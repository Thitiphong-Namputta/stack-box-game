# Multi-Select and Bulk Operations

## ภาพรวม

ปลดล็อกการเลือกกล่องหลายใบพร้อมกัน (Shift+click หรือลากกรอบ) แล้วทำ bulk operation เช่น move/delete/rotate/duplicate/group เป็น operation เดียว ลด workflow ที่ต้องคลิกซ้ำๆ ในงานที่มีกล่องเยอะ

**ผลกระทบ**: ลดเวลาทำงานสำหรับ plan ที่มีกล่อง 20+ ใบ อย่างมาก
**ระดับความซับซ้อน**: 🟡 ปานกลาง (4–6 วัน)
**ขึ้นกับ feature อื่น**: ต้องเปลี่ยน `selectedId: string | null` เป็น `Set<string>` — กระทบหลายไฟล์

---

## เป้าหมายของฟีเจอร์

1. **Shift+click** สลับการเลือกแต่ละกล่อง (toggle in selection)
2. **Ctrl/Cmd+A** เลือกทั้งหมด
3. **Box-select drag** ลากกรอบบน canvas → เลือกกล่องที่อยู่ในกรอบ (เหมือน Photoshop / Figma)
4. **Bulk operations**:
   - Delete หลายกล่อง
   - Move กลุ่ม (ลากที่กล่องใดในกลุ่ม → ทุกกล่องในกลุ่มเลื่อนเท่ากัน)
   - Rotate ทั้งกลุ่ม (orientation เดียวกันทุกใบ)
   - Duplicate กลุ่ม
   - Align (top/center/bottom, left/center/right)
   - Distribute spacing (equal x/y/z gaps)
5. **Visual feedback**: outline ทุกกล่องที่ถูกเลือก, แสดง count + total weight ใน mini HUD

---

## Breaking Change ที่หลีกเลี่ยงไม่ได้

State shape เปลี่ยน:
```ts
// Before
selectedId: string | null

// After
selectedIds: Set<string>
```

ไฟล์ที่กระทบ:
- `store/use-scene-store.ts`
- `components/scene/cargo-box.tsx`
- `components/custom/right-panel.tsx`
- `components/custom/item-catalog.tsx` (ManifestItemCard)
- `components/scene/scene-canvas.tsx` (keyboard handlers)

> **กลยุทธ์**: เก็บ helper `selectedId` (= first item of Set) ไว้ใน selector เพื่อให้โค้ดเก่าที่อ้าง single selection ยังทำงานได้ในเฟสแรก

---

## โครงสร้างไฟล์ที่จะเพิ่ม/แก้ไข

```
stack-box-game/
├── store/
│   └── use-scene-store.ts                ← แก้ไข — selectedIds Set + bulk actions
├── components/
│   ├── scene/
│   │   ├── cargo-box.tsx                 ← แก้ไข — handle Shift+click + group drag
│   │   ├── scene-canvas.tsx              ← แก้ไข — Ctrl+A, box-select drag
│   │   └── selection-rectangle.tsx       ← ใหม่ — overlay div ขณะ drag กรอบ
│   └── custom/
│       ├── multi-select-panel.tsx        ← ใหม่ — replace InfoPanel เมื่อ multi-select
│       ├── alignment-toolbar.tsx         ← ใหม่ — align/distribute buttons
│       └── right-panel.tsx               ← แก้ไข — สลับระหว่าง single/multi panel
└── lib/
    └── selection/
        ├── frustum-select.ts             ← ใหม่ — 3D box-select algorithm
        ├── alignment.ts                  ← ใหม่ — align/distribute math
        └── group-transform.ts            ← ใหม่ — group move/rotate
```

---

## Phase 1 — State Refactor (~3 ชม.)

### `store/use-scene-store.ts`

```ts
// Replace selectedId with selectedIds: Set<string>

export interface SceneStore {
  // ... existing
  selectedIds: Set<string>

  // Single-selection compatibility (returns first or null)
  // เป็น computed via selector — ไม่ใช่ state field

  setSelected: (id: string | null) => void          // single-select (เหมือนเดิม)
  toggleSelected: (id: string) => void              // shift+click
  addToSelection: (ids: string[]) => void
  removeFromSelection: (ids: string[]) => void
  selectAll: () => void
  clearSelection: () => void
  isSelected: (id: string) => boolean

  // Bulk actions
  removeSelected: () => void
  duplicateSelected: () => void
  rotateSelected: (dir: 'fwd' | 'bwd') => void
  moveSelected: (delta: { x: number; y: number; z: number }) => void
  alignSelected: (axis: 'x' | 'y' | 'z', mode: 'min' | 'center' | 'max') => void
  distributeSelected: (axis: 'x' | 'y' | 'z') => void
}
```

```ts
// In create():
selectedIds: new Set(),

setSelected: (id) =>
  set({ selectedIds: id ? new Set([id]) : new Set() }),

toggleSelected: (id) =>
  set((state) => {
    const next = new Set(state.selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return { selectedIds: next }
  }),

selectAll: () =>
  set((state) => ({ selectedIds: new Set(state.boxes.map((b) => b.id)) })),

clearSelection: () => set({ selectedIds: new Set() }),

isSelected: (id) => get().selectedIds.has(id),

removeSelected: () => {
  const ids = Array.from(get().selectedIds)
  if (ids.length === 0) return
  set((state) => ({
    history: [...state.history.slice(-19), state.boxes],
    future: [],
    boxes: state.boxes.filter((b) => !state.selectedIds.has(b.id)),
    selectedIds: new Set(),
  }))
  get().logStep('removeBox', `Removed ${ids.length} boxes`)
},

moveSelected: (delta) => {
  set((state) => ({
    history: [...state.history.slice(-19), state.boxes],
    future: [],
    boxes: state.boxes.map((b) =>
      state.selectedIds.has(b.id)
        ? {
            ...b,
            position: {
              x: b.position.x + delta.x,
              y: b.position.y + delta.y,
              z: b.position.z + delta.z,
            },
          }
        : b
    ),
  }))
},
```

### Migration helper selector

```ts
// Single-selection helper for legacy components
export const selectedIdSelector = (s: SceneStore): string | null => {
  if (s.selectedIds.size === 0) return null
  return Array.from(s.selectedIds)[0]
}

// Usage in components ที่ยังต้องการ single id
const selectedId = useSceneStore(selectedIdSelector)
```

---

## Phase 2 — Shift+Click + Visual Feedback (~3 ชม.)

### `cargo-box.tsx`

```tsx
const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
  e.stopPropagation()

  const isShift = e.nativeEvent.shiftKey
  const isMod = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey

  if (isShift || isMod) {
    toggleSelected(box.id)
    return  // ไม่เริ่ม drag เมื่อ shift/cmd-click
  }

  // ถ้า click กล่องที่ไม่อยู่ใน selection → replace selection
  if (!useSceneStore.getState().selectedIds.has(box.id)) {
    setSelected(box.id)
  }
  // ถ้าคลิกกล่องที่อยู่ใน selection อยู่แล้ว → เริ่ม group drag (ทั้งกลุ่มเลื่อน)

  // ... existing drag logic
}, [box, toggleSelected, setSelected])
```

### Group drag

ใน drag loop: คำนวณ delta จาก ghost movement แล้ว apply ทุกกล่องที่ selected

```ts
const onPointerMove = (me: PointerEvent) => {
  // ... compute snapped position for `box`
  const delta = {
    x: snapped.x - box.position.x,
    y: snapped.y - box.position.y,
    z: snapped.z - box.position.z,
  }

  // Validate ทุก box ในกลุ่ม
  const selectedBoxes = boxes.filter((b) => isSelected(b.id))
  const allValid = selectedBoxes.every((b) => {
    const newPos = new THREE.Vector3(
      b.position.x + delta.x,
      b.position.y + delta.y,
      b.position.z + delta.z
    )
    // Validate against non-selected boxes only (กลุ่มเลื่อนพร้อมกันไม่ชนกันเอง)
    const others = boxes.filter((o) => !isSelected(o.id))
    return validatePlacement(b, newPos, others, containerSize).valid
  })

  // Update ghosts for all selected
  ghostDeltaRef.current = { delta, valid: allValid }
}

const onPointerUp = () => {
  if (ghostDeltaRef.current.valid) {
    moveSelected(ghostDeltaRef.current.delta)
  }
}
```

### Visual: Selection outline

ใน `cargo-box.tsx`:
```tsx
const isInSelection = useSceneStore((s) => s.selectedIds.has(box.id))
const showOutline = isInSelection || isFlashing

// outline color: red flash > selected white > none
```

---

## Phase 3 — Box-Select (Drag Rectangle) (~5 ชม.)

### Concept

User กดเมาส์ที่พื้นที่ว่างของ canvas (`onPointerMissed`) แล้วลาก → วาด rectangle overlay บน DOM → คำนวณว่ากล่องไหน 3D bounding box อยู่ในกรอบ 2D screen นั้น

### `components/scene/selection-rectangle.tsx`

```tsx
'use client'

interface Props {
  start: { x: number; y: number } | null
  current: { x: number; y: number } | null
}

export function SelectionRectangle({ start, current }: Props) {
  if (!start || !current) return null

  const left   = Math.min(start.x, current.x)
  const top    = Math.min(start.y, current.y)
  const width  = Math.abs(current.x - start.x)
  const height = Math.abs(current.y - start.y)

  return (
    <div
      className="absolute pointer-events-none border-2 border-blue-400 bg-blue-400/15 rounded-sm"
      style={{ left, top, width, height }}
    />
  )
}
```

### `lib/selection/frustum-select.ts`

```ts
import * as THREE from 'three'
import { getEffectiveSize } from '@/store/use-scene-store'
import type { CargoBox } from '@/store/use-scene-store'

/**
 * Project a 3D point to NDC (-1..1) using a camera.
 */
function projectPoint(p: THREE.Vector3, camera: THREE.Camera): THREE.Vector3 {
  return p.clone().project(camera)
}

/**
 * Returns the box IDs whose center (or any of 8 corners) projects inside the screen rectangle.
 */
export function pickBoxesInRect(
  boxes: CargoBox[],
  camera: THREE.Camera,
  domSize: { width: number; height: number },
  rect: { x1: number; y1: number; x2: number; y2: number }
): string[] {
  const xMin = Math.min(rect.x1, rect.x2)
  const xMax = Math.max(rect.x1, rect.x2)
  const yMin = Math.min(rect.y1, rect.y2)
  const yMax = Math.max(rect.y1, rect.y2)

  return boxes
    .filter((box) => {
      const s = getEffectiveSize(box)
      const c = box.position

      // Check 8 corners of AABB
      const corners = [
        new THREE.Vector3(c.x - s.w/2, c.y - s.h/2, c.z - s.d/2),
        new THREE.Vector3(c.x + s.w/2, c.y - s.h/2, c.z - s.d/2),
        new THREE.Vector3(c.x - s.w/2, c.y + s.h/2, c.z - s.d/2),
        new THREE.Vector3(c.x + s.w/2, c.y + s.h/2, c.z - s.d/2),
        new THREE.Vector3(c.x - s.w/2, c.y - s.h/2, c.z + s.d/2),
        new THREE.Vector3(c.x + s.w/2, c.y - s.h/2, c.z + s.d/2),
        new THREE.Vector3(c.x - s.w/2, c.y + s.h/2, c.z + s.d/2),
        new THREE.Vector3(c.x + s.w/2, c.y + s.h/2, c.z + s.d/2),
      ]

      return corners.some((corner) => {
        const projected = projectPoint(corner, camera)
        const screenX = (projected.x + 1) / 2 * domSize.width
        const screenY = (1 - projected.y) / 2 * domSize.height
        return screenX >= xMin && screenX <= xMax && screenY >= yMin && screenY <= yMax
      })
    })
    .map((box) => box.id)
}
```

### `scene-canvas.tsx` integration

```tsx
const [dragRect, setDragRect] = useState<{ start: Point; current: Point } | null>(null)

const handleCanvasPointerDown = (e: React.PointerEvent) => {
  // เฉพาะคลิกที่ background (raycaster ไม่ชนกล่อง) — ใช้ onPointerMissed
}

// ใน Canvas:
<Canvas
  onPointerMissed={(e) => {
    // Only start box-select if not on a box
    const target = e.target as HTMLElement
    if (!target.closest('[data-box-mesh]')) {
      const rect = canvasWrapperRef.current!.getBoundingClientRect()
      setDragRect({
        start:   { x: e.clientX - rect.left, y: e.clientY - rect.top },
        current: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      })
    } else {
      clearSelection()
    }
  }}
>

// On document pointermove + up while dragRect != null:
useEffect(() => {
  if (!dragRect) return
  const onMove = (e: PointerEvent) => {
    const rect = canvasWrapperRef.current!.getBoundingClientRect()
    setDragRect((prev) => prev && {
      ...prev,
      current: { x: e.clientX - rect.left, y: e.clientY - rect.top },
    })
  }
  const onUp = () => {
    if (!dragRect || !cameraRef.current) {
      setDragRect(null)
      return
    }
    const ids = pickBoxesInRect(
      boxes,
      cameraRef.current,
      { width: rect.width, height: rect.height },
      { x1: dragRect.start.x, y1: dragRect.start.y, x2: dragRect.current.x, y2: dragRect.current.y },
    )
    if (ids.length) addToSelection(ids)
    setDragRect(null)
  }
  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', onUp)
  return () => {
    document.removeEventListener('pointermove', onMove)
    document.removeEventListener('pointerup', onUp)
  }
}, [dragRect])

return (
  <div ref={canvasWrapperRef} className="w-full h-full relative">
    <Canvas>...</Canvas>
    {dragRect && (
      <SelectionRectangle start={dragRect.start} current={dragRect.current} />
    )}
  </div>
)
```

---

## Phase 4 — Multi-Select Panel UI (~3 ชม.)

### `components/custom/multi-select-panel.tsx`

```tsx
'use client'

import { Trash2, Copy, RotateCw } from 'lucide-react'
import { useSceneStore, getEffectiveSize } from '@/store/use-scene-store'
import { AlignmentToolbar } from './alignment-toolbar'

export function MultiSelectPanel() {
  const { boxes, selectedIds, removeSelected, duplicateSelected, rotateSelected } = useSceneStore()

  const selected = boxes.filter((b) => selectedIds.has(b.id))
  const totalWeight = selected.reduce((s, b) => s + (b.weight ?? 0), 0)
  const totalVolume = selected.reduce((s, b) => {
    const e = getEffectiveSize(b)
    return s + (e.w * e.h * e.d)
  }, 0)

  return (
    <section className="p-6 an-section-border-bottom">
      <div className="text-[10px] font-bold uppercase tracking-widest an-section-label">
        Selection ({selected.length} items)
      </div>

      {/* Aggregate stats */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="p-3 rounded-lg an-stat-card">
          <div className="text-[10px] uppercase an-stat-label">Total Weight</div>
          <div className="font-mono font-bold text-sm an-text-on-surface mt-1">
            {totalWeight.toFixed(1)} kg
          </div>
        </div>
        <div className="p-3 rounded-lg an-stat-card">
          <div className="text-[10px] uppercase an-stat-label">Total Volume</div>
          <div className="font-mono font-bold text-sm an-text-on-surface mt-1">
            {(totalVolume / 1_000_000).toFixed(3)} m³
          </div>
        </div>
      </div>

      {/* Bulk action buttons */}
      <div className="grid grid-cols-3 gap-2 mt-4">
        <button onClick={() => rotateSelected('fwd')} className="...">
          <RotateCw className="w-3.5 h-3.5" /> Rotate
        </button>
        <button onClick={duplicateSelected} className="...">
          <Copy className="w-3.5 h-3.5" /> Duplicate
        </button>
        <button onClick={removeSelected} className="... an-btn-danger-ghost">
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </button>
      </div>

      {/* Alignment / distribution toolbar */}
      <AlignmentToolbar />

      {/* List of selected items (scrollable) */}
      <div className="mt-4 space-y-1 max-h-48 overflow-y-auto">
        {selected.map((b) => (
          <div key={b.id} className="text-[11px] font-mono an-text-on-surface-muted px-2 py-1 rounded an-manifest-item flex justify-between">
            <span>{b.name}</span>
            <span>{b.weight}kg</span>
          </div>
        ))}
      </div>
    </section>
  )
}
```

### แก้ไข `right-panel.tsx`

```tsx
const selectedCount = useSceneStore((s) => s.selectedIds.size)

// แทนที่ Selection section
{selectedCount === 0 && <EmptySelection />}
{selectedCount === 1 && <SingleSelectionDetails />}  {/* Selection card เดิม */}
{selectedCount > 1 && <MultiSelectPanel />}
```

---

## Phase 5 — Alignment & Distribution (~4 ชม.)

### `lib/selection/alignment.ts`

```ts
import { getEffectiveSize } from '@/store/use-scene-store'
import type { CargoBox } from '@/store/use-scene-store'

export type AlignAxis = 'x' | 'y' | 'z'
export type AlignMode = 'min' | 'center' | 'max'

const halfSizeOnAxis = (b: CargoBox, axis: AlignAxis): number => {
  const e = getEffectiveSize(b)
  return axis === 'x' ? e.w / 2 : axis === 'y' ? e.h / 2 : e.d / 2
}

export function computeAlignment(
  selected: CargoBox[],
  axis: AlignAxis,
  mode: AlignMode
): Map<string, number> {
  // Find the reference value
  const positions = selected.map((b) => b.position[axis])

  let target: number
  if (mode === 'min') {
    target = Math.min(...selected.map((b) => b.position[axis] - halfSizeOnAxis(b, axis)))
  } else if (mode === 'max') {
    target = Math.max(...selected.map((b) => b.position[axis] + halfSizeOnAxis(b, axis)))
  } else {
    // center
    target = positions.reduce((s, p) => s + p, 0) / positions.length
  }

  const updates = new Map<string, number>()
  selected.forEach((b) => {
    const half = halfSizeOnAxis(b, axis)
    let newCoord: number
    if (mode === 'min') newCoord = target + half
    else if (mode === 'max') newCoord = target - half
    else newCoord = target
    updates.set(b.id, newCoord)
  })
  return updates
}

export function computeDistribution(
  selected: CargoBox[],
  axis: AlignAxis
): Map<string, number> {
  if (selected.length < 3) return new Map()  // need at least 3 to distribute

  const sorted = [...selected].sort((a, b) => a.position[axis] - b.position[axis])
  const first = sorted[0].position[axis]
  const last  = sorted[sorted.length - 1].position[axis]
  const step  = (last - first) / (sorted.length - 1)

  const updates = new Map<string, number>()
  sorted.forEach((b, i) => {
    if (i === 0 || i === sorted.length - 1) return  // endpoints don't move
    updates.set(b.id, first + step * i)
  })
  return updates
}
```

### `components/custom/alignment-toolbar.tsx`

```tsx
import { useSceneStore } from '@/store/use-scene-store'
import { computeAlignment, computeDistribution } from '@/lib/selection/alignment'
import {
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
} from 'lucide-react'

export function AlignmentToolbar() {
  const { boxes, selectedIds, alignSelected, distributeSelected } = useSceneStore()
  if (selectedIds.size < 2) return null

  return (
    <div className="mt-4 pt-4 an-section-border-top">
      <div className="text-[10px] font-bold uppercase tracking-widest an-section-label mb-2">
        Align & Distribute
      </div>

      {/* Align X */}
      <div className="grid grid-cols-3 gap-1">
        <ToolBtn icon={<AlignStartHorizontal />} title="Align Left (X min)"
          onClick={() => alignSelected('x', 'min')} />
        <ToolBtn icon={<AlignCenterHorizontal />} title="Center on X"
          onClick={() => alignSelected('x', 'center')} />
        <ToolBtn icon={<AlignEndHorizontal />} title="Align Right (X max)"
          onClick={() => alignSelected('x', 'max')} />
      </div>

      {/* Align Y, Z similarly */}

      {/* Distribute */}
      {selectedIds.size >= 3 && (
        <div className="grid grid-cols-3 gap-1 mt-2">
          <ToolBtn label="Dist X" onClick={() => distributeSelected('x')} />
          <ToolBtn label="Dist Y" onClick={() => distributeSelected('y')} />
          <ToolBtn label="Dist Z" onClick={() => distributeSelected('z')} />
        </div>
      )}
    </div>
  )
}
```

> **สำคัญ**: หลัง align/distribute ต้อง **revalidate** ทุกกล่องว่าไม่ชนกัน — ถ้าชนให้ revert + flash error

---

## Phase 6 — Keyboard Shortcuts & Polish (~2 ชม.)

### Keyboard

ใน `scene-canvas.tsx` `onKey` handler:

```ts
// Ctrl/Cmd + A — select all
if (isMod && e.key === 'a') {
  e.preventDefault()
  selectAll()
  return
}

// Escape — clear selection
if (e.key === 'Escape') {
  clearSelection()
  return
}

// Ctrl/Cmd + D — duplicate selected
if (isMod && e.key === 'd') {
  e.preventDefault()
  duplicateSelected()
  return
}

// Existing arrow/r/delete: apply to all selected, not just first
const selectedBoxes = boxes.filter((b) => selectedIds.has(b.id))
if (selectedBoxes.length === 0) return

if (e.key === 'Delete') {
  removeSelected()
  return
}

// Move with arrows: moveSelected({ x: dir*gridStep, y: 0, z: 0 })
```

### HUD: Selection Count Badge

```tsx
{selectedIds.size > 1 && (
  <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full an-glass an-toolbar-border z-30">
    <span className="text-xs font-bold an-text-primary">
      {selectedIds.size} boxes selected
    </span>
  </div>
)}
```

---

## Edge Cases

| Case | Behavior |
|---|---|
| Group drag ทำให้บางกล่องชนกล่องนอกกลุ่ม | Validation fail → ทั้งกลุ่มไม่ขยับ + flash แดง |
| Group drag ทำให้กล่องในกลุ่มชนกันเอง | ไม่เกิดได้ — เลื่อน delta เท่ากันทุกตัว geometry คงเดิม |
| Align ทำให้กล่องซ้อนกัน | Validate → revert + warning toast |
| Distribute เมื่อ selected = 2 | ไม่ทำอะไร (ต้องการ ≥ 3) — disable button |
| Box-select ใน top view ที่ทุกกล่องซ้อนกัน | OK — เลือกได้หมดเพราะ projection จะมี overlap |
| User ลบกล่อง 1 ใบจากนอกกลุ่ม → selection ไม่กระทบ | เพราะใช้ Set, การลบ box ที่ไม่ได้ selected ไม่กระทบ Set |
| Selection มี id ของกล่องที่ถูกลบไปแล้ว | ทุก action ที่ filter `boxes.filter(b => selectedIds.has(b.id))` จะ skip ไป — ปลอดภัย |

---

## Acceptance Criteria

- [x] Shift+click toggle กล่องเข้า/ออกจาก selection
- [x] Ctrl/Cmd+A เลือกทั้งหมด
- [x] Escape clear selection
- [x] ลากกรอบบนพื้นที่ว่าง → กล่องในกรอบถูกเลือก
- [x] Right panel แสดง multi-select view เมื่อ ≥ 2 ตัว
- [x] Total weight + volume คำนวณถูกต้อง
- [x] Delete (ปุ่มหรือคีย์) ลบทั้งกลุ่ม + 1 step ใน undo history
- [x] Duplicate ทำสำเนาทั้งกลุ่มในตำแหน่งใหม่ที่หา space ให้
- [x] Rotate ทำงานทั้งกลุ่ม (orientation เดียวกันทุกตัว)
- [x] Group drag เลื่อนทุกตัวเท่ากัน, validate รวม, fail → ไม่ขยับ
- [x] Align/distribute ทำงานถูกต้องทั้ง 3 axes
- [x] Step log บันทึก action เป็น "Moved 5 boxes" ไม่ใช่ 5 entries แยกกัน
- [x] Undo/redo คืน selection state ด้วย (optional — ถ้าซับซ้อนเกินก็ skip)

---

## Future Enhancements

- **Group as named asset** — บันทึกกลุ่ม + relative positions เป็น "Pallet preset" ใน catalog
- **Lock selection** — pin selection ไว้ไม่ให้ deselect ตอนคลิก background
- **Smart selection** — "select all boxes of same type/color/category"
- **Selection by filter** — sidebar checkbox: "เลือกเฉพาะกล่องที่หนัก > 50 kg"
- **Marquee + Shift** — Shift+drag ขยาย selection โดยไม่แทนที่ของเดิม
