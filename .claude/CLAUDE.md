# แผนพัฒนา 3D Cargo Box Planner — Next.js Web Application

## ภาพรวมโปรเจกต์

Web application สำหรับจัดวางสินค้า (กล่อง) ภายในตู้สินค้าสี่เหลี่ยมแบบ 3D โดยผู้ใช้สามารถคลิกเลือกกล่องสินค้าแล้วลากวางภายในตู้ที่กำหนดได้ รองรับการตรวจสอบขอบเขต และ snap-to-grid เพื่อความแม่นยำ

---

## Tech Stack

### Frontend Framework
- **Next.js 14+** (App Router) — Framework หลัก
- **TypeScript** — Type safety ทั้งโปรเจกต์
- Rendering strategy: CSR สำหรับ 3D scene, SSR สำหรับหน้า catalog/form

### 3D Engine
| Package | บทบาท |
|---|---|
| `three` | 3D engine หลัก |
| `@react-three/fiber` | React wrapper สำหรับ Three.js (declarative) |
| `@react-three/drei` | Helper components: `<Box>`, `<OrbitControls>`, `<TransformControls>`, `<Grid>` |
| `@react-three/rapier` | Physics engine (optional) — ใช้ถ้าต้องการ collision detection จริงจัง |

### Interaction / Drag
- **`@use-gesture/react`** — จัดการ pointer events สำหรับ drag ใน 3D space
- **Raycasting** (Three.js built-in) — แปลง mouse position → 3D world coordinates
- **Drag plane technique** — invisible plane สำหรับ project ตำแหน่ง drag

### State Management
- **Zustand** — เก็บ state ของ scene (ตำแหน่งกล่อง, selected item, ขนาดตู้)

### UI / Forms
- **Tailwind CSS** — Styling
- **shadcn/ui** — UI component library (copy-into-project, ปรับแต่งได้เต็มที่)
- **React Hook Form + Zod** — Validate ขนาดกล่องและ input ต่างๆ

#### shadcn/ui — การติดตั้ง
```bash
# Init shadcn ใน Next.js project
npx shadcn@latest init

# เพิ่ม components ที่ใช้ในโปรเจกต์นี้
npx shadcn@latest add sheet sidebar dialog slider input button badge tooltip separator scroll-area
```

#### shadcn/ui — Components ที่ใช้ในโปรเจกต์นี้
| Component | ใช้ที่ไหน |
|---|---|
| `Sheet` | Item Catalog panel เลื่อนออกจากด้านข้าง |
| `Sidebar` | Layout wrapper ของ control panel |
| `Dialog` | Form ตั้งค่าขนาดตู้ (W × H × D) |
| `Slider` | ปรับ snap grid size, ความโปร่งใส ghost preview |
| `Input` | กรอกขนาดกล่อง, ชื่อสินค้า |
| `Button` | ปุ่ม add box, save, export, มุมมอง |
| `Badge` | แสดง label ประเภทสินค้า, สถานะ collision |
| `Tooltip` | แสดงข้อมูลกล่องตอน hover ใน 3D scene |
| `Separator` | แบ่ง section ใน sidebar |
| `ScrollArea` | รายการสินค้าใน catalog ที่ scroll ได้ |

### Packing Algorithm
- **`binpackingjs`** (BP3D) — library หลักสำหรับคำนวณการวางกล่อง ported จาก Go package `bp3d`

#### การติดตั้ง
```bash
npm install binpackingjs
```

#### BP3D API ที่ใช้ในโปรเจกต์นี้
```ts
import { BP3D } from 'binpackingjs'
const { Item, Bin, Packer } = BP3D

// สร้างตู้สินค้า: Bin(name, width, height, depth, maxWeight)
const bin = new Bin('cargo-container', 600, 240, 240, 20000)

// สร้างกล่องสินค้า: Item(name, width, height, depth, weight)
const item1 = new Item('box-001', 60, 60, 60, 10)
const item2 = new Item('box-002', 100, 80, 50, 15)

// คำนวณ packing
const packer = new Packer()
packer.addBin(bin)
packer.addItem(item1)
packer.addItem(item2)
packer.pack()

// อ่านผลลัพธ์
bin.items          // กล่องที่วางสำเร็จ (มี position และ rotation)
packer.unfitItems  // กล่องที่ไม่พอดีหรือเกิน
```

#### สิ่งที่ binpackingjs คืนกลับมา
แต่ละ item ที่ packed จะมี properties สำคัญ:
| Property | ความหมาย |
|---|---|
| `item.position[0,1,2]` | ตำแหน่ง x, y, z ของมุมล่างซ้ายหน้า |
| `item.rotationType` | การหมุน (0–5 รูปแบบ) |
| `item.width`, `item.height`, `item.depth` | ขนาดหลังหมุน |

#### บทบาทของ binpackingjs ใน app นี้ (manual drag mode)
เนื่องจาก user **ลากวางเอง** binpackingjs จะถูกใช้ใน 3 กรณี:

1. **Validate on drop** — เมื่อผู้ใช้ปล่อยกล่อง ตรวจสอบว่ากล่องไม่ทับกล่องอื่นและอยู่ในตู้
2. **Placement suggestion** — รันหา position ที่เหมาะสมที่สุดแนะนำให้ผู้ใช้ก่อน drop
3. **Auto-pack feature** — ปุ่ม "จัดเรียงอัตโนมัติ" สำหรับวางกล่องทั้งหมดให้พอดีทีเดียว

### Backend (Optional)
- **Next.js API Routes** — Save/load layout
- **PostgreSQL หรือ SQLite** — เก็บข้อมูลสินค้าและ layout
- **Prisma ORM** — Type-safe database queries

---

## สถาปัตยกรรม Component

```
app/
├── page.tsx                   # หน้าหลัก
├── layout.tsx
└── planner/
    └── page.tsx               # หน้า 3D Planner

components/
├── scene/
│   ├── CargoContainer.tsx     # ตู้สินค้า 3D (wireframe box)
│   ├── CargoBox.tsx           # กล่องสินค้าแต่ละชิ้น (draggable)
│   ├── DragPlane.tsx          # Invisible plane สำหรับ drag projection
│   ├── GridHelper.tsx         # Grid แสดงพื้น
│   └── SceneCanvas.tsx        # R3F Canvas wrapper
├── ui/
│   ├── ItemCatalog.tsx        # รายการสินค้าที่เลือกได้
│   ├── ControlPanel.tsx       # ตั้งค่าขนาดตู้, toggle options
│   └── InfoPanel.tsx          # แสดงข้อมูลกล่องที่ selected
└── providers/
    └── SceneProvider.tsx      # Zustand store context

store/
└── useSceneStore.ts           # Zustand store (positions, selection, container size)

lib/
└── packing/
    ├── useBinPacking.ts       # Hook หลักสำหรับ binpackingjs integration
    ├── validatePlacement.ts   # ตรวจสอบ collision + boundary ก่อน drop
    ├── suggestPosition.ts     # แนะนำตำแหน่งที่ดีที่สุดสำหรับกล่องใหม่
    └── packingUtils.ts        # แปลง Zustand state ↔ binpackingjs Item/Bin format
```

---

## แผนการพัฒนา (Phase-by-Phase)

### Phase 1 — Setup & 3D Foundation (~1 สัปดาห์)

**เป้าหมาย**: มองเห็นตู้สินค้าและกล่องใน 3D ได้

- [ ] ติดตั้ง Next.js + TypeScript + Tailwind
- [ ] ติดตั้ง React Three Fiber, Drei
- [ ] รัน `npx shadcn@latest init` และเพิ่ม components พื้นฐาน (`button`, `separator`, `tooltip`)
- [ ] วาง layout หลัก: sidebar ซ้าย + canvas 3D ขวา โดยใช้ `<SidebarProvider>` ของ shadcn
- [ ] สร้าง `<CargoContainer>` เป็น wireframe box ที่กำหนดขนาดได้
- [ ] สร้าง `<CargoBox>` แสดงกล่องสินค้าแบบ solid colored mesh
- [ ] เพิ่ม `<OrbitControls>` — หมุน/zoom กล้องได้
- [ ] ตั้งค่า lighting (AmbientLight + DirectionalLight)
- [ ] ตั้งค่า camera perspective เริ่มต้น

**Deliverable**: เห็นตู้และกล่องหลายชิ้นใน 3D scene หมุนดูได้

---

### Phase 2 — Click Selection (~1–2 สัปดาห์)

**เป้าหมาย**: คลิกเลือกกล่องได้และ highlight ชัดเจน

- [ ] ใช้ `onPointerDown` / `onPointerOver` ของ R3F สำหรับ raycasting อัตโนมัติ
- [ ] Highlight กล่องที่ถูก select (เปลี่ยนสี emissive หรือแสดง outline)
- [ ] เชื่อม selection state กับ Zustand store
- [ ] สร้าง `<InfoPanel>` ด้วย shadcn `<Card>` แสดงชื่อ/ขนาดกล่องที่ถูกเลือก
- [ ] สร้าง `<ItemCatalog>` ด้วย shadcn `<Sheet>` + `<ScrollArea>` — เลื่อนออกจากด้านซ้าย
- [ ] ใช้ shadcn `<Badge>` แสดง label ประเภทสินค้าในแต่ละ item
- [ ] ใช้ shadcn `<Tooltip>` แสดงชื่อและขนาดกล่องตอน hover ใน 3D scene
- [ ] กด Escape หรือคลิก background เพื่อ deselect

**Deliverable**: คลิกกล่องแล้วเห็น highlight + ข้อมูลใน sidebar

---

### Phase 3 — Drag & Drop ใน 3D Space (~2 สัปดาห์)

**เป้าหมาย**: ลากกล่องไปวางในตำแหน่งใหม่ภายในตู้ได้

> ⚠️ นี่คือส่วนที่ยากที่สุดของโปรเจกต์

#### เทคนิค Drag ใน 3D
1. เมื่อ `pointerdown` บนกล่อง → สร้าง invisible `<DragPlane>` ขนาน floor ที่ความสูง Y ของกล่องนั้น
2. ระหว่าง `pointermove` → raycast จาก mouse ไปชน drag plane → ได้ตำแหน่ง 3D
3. อัพเดท position ของกล่องตาม intersection point
4. เมื่อ `pointerup` → ลบ drag plane, บันทึก position ลง store

- [ ] Implement drag plane raycasting
- [ ] **Snap-to-grid**: round ตำแหน่งไปหา grid step ที่ใกล้ที่สุด (เช่น ทุก 0.1m)
- [ ] ใช้ shadcn `<Slider>` ใน ControlPanel สำหรับปรับ grid step size แบบ real-time
- [ ] **Boundary check**: ตรวจว่ากล่องไม่หลุดออกนอกตู้ (clamp position)
- [ ] **Ghost preview**: แสดง translucent box ที่ตำแหน่ง drop ก่อนปล่อย
- [ ] **Collision detection + Validate**: ใช้ `binpackingjs` BP3D ตรวจสอบว่ากล่องวางได้หรือไม่ก่อน confirm drop
- [ ] **Placement suggestion**: รัน `packer.pack()` กับ container snapshot เพื่อหาตำแหน่งที่แนะนำ แสดง ghost box สีต่างกันตามผล (เขียว = OK, แดง = collision)
- [ ] ใช้ shadcn `<Badge>` สีแดงแจ้งเตือนเมื่อ collision เกิดขึ้น
- [ ] Disable OrbitControls ระหว่างที่กำลัง drag

**Deliverable**: ลาก-วางกล่องได้อย่าง smooth มี snap และ boundary

---

### Phase 4 — Features เพิ่มเติม (~1–2 สัปดาห์)

**เป้าหมาย**: ระบบพร้อมใช้งานจริง

- [ ] **Item Catalog**: เพิ่มกล่องใหม่จากรายการสินค้า ใช้ shadcn `<Sheet>` + `<ScrollArea>`
- [ ] **ตั้งค่าขนาดตู้**: ใช้ shadcn `<Dialog>` + `<Input>` + React Hook Form + Zod validate W × H × D
- [ ] **Auto-pack**: ปุ่ม "จัดเรียงอัตโนมัติ" รัน `binpackingjs` BP3D `packer.pack()` เต็มรูปแบบ แล้ว sync ผลลัพธ์ตำแหน่งกลับเข้า Zustand store และ Three.js scene
- [ ] **Space analysis**: แสดง % พื้นที่ใช้ไป/คงเหลือ คำนวณจาก `Σ volume(bin.items) / volume(container)` ด้วย shadcn `<Progress>` bar ใน sidebar
- [ ] **Unfit items warning**: แสดงรายการกล่องใน `packer.unfitItems` ด้วย shadcn `<Badge>` สีแดงใน Item Catalog
- [ ] **Save/Load layout**: บันทึกและโหลด layout ผ่าน API ใช้ shadcn `<Dialog>` ยืนยันก่อน overwrite
- [ ] **Multi-view mode**: ใช้ shadcn `<Button>` group สลับมุมมอง Top / Front / Side
- [ ] **Export**: Export layout เป็น JSON หรือ PDF report
- [ ] **Undo/Redo**: Command pattern สำหรับ action history ใช้ shadcn `<Button>` + keyboard shortcut

---

## จุดเทคนิคสำคัญที่ต้องระวัง

### binpackingjs — Integration Pattern

```ts
// lib/packing/packingUtils.ts
import { BP3D } from 'binpackingjs'
const { Item, Bin, Packer } = BP3D

// แปลง Zustand CargoBox → binpackingjs Item
export function toPackingItem(box: CargoBox): InstanceType<typeof Item> {
  return new Item(box.id, box.size.w, box.size.h, box.size.d, box.weight ?? 0)
}

// แปลง container size → binpackingjs Bin
export function toPackingBin(size: ContainerSize): InstanceType<typeof Bin> {
  return new Bin('container', size.w, size.h, size.d, size.maxWeight ?? 99999)
}

// คำนวณ suggested position สำหรับกล่องใหม่
export function suggestPosition(
  newBox: CargoBox,
  placedBoxes: CargoBox[],
  containerSize: ContainerSize
): Vector3 | null {
  const packer = new Packer()
  packer.addBin(toPackingBin(containerSize))

  // ใส่กล่องที่วางแล้วก่อน (เพื่อ lock ตำแหน่ง)
  placedBoxes.forEach(b => packer.addItem(toPackingItem(b)))
  // ใส่กล่องใหม่ที่ต้องการหาตำแหน่ง
  packer.addItem(toPackingItem(newBox))
  packer.pack()

  const bin = packer.bins[0]
  const packed = bin.items.find(i => i.name === newBox.id)
  if (!packed) return null  // ไม่มีที่วาง

  // แปลง position จาก corner → center (สำหรับ Three.js)
  return new THREE.Vector3(
    packed.position[0] + packed.width / 2,
    packed.position[1] + packed.height / 2,
    packed.position[2] + packed.depth / 2,
  )
}

// validate ว่ากล่องวางได้ที่ตำแหน่งที่ user ลากมาหรือไม่
export function validatePlacement(
  movingBox: CargoBox,
  newPos: Vector3,
  otherBoxes: CargoBox[],
  containerSize: ContainerSize
): { valid: boolean; reason?: string } {
  // 1. Boundary check
  const half = containerSize
  if (
    newPos.x - movingBox.size.w / 2 < 0 ||
    newPos.x + movingBox.size.w / 2 > half.w ||
    newPos.y - movingBox.size.h / 2 < 0 ||
    newPos.y + movingBox.size.h / 2 > half.h ||
    newPos.z - movingBox.size.d / 2 < 0 ||
    newPos.z + movingBox.size.d / 2 > half.d
  ) return { valid: false, reason: 'กล่องเกินขอบตู้' }

  // 2. AABB collision check กับกล่องอื่น
  const aNew = new THREE.Box3().setFromCenterAndSize(newPos, new THREE.Vector3(...Object.values(movingBox.size)))
  for (const other of otherBoxes) {
    if (other.id === movingBox.id) continue
    const aOther = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(other.position.x, other.position.y, other.position.z),
      new THREE.Vector3(other.size.w, other.size.h, other.size.d)
    )
    if (aNew.intersectsBox(aOther)) return { valid: false, reason: `ชนกับ ${other.name}` }
  }
  return { valid: true }
}
```

### useBinPacking Hook

```ts
// lib/packing/useBinPacking.ts
export function useBinPacking() {
  const { boxes, containerSize } = useSceneStore()

  const getSuggestedPosition = useCallback((newBox: CargoBox) =>
    suggestPosition(newBox, boxes, containerSize), [boxes, containerSize])

  const validate = useCallback((box: CargoBox, pos: Vector3) =>
    validatePlacement(box, pos, boxes, containerSize), [boxes, containerSize])

  const spaceUtilization = useMemo(() => {
    const used = boxes.reduce((sum, b) => sum + b.size.w * b.size.h * b.size.d, 0)
    const total = containerSize.w * containerSize.h * containerSize.d
    return Math.round((used / total) * 100)
  }, [boxes, containerSize])

  return { getSuggestedPosition, validate, spaceUtilization }
}
```

### Drag ใน 3D
```ts
// ตัวอย่าง drag plane raycasting pattern
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -box.position.y)
const raycaster = new THREE.Raycaster()
const intersection = new THREE.Vector3()

raycaster.setFromCamera(mouseNDC, camera)
raycaster.ray.intersectPlane(dragPlane, intersection)
// intersection คือตำแหน่ง 3D ที่กล่องควรย้ายไป
```

### Snap to Grid
```ts
const GRID_STEP = 0.1 // 10 cm
const snapToGrid = (v: number) => Math.round(v / GRID_STEP) * GRID_STEP
```

### Boundary Clamp
```ts
const clampInContainer = (pos: Vector3, boxSize: Vector3, containerSize: Vector3) => ({
  x: clamp(pos.x, -containerSize.x/2 + boxSize.x/2, containerSize.x/2 - boxSize.x/2),
  y: clamp(pos.y, boxSize.y/2, containerSize.y - boxSize.y/2),
  z: clamp(pos.z, -containerSize.z/2 + boxSize.z/2, containerSize.z/2 - boxSize.z/2),
})
```

### Zustand Store Shape
```ts
interface SceneStore {
  containerSize: { w: number; h: number; d: number }
  boxes: CargoBox[]
  selectedId: string | null
  setSelected: (id: string | null) => void
  moveBox: (id: string, position: Vector3) => void
  addBox: (box: CargoBox) => void
  removeBox: (id: string) => void
}
```

---

## Timeline สรุป

| Phase | งาน | ระยะเวลาประมาณ |
|---|---|---|
| 1 | Setup + 3D Foundation | 1 สัปดาห์ |
| 2 | Click Selection + UI | 1–2 สัปดาห์ |
| 3 | Drag & Drop 3D | 2 สัปดาห์ |
| 4 | Features + Polish | 1–2 สัปดาห์ |
| **รวม** | | **5–7 สัปดาห์** |

---

## คำแนะนำเพิ่มเติม

- เริ่ม Phase 3 ด้วย **grid-based snapping** ก่อน แล้วค่อยเพิ่ม free-placement ทีหลัง จะง่ายกว่ามาก
- ใช้ `leva` (debug GUI) ระหว่าง development เพื่อ tweak ค่าต่างๆ แบบ real-time
- ทดสอบบน mobile ตั้งแต่ต้น เพราะ touch events กับ OrbitControls มักมีปัญหา conflict กับ drag
- ถ้าต้องการ performance สูง ให้ใช้ `instancedMesh` แทนการ render กล่องแยกทีละชิ้น
