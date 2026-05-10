# Stacking Constraints

## ภาพรวม

เพิ่มข้อมูล physical constraints ให้แต่ละ catalog item — เช่น `fragile`, `thisSideUp`, `maxStackWeight`, `nonStackable` — แล้วใช้เป็นเงื่อนไขในการ validate การวาง/รหมุน/auto-pack เพื่อป้องกันการบรรทุกที่ทำลายของจริง

**ผลกระทบ**: ระบบจะเช็ค constraints จริงในการขนส่ง ไม่ใช่แค่ขนาด/น้ำหนักรวม
**ระดับความซับซ้อน**: 🟡 ปานกลาง (3–4 วัน)
**ขึ้นกับ feature อื่น**: ใช้ pattern validation เดิมที่มีอยู่ใน `packing-utils.ts`

---

## เป้าหมายของฟีเจอร์

1. **Catalog ระดับ item** สามารถระบุ constraints
2. **Validate ตอนวาง** — Block หรือ warn เมื่อละเมิดกฎ
3. **Visualization** — กล่อง fragile มีไอคอนลอยเหนือ, this-side-up มีลูกศรชี้ขึ้น
4. **Auto-pack ตามกฎ** — algorithm พยายามไม่ละเมิด constraints
5. **Report exceptions** — ใน Constraint Analysis panel แสดงรายการ violations
6. **Override ได้** — user กดยืนยันเพื่อข้าม warning ในกรณีพิเศษ

---

## Constraints ที่ต้องรองรับ

| Property | Type | คำอธิบาย | Behavior |
|---|---|---|---|
| `fragile` | `boolean` | กล่องเปราะ | ห้ามวางของหนัก > X kg ทับ |
| `thisSideUp` | `boolean` | ห้ามคว่ำ | จำกัด orientation ที่วางได้ (เฉพาะ 0, 1) |
| `maxStackWeight` | `number?` (kg) | น้ำหนักที่ทับได้ | ผลรวมของกล่องที่ทับด้านบนต้องไม่เกินค่านี้ |
| `nonStackable` | `boolean` | วางทับไม่ได้ | ห้ามมีกล่องใดอยู่บน |
| `cannotBeStackedOn` | `boolean` | ห้ามวางบนของอื่น | ต้องอยู่บนพื้นเท่านั้น |
| `hazmat` | `string?` (UN code) | วัตถุอันตราย | แยกจากกล่องประเภทอื่นที่กำหนด |
| `temperature` | `'ambient' \| 'chilled' \| 'frozen'` | อุณหภูมิที่ต้องการ | reefer container เท่านั้น (warn) |
| `priority` | `number` | ลำดับความสำคัญ (1-5) | LIFO sequence (ส่งก่อน = priority สูง = ใกล้ประตู) |

---

## โครงสร้างไฟล์ที่จะเพิ่ม/แก้ไข

```
stack-box-game/
├── lib/
│   └── packing/
│       ├── constraints.ts            ← ใหม่ — validate stacking rules
│       └── packing-utils.ts          ← แก้ไข — รวม constraint check ใน validatePlacement
├── components/
│   ├── scene/
│   │   ├── cargo-box.tsx             ← แก้ไข — render constraint icons
│   │   └── constraint-icons.tsx      ← ใหม่ — 3D HTML icons (fragile/up arrow)
│   └── custom/
│       ├── catalog-item-form.tsx     ← แก้ไข — UI สำหรับ constraints fields
│       └── right-panel.tsx           ← แก้ไข — Constraint Analysis section
├── prisma/
│   └── schema.prisma                 ← แก้ไข — เพิ่ม fields ใน CatalogItem & Box
└── store/
    └── use-scene-store.ts            ← แก้ไข — type definitions
```

---

## Phase 1 — Schema + Types (~2 ชม.)

### Database — `prisma/schema.prisma`

```prisma
model CatalogItem {
  // ... existing
  fragile           Boolean  @default(false)
  thisSideUp        Boolean  @default(false)
  nonStackable      Boolean  @default(false)
  cannotBeStackedOn Boolean  @default(false)
  maxStackWeight    Float?
  hazmat            String?
  temperature       String?  // 'ambient' | 'chilled' | 'frozen'
  priority          Int      @default(3)
}

model Box {
  // ... existing
  fragile           Boolean  @default(false)
  thisSideUp        Boolean  @default(false)
  nonStackable      Boolean  @default(false)
  cannotBeStackedOn Boolean  @default(false)
  maxStackWeight    Float?
  hazmat            String?
  temperature       String?
  priority          Int      @default(3)
}
```

รัน:
```bash
npx prisma migrate dev --name add_stacking_constraints
```

### Types — `store/use-scene-store.ts`

```ts
export interface StackingConstraints {
  fragile?: boolean
  thisSideUp?: boolean
  nonStackable?: boolean        // nothing on top
  cannotBeStackedOn?: boolean   // must touch floor
  maxStackWeight?: number       // kg
  hazmat?: string               // UN code (e.g., "UN1170")
  temperature?: 'ambient' | 'chilled' | 'frozen'
  priority?: 1 | 2 | 3 | 4 | 5  // LIFO sequence
}

export interface CatalogItem extends StackingConstraints {
  id: string
  name: string
  size: BoxSize
  weight: number
  category?: string
}

export interface CargoBox extends StackingConstraints {
  // ... existing fields
}
```

### Transform updates — `lib/transforms.ts`

แก้ `toCargoBox`, `toBoxData`, `toCatalogItem`, `toCatalogItemData` ให้ pass-through fields ใหม่

---

## Phase 2 — Constraint Validation Logic (~4 ชม.)

### `lib/packing/constraints.ts`

```ts
import * as THREE from 'three'
import { getEffectiveSize } from '@/store/use-scene-store'
import { footprintOverlaps } from './packing-utils'
import type { CargoBox, ContainerSize } from '@/store/use-scene-store'

export type ConstraintSeverity = 'error' | 'warning'

export interface ConstraintViolation {
  severity: ConstraintSeverity
  rule: string
  message: string
  boxIds: string[]   // affected boxes
}

const EPS = 0.5

/** Returns boxes that physically rest ON TOP OF `box` */
export function findBoxesAbove(box: CargoBox, allBoxes: CargoBox[]): CargoBox[] {
  const s = getEffectiveSize(box)
  const topY = box.position.y + s.h / 2

  return allBoxes.filter((other) => {
    if (other.id === box.id) return false
    const os = getEffectiveSize(other)
    const otherBottomY = other.position.y - os.h / 2

    // Other box's bottom touches our top (within epsilon)
    if (Math.abs(otherBottomY - topY) > EPS) return false

    // Footprint overlap on x,z
    return footprintOverlaps(
      box.position.x, s.w, box.position.z, s.d,
      other.position.x, os.w, other.position.z, os.d
    )
  })
}

/** Total weight of all boxes resting (transitively) on top of this one */
export function computeStackWeightOn(box: CargoBox, allBoxes: CargoBox[]): number {
  const visited = new Set<string>()
  const stack = [box]
  let total = 0

  while (stack.length > 0) {
    const current = stack.pop()!
    if (visited.has(current.id)) continue
    visited.add(current.id)

    const above = findBoxesAbove(current, allBoxes)
    for (const a of above) {
      if (!visited.has(a.id)) {
        total += a.weight ?? 0
        stack.push(a)
      }
    }
  }
  return total
}

/** orientation 0 (default) and 1 (Y-90°) keep "up" pointing up; others flip the box */
const UPRIGHT_ORIENTATIONS = new Set([0, 1])

/** Validate ONE box placement against stacking constraints */
export function validateStackingConstraints(
  movingBox: CargoBox,
  newPos: THREE.Vector3,
  otherBoxes: CargoBox[]
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = []
  const s = getEffectiveSize(movingBox)
  const onFloor = Math.abs(newPos.y - s.h / 2) < EPS

  // Rule 1: thisSideUp
  if (movingBox.thisSideUp && !UPRIGHT_ORIENTATIONS.has(movingBox.orientationId ?? 0)) {
    violations.push({
      severity: 'error',
      rule: 'this-side-up',
      message: `${movingBox.name} ห้ามคว่ำ — ต้องอยู่ในแนวตั้งเท่านั้น`,
      boxIds: [movingBox.id],
    })
  }

  // Rule 2: cannotBeStackedOn — must be on floor
  if (movingBox.cannotBeStackedOn && !onFloor) {
    violations.push({
      severity: 'error',
      rule: 'cannot-be-stacked-on',
      message: `${movingBox.name} ต้องวางบนพื้นเท่านั้น`,
      boxIds: [movingBox.id],
    })
  }

  // Rule 3: Find what's directly below (this box is being placed on top of them)
  // Use a temporary "fake" box at newPos to find what would be below it
  const tempBelow = otherBoxes.filter((other) => {
    const os = getEffectiveSize(other)
    const otherTopY = other.position.y + os.h / 2
    if (Math.abs(otherTopY - (newPos.y - s.h / 2)) > EPS) return false
    return footprintOverlaps(
      newPos.x, s.w, newPos.z, s.d,
      other.position.x, os.w, other.position.z, os.d
    )
  })

  // Rule 3a: ห้ามวางบน nonStackable
  for (const below of tempBelow) {
    if (below.nonStackable) {
      violations.push({
        severity: 'error',
        rule: 'non-stackable',
        message: `ห้ามวาง ${movingBox.name} บน ${below.name} (nonStackable)`,
        boxIds: [movingBox.id, below.id],
      })
    }
  }

  // Rule 4: maxStackWeight — does this addition exceed any below's limit?
  for (const below of tempBelow) {
    if (below.maxStackWeight == null) continue
    // Check the entire stack starting from `below`
    // Pretend movingBox is now at newPos by including it in the world
    const simulatedWorld = [
      ...otherBoxes,
      { ...movingBox, position: { x: newPos.x, y: newPos.y, z: newPos.z } },
    ]
    const stackWeight = computeStackWeightOn(below, simulatedWorld)
    if (stackWeight > below.maxStackWeight) {
      violations.push({
        severity: 'error',
        rule: 'max-stack-weight',
        message: `${below.name} รับน้ำหนักได้สูงสุด ${below.maxStackWeight} kg แต่จะมี ${stackWeight.toFixed(0)} kg ทับ`,
        boxIds: [movingBox.id, below.id],
      })
    }
  }

  // Rule 5: fragile — ห้ามวางของ "หนักกว่า X" บนกล่อง fragile
  // Convention: ถ้า maxStackWeight ไม่ระบุใน fragile box ใช้ default 50kg
  const FRAGILE_DEFAULT = 50
  for (const below of tempBelow) {
    if (!below.fragile) continue
    const limit = below.maxStackWeight ?? FRAGILE_DEFAULT
    const simulatedWorld = [
      ...otherBoxes,
      { ...movingBox, position: { x: newPos.x, y: newPos.y, z: newPos.z } },
    ]
    const stackW = computeStackWeightOn(below, simulatedWorld)
    if (stackW > limit) {
      violations.push({
        severity: 'error',
        rule: 'fragile',
        message: `${below.name} เปราะ — รับน้ำหนักได้เพียง ${limit} kg`,
        boxIds: [movingBox.id, below.id],
      })
    }
  }

  // Rule 6: Hazmat segregation (basic — same code = OK; different codes = warn)
  if (movingBox.hazmat) {
    // Find other hazmat boxes within 1m radius (quick proximity check)
    const tooClose = otherBoxes.filter((other) => {
      if (!other.hazmat || other.hazmat === movingBox.hazmat) return false
      const dist = Math.hypot(
        other.position.x - newPos.x,
        other.position.y - newPos.y,
        other.position.z - newPos.z
      )
      return dist < 100  // < 1m
    })
    if (tooClose.length > 0) {
      violations.push({
        severity: 'warning',
        rule: 'hazmat-segregation',
        message: `วัตถุอันตรายต่างประเภทใกล้กันเกินไป (${movingBox.hazmat} vs ${tooClose.map((t) => t.hazmat).join(', ')})`,
        boxIds: [movingBox.id, ...tooClose.map((t) => t.id)],
      })
    }
  }

  return violations
}

/** Validate the entire current state for ALL constraint violations (audit mode) */
export function auditAllConstraints(
  boxes: CargoBox[],
  container: ContainerSize
): ConstraintViolation[] {
  const all: ConstraintViolation[] = []
  for (const box of boxes) {
    const others = boxes.filter((b) => b.id !== box.id)
    const pos = new THREE.Vector3(box.position.x, box.position.y, box.position.z)
    all.push(...validateStackingConstraints(box, pos, others))
  }

  // Deduplicate by (rule, sorted boxIds)
  const seen = new Set<string>()
  return all.filter((v) => {
    const key = `${v.rule}:${[...v.boxIds].sort().join(',')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
```

### Integration: `packing-utils.ts`

```ts
import { validateStackingConstraints } from './constraints'

export function validatePlacement(
  movingBox: CargoBox,
  newPos: THREE.Vector3,
  otherBoxes: CargoBox[],
  containerSize: ContainerSize,
  options: { skipConstraints?: boolean } = {}
): { valid: boolean; reason?: string; warnings?: string[] } {
  // ... existing boundary + collision checks ...

  if (!options.skipConstraints) {
    const violations = validateStackingConstraints(movingBox, newPos, otherBoxes)
    const errors = violations.filter((v) => v.severity === 'error')
    if (errors.length > 0) {
      return { valid: false, reason: errors[0].message }
    }
    const warnings = violations.filter((v) => v.severity === 'warning').map((v) => v.message)
    if (warnings.length > 0) {
      return { valid: true, warnings }
    }
  }

  return { valid: true }
}
```

---

## Phase 3 — Catalog Form UI (~3 ชม.)

### แก้ไข `app/catalog/page.tsx` — เพิ่ม fields ใน CatalogItemDialog

```tsx
const catalogItemSchema = z.object({
  name: z.string().min(1),
  w: z.number().min(1).max(2000),
  h: z.number().min(1).max(2000),
  d: z.number().min(1).max(2000),
  weight: z.number().min(0).max(10000),
  category: z.string().optional(),

  // New constraint fields
  fragile: z.boolean().optional(),
  thisSideUp: z.boolean().optional(),
  nonStackable: z.boolean().optional(),
  cannotBeStackedOn: z.boolean().optional(),
  maxStackWeight: z.number().optional(),
  hazmat: z.string().optional(),
  temperature: z.enum(['ambient', 'chilled', 'frozen']).optional(),
  priority: z.number().min(1).max(5).optional(),
})
```

### Form UI section

```tsx
{/* Add to CatalogItemDialog after weight/category */}
<details className="border rounded-lg p-3">
  <summary className="text-xs font-bold an-text-on-surface cursor-pointer">
    Stacking Constraints (advanced)
  </summary>
  <div className="mt-3 space-y-3">

    {/* Boolean toggles */}
    <div className="grid grid-cols-2 gap-2 text-xs">
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('fragile')} />
        🍷 Fragile
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('thisSideUp')} />
        ⬆️ This Side Up
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('nonStackable')} />
        🚫 Non-stackable
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" {...register('cannotBeStackedOn')} />
        🏠 Floor only
      </label>
    </div>

    <div>
      <label className="text-xs an-text-on-surface-muted mb-1 block">
        Max Stack Weight (kg) — น้ำหนักที่รับได้
      </label>
      <Input type="number" {...register('maxStackWeight', { valueAsNumber: true })} />
    </div>

    <div className="grid grid-cols-2 gap-2">
      <div>
        <label className="text-xs an-text-on-surface-muted mb-1 block">UN Hazmat Code</label>
        <Input {...register('hazmat')} placeholder="e.g., UN1170" />
      </div>
      <div>
        <label className="text-xs an-text-on-surface-muted mb-1 block">Temperature</label>
        <select {...register('temperature')} className="an-input w-full">
          <option value="">Any</option>
          <option value="ambient">Ambient</option>
          <option value="chilled">Chilled</option>
          <option value="frozen">Frozen</option>
        </select>
      </div>
    </div>

    <div>
      <label className="text-xs an-text-on-surface-muted mb-1 block">
        Priority (1 = unload first, 5 = unload last)
      </label>
      <Input type="number" min={1} max={5} {...register('priority', { valueAsNumber: true })} />
    </div>
  </div>
</details>
```

### Catalog Card display

ใน catalog grid view เพิ่ม badges:
```tsx
<div className="flex gap-1 flex-wrap mt-2">
  {item.fragile && <Badge>🍷 Fragile</Badge>}
  {item.thisSideUp && <Badge>⬆️ This Side Up</Badge>}
  {item.nonStackable && <Badge>🚫 Non-stack</Badge>}
  {item.hazmat && <Badge variant="destructive">⚠️ {item.hazmat}</Badge>}
  {item.temperature && item.temperature !== 'ambient' && <Badge>❄️ {item.temperature}</Badge>}
</div>
```

---

## Phase 4 — 3D Visualization (~3 ชม.)

### `components/scene/constraint-icons.tsx`

```tsx
'use client'

import { Html } from '@react-three/drei'
import { getEffectiveSize } from '@/store/use-scene-store'
import type { CargoBox } from '@/store/use-scene-store'

interface Props {
  box: CargoBox
}

export function ConstraintIcons({ box }: Props) {
  const e = getEffectiveSize(box)
  const topY = e.h / 2 + 8

  const icons: { emoji: string; label: string }[] = []
  if (box.fragile) icons.push({ emoji: '🍷', label: 'Fragile' })
  if (box.thisSideUp) icons.push({ emoji: '⬆️', label: 'This Side Up' })
  if (box.nonStackable) icons.push({ emoji: '🚫', label: 'Non-stackable' })
  if (box.hazmat) icons.push({ emoji: '⚠️', label: box.hazmat })

  if (icons.length === 0) return null

  return (
    <Html position={[0, topY, 0]} center distanceFactor={300}>
      <div className="flex gap-0.5 pointer-events-none">
        {icons.map((i, idx) => (
          <span
            key={idx}
            title={i.label}
            className="text-xs bg-white/90 rounded shadow px-1 py-0.5"
          >
            {i.emoji}
          </span>
        ))}
      </div>
    </Html>
  )
}
```

### แก้ไข `cargo-box.tsx`

ภายใน mesh:
```tsx
<ConstraintIcons box={box} />
```

### Special: This-Side-Up arrow (3D mesh, ไม่ใช่ HTML)

```tsx
{box.thisSideUp && (
  <mesh position={[0, e.h / 2 + 4, 0]} rotation={[0, 0, 0]}>
    <coneGeometry args={[3, 8, 4]} />
    <meshBasicMaterial color="#10b981" />
  </mesh>
)}
```

---

## Phase 5 — Constraint Analysis Panel (~2 ชม.)

ขยาย Constraint Analysis section ใน `right-panel.tsx`:

```tsx
import { auditAllConstraints } from '@/lib/packing/constraints'

const violations = useMemo(
  () => auditAllConstraints(boxes, containerSize),
  [boxes, containerSize]
)

const errors   = violations.filter((v) => v.severity === 'error')
const warnings = violations.filter((v) => v.severity === 'warning')

// Add to Constraint Analysis section:
{errors.length > 0 && (
  <div className="mt-3">
    <div className="text-[10px] font-bold an-text-error uppercase mb-2">
      🚨 Stacking Violations ({errors.length})
    </div>
    {errors.map((v, i) => (
      <button
        key={i}
        type="button"
        onClick={() => {
          // Highlight affected boxes
          v.boxIds.forEach((id) => setFlashId(id))
          setTimeout(() => setFlashId(null), 1500)
        }}
        className="w-full text-left text-[11px] p-2 mb-1 rounded an-constraint-item-fail hover:opacity-80"
      >
        {v.message}
      </button>
    ))}
  </div>
)}
```

---

## Phase 6 — Override Confirmation (~2 ชม.)

When user moves a box and validation fails due to constraint (not boundary/collision), show a confirm dialog:

```tsx
// In cargo-box.tsx onPointerUp
if (isDraggingRef.current && ghostPosRef.current) {
  const result = validatePlacement(box, ghostPosRef.current, boxes, containerSize)
  if (!result.valid && result.reason && isConstraintViolation(result.reason)) {
    // Open confirm dialog
    setOverrideRequest({
      box,
      newPos: ghostPosRef.current,
      reason: result.reason,
    })
  } else if (result.valid) {
    moveBox(box.id, ghostPosRef.current)
  }
}
```

```tsx
// OverrideDialog component
<Dialog open={!!overrideRequest} onOpenChange={(o) => !o && setOverrideRequest(null)}>
  <DialogContent className="an-dialog-content">
    <DialogHeader>
      <DialogTitle className="an-text-error">⚠️ ละเมิดกฎการวางซ้อน</DialogTitle>
    </DialogHeader>
    <p className="text-sm an-text-on-surface mt-2">{overrideRequest?.reason}</p>
    <p className="text-xs an-text-on-surface-muted mt-2">
      คุณต้องการดำเนินการต่อหรือไม่? การละเมิดจะถูกบันทึกในรายงาน
    </p>
    <DialogFooter className="mt-4 gap-2">
      <button onClick={() => setOverrideRequest(null)} className="an-btn-outline-primary">
        ยกเลิก
      </button>
      <button
        onClick={() => {
          if (overrideRequest) {
            moveBox(overrideRequest.box.id, overrideRequest.newPos)
            // Mark as override in step log
          }
          setOverrideRequest(null)
        }}
        className="an-btn-danger-ghost"
      >
        ดำเนินการต่อ
      </button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Phase 7 — Auto-Pack Constraint Awareness (~3 ชม.)

`binpackingjs` ไม่รู้จัก constraints — หลัง pack เสร็จต้อง post-process:

```ts
// In runAutoPack:
const result = packer.pack()
const packedBoxes = result.bins[0].items.map(...)

// Post-process: validate each placement against constraints
const violations: string[] = []  // ids of violating boxes
for (const item of packedBoxes) {
  const others = packedBoxes.filter((p) => p.id !== item.id)
  const checks = validateStackingConstraints(item, item.position, others)
  if (checks.some((c) => c.severity === 'error')) {
    violations.push(item.id)
  }
}

// Try to fix violations: move violating boxes to floor or unfit them
// ... iterative repacking with ordering by priority + cannotBeStackedOn first
```

> **Better long-term approach**: เขียน packing algorithm เองที่ aware constraints แทน binpackingjs (ใหญ่กว่ามาก เก็บไว้เป็น future enhancement)

---

## Phase 8 — Update Sample Catalog (~30 นาที)

ใน `store/use-scene-store.ts`:

```ts
export const SAMPLE_CATALOG: ... = [
  { name: 'กล่องเล็ก S', size: { w: 30, h: 30, d: 30 }, weight: 5, category: 'Standard' },
  { name: 'กล่องไวน์', size: { w: 35, h: 35, d: 35 }, weight: 12, category: 'Beverages',
    fragile: true, thisSideUp: true, maxStackWeight: 30 },
  { name: 'อิเล็กทรอนิกส์', size: { w: 60, h: 50, d: 40 }, weight: 25, category: 'Electronics',
    fragile: true, thisSideUp: true, maxStackWeight: 50 },
  { name: 'ถังเคมี', size: { w: 50, h: 80, d: 50 }, weight: 100, category: 'Hazmat',
    hazmat: 'UN1170', cannotBeStackedOn: true, nonStackable: true },
  { name: 'ของแช่เย็น', size: { w: 80, h: 60, d: 60 }, weight: 30, category: 'Cold Chain',
    temperature: 'chilled', priority: 1 },
  // ... existing items
]
```

---

## Acceptance Criteria

- [x] Catalog form มี Section "Stacking Constraints" (collapsible)
- [x] DB เก็บ constraints ทุก field และ load กลับมาถูกต้อง
- [x] กล่อง fragile แสดง icon 🍷 ลอยเหนือใน 3D scene
- [x] กล่อง this-side-up แสดงลูกศรขึ้น 3D และ block orientation 2-5
- [x] วางของหนักทับ fragile box → ghost แดง + reason
- [x] วางบน nonStackable → block + reason
- [x] cannotBeStackedOn → ต้องอยู่บนพื้น
- [x] Constraint Analysis panel แสดง violations พร้อม click → highlight
- [x] Override dialog เปิดเมื่อพยายามทำ action ที่ละเมิด — confirm = ทำต่อได้ (logged)
- [x] Auto-pack respect cannotBeStackedOn (วางบนพื้นเสมอ)
- [x] Hazmat boxes ที่ใกล้กันเกิน 1m → warning
- [x] Catalog card แสดง constraint badges

---

## Future Enhancements

- **IMDG Code segregation table** — official chart of which UN classes can/cannot be near each other
- **CTU Code compliance** — IMO/ILO standard validation
- **Customizable max-stack defaults** — per category (Electronics fragile = 25kg, Furniture = 80kg)
- **Stack height limit per box** — "ห้ามวางสูงเกิน 3 ชั้น"
- **Edge-of-pallet rule** — กล่องเกินขอบ pallet > 5cm = warning
- **Liquid containers** — bottom-heavy bias auto-rotation
