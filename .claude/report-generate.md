# Report Generation — Stack Box Project

## สรุปเครื่องมือที่เลือกใช้

| ประเภทไฟล์ | Library | เหตุผล |
|---|---|---|
| **PDF** | `@react-pdf/renderer` | เขียนเป็น React component, รองรับ Next.js App Router, ไม่ต้องรัน browser |
| **XLSX** | `ExcelJS` | API ใช้งานง่าย, styling ครบ, streaming, maintained ดี, ไม่มี security issue |

---

## PDF — `@react-pdf/renderer`

### ติดตั้ง

```bash
npm install @react-pdf/renderer
```

### เหตุผลที่เลือก

- เขียน PDF template เป็น React component ได้เลย — คุ้นเคยกับ stack ที่มีอยู่
- รองรับ **Next.js App Router** ตั้งแต่ Next.js 14.1.1+ โดยไม่ต้องเพิ่ม config พิเศษ
- ใช้ `renderToBuffer()` ใน API route ได้โดยตรง (server-side)
- ไม่ต้องรัน Chromium (เบากว่า Puppeteer มาก)
- รองรับ Thai font ได้ (ต้อง embed TTF เอง)

### ข้อระวัง

- ไม่ได้ render HTML/CSS จริง — ต้องเขียน layout ด้วย `<View>`, `<Text>`, `<Page>` ของ library เอง
- ต้อง embed Thai font (เช่น Sarabun, Prompt) ก่อนใช้งาน

### โครงสร้างไฟล์

```
app/api/export/
└── pdf/
    └── route.ts          ← API route: POST → return PDF buffer

components/pdf/
├── report-document.tsx   ← React component หลักของ PDF
├── report-summary.tsx    ← section สรุปข้อมูล container + utilization
├── report-manifest.tsx   ← ตารางรายการสินค้าทั้งหมด
└── styles.ts             ← StyleSheet สำหรับ PDF
```

### API Route Pattern

```ts
// app/api/export/pdf/route.ts
import { renderToBuffer } from '@react-pdf/renderer'
import { ReportDocument } from '@/components/pdf/report-document'
import { auth } from '@/auth'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await req.json() // { plan, containerSize, boxes }

  const buffer = await renderToBuffer(<ReportDocument data={data} />)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=cargo-report-${Date.now()}.pdf`,
    },
  })
}
```

### PDF Document Component Pattern

```tsx
// components/pdf/report-document.tsx
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { Font } from '@react-pdf/renderer'

// Register Thai font
Font.register({
  family: 'Prompt',
  src: '/fonts/Prompt-Regular.ttf',
})

const styles = StyleSheet.create({
  page: { fontFamily: 'Prompt', padding: 40, fontSize: 10 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  table: { display: 'flex', flexDirection: 'column', width: '100%' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#e2e8f0', padding: 4 },
  cell: { flex: 1 },
})

export function ReportDocument({ data }) {
  const { plan, boxes, containerSize } = data
  const utilization = Math.round(
    boxes.reduce((s, b) => s + b.size.w * b.size.h * b.size.d, 0) /
    (containerSize.w * containerSize.h * containerSize.d) * 100
  )

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Cargo Report: {plan.name}</Text>
        <View>
          <Text>Container: {containerSize.w} × {containerSize.h} × {containerSize.d} cm</Text>
          <Text>การใช้พื้นที่: {utilization}%</Text>
          <Text>จำนวนกล่อง: {boxes.length} ชิ้น</Text>
        </View>

        {/* Manifest Table */}
        <View style={styles.table}>
          <View style={[styles.row, { backgroundColor: '#f1f5f9' }]}>
            <Text style={styles.cell}>ชื่อสินค้า</Text>
            <Text style={styles.cell}>ขนาด (cm)</Text>
            <Text style={styles.cell}>น้ำหนัก (kg)</Text>
          </View>
          {boxes.map((box) => (
            <View key={box.id} style={styles.row}>
              <Text style={styles.cell}>{box.name}</Text>
              <Text style={styles.cell}>{box.size.w}×{box.size.h}×{box.size.d}</Text>
              <Text style={styles.cell}>{box.weight}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  )
}
```

---

## XLSX — `ExcelJS`

### ติดตั้ง

```bash
npm install exceljs
```

### เหตุผลที่เลือก

- API ใช้งานง่าย อ่านเข้าใจง่าย
- รองรับ styling ครบ: สีเซลล์, font, border, merge cell, column width
- รองรับ **streaming** สำหรับไฟล์ขนาดใหญ่ (ไม่ทำให้ memory พัง)
- maintained อยู่ (13,000+ GitHub stars)
- ไม่มี security vulnerability แบบ SheetJS Community

### ข้อระวัง

- ใหญ่กว่า SheetJS เล็กน้อย
- ไม่รองรับ format เก่า (.xls) — แต่โปรเจกต์นี้ไม่จำเป็น

### โครงสร้างไฟล์

```
app/api/export/
└── xlsx/
    └── route.ts          ← API route: POST → return XLSX buffer

lib/export/
├── build-xlsx.ts         ← logic สร้าง workbook
└── xlsx-styles.ts        ← styles กลาง (header color, border, font)
```

### API Route Pattern

```ts
// app/api/export/xlsx/route.ts
import ExcelJS from 'exceljs'
import { auth } from '@/auth'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { plan, boxes, containerSize } = await req.json()

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Stack Box'
  workbook.created = new Date()

  // ── Sheet 1: Summary ───────────────────────────────────────────
  const summary = workbook.addWorksheet('Summary')
  summary.getCell('A1').value = `Cargo Plan: ${plan.name}`
  summary.getCell('A1').font = { bold: true, size: 14 }
  summary.getCell('A3').value = 'Container (W × H × D)'
  summary.getCell('B3').value = `${containerSize.w} × ${containerSize.h} × ${containerSize.d} cm`
  summary.getCell('A4').value = 'Max Weight'
  summary.getCell('B4').value = `${containerSize.maxWeight} kg`
  summary.getCell('A5').value = 'จำนวนกล่อง'
  summary.getCell('B5').value = boxes.length
  const usedVol = boxes.reduce((s, b) => s + b.size.w * b.size.h * b.size.d, 0)
  const totalVol = containerSize.w * containerSize.h * containerSize.d
  summary.getCell('A6').value = 'การใช้พื้นที่'
  summary.getCell('B6').value = `${Math.round(usedVol / totalVol * 100)}%`

  // ── Sheet 2: Manifest ──────────────────────────────────────────
  const manifest = workbook.addWorksheet('Manifest')
  manifest.columns = [
    { header: 'ชื่อสินค้า',    key: 'name',     width: 24 },
    { header: 'ประเภท',        key: 'category', width: 14 },
    { header: 'กว้าง (cm)',    key: 'w',        width: 12 },
    { header: 'สูง (cm)',      key: 'h',        width: 12 },
    { header: 'ลึก (cm)',      key: 'd',        width: 12 },
    { header: 'น้ำหนัก (kg)', key: 'weight',   width: 14 },
    { header: 'ปริมาตร (m³)', key: 'volume',   width: 14 },
  ]

  // Style header row
  manifest.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.alignment = { horizontal: 'center' }
  })

  // Add data rows
  boxes.forEach((box) => {
    manifest.addRow({
      name:     box.name,
      category: box.category ?? '-',
      w:        box.size.w,
      h:        box.size.h,
      d:        box.size.d,
      weight:   box.weight,
      volume:   +((box.size.w * box.size.h * box.size.d) / 1_000_000).toFixed(4),
    })
  })

  // ── Export ─────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=cargo-plan-${Date.now()}.xlsx`,
    },
  })
}
```

---

## เปรียบเทียบ Library ทั้งหมด (Reference)

### PDF

| Library | Approach | Next.js App Router | Thai Font | Bundle Size | เหมาะกับ |
|---|---|---|---|---|---|
| **@react-pdf/renderer** ✅ | React components | ✅ รองรับ | ✅ embed TTF | เบา | Report จาก data |
| pdfmake | Declarative JSON | ✅ รองรับ | ✅ embed TTF | กลาง | Document ซับซ้อน |
| Puppeteer | HTML → PDF (headless Chrome) | ⚠️ ต้องใช้ serverless layer | ✅ CSS font | หนักมาก | Pixel-perfect จาก HTML |
| PDFKit | Programmatic API | ✅ รองรับ | ✅ embed TTF | เบา | Low-level control |
| jsPDF | Programmatic API | ⚠️ client-side เป็นหลัก | จำกัด | เบา | Simple client-side |

### XLSX

| Library | Read/Write | Styling | Streaming | Security | เหมาะกับ |
|---|---|---|---|---|---|
| **ExcelJS** ✅ | Read + Write | ✅ ครบ | ✅ รองรับ | ✅ ดี | Generate from scratch |
| SheetJS (xlsx) | Read + Write | ⚠️ จำกัด (Community) | ❌ | ⚠️ มี CVE | Data extraction / format conversion |
| xlsx-populate | Read + Write | ✅ ครบ | ❌ | ✅ ดี | Modify existing template |
| excel4node | Write only | ✅ ครบ | ❌ | ✅ ดี | ❌ deprecated (2020) |

---

## Frontend Integration

เรียก API จาก `right-panel.tsx` หรือ planner page โดยเพิ่ม export button:

```ts
// lib/api-client.ts — เพิ่ม export functions

export async function exportPDF(planData: ExportPayload): Promise<void> {
  const res = await fetch('/api/export/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(planData),
  })
  if (!res.ok) throw new Error('PDF export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cargo-report-${Date.now()}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportXLSX(planData: ExportPayload): Promise<void> {
  const res = await fetch('/api/export/xlsx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(planData),
  })
  if (!res.ok) throw new Error('XLSX export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `cargo-plan-${Date.now()}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
```

---

## ไฟล์ที่ต้องสร้าง / แก้ไข

```
stack-box-game/
├── app/api/export/
│   ├── pdf/route.ts              ← ใหม่
│   └── xlsx/route.ts             ← ใหม่
├── components/pdf/
│   ├── report-document.tsx       ← ใหม่ (PDF template)
│   └── styles.ts                 ← ใหม่
├── lib/
│   └── api-client.ts             ← แก้ไข: เพิ่ม exportPDF, exportXLSX
└── public/fonts/
    └── Prompt-Regular.ttf        ← ใหม่ (Thai font สำหรับ PDF)
```

---

## Checklist ก่อน Implement

- [ ] `npm install @react-pdf/renderer exceljs`
- [ ] วาง Thai font (.ttf) ใน `public/fonts/` และ register ใน `Font.register()`
- [ ] สร้าง `components/pdf/report-document.tsx` — PDF template
- [ ] สร้าง `app/api/export/pdf/route.ts` — ใช้ `renderToBuffer()`
- [ ] สร้าง `app/api/export/xlsx/route.ts` — ใช้ `ExcelJS.Workbook`
- [ ] เพิ่ม `exportPDF()` และ `exportXLSX()` ใน `lib/api-client.ts`
- [ ] เพิ่มปุ่ม Export PDF / Export XLSX ใน `right-panel.tsx`
- [ ] ทดสอบ Thai character แสดงถูกต้องใน PDF
- [ ] ทดสอบ XLSX เปิดได้ใน Excel และ Google Sheets
