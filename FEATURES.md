# 3D Cargo Planner — Feature Summary

> อัปเดต: 2026-04-10

---

## Pages

| หน้า | Route | สถานะ |
|---|---|---|
| Dashboard / Landing | `/` | ✅ มีแล้ว |
| 3D Planner | `/planner` | ✅ มีแล้ว |
| Load Plans | `/load-plans` | ⚠️ Mock data (ยังไม่ต่อ backend) |
| Catalog | `/catalog` | ⚠️ Mock data (ยังไม่ต่อ backend) |

---

## Features ที่ทำงานได้จริงแล้ว

### 3D Scene (`/planner`)
- **3D Cargo Container** — wireframe box ขนาดปรับได้ (default 600×240×240 cm)
- **Cargo Boxes** — แสดงกล่องสินค้าแบบ solid colored mesh, แต่ละกล่องมีสีไม่ซ้ำกัน
- **OrbitControls** — หมุน/zoom/pan กล้องด้วย mouse
- **View Modes** — สลับมุมมอง 3D / Top / Side ผ่าน Floating Toolbar
- **Render Modes** — สลับโหมด Solid / Wireframe / X-ray ผ่าน Floating Toolbar
- **Camera HUD** — ปุ่ม Zoom In, Zoom Out, Reset View (ด้านขวาบน Canvas)

### Item Management
- **Item Catalog Sheet** — เปิด Sheet panel เลือกกล่องจาก catalog (แบ่งเป็น category: Standard / Special)
- **Search** — ค้นหาสินค้าใน catalog ด้วยชื่อหรือ category
- **Add Box** — เพิ่มกล่องเข้า manifest พร้อม suggested position อัตโนมัติ
- **Remove Box** — ลบกล่องออกจาก manifest (hover แล้วกด Delete)
- **Click Selection** — คลิกกล่องใน 3D scene หรือใน manifest list เพื่อ highlight และดู details
- **Manifest List** — แสดงรายการกล่องทั้งหมดใน sidebar ซ้าย พร้อม badge สถานะ Packed / Unfit

### Packing Algorithm
- **Auto-pack** — ปุ่ม "Auto-pack" (header) รัน BP3D algorithm จัดวางกล่องทั้งหมดให้อัตโนมัติ
- **Placement Suggestion** — เมื่อ Add กล่องใหม่ จะคำนวณ position ที่ดีที่สุดให้ก่อน
- **Unfit Items Warning** — แสดง alert ใน Right Panel เมื่อมีกล่องที่ไม่สามารถ pack ได้

### Right Panel (Analytics)
- **Volume Efficiency** — แสดง % พื้นที่ที่ใช้ไปด้วย progress bar
- **Weight Capacity** — แสดง % น้ำหนักที่ใช้ไป (เปลี่ยนเป็นสีแดงเมื่อเกิน)
- **Constraint Analysis** — ตรวจสอบ 3 เงื่อนไข: Weight limit / Volume capacity / No collisions (PASS/FAIL)
- **Selected Item Details** — แสดง Length, Width, Height, Weight, Volume ของกล่องที่ selected
- **Export Plan** — Export layout ทั้งหมดเป็นไฟล์ `.json`

### Left Sidebar — Container Tab
- **ControlPanel** — ตั้งค่า Container Size (W×H×D), Max Weight, Grid Step, Ghost Opacity ผ่าน sliders/inputs

### Undo / Redo
- **Undo** (Ctrl+Z) — ย้อนกลับ action ก่อนหน้า (ประวัติสูงสุด 20 ครั้ง)
- **Redo** (Ctrl+Y) — ทำซ้ำ action ที่ undo ไป

### UI/UX
- **Dark / Light Mode** — toggle ผ่านปุ่ม ModeToggle ที่ header
- **Navigation** — navbar ลิงก์ครบ 4 หน้า (Dashboard / 3D Planner / Load Plans / Catalog)
- **Snap to Grid** — กล่องจะ snap ตาม gridStep ที่กำหนด

---

## Features ที่ยังไม่สมบูรณ์ / Coming Soon

| Feature | สถานะ |
|---|---|
| Drag & Drop กล่องใน 3D scene | ❌ ยังไม่ทำ (Phase 3) |
| Ghost preview ระหว่าง drag | ❌ ยังไม่ทำ |
| Steps Log | ❌ Coming soon (placeholder อยู่แล้ว) |
| Save / Load plan จาก backend | ❌ Mock data เท่านั้น |
| Catalog CRUD (เพิ่ม/แก้ไข/ลบสินค้า) | ❌ UI มีปุ่ม "เพิ่มสินค้า" แต่ยังไม่ทำงาน |
| Load Plans จาก backend | ❌ Mock data เท่านั้น |
| Keyboard shortcut Ctrl+Z / Ctrl+Y | ❌ ปุ่มมีแล้ว แต่ยังไม่ bind keyboard event |

---

## Tech Stack สรุป

- **Framework**: Next.js (App Router), TypeScript
- **3D**: React Three Fiber + Drei
- **State**: Zustand
- **UI**: shadcn/ui v4 (`@base-ui/react`), Tailwind CSS
- **Packing**: binpackingjs (BP3D)
- **Forms**: React Hook Form + Zod
