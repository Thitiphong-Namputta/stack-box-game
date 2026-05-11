# Loading Sequence Animation

## ภาพรวม

Playback ลำดับการโหลดสินค้าทีละกล่อง — ผู้ใช้เห็นว่ากล่องไหนถูกวางก่อน-หลัง, สามารถ pause/forward/rewind ได้, ใช้สำหรับ briefing คนงานหน้างาน หรือ preview แผนก่อนลงมือจริง

**ผลกระทบ**: ทำให้ plan มี "story" — ไม่ใช่แค่ผลลัพธ์ static, ใช้เป็น communication tool ได้
**ระดับความซับซ้อน**: 🟡 ปานกลาง (3–5 วัน)
**ขึ้นกับ feature อื่น**: ใช้ได้ดีคู่กับ Stacking Constraints (priority field) และ LIFO Multi-stop Sequencing

---

## เป้าหมายของฟีเจอร์

1. **Computed loading order** — เรียงลำดับกล่องอัตโนมัติตามกฎ physics + business logic (LIFO, weight, fragility)
2. **Manual reordering** — drag-and-drop ใน sidebar เพื่อปรับลำดับเอง
3. **Animation playback** — กล่องค่อยๆ โผล่ขึ้นมาตามลำดับ พร้อม smooth lerp position
4. **Playback controls** — Play / Pause / Step forward / Step backward / Reset / Speed (0.5x / 1x / 2x / 4x)
5. **Active step highlighting** — กล่องที่กำลัง "ถูกโหลด" สว่างขึ้น + ห้อง numbered badge
6. **Timeline scrubber** — slider ที่ลากไปยังจุดใดในลำดับก็ได้
7. **Export sequence** — เป็น GIF/video หรือ slide-by-slide PDF

---

## Loading Order Logic

### Default ordering (auto-computed)

ลำดับการโหลด = inverse ของลำดับการ unload

ตัวอย่าง: ส่งของ A → B → C ตามลำดับ จะโหลด **C ลงตู้ก่อน, B กลาง, A ใกล้ประตู**

### Sorting rules (priority order)

1. **By stop sequence** — กล่องที่ส่งทีหลัง (priority สูง) ลงก่อน
2. **By Y position** — กล่องที่อยู่ด้านล่างลงก่อนกล่องที่อยู่ด้านบน (physics)
3. **By weight** — หนักลงก่อนเบา (ลด CoG)
4. **By fragility** — fragile วางทีหลังบนสุด

```ts
function computeLoadingOrder(boxes: CargoBox[]): CargoBox[] {
  return [...boxes].sort((a, b) => {
    // 1. Higher priority unloaded last → loaded first
    const pa = a.priority ?? 3
    const pb = b.priority ?? 3
    if (pa !== pb) return pb - pa  // descending priority

    // 2. Lower Y first (must be supported before stacking)
    if (Math.abs(a.position.y - b.position.y) > 1) {
      return a.position.y - b.position.y
    }

    // 3. Heavier first
    if (a.weight !== b.weight) return b.weight - a.weight

    // 4. Non-fragile before fragile
    if ((a.fragile ?? false) !== (b.fragile ?? false)) {
      return a.fragile ? 1 : -1
    }

    // Stable sort by ID
    return a.id.localeCompare(b.id)
  })
}
```

### Critical: physics validation

ลำดับที่ generate ต้องผ่านกฎ "supported placement" — กล่องที่อยู่ด้านบนต้องโผล่หลังกล่องที่รองด้านล่างทุกใบเสมอ

```ts
function validateOrder(orderedBoxes: CargoBox[], allBoxes: CargoBox[]): boolean {
  for (let i = 0; i < orderedBoxes.length; i++) {
    const current = orderedBoxes[i]
    const placedSoFar = orderedBoxes.slice(0, i)

    // กล่องที่จะรองรับ current คือ box ที่ top touches current's bottom
    const supporters = findSupporters(current, allBoxes)
    for (const supporter of supporters) {
      if (!placedSoFar.includes(supporter)) {
        return false  // ยังไม่ถูกโหลด — invalid
      }
    }
  }
  return true
}
```

ถ้า default sort ออกมาแล้ว invalid → ใช้ topological sort แทน (graph: edge = "must be loaded before")

---

## โครงสร้างไฟล์ที่จะเพิ่ม/แก้ไข

```
stack-box-game/
├── lib/
│   └── loading-sequence/
│       ├── compute-order.ts        ← ใหม่ — sort + topo-validate
│       └── animation-state.ts      ← ใหม่ — state machine for playback
├── components/
│   ├── scene/
│   │   ├── cargo-box.tsx           ← แก้ไข — render based on currentStep
│   │   └── step-number-badge.tsx   ← ใหม่ — 3D HTML number "1", "2", ...
│   └── custom/
│       ├── playback-bar.tsx        ← ใหม่ — controls + timeline (bottom-floating)
│       └── sequence-list.tsx       ← ใหม่ — drag-reorderable list (sidebar tab)
├── store/
│   └── use-scene-store.ts          ← แก้ไข — playbackState slice
└── app/planner/page.tsx            ← แก้ไข — render PlaybackBar + Sequence tab
```

---

## Phase 1 — Sequence Computation (~3 ชม.)

### `lib/loading-sequence/compute-order.ts`

```ts
import * as THREE from 'three'
import { getEffectiveSize } from '@/store/use-scene-store'
import { footprintOverlaps } from '@/lib/packing/packing-utils'
import type { CargoBox } from '@/store/use-scene-store'

const EPS = 0.5

/** Returns boxes whose top supports `box.bottom` */
export function findSupporters(box: CargoBox, allBoxes: CargoBox[]): CargoBox[] {
  const s = getEffectiveSize(box)
  const bottomY = box.position.y - s.h / 2
  if (bottomY < EPS) return []  // on floor

  return allBoxes.filter((other) => {
    if (other.id === box.id) return false
    const os = getEffectiveSize(other)
    const otherTop = other.position.y + os.h / 2
    if (Math.abs(otherTop - bottomY) > EPS) return false
    return footprintOverlaps(
      box.position.x, s.w, box.position.z, s.d,
      other.position.x, os.w, other.position.z, os.d
    )
  })
}

/** Topological sort so that supporters always come before supported boxes */
export function topoSortByDependency(boxes: CargoBox[]): CargoBox[] {
  const idMap = new Map(boxes.map((b) => [b.id, b]))
  const supporters = new Map(
    boxes.map((b) => [b.id, findSupporters(b, boxes).map((s) => s.id)])
  )

  const visited = new Set<string>()
  const visiting = new Set<string>()
  const result: CargoBox[] = []

  const visit = (id: string) => {
    if (visited.has(id)) return
    if (visiting.has(id)) {
      // Circular dependency — shouldn't happen in real placements
      console.warn('Circular support dependency on', id)
      return
    }
    visiting.add(id)
    for (const depId of supporters.get(id) ?? []) {
      visit(depId)
    }
    visiting.delete(id)
    visited.add(id)
    const box = idMap.get(id)
    if (box) result.push(box)
  }

  for (const box of boxes) {
    visit(box.id)
  }
  return result
}

/** Apply business sorting to a topologically valid order */
export function computeLoadingOrder(boxes: CargoBox[]): CargoBox[] {
  // Step 1: business priority sort
  const businessSorted = [...boxes].sort((a, b) => {
    const pa = a.priority ?? 3
    const pb = b.priority ?? 3
    if (pa !== pb) return pb - pa
    if (Math.abs(a.position.y - b.position.y) > 1) return a.position.y - b.position.y
    if (a.weight !== b.weight) return b.weight - a.weight
    if ((a.fragile ?? false) !== (b.fragile ?? false)) return a.fragile ? 1 : -1
    return a.id.localeCompare(b.id)
  })

  // Step 2: enforce physics dependencies via stable topo sort
  // Run topo sort but break ties using businessSorted's order
  const businessRank = new Map(businessSorted.map((b, i) => [b.id, i]))

  // Custom topo: pick from "ready" set the one with lowest businessRank
  const idMap = new Map(boxes.map((b) => [b.id, b]))
  const supporters = new Map(
    boxes.map((b) => [b.id, new Set(findSupporters(b, boxes).map((s) => s.id))])
  )
  const placed = new Set<string>()
  const result: CargoBox[] = []

  while (result.length < boxes.length) {
    const ready = boxes.filter((b) =>
      !placed.has(b.id) &&
      Array.from(supporters.get(b.id) ?? []).every((s) => placed.has(s))
    )
    if (ready.length === 0) {
      console.error('Cannot resolve loading order — broken support graph')
      break
    }
    ready.sort((a, b) => (businessRank.get(a.id) ?? 0) - (businessRank.get(b.id) ?? 0))
    const next = ready[0]
    placed.add(next.id)
    result.push(next)
  }
  return result
}
```

---

## Phase 2 — Playback State (~2 ชม.)

### `store/use-scene-store.ts` — เพิ่ม playback slice

```ts
export type PlaybackState = 'idle' | 'playing' | 'paused'

export interface SceneStore {
  // ... existing

  // Loading sequence
  loadingOrder: string[]           // box IDs in load order
  currentStep: number              // 0 = nothing loaded yet, n = first n loaded
  playbackState: PlaybackState
  playbackSpeed: 0.5 | 1 | 2 | 4

  computeLoadingOrder: () => void          // recompute based on current boxes
  setLoadingOrder: (ids: string[]) => void  // manual reorder
  play: () => void
  pause: () => void
  reset: () => void
  stepForward: () => void
  stepBackward: () => void
  setStep: (step: number) => void
  setPlaybackSpeed: (s: 0.5 | 1 | 2 | 4) => void
}

// In create:
loadingOrder: [],
currentStep: 0,
playbackState: 'idle',
playbackSpeed: 1,

computeLoadingOrder: () => {
  const order = computeLoadingOrderUtil(get().boxes)
  set({ loadingOrder: order.map((b) => b.id), currentStep: 0 })
},

setLoadingOrder: (ids) => set({ loadingOrder: ids, currentStep: 0 }),

play: () => set({ playbackState: 'playing' }),
pause: () => set({ playbackState: 'paused' }),
reset: () => set({ currentStep: 0, playbackState: 'idle' }),

stepForward: () => set((s) => ({
  currentStep: Math.min(s.currentStep + 1, s.loadingOrder.length),
})),
stepBackward: () => set((s) => ({
  currentStep: Math.max(s.currentStep - 1, 0),
})),
setStep: (step) => set({ currentStep: step }),
setPlaybackSpeed: (s) => set({ playbackSpeed: s }),
```

### Auto-recompute on box changes

```ts
// In addBox / removeBox / moveBox / autoPack reducers, after updating boxes:
const order = computeLoadingOrderUtil(newBoxes)
return { ..., loadingOrder: order.map((b) => b.id), currentStep: order.length }
// (default to "fully loaded" view)
```

---

## Phase 3 — Animated Box Rendering (~3 ชม.)

### แก้ไข `cargo-box.tsx` — visibility + slide-in animation

```tsx
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

export function CargoBox({ box, ... }: Props) {
  const { loadingOrder, currentStep, playbackState } = useSceneStore()

  const stepIndex = loadingOrder.indexOf(box.id)
  const isLoaded = stepIndex !== -1 && stepIndex < currentStep
  const isCurrent = stepIndex === currentStep - 1   // just loaded in this step
  const isNext = stepIndex === currentStep           // about to load

  const meshRef = useRef<THREE.Mesh>(null)
  const animatedY = useRef(box.position.y)
  const targetY = box.position.y

  useFrame((_, delta) => {
    if (!meshRef.current) return
    if (isCurrent && playbackState !== 'idle') {
      // Lerp from above into final position
      const startY = box.position.y + 200  // start 2m above final
      animatedY.current = THREE.MathUtils.lerp(animatedY.current, targetY, delta * 4)
      meshRef.current.position.y = animatedY.current
    } else if (isLoaded) {
      meshRef.current.position.y = targetY
      animatedY.current = targetY
    }
  })

  // Hide future boxes during playback
  if (playbackState !== 'idle' && !isLoaded && !isCurrent) return null

  return (
    <mesh ref={meshRef} ... >
      ...
      {isCurrent && (
        <Html position={[0, e.h / 2 + 12, 0]} center distanceFactor={300}>
          <div className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg animate-pulse">
            {stepIndex + 1}
          </div>
        </Html>
      )}
    </mesh>
  )
}
```

### Ticker for auto-play

ใน `scene-canvas.tsx`:

```tsx
const { playbackState, playbackSpeed, currentStep, loadingOrder, stepForward, pause } = useSceneStore()

useEffect(() => {
  if (playbackState !== 'playing') return

  const interval = 1000 / playbackSpeed  // 1s per step at 1x

  const id = setInterval(() => {
    const state = useSceneStore.getState()
    if (state.currentStep >= state.loadingOrder.length) {
      pause()
      return
    }
    stepForward()
  }, interval)

  return () => clearInterval(id)
}, [playbackState, playbackSpeed])
```

---

## Phase 4 — Playback Bar UI (~3 ชม.)

### `components/custom/playback-bar.tsx`

```tsx
'use client'

import { Play, Pause, SkipBack, SkipForward, RotateCcw, Gauge } from 'lucide-react'
import { useSceneStore } from '@/store/use-scene-store'

const SPEEDS = [0.5, 1, 2, 4] as const

export function PlaybackBar() {
  const {
    boxes, loadingOrder, currentStep, playbackState, playbackSpeed,
    play, pause, reset, stepForward, stepBackward, setStep, setPlaybackSpeed,
  } = useSceneStore()

  if (boxes.length === 0) return null
  const total = loadingOrder.length

  return (
    <div className="an-glass an-toolbar-border absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-3 p-3 rounded-2xl z-20 min-w-[480px]">

      {/* Reset */}
      <button
        type="button"
        onClick={reset}
        className="p-2 rounded-lg an-text-on-surface-muted hover:an-text-primary transition-colors"
        title="Reset"
      >
        <RotateCcw className="w-4 h-4" />
      </button>

      {/* Step backward */}
      <button
        type="button"
        onClick={stepBackward}
        disabled={currentStep === 0}
        className="p-2 rounded-lg disabled:opacity-30 hover:an-text-primary"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* Play / Pause */}
      <button
        type="button"
        onClick={() => playbackState === 'playing' ? pause() : play()}
        disabled={currentStep >= total}
        className="p-2 rounded-lg an-bg-surface-container-high disabled:opacity-30 hover:opacity-80"
      >
        {playbackState === 'playing'
          ? <Pause className="w-5 h-5 an-text-primary" />
          : <Play className="w-5 h-5 an-text-primary" />}
      </button>

      {/* Step forward */}
      <button
        type="button"
        onClick={stepForward}
        disabled={currentStep >= total}
        className="p-2 rounded-lg disabled:opacity-30 hover:an-text-primary"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      {/* Timeline scrubber */}
      <div className="flex items-center gap-2 flex-1">
        <span className="text-xs font-mono an-text-on-surface-muted">
          {currentStep}/{total}
        </span>
        <input
          type="range"
          min={0}
          max={total}
          value={currentStep}
          onChange={(e) => setStep(Number(e.target.value))}
          className="flex-1 an-range-input"
        />
      </div>

      {/* Speed selector */}
      <div className="flex items-center gap-1">
        <Gauge className="w-3.5 h-3.5 an-text-on-surface-muted" />
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setPlaybackSpeed(s)}
            className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
              playbackSpeed === s ? 'an-bg-surface-container-high an-text-primary' : 'an-text-on-surface-muted'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  )
}
```

### Add to `app/planner/page.tsx`

```tsx
import { PlaybackBar } from '@/components/custom/playback-bar'

// Inside the canvas section:
<PlaybackBar />
```

---

## Phase 5 — Sequence List (Sidebar Tab) (~3 ชม.)

เพิ่ม tab ใหม่ "Sequence" ใน LeftSidebar (นอกจาก Items / Container / Steps)

### `components/custom/sequence-list.tsx`

```tsx
'use client'

import { useState } from 'react'
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react'
import { useSceneStore } from '@/store/use-scene-store'

export function SequenceList() {
  const { boxes, loadingOrder, setLoadingOrder, currentStep, setStep } = useSceneStore()
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)

  const items = loadingOrder.map((id) => boxes.find((b) => b.id === id)!).filter(Boolean)

  const handleDrop = (targetIdx: number) => {
    if (draggingIdx === null || draggingIdx === targetIdx) return
    const next = [...loadingOrder]
    const [moved] = next.splice(draggingIdx, 1)
    next.splice(targetIdx, 0, moved)
    setLoadingOrder(next)
    setDraggingIdx(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1 an-section-label">
        Loading Sequence ({items.length})
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {items.map((box, i) => {
          const isLoaded = i < currentStep
          const isCurrent = i === currentStep - 1
          return (
            <div
              key={box.id}
              draggable
              onDragStart={() => setDraggingIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              onClick={() => setStep(i + 1)}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer ${
                isCurrent ? 'an-manifest-item-active' : isLoaded ? 'an-manifest-item' : 'an-manifest-item opacity-50'
              }`}
            >
              <GripVertical className="w-3 h-3 an-text-on-surface-muted shrink-0" />
              <span className="text-[10px] font-mono an-text-primary w-6 text-right shrink-0">
                #{i + 1}
              </span>
              <div
                className="w-3 h-3 rounded shrink-0"
                style={{ backgroundColor: box.color }}
              />
              <span className="flex-1 text-xs an-text-on-surface truncate">
                {box.name}
              </span>
              <span className="text-[10px] an-text-on-surface-muted">
                {box.weight}kg
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

---

## Phase 6 — Polish (~2 ชม.)

- [ ] Camera follow current box (optional toggle) — pan camera ไปยังกล่องที่กำลังโหลด
- [ ] Sound effect ตอน step forward (optional, mute by default)
- [ ] Step counter overlay บน canvas (top-center): "Step 5 / 12"
- [ ] Highlight line show "trajectory" — เส้นจากนอกตู้เข้าไปยังจุดวาง
- [ ] เก็บ playback state ใน URL hash เพื่อ share link ที่ step ใดๆ ได้
- [ ] Keyboard shortcuts: Space = play/pause, ← → = step, Home = reset

---

## Phase 7 — Export Sequence (Future-ish, ~6 ชม.)

### Option A: GIF Export
ใช้ library `gif.js` — capture canvas frame ทุก step → encode → download

### Option B: PDF slide-by-slide
Render แต่ละ step เป็นรูปจาก canvas → embed ใน PDF report เพิ่มเติม section "Loading Steps"

### Option C: Video Export
ใช้ `MediaRecorder` API capture canvas stream — produce MP4

> **คำแนะนำ**: ทำ Option B ก่อน — ตรงกับ use case logistics report ที่สุด

---

## Acceptance Criteria

- [x] Loading order ถูกคำนวณอัตโนมัติเมื่อ box เปลี่ยน
- [x] Order respect physics (supporter ก่อน, supported ทีหลัง)
- [x] Order respect business rules (priority สูงโหลดก่อน, หนักก่อน fragile)
- [x] Playback bar แสดงเฉพาะเมื่อมี boxes
- [x] Play → กล่องโผล่ทีละชิ้นด้วย smooth animation จากด้านบน
- [x] Pause/Resume/Reset ทำงานถูกต้อง
- [x] Speed control (0.5/1/2/4x) เปลี่ยนความเร็วทันที
- [x] Timeline scrubber drag ได้, jump ไป step ใดก็ได้
- [x] Active step มี badge หมายเลขลอยเหนือกล่อง
- [x] Sequence tab แสดงรายการ + reorder ด้วย drag
- [x] Click item ใน sequence list → jump ไป step นั้น
- [x] Keyboard: Space play/pause, arrows step

---

## Edge Cases

| Case | Behavior |
|---|---|
| User edit box ระหว่าง playback | Pause → recompute order → reset to step 0 |
| Auto-pack ระหว่าง playback | Pause → recompute order → set step = total (show all) |
| Manual reorder ที่ละเมิด physics | Show warning dialog "ลำดับนี้กล่อง X จะลอยกลางอากาศ — ดำเนินการต่อ?" |
| Box ถูกลบ ขณะอยู่ใน loadingOrder | Filter ออกจาก order, decrement step ถ้าจำเป็น |
| ตู้ว่างเปล่า | Hide playback bar |
| Order ที่ topo sort แก้ไม่ได้ | console.error + แสดงข้อความใน UI ให้ check supporters |

---

## Future Enhancements

- **Worker animation** — แสดง avatar คนงานเดินเข้าไปวางกล่อง (พิเศษมาก แต่ educational)
- **Multi-stop visualization** — สีกล่องตาม stop, animated unloading sequence ตอน arrived
- **Loading dock view** — กล้องอยู่นอกตู้มองเข้าไป แสดงกล่อง queue รออยู่ข้างนอก
- **Time estimate** — "Estimated loading time: 2h 15m" จาก number of boxes × per-box time
- **Dependency graph view** — แสดง DAG ของ "what depends on what"
- **AR view** (mobile) — pin animation ลงพื้นจริงในโกดังด้วย AR
