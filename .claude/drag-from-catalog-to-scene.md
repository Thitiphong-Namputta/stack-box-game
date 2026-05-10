# Drag from Catalog to 3D Scene

## ภาพรวม

ปลดล็อกการลากกล่องจาก catalog sidebar เข้าไปวางใน 3D scene ได้โดยตรง เห็น ghost preview ตามเมาส์ตั้งแต่เริ่มลาก แทนที่ flow ปัจจุบันที่คลิก add → ระบบ auto-place ให้

**ผลกระทบ**: UX สำคัญที่ขาดหายไป — ทำให้ผู้ใช้รู้สึก "ควบคุม" การวางได้จริง
**ระดับความซับซ้อน**: 🟡 ปานกลาง (3–5 วัน)
**ขึ้นกับ feature อื่น**: ใช้โค้ด validation/snap-to-grid ที่มีอยู่แล้วใน `cargo-box.tsx`

---

## ปัญหาปัจจุบัน

ใน `item-catalog.tsx` ตอนนี้ flow คือ:
1. คลิก catalog item
2. เรียก `getSuggestedPosition()` → หา position ว่างให้
3. `addBox()` พร้อม position นั้น

ผู้ใช้ไม่ได้เลือกตำแหน่งเอง ผลคือ:
- ใส่กล่องเรียงเป็นแถวซ้ำๆ ตามที่ algorithm หาให้
- ถ้าจะย้ายต้องลากใหม่อีกที (2 steps)
- ไม่เห็น preview ว่ากล่องจะใหญ่/พอดีกับช่องว่างแค่ไหน

---

## เป้าหมายของฟีเจอร์

1. **Drag from sidebar → drop in scene** เป็น operation เดียว
2. Ghost preview ปรากฏตั้งแต่เริ่มลากออกจาก sidebar
3. Snap-to-grid และ collision validation ทำงานเหมือนการลากกล่องที่อยู่ใน scene
4. รองรับทั้ง mouse และ touch
5. Fallback: คลิก item เดียว → behavior เดิม (auto-place) — ไม่ break workflow เดิม

---

## เทคนิคที่ใช้

ปัญหาใหญ่: **การลากระหว่าง DOM (sidebar) ↔ Canvas (3D)** ต่างระบบกัน

แนวทาง: ใช้ **HTML5 Drag and Drop API** (drag จาก DOM) + **Raycasting จาก mouse coords ใน Canvas** (drop position)

### ทำไมไม่ใช้ React DnD / dnd-kit
- React DnD optimized สำหรับ DOM-to-DOM ไม่ทำงานกับ Three.js Canvas
- จัดการเองด้วย native API ตรงไปตรงมาและไม่เพิ่ม dependency

---

## โครงสร้างไฟล์ที่จะเพิ่ม/แก้ไข

```
stack-box-game/
├── store/
│   └── use-scene-store.ts         ← แก้ไข — เพิ่ม dragPreview state
├── components/
│   ├── scene/
│   │   ├── scene-canvas.tsx       ← แก้ไข — handle dragover/drop events
│   │   └── catalog-drop-preview.tsx  ← ใหม่ — ghost mesh ขณะลาก
│   └── custom/
│       └── item-catalog.tsx       ← แก้ไข — make items draggable
└── lib/packing/
    └── catalog-drag.ts            ← ใหม่ — utility สำหรับ drag payload
```

---

## Phase 1 — State Setup (~2 ชม.)

### `store/use-scene-store.ts` — เพิ่ม drag preview state

```ts
export interface DragPreview {
  catalogItemId: string
  size: BoxSize
  weight: number
  name: string
  color: string
  category?: string
  // Live position (updated as mouse moves over canvas)
  position: { x: number; y: number; z: number } | null
  isValid: boolean
}

export interface SceneStore {
  // ... existing
  dragPreview: DragPreview | null
  setDragPreview: (preview: DragPreview | null) => void
  updateDragPreviewPosition: (
    pos: { x: number; y: number; z: number } | null,
    isValid: boolean
  ) => void
}

// ใน create():
dragPreview: null,
setDragPreview: (preview) => set({ dragPreview: preview }),
updateDragPreviewPosition: (position, isValid) =>
  set((state) => state.dragPreview
    ? { dragPreview: { ...state.dragPreview, position, isValid } }
    : {}),
```

---

## Phase 2 — Catalog Items กลายเป็น Draggable (~3 ชม.)

### แก้ไข `components/custom/item-catalog.tsx`

```tsx
// Inside catalog item rendering (in the Sheet)
{items.map((item) => (
  <div
    key={item.id}
    draggable
    onDragStart={(e) => handleDragStart(e, item)}
    onDragEnd={handleDragEnd}
    onClick={() => handleAdd(item)} // fallback: click = auto-place
    className="..."
  >
    {/* ... existing card content ... */}
  </div>
))}
```

```tsx
function handleDragStart(e: React.DragEvent, item: CatalogItem) {
  // Set drag image to a transparent 1x1 px (we render our own ghost in 3D)
  const blank = document.createElement('canvas')
  blank.width = blank.height = 1
  e.dataTransfer.setDragImage(blank, 0, 0)
  e.dataTransfer.effectAllowed = 'copy'

  // Stash item id in the drag payload (for cross-document drops, optional)
  e.dataTransfer.setData('application/x-catalog-item', item.id)

  // Prime our store-driven ghost
  setDragPreview({
    catalogItemId: item.id,
    size: item.size,
    weight: item.weight,
    name: item.name,
    color: getNextColor(),
    category: item.category,
    position: null,
    isValid: false,
  })

  // Close the catalog sheet so user can see the canvas
  setShowCatalog(false)
}

function handleDragEnd() {
  // Cleanup if drop didn't happen on canvas
  setDragPreview(null)
}
```

> **Critical**: ต้อง `e.dataTransfer.setDragImage(blankCanvas, 0, 0)` เพื่อซ่อน drag image default ของเบราว์เซอร์ ไม่งั้นจะมีกล่องจริงและ ghost ซ้อนกัน

---

## Phase 3 — Canvas รับ Drag Events (~4 ชม.)

### แก้ไข `components/scene/scene-canvas.tsx`

ครอบ `<Canvas>` ด้วย wrapper div ที่ฟัง drag events:

```tsx
'use client'

import { useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
// ... other imports
import { CatalogDropPreview } from './catalog-drop-preview'

export function SceneCanvas() {
  const { dragPreview, setDragPreview, updateDragPreviewPosition, addBox, ... } = useSceneStore()
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)

  // Handle drag-over: compute drop position in 3D
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'

    if (!dragPreview || !canvasWrapperRef.current || !cameraRef.current) return

    const rect = canvasWrapperRef.current.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )

    // Raycast onto floor plane (Y=0)
    const raycaster = new THREE.Raycaster()
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    raycaster.setFromCamera(ndc, cameraRef.current)
    const hit = new THREE.Vector3()
    if (!raycaster.ray.intersectPlane(floorPlane, hit)) return

    // Snap to grid + clamp to container + auto-gravity (reuse existing utilities)
    const tempBox: CargoBox = {
      id: '__preview__',
      name: dragPreview.name,
      size: dragPreview.size,
      weight: dragPreview.weight,
      color: dragPreview.color,
      orientationId: 0,
      position: { x: 0, y: 0, z: 0 },
    }

    const clampedX = clampX(hit.x, dragPreview.size.w, containerSize, gridStep)
    const clampedZ = clampZ(hit.z, dragPreview.size.d, containerSize, gridStep)
    const y = getSupportY(clampedX, clampedZ, tempBox, boxes, containerSize)

    const candidate = new THREE.Vector3(clampedX, y, clampedZ)
    const result = validatePlacement(tempBox, candidate, boxes, containerSize)

    updateDragPreviewPosition(
      { x: candidate.x, y: candidate.y, z: candidate.z },
      result.valid
    )
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!dragPreview?.position || !dragPreview.isValid) {
      setDragPreview(null)
      return
    }

    addBox({
      id: nanoid(),
      name: dragPreview.name,
      size: dragPreview.size,
      weight: dragPreview.weight,
      color: dragPreview.color,
      category: dragPreview.category,
      orientationId: 0,
      position: dragPreview.position,
    })
    setDragPreview(null)
  }

  const handleDragLeave = () => {
    updateDragPreviewPosition(null, false)
  }

  return (
    <div
      ref={canvasWrapperRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      className="w-full h-full"
    >
      <Canvas /* ... */>
        <CameraGrabber onReady={(cam) => { cameraRef.current = cam }} />
        {/* ... lights, container, boxes ... */}
        <CatalogDropPreview />
      </Canvas>
    </div>
  )
}

// Tiny helper component to expose camera ref to outer scope
function CameraGrabber({ onReady }: { onReady: (cam: THREE.Camera) => void }) {
  const { camera } = useThree()
  useEffect(() => onReady(camera), [camera, onReady])
  return null
}
```

### `components/scene/catalog-drop-preview.tsx`

```tsx
'use client'

import { useSceneStore } from '@/store/use-scene-store'

export function CatalogDropPreview() {
  const { dragPreview, ghostOpacity } = useSceneStore()
  if (!dragPreview?.position) return null

  const { size, position, isValid } = dragPreview

  return (
    <mesh position={[position.x, position.y, position.z]}>
      <boxGeometry args={[size.w, size.h, size.d]} />
      <meshStandardMaterial
        color={isValid ? '#22c55e' : '#ef4444'}
        transparent
        opacity={ghostOpacity}
      />
    </mesh>
  )
}
```

---

## Phase 4 — Touch Support (~3 ชม.)

HTML5 DnD ไม่ทำงานบน mobile — ต้องใช้ pointer events เอง

### Strategy

ใน catalog item:
```tsx
onPointerDown={(e) => {
  if (e.pointerType === 'touch') {
    // Start manual drag tracking
    startTouchDrag(item, e)
  }
}}
```

`startTouchDrag` จะ:
1. setDragPreview ใน store
2. listen `pointermove` บน document → forward ไปยัง canvas (raycast เหมือน drag-over)
3. listen `pointerup` → ถ้า target อยู่ใน canvas bounds และ isValid → addBox

> **หมายเหตุ**: ขั้นนี้ optional ถ้าโปรเจกต์ยังเป็น desktop-first ทำ Phase 4 ทีหลังได้

---

## Phase 5 — Visual Polish (~2 ชม.)

- [ ] **Cursor feedback**: เปลี่ยน cursor เป็น `grabbing` ตลอดเวลา drag
- [ ] **Ghost glow effect**: เพิ่ม emissive ที่ ghost mesh ให้เห็นชัดขึ้น
- [ ] **Drop zone hint**: ตอน drag เริ่ม → highlight container outline เป็นสีฟ้าจางๆ
- [ ] **Snap indicator**: เส้น dashed จาก ghost ไปยัง grid intersection ที่ใกล้สุด
- [ ] **Auto-rotate camera**: ถ้า drag ค้างขอบ canvas → orbit camera ช้าๆ ให้เห็นมุมหลัง
- [ ] **Esc to cancel**: กด Escape ระหว่าง drag → ยกเลิก setDragPreview(null)

---

## Phase 6 — Catalog UX Improvements (~1 ชม.)

- [ ] เพิ่ม hint text ใน catalog: "💡 Drag items into the scene to place precisely, or click to auto-place"
- [ ] Visual cue ที่ catalog item: cursor: grab, hover transform: scale(1.02)
- [ ] Sheet ปิดอัตโนมัติเมื่อ drag เริ่ม (เพื่อให้เห็น canvas)

---

## Edge Cases ที่ต้องจัดการ

| Case | Solution |
|---|---|
| Drag เริ่มที่ catalog แต่ drop นอก canvas (เช่น sidebar อื่น) | `onDragEnd` ที่ catalog item → setDragPreview(null) |
| Drag ออกจาก canvas แล้วกลับเข้ามา | `onDragLeave` → position=null, `onDragOver` → คำนวณใหม่ |
| Drag กล่องที่ไม่พอดีกับตู้เลย (ใหญ่เกิน) | ghost จะแดงตลอด → drop ไม่ถูกเรียก (isValid=false) |
| Multiple drag start ซ้อนกัน | ตรวจ `dragPreview != null` ก่อน setDragPreview ใหม่ — replace ใหม่ทั้งหมด |
| User กดเริ่ม drag แล้วเปิด tab อื่น | window blur listener → setDragPreview(null) |

---

## Acceptance Criteria

- [x] Drag catalog item → ghost ตามเมาส์ใน 3D scene
- [x] Ghost สีเขียวเมื่อ valid, แดงเมื่อ collision/out-of-bounds
- [x] ปล่อยเมาส์ใน scene → กล่องถูก add ที่ตำแหน่งนั้น
- [x] ปล่อยเมาส์นอก scene → ไม่มีกล่องถูก add
- [x] Click (ไม่ drag) ที่ catalog item ยังคง auto-place ได้
- [x] Snap-to-grid ทำงานตอน drag preview
- [x] Auto-gravity ทำงาน (กล่องตกไปยัง support surface ใต้ตำแหน่ง)
- [x] Step log บันทึก "Added [name]" หลัง drop สำเร็จ
- [x] Undo สามารถยกเลิกการ drop ได้

---

## Future Enhancements

- **Drag กล่องที่อยู่ใน manifest list** ไปวางใหม่ (ตอนนี้ต้องลากใน scene อย่างเดียว)
- **Drag-to-duplicate**: hold Alt + drag → duplicate กล่องที่มีอยู่
- **Multi-drag**: ลากหลาย item พร้อมกัน (ต้องรอ multi-select feature ก่อน)
- **Snap to existing box**: ขณะลาก ถ้าใกล้ผิวกล่องอื่น → snap ติดเข้าไปเลย (magnetic placement)
