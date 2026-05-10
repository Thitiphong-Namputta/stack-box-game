# Container Template Library

## ภาพรวม

แทนที่จะให้ user กรอกขนาดตู้สินค้า (W × H × D) ด้วยตนเองทุกครั้ง ระบบจะมี **preset ของตู้สินค้ามาตรฐาน ISO** ให้เลือกได้ทันที พร้อมข้อมูลจริงตามมาตรฐานอุตสาหกรรม เช่น tare weight, max payload, internal dimensions

**ผลกระทบ**: ลดเวลา setup, ลดความผิดพลาด, ทำให้ระบบดูเป็นมืออาชีพ (logistics-grade)
**ระดับความซับซ้อน**: 🟢 ง่าย (1–2 วัน)
**ขึ้นกับ feature อื่น**: ไม่มี — ทำได้เลย

---

## เป้าหมายของฟีเจอร์

1. ผู้ใช้เปิด Container Settings dialog แล้วเห็นรายการตู้มาตรฐานให้เลือก
2. คลิก preset เพียงครั้งเดียว → ค่า W, H, D, maxWeight ถูกกรอกอัตโนมัติ
3. รองรับการบันทึก template เองสำหรับตู้ที่ใช้บ่อย (custom templates)
4. แสดงข้อมูลเสริม: tare weight, max payload, internal volume (m³)

---

## Container มาตรฐานที่ต้องรองรับ

| Code | ชื่อ | Internal W × H × D (cm) | Max Payload (kg) | Tare (kg) | Volume (m³) |
|---|---|---|---|---|---|
| `20GP` | 20ft Standard | 589 × 239 × 235 | 28,200 | 2,300 | ~33 |
| `40GP` | 40ft Standard | 1203 × 239 × 235 | 28,800 | 3,750 | ~67 |
| `40HC` | 40ft High Cube | 1203 × 269 × 235 | 28,600 | 3,900 | ~76 |
| `45HC` | 45ft High Cube | 1356 × 269 × 235 | 27,700 | 4,800 | ~86 |
| `20RF` | 20ft Reefer | 543 × 222 × 228 | 27,400 | 3,100 | ~28 |
| `40RF` | 40ft Reefer | 1158 × 222 × 228 | 29,200 | 4,800 | ~59 |
| `LD3` | LD3 Air ULD | 156 × 163 × 153 | 1,588 | 82 | ~4.5 |
| `EU-PALLET` | Euro Pallet | 120 × 144 × 80 | 1,500 | 25 | ~1.4 |

> **หมายเหตุ**: ตัวเลขเป็นค่ามาตรฐานทั่วไป — ในระบบควร comment ไว้ว่าให้ผู้ใช้ verify กับ shipping line จริงเสมอ

---

## โครงสร้างไฟล์ที่จะเพิ่ม/แก้ไข

```
stack-box-game/
├── lib/
│   └── container-templates/
│       ├── presets.ts             ← ใหม่ — Standard ISO container data
│       └── types.ts               ← ใหม่ — TypeScript types
├── components/
│   └── custom/
│       ├── container-presets.tsx  ← ใหม่ — Preset picker UI
│       └── control-panel.tsx      ← แก้ไข — เพิ่มปุ่ม "Browse templates"
├── prisma/
│   └── schema.prisma              ← แก้ไข — เพิ่ม ContainerTemplate model
└── app/api/
    └── container-templates/
        ├── route.ts                ← ใหม่ — GET, POST custom templates
        └── [id]/route.ts           ← ใหม่ — DELETE custom template
```

---

## Phase 1 — Preset Data + Type System (~2 ชม.)

### `lib/container-templates/types.ts`

```ts
export interface ContainerTemplate {
  id: string                    // 'iso-20gp', 'iso-40hc', or cuid for custom
  code: string                  // '20GP', '40HC', etc.
  name: string                  // '20ft Standard'
  category: 'sea' | 'air' | 'pallet' | 'custom'
  size: { w: number; h: number; d: number }
  maxWeight: number             // payload (kg)
  tareWeight?: number           // empty container weight (kg)
  description?: string
  isCustom?: boolean
  userId?: string               // เฉพาะ custom templates
}
```

### `lib/container-templates/presets.ts`

```ts
import type { ContainerTemplate } from './types'

export const ISO_CONTAINER_PRESETS: ContainerTemplate[] = [
  {
    id: 'iso-20gp',
    code: '20GP',
    name: '20ft Standard (Dry)',
    category: 'sea',
    size: { w: 589, h: 239, d: 235 },
    maxWeight: 28200,
    tareWeight: 2300,
    description: 'มาตรฐาน ISO 20ft general purpose dry container',
  },
  {
    id: 'iso-40gp',
    code: '40GP',
    name: '40ft Standard (Dry)',
    category: 'sea',
    size: { w: 1203, h: 239, d: 235 },
    maxWeight: 28800,
    tareWeight: 3750,
    description: 'มาตรฐาน ISO 40ft general purpose dry container',
  },
  {
    id: 'iso-40hc',
    code: '40HC',
    name: '40ft High Cube',
    category: 'sea',
    size: { w: 1203, h: 269, d: 235 },
    maxWeight: 28600,
    tareWeight: 3900,
    description: 'High Cube สูงพิเศษเพิ่ม 30 cm',
  },
  {
    id: 'iso-45hc',
    code: '45HC',
    name: '45ft High Cube',
    category: 'sea',
    size: { w: 1356, h: 269, d: 235 },
    maxWeight: 27700,
    tareWeight: 4800,
  },
  {
    id: 'iso-20rf',
    code: '20RF',
    name: '20ft Reefer (Refrigerated)',
    category: 'sea',
    size: { w: 543, h: 222, d: 228 },
    maxWeight: 27400,
    tareWeight: 3100,
    description: 'ตู้เย็น insulated walls ลด internal volume',
  },
  {
    id: 'iso-40rf',
    code: '40RF',
    name: '40ft Reefer (Refrigerated)',
    category: 'sea',
    size: { w: 1158, h: 222, d: 228 },
    maxWeight: 29200,
    tareWeight: 4800,
  },
  {
    id: 'air-ld3',
    code: 'LD3',
    name: 'LD3 Air ULD',
    category: 'air',
    size: { w: 156, h: 163, d: 153 },
    maxWeight: 1588,
    tareWeight: 82,
    description: 'Unit Load Device สำหรับเครื่องบินขนส่ง',
  },
  {
    id: 'pallet-eur',
    code: 'EU-PALLET',
    name: 'Euro Pallet (EUR1)',
    category: 'pallet',
    size: { w: 120, h: 144, d: 80 },
    maxWeight: 1500,
    tareWeight: 25,
    description: 'Pallet ยุโรป 1200×800 mm load สูงไม่เกิน 144 cm',
  },
]

// Group by category for UI rendering
export const PRESETS_BY_CATEGORY = ISO_CONTAINER_PRESETS.reduce(
  (acc, t) => {
    (acc[t.category] ||= []).push(t)
    return acc
  },
  {} as Record<string, ContainerTemplate[]>
)
```

---

## Phase 2 — UI: Preset Picker (~3 ชม.)

### `components/custom/container-presets.tsx`

```tsx
'use client'

import { Ship, Plane, Package, Star } from 'lucide-react'
import { ISO_CONTAINER_PRESETS, PRESETS_BY_CATEGORY } from '@/lib/container-templates/presets'
import type { ContainerTemplate } from '@/lib/container-templates/types'

const CATEGORY_META = {
  sea:    { icon: Ship,    label: 'Sea Freight (ISO)' },
  air:    { icon: Plane,   label: 'Air Cargo' },
  pallet: { icon: Package, label: 'Pallets' },
  custom: { icon: Star,    label: 'My Templates' },
}

interface Props {
  customTemplates?: ContainerTemplate[]
  onSelect: (t: ContainerTemplate) => void
  selectedId?: string
}

export function ContainerPresets({ customTemplates = [], onSelect, selectedId }: Props) {
  const grouped = {
    ...PRESETS_BY_CATEGORY,
    custom: customTemplates,
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, items]) => {
        if (items.length === 0) return null
        const { icon: Icon, label } = CATEGORY_META[cat as keyof typeof CATEGORY_META]
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <Icon className="w-3.5 h-3.5 an-text-on-surface-muted" />
              <span className="text-[10px] font-bold uppercase tracking-widest an-section-label">
                {label}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {items.map((t) => (
                <PresetCard
                  key={t.id}
                  template={t}
                  selected={selectedId === t.id}
                  onClick={() => onSelect(t)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PresetCard({
  template, selected, onClick,
}: {
  template: ContainerTemplate
  selected?: boolean
  onClick: () => void
}) {
  const vol = (template.size.w * template.size.h * template.size.d) / 1_000_000
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-lg border transition-all ${
        selected
          ? 'an-bg-surface-container-highest border-an-primary'
          : 'an-bg-surface-container border-transparent hover:an-bg-surface-variant'
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-xs font-bold an-text-on-surface">{template.name}</div>
          <div className="text-[10px] font-mono an-text-on-surface-muted">
            {template.code}
          </div>
        </div>
        <div className="text-[10px] font-mono an-text-primary">
          {vol.toFixed(1)} m³
        </div>
      </div>
      <div className="text-[10px] an-text-on-surface-muted font-mono">
        {template.size.w} × {template.size.h} × {template.size.d} cm
      </div>
      <div className="text-[10px] an-text-on-surface-muted mt-1">
        Max payload: {template.maxWeight.toLocaleString()} kg
        {template.tareWeight && ` · Tare: ${template.tareWeight.toLocaleString()} kg`}
      </div>
    </button>
  )
}
```

### แก้ไข `components/custom/control-panel.tsx`

เพิ่มปุ่ม "Browse Templates" ที่เปิด Sheet/Dialog ขึ้นมาแสดง `<ContainerPresets>`

```tsx
// ใน ContainerTab — เพิ่มเหนือปุ่ม "Container Settings"
<Sheet open={presetOpen} onOpenChange={setPresetOpen}>
  <SheetTrigger asChild>
    <button
      type="button"
      className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all hover:opacity-80 mb-2 an-btn-outline-primary"
    >
      <Ship className="w-3.5 h-3.5" />
      Browse Container Templates
    </button>
  </SheetTrigger>
  <SheetContent side="left" className="w-96 p-6 an-sheet-content">
    <SheetHeader>
      <SheetTitle className="an-text-on-surface">Container Templates</SheetTitle>
    </SheetHeader>
    <ScrollArea className="h-[calc(100vh-120px)] mt-4">
      <ContainerPresets
        customTemplates={customTemplates}
        selectedId={activeTemplateId}
        onSelect={(t) => {
          setContainerSize({
            w: t.size.w, h: t.size.h, d: t.size.d, maxWeight: t.maxWeight,
          })
          setActiveTemplateId(t.id)
          setPresetOpen(false)
        }}
      />
    </ScrollArea>
  </SheetContent>
</Sheet>
```

---

## Phase 3 — Custom Templates (Save / Load) (~2 ชม.)

### Database — `prisma/schema.prisma`

```prisma
model ContainerTemplate {
  id          String   @id @default(cuid())
  code        String
  name        String
  category    String   // 'sea' | 'air' | 'pallet' | 'custom'
  sizeW       Float
  sizeH       Float
  sizeD       Float
  maxWeight   Float
  tareWeight  Float?
  description String?
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  createdAt   DateTime @default(now())

  @@index([userId])
}

// แก้ User model
model User {
  // ... existing fields
  containerTemplates ContainerTemplate[]
}
```

รัน:
```bash
npx prisma migrate dev --name add_container_templates
npx prisma generate
```

### API Routes

`app/api/container-templates/route.ts`:
```ts
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const templates = await prisma.containerTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(templates.map(toContainerTemplate))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const created = await prisma.containerTemplate.create({
    data: {
      ...body,
      sizeW: body.size.w, sizeH: body.size.h, sizeD: body.size.d,
      userId: session.user.id,
    },
  })
  return NextResponse.json(toContainerTemplate(created), { status: 201 })
}
```

### "Save as Template" button

ใน Container Settings dialog เพิ่มปุ่ม "Save as Template" — เปิด mini form ขอ name + code แล้ว POST

---

## Phase 4 — UX Polish (~1 ชม.)

- [ ] แสดง active template badge ใน sidebar (เช่น "📦 40HC" ถ้ากำลังใช้)
- [ ] ตอนเปลี่ยน template ที่ขนาดต่างกันให้ confirm ถ้ามีกล่องอยู่แล้ว (อาจมี boxes หลุดออกนอกตู้)
- [ ] Recently used templates section (top 3)
- [ ] เพิ่ม template เริ่มต้นใน seed.ts สำหรับ demo user

---

## Acceptance Criteria

- [x] เปิด Sheet "Browse Templates" เห็นกลุ่ม Sea / Air / Pallet พร้อม icon
- [x] คลิก preset → containerSize เปลี่ยนทันทีใน 3D scene
- [x] รายละเอียดแต่ละ preset แสดง: code, dimensions, max payload, volume, tare
- [x] สามารถ "Save as Template" จาก custom size ที่กรอกเอง
- [x] Custom templates โผล่ในหมวด "My Templates" หลัง refresh
- [x] ลบ custom template ได้ (preset ISO ลบไม่ได้)

---

## Future Enhancements

- Container utilization comparison: "ตู้ 40HC จะเหลือพื้นที่กว่า 20GP 67%"
- Auto-suggest container ที่เหมาะกับ manifest ปัจจุบัน
- Reefer-specific constraints (temperature zones, airflow gaps)
- Tank container type สำหรับของเหลว
