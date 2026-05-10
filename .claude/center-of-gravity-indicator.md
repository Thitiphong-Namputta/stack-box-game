# Center of Gravity (CoG) Indicator

## ภาพรวม

คำนวณและแสดงจุดศูนย์ถ่วงจริงของกล่องทั้งหมดที่วางในตู้ เปรียบเทียบกับ ideal CoG (กลางตู้) เพื่อช่วยให้ผู้ใช้กระจายน้ำหนักได้อย่างปลอดภัย — เป็น feature ที่ยกระดับ tool จาก hobby project ไปเป็น **logistics-grade software** ตามมาตรฐาน SOLAS VGM และ axle weight distribution

**ผลกระทบ**: เพิ่มมูลค่าให้ผู้ใช้สาย commercial logistics, ป้องกันอุบัติเหตุจากการขนส่ง, compliance-ready
**ระดับความซับซ้อน**: 🟡 ปานกลาง (3–4 วัน)
**ขึ้นกับ feature อื่น**: ใช้ข้อมูล box position + weight ที่มีอยู่แล้ว

---

## ทำไมต้องมีฟีเจอร์นี้

ในอุตสาหกรรมขนส่งจริง การกระจายน้ำหนักที่ผิดพลาดทำให้:
- **ตู้พลิก** ขณะ lift onto ship/truck (CoG สูงเกิน)
- **เพลาเกินน้ำหนัก** ทำให้ผิดกฎหมายและรถพัง (axle weight)
- **ตู้เอียง** ขณะวิ่ง — ของกระแทกกัน เสียหาย
- **ติดค่าปรับ port** ที่บังคับ VGM declaration ตาม SOLAS

ปัจจุบันระบบเช็คแค่ "weight ≤ maxWeight" แต่ไม่เช็คว่าน้ำหนัก **กระจายอยู่ที่ไหน**

---

## เป้าหมายของฟีเจอร์

1. แสดง **CoG marker (3D sphere)** ที่ตำแหน่งจุดศูนย์ถ่วงจริง
2. แสดง **ideal CoG** (จุดกลางตู้) เป็น reference
3. แสดง **deviation vector** เป็นเส้นเชื่อม + ระยะ deviation (cm)
4. **Right panel section** แสดง:
   - CoG coordinates (x, y, z) ในรูป % ของตู้
   - Deviation จาก ideal — แสดงสถานะ OK / Warning / Danger
   - Weight distribution ตามแกนยาว (axle simulation)
5. **Stability score** 0–100 — รวม CoG deviation + height factor
6. แจ้งเตือนเมื่อ:
   - CoG offset เกิน 10% ของขนาดตู้ในแกนใดก็ตาม
   - CoG height เกิน 60% ของความสูงตู้
   - Forward/Aft weight imbalance > 60/40 split

---

## คณิตศาสตร์ที่ใช้

### Center of Mass (CoM)

สำหรับชุดกล่อง $i$ ที่มีน้ำหนัก $m_i$ และตำแหน่ง center $\vec{r}_i$:

$$
\vec{r}_{CoG} = \frac{\sum_i m_i \vec{r}_i}{\sum_i m_i}
$$

(`box.position` ใน store เก็บเป็น center อยู่แล้ว — ตรงนี้สะดวกมาก)

### Ideal CoG

$$
\vec{r}_{ideal} = \left(\frac{W}{2}, \frac{H_{ideal}}{2}, \frac{D}{2}\right)
$$

โดย $H_{ideal}$ ใช้ **weighted center height** ของกล่องที่ใส่ ไม่ใช่กลางตู้ (เพราะกล่องไม่ได้สูงถึงเพดาน)

### Deviation

$$
\vec{\delta} = \vec{r}_{CoG} - \vec{r}_{ideal}
$$

แสดงเป็น cm และเป็น % ของขนาดตู้แต่ละแกน

### Stability Score

```
score = 100
        - (|δx| / W * 100) * 1.5    # x-axis tilt penalty
        - (|δz| / D * 100) * 1.5    # z-axis tilt penalty
        - max(0, (CoG.y / H - 0.5)) * 100 * 2.0   # height penalty (linear above mid-height)
```

Clamp 0–100. แบ่ง:
- **80–100**: Excellent (สีเขียว)
- **60–79**: Good (สีน้ำเงิน)
- **40–59**: Warning (สีเหลือง)
- **0–39**: Danger (สีแดง)

### Axle Weight Distribution

จำลองตู้เป็นคานวางบน 2 จุด — front axle (ด้านหน้าตู้) และ rear axle (ด้านหลัง)

สำหรับแกนยาวของตู้ (ใช้ x หรือ z ตามที่ตั้งไว้ — สมมติแกน x = ความยาวตู้):

$$
W_{front} = W_{total} \cdot \frac{L - x_{CoG}}{L}, \quad W_{rear} = W_{total} \cdot \frac{x_{CoG}}{L}
$$

แสดงเป็น bar chart แนวนอน + เปอร์เซ็นต์ ideal ที่ 50/50

---

## โครงสร้างไฟล์ที่จะเพิ่ม/แก้ไข

```
stack-box-game/
├── lib/
│   └── physics/
│       ├── center-of-gravity.ts   ← ใหม่ — pure math functions
│       └── stability.ts           ← ใหม่ — score + axle calculations
├── components/
│   ├── scene/
│   │   ├── cog-marker.tsx         ← ใหม่ — 3D sphere + deviation line
│   │   └── scene-canvas.tsx       ← แก้ไข — render CoGMarker
│   └── custom/
│       ├── stability-panel.tsx    ← ใหม่ — right panel section
│       └── right-panel.tsx        ← แก้ไข — เพิ่ม StabilityPanel
└── store/
    └── use-scene-store.ts         ← แก้ไข — toggle showCoG
```

---

## Phase 1 — Pure Math Layer (~3 ชม.)

### `lib/physics/center-of-gravity.ts`

```ts
import * as THREE from 'three'
import { getEffectiveSize } from '@/store/use-scene-store'
import type { CargoBox, ContainerSize } from '@/store/use-scene-store'

export interface CoGResult {
  cog: { x: number; y: number; z: number }
  ideal: { x: number; y: number; z: number }
  deviation: {
    x: number; y: number; z: number
    magnitude: number
    pctX: number; pctY: number; pctZ: number  // % of container dimension
  }
  totalWeight: number
}

export function computeCoG(boxes: CargoBox[], container: ContainerSize): CoGResult | null {
  if (boxes.length === 0) return null

  const totalWeight = boxes.reduce((s, b) => s + (b.weight ?? 0), 0)
  if (totalWeight === 0) return null  // can't compute weighted center

  const weighted = boxes.reduce(
    (acc, b) => {
      const w = b.weight ?? 0
      acc.x += b.position.x * w
      acc.y += b.position.y * w
      acc.z += b.position.z * w
      return acc
    },
    { x: 0, y: 0, z: 0 }
  )

  const cog = {
    x: weighted.x / totalWeight,
    y: weighted.y / totalWeight,
    z: weighted.z / totalWeight,
  }

  // Ideal = center on x,z; weighted-mean of box heights on y (not container/2)
  const idealY = boxes.reduce((s, b) => {
    const h = getEffectiveSize(b).h
    return s + (b.position.y) * (b.weight ?? 0)
  }, 0) / totalWeight

  // Actually for ideal we want lowest possible center → bottom-heavy
  // Use load-bottom-y + half average box height as a reasonable target
  const avgBoxHalfH = boxes.reduce((s, b) => s + getEffectiveSize(b).h, 0) / (boxes.length * 2)
  const ideal = {
    x: container.w / 2,
    y: avgBoxHalfH,
    z: container.d / 2,
  }

  const dx = cog.x - ideal.x
  const dy = cog.y - ideal.y
  const dz = cog.z - ideal.z

  return {
    cog,
    ideal,
    deviation: {
      x: dx, y: dy, z: dz,
      magnitude: Math.sqrt(dx * dx + dy * dy + dz * dz),
      pctX: (dx / container.w) * 100,
      pctY: (dy / container.h) * 100,
      pctZ: (dz / container.d) * 100,
    },
    totalWeight,
  }
}
```

### `lib/physics/stability.ts`

```ts
import type { CargoBox, ContainerSize } from '@/store/use-scene-store'
import type { CoGResult } from './center-of-gravity'

export type StabilityLevel = 'excellent' | 'good' | 'warning' | 'danger'

export interface StabilityResult {
  score: number              // 0–100
  level: StabilityLevel
  warnings: string[]
  axleDistribution: {
    front: { weight: number; pct: number }   // assumes x-axis = container length
    rear:  { weight: number; pct: number }
    balanced: boolean        // |frontPct - 50| <= 10
  }
  cogHeightPct: number       // CoG.y / container.h × 100
}

export function computeStability(
  cog: CoGResult,
  boxes: CargoBox[],
  container: ContainerSize
): StabilityResult {
  const heightPct = (cog.cog.y / container.h) * 100
  const heightFactor = Math.max(0, heightPct / 100 - 0.5)

  const xPenalty = Math.abs(cog.deviation.pctX) * 1.5
  const zPenalty = Math.abs(cog.deviation.pctZ) * 1.5
  const heightPenalty = heightFactor * 100 * 2.0

  const score = Math.max(0, Math.min(100, 100 - xPenalty - zPenalty - heightPenalty))

  let level: StabilityLevel = 'excellent'
  if (score < 40) level = 'danger'
  else if (score < 60) level = 'warning'
  else if (score < 80) level = 'good'

  // Warnings
  const warnings: string[] = []
  if (Math.abs(cog.deviation.pctX) > 10)
    warnings.push(`CoG เอียงในแกน X เกิน 10% (${cog.deviation.pctX.toFixed(1)}%)`)
  if (Math.abs(cog.deviation.pctZ) > 10)
    warnings.push(`CoG เอียงในแกน Z เกิน 10% (${cog.deviation.pctZ.toFixed(1)}%)`)
  if (heightPct > 60)
    warnings.push(`CoG สูงเกินครึ่งตู้ (${heightPct.toFixed(0)}%) — เสี่ยงพลิก`)

  // Axle distribution (assuming container length = x axis)
  const front = boxes.reduce((s, b) => {
    const lever = (container.w - b.position.x) / container.w  // 1.0 at front, 0 at rear
    return s + (b.weight ?? 0) * lever
  }, 0)
  const rear = cog.totalWeight - front
  const frontPct = cog.totalWeight > 0 ? (front / cog.totalWeight) * 100 : 50
  const balanced = Math.abs(frontPct - 50) <= 10

  if (!balanced)
    warnings.push(`น้ำหนักไม่สมดุล Front/Rear (${frontPct.toFixed(0)}%/${(100 - frontPct).toFixed(0)}%)`)

  return {
    score,
    level,
    warnings,
    axleDistribution: {
      front: { weight: front, pct: frontPct },
      rear:  { weight: rear,  pct: 100 - frontPct },
      balanced,
    },
    cogHeightPct: heightPct,
  }
}
```

### Unit tests (recommended)

ตรวจสอบเคสง่ายๆ:
- กล่องเดียวกลางตู้ → CoG = ตำแหน่งกล่อง, deviation ≈ 0
- 2 กล่องน้ำหนักเท่ากันที่ตำแหน่งสมมาตร → CoG อยู่กลาง
- กล่องเดียวที่มุม → deviation สูงสุด

---

## Phase 2 — 3D Visualization (~3 ชม.)

### `components/scene/cog-marker.tsx`

```tsx
'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/store/use-scene-store'
import { computeCoG } from '@/lib/physics/center-of-gravity'
import { computeStability } from '@/lib/physics/stability'

const LEVEL_COLOR: Record<string, string> = {
  excellent: '#22c55e',
  good:      '#3b82f6',
  warning:   '#eab308',
  danger:    '#ef4444',
}

export function CoGMarker() {
  const { boxes, containerSize, showCoG } = useSceneStore()

  const data = useMemo(() => {
    if (!showCoG || boxes.length === 0) return null
    const cog = computeCoG(boxes, containerSize)
    if (!cog) return null
    const stab = computeStability(cog, boxes, containerSize)
    return { cog, stab }
  }, [boxes, containerSize, showCoG])

  if (!data) return null

  const { cog, stab } = data
  const color = LEVEL_COLOR[stab.level]

  // Line geometry from ideal → actual
  const lineGeom = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(cog.ideal.x, cog.ideal.y, cog.ideal.z),
      new THREE.Vector3(cog.cog.x, cog.cog.y, cog.cog.z),
    ])
    return g
  }, [cog])

  return (
    <group>
      {/* Actual CoG — solid colored sphere */}
      <mesh position={[cog.cog.x, cog.cog.y, cog.cog.z]}>
        <sphereGeometry args={[8, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
        />
      </mesh>

      {/* Ideal CoG — wireframe sphere */}
      <mesh position={[cog.ideal.x, cog.ideal.y, cog.ideal.z]}>
        <sphereGeometry args={[6, 16, 16]} />
        <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.5} />
      </mesh>

      {/* Deviation line */}
      <line>
        <bufferGeometry attach="geometry" {...lineGeom} />
        <lineDashedMaterial
          attach="material"
          color={color}
          dashSize={5}
          gapSize={3}
          linewidth={2}
        />
      </line>

      {/* Vertical drop line from CoG to floor (helps spot height) */}
      <line>
        <bufferGeometry
          attach="geometry"
          {...new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(cog.cog.x, 0, cog.cog.z),
            new THREE.Vector3(cog.cog.x, cog.cog.y, cog.cog.z),
          ])}
        />
        <lineBasicMaterial attach="material" color={color} transparent opacity={0.3} />
      </line>
    </group>
  )
}
```

> **เกร็ด**: ใช้ `lineDashedMaterial` ต้องเรียก `line.computeLineDistances()` หลัง mount — ใช้ `<Line>` จาก drei ง่ายกว่า

### แก้ไข `scene-canvas.tsx`

```tsx
import { CoGMarker } from './cog-marker'

// ภายใน <Canvas>
<CoGMarker />
```

### Toggle ใน store

```ts
// use-scene-store.ts
showCoG: boolean
toggleCoG: () => void

// in create():
showCoG: true,  // default ON
toggleCoG: () => set((s) => ({ showCoG: !s.showCoG })),
```

---

## Phase 3 — Right Panel UI (~3 ชม.)

### `components/custom/stability-panel.tsx`

```tsx
'use client'

import { useMemo } from 'react'
import { TrendingUp, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { useSceneStore } from '@/store/use-scene-store'
import { computeCoG } from '@/lib/physics/center-of-gravity'
import { computeStability } from '@/lib/physics/stability'

const LEVEL_LABEL = {
  excellent: 'EXCELLENT',
  good:      'GOOD',
  warning:   'WARNING',
  danger:    'DANGER',
}

const LEVEL_COLOR_VAR = {
  excellent: 'var(--color-an-tertiary)',
  good:      'var(--color-an-primary)',
  warning:   '#eab308',
  danger:    'var(--color-an-error)',
}

export function StabilityPanel() {
  const { boxes, containerSize, showCoG, toggleCoG } = useSceneStore()

  const result = useMemo(() => {
    const cog = computeCoG(boxes, containerSize)
    if (!cog) return null
    return { cog, stab: computeStability(cog, boxes, containerSize) }
  }, [boxes, containerSize])

  if (!result) {
    return (
      <section className="p-6 an-section-border-bottom">
        <SectionLabel>Stability Analysis</SectionLabel>
        <p className="text-xs an-text-on-surface-muted mt-3">
          เพิ่มกล่องเพื่อดูการวิเคราะห์ศูนย์ถ่วง
        </p>
      </section>
    )
  }

  const { cog, stab } = result
  const color = LEVEL_COLOR_VAR[stab.level]

  return (
    <section className="p-6 an-section-border-bottom">
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Stability Analysis</SectionLabel>
        <button
          type="button"
          onClick={toggleCoG}
          className="p-1 rounded hover:opacity-70"
          title={showCoG ? 'Hide CoG marker' : 'Show CoG marker'}
        >
          {showCoG
            ? <Eye className="w-3.5 h-3.5 an-text-primary" />
            : <EyeOff className="w-3.5 h-3.5 an-text-on-surface-muted" />}
        </button>
      </div>

      {/* Score Gauge */}
      <div className="text-center mb-4">
        <div className="text-3xl font-bold font-mono" style={{ color }}>
          {stab.score.toFixed(0)}
        </div>
        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color }}>
          {LEVEL_LABEL[stab.level]}
        </div>
        <div className="text-[10px] an-text-on-surface-muted mt-1">Stability Score</div>
      </div>

      {/* CoG Coordinates */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['x', 'y', 'z'] as const).map((axis) => {
          const dev = cog.deviation[`pct${axis.toUpperCase()}` as 'pctX'|'pctY'|'pctZ']
          return (
            <div key={axis} className="p-2 rounded-lg an-stat-card text-center">
              <div className="text-[9px] uppercase an-stat-label">CoG {axis}</div>
              <div className="text-xs font-mono font-bold an-text-on-surface mt-0.5">
                {cog.cog[axis].toFixed(0)}
              </div>
              <div className={`text-[9px] font-mono ${Math.abs(dev) > 10 ? 'an-text-error' : 'an-text-on-surface-muted'}`}>
                {dev > 0 ? '+' : ''}{dev.toFixed(1)}%
              </div>
            </div>
          )
        })}
      </div>

      {/* Axle Distribution Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] an-text-on-surface-muted mb-1">
          <span>Front {stab.axleDistribution.front.pct.toFixed(0)}%</span>
          <span>Rear {stab.axleDistribution.rear.pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 flex rounded-full overflow-hidden an-util-bar-bg">
          <div
            className="h-full"
            style={{
              width: `${stab.axleDistribution.front.pct}%`,
              background: stab.axleDistribution.balanced
                ? 'var(--color-an-primary)'
                : 'var(--color-an-error)',
            }}
          />
          <div
            className="h-full"
            style={{
              width: `${stab.axleDistribution.rear.pct}%`,
              background: stab.axleDistribution.balanced
                ? 'var(--color-an-tertiary)'
                : '#eab308',
            }}
          />
        </div>
        <div className="text-[10px] an-text-on-surface-muted mt-1 text-center">
          Front: {stab.axleDistribution.front.weight.toFixed(0)} kg ·
          Rear: {stab.axleDistribution.rear.weight.toFixed(0)} kg
        </div>
      </div>

      {/* Warnings */}
      {stab.warnings.length > 0 && (
        <div className="mt-4 p-3 rounded-lg an-unfit-section">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 an-text-error" />
            <span className="text-[10px] font-bold an-text-error uppercase">
              Stability Warnings
            </span>
          </div>
          <ul className="space-y-1">
            {stab.warnings.map((w, i) => (
              <li key={i} className="text-[11px] an-text-on-surface">
                • {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-widest an-section-label">
      {children}
    </div>
  )
}
```

### แก้ไข `right-panel.tsx`

ใส่ `<StabilityPanel />` ระหว่าง Utilization Metrics และ Constraint Analysis

---

## Phase 4 — Export Integration (~1 ชม.)

เพิ่มข้อมูล CoG ใน PDF report และ XLSX export:

### PDF: `components/pdf/report-document.tsx`

เพิ่ม section ใหม่:
```tsx
{stab && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>การวิเคราะห์ความสมดุล (Stability)</Text>
    <View style={styles.summaryGrid}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Stability Score</Text>
        <Text style={styles.summaryValue}>{stab.score.toFixed(0)} / 100</Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>CoG Position (cm)</Text>
        <Text style={styles.summaryValue}>
          ({cog.cog.x.toFixed(0)}, {cog.cog.y.toFixed(0)}, {cog.cog.z.toFixed(0)})
        </Text>
      </View>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Front/Rear Distribution</Text>
        <Text style={styles.summaryValue}>
          {stab.axleDistribution.front.pct.toFixed(0)}% / {stab.axleDistribution.rear.pct.toFixed(0)}%
        </Text>
      </View>
    </View>
    {stab.warnings.length > 0 && (
      <View style={{ marginTop: 8, padding: 8, backgroundColor: '#fef2f2', borderRadius: 4 }}>
        {stab.warnings.map((w, i) => (
          <Text key={i} style={{ fontSize: 9, color: '#991b1b' }}>⚠ {w}</Text>
        ))}
      </View>
    )}
  </View>
)}
```

### XLSX: `app/api/export/xlsx/route.ts`

เพิ่ม sheet ใหม่ "Stability" ที่มี CoG coords + score + warnings

---

## Phase 5 — Polish (~1 ชม.)

- [ ] Animate CoG sphere ตอน boxes เปลี่ยน — lerp position smoothly แทนที่จะ teleport
- [ ] เพิ่ม HTML label เหนือ sphere แสดง score "84"
- [ ] กด keyboard shortcut `G` toggle CoG visibility
- [ ] Hide CoG ใน top/side view ถ้ารบกวนการมอง
- [ ] เพิ่ม tooltip อธิบายว่าตัวเลขแต่ละค่าหมายถึงอะไร

---

## Acceptance Criteria

- [x] เมื่อมีกล่อง 1+ ใบ → CoG sphere ปรากฏใน scene
- [x] Sphere เปลี่ยนสีตาม stability level (เขียว/น้ำเงิน/เหลือง/แดง)
- [x] เส้นประจาก ideal → actual CoG แสดง deviation
- [x] Right panel แสดง score, CoG coords, axle distribution
- [x] Warnings แสดงเมื่อ deviation > 10% หรือ height > 60%
- [x] Toggle visibility ได้จากปุ่มใน panel + shortcut `G`
- [x] CoG อัพเดท real-time เมื่อ move/add/remove/rotate กล่อง
- [x] PDF report รวมส่วน Stability Analysis
- [x] ค่าทั้งหมดเป็น 0/null เมื่อไม่มีกล่อง (ไม่ crash)

---

## Edge Cases

| Case | Behavior |
|---|---|
| กล่องทั้งหมดน้ำหนัก = 0 | แสดงข้อความ "ไม่สามารถคำนวณได้ — กรุณาตั้งน้ำหนัก" |
| มีกล่องเดียว | CoG = ตำแหน่งกล่อง, deviation อาจสูงเป็นปกติ |
| Container ขนาดเปลี่ยน | recompute ทันที, marker เคลื่อนตาม |
| Auto-pack ทำให้ CoG ดีขึ้น | step log "Auto-pack improved stability +12 points" (optional) |

---

## Future Enhancements

- **CoG history graph** — กราฟ line ของ score ตามเวลา (ดูว่าการแก้ไขแต่ละครั้งทำให้ดีขึ้นไหม)
- **Suggest moves** — algorithm แนะนำว่าควรย้ายกล่องไหนไปไหนเพื่อปรับ CoG
- **Multi-axle truck simulation** — รถ 6 ล้อมี 2-3 axle ต้อง distribute น้ำหนักต่อ axle group
- **VGM Certificate Export** — generate VGM declaration PDF ตาม SOLAS format
- **Tilt animation** — animate ตู้เอียงในมุมที่จะเอียงจริงตาม CoG (educational)
