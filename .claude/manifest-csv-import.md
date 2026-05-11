# Manifest CSV Import

## ภาพรวม

อนุญาตให้ผู้ใช้ import กล่องสินค้าจำนวนมากจากไฟล์ CSV/Excel — มี mapping wizard, validation preview, error reporting, และ option ให้บันทึกเป็น catalog items หรือ add ลง plan ปัจจุบันเลย

**ผลกระทบ**: ลดเวลา setup จากชั่วโมงเหลือไม่กี่วินาทีสำหรับ user ที่มีรายการสินค้าจาก ERP/WMS อยู่แล้ว
**ระดับความซับซ้อน**: 🟢 ง่าย-ปานกลาง (2–3 วัน)
**ขึ้นกับ feature อื่น**: ทำงานคู่กับ Stacking Constraints (ถ้ามี constraint columns)

---

## เป้าหมายของฟีเจอร์

1. รับไฟล์ **.csv** หรือ **.xlsx** ผ่าน drag-and-drop หรือ file picker
2. **Auto-detect columns** — match column header กับ field ที่ระบบรู้จัก (name, w, h, d, weight, qty, ...)
3. **Manual column mapping** — ถ้า auto-detect ไม่ตรง user override ได้
4. **Preview table** ก่อน import จริง — แสดง 50 แถวแรก, highlight rows ที่มี error
5. **Quantity expansion** — แถวเดียวที่มี qty=10 → expand เป็น 10 boxes
6. **Bulk validate** — ก่อน import เช็คว่าทั้งหมดใส่ตู้ปัจจุบันได้หรือไม่
7. **Import target options**:
   - "Add to current plan" → เพิ่มกล่องลง scene เลย (auto-place หรือใช้ template position)
   - "Save to catalog" → เพิ่มเป็น catalog items reuse ได้
   - "Both"
8. **Download error report** — ถ้ามี rows ที่ fail download CSV ที่บอกว่าผิดอะไรแถวไหน

---

## Supported Format

### Required columns (ขั้นต่ำ)
| Header (any of) | Maps to | Type | Required |
|---|---|---|---|
| `name`, `Name`, `item`, `Product`, `ชื่อ`, `ชื่อสินค้า` | `name` | string | ✅ |
| `width`, `w`, `กว้าง`, `กว้าง (cm)` | `size.w` | number (cm) | ✅ |
| `height`, `h`, `สูง`, `สูง (cm)` | `size.h` | number (cm) | ✅ |
| `depth`, `d`, `length`, `ลึก`, `ยาว` | `size.d` | number (cm) | ✅ |
| `weight`, `kg`, `น้ำหนัก`, `น้ำหนัก (kg)` | `weight` | number (kg) | ✅ |

### Optional columns
| Header | Maps to |
|---|---|
| `qty`, `quantity`, `count`, `จำนวน` | expansion factor |
| `category`, `type`, `ประเภท` | `category` |
| `fragile` | `fragile` (1/0/yes/no/true/false) |
| `this_side_up`, `up`, `thisSideUp` | `thisSideUp` |
| `non_stackable` | `nonStackable` |
| `max_stack_weight` | `maxStackWeight` |
| `hazmat`, `un_code` | `hazmat` |
| `priority`, `stop` | `priority` |
| `temperature`, `temp` | `temperature` |

### Sample CSV
```csv
name,width,height,depth,weight,qty,category,fragile
Standard Box A,60,40,40,12,5,Standard,0
Wine Case,35,35,35,15,8,Beverages,1
Hazardous Drum,50,80,50,100,2,Chemical,0
```

---

## โครงสร้างไฟล์ที่จะเพิ่ม/แก้ไข

```
stack-box-game/
├── components/
│   └── custom/
│       ├── import-dialog.tsx         ← ใหม่ — main wizard component
│       ├── import-dropzone.tsx       ← ใหม่ — drag-and-drop UI
│       ├── column-mapper.tsx         ← ใหม่ — header → field mapping table
│       └── import-preview.tsx        ← ใหม่ — preview table with errors
├── lib/
│   └── import/
│       ├── parse.ts                  ← ใหม่ — CSV/XLSX parsing
│       ├── auto-detect.ts            ← ใหม่ — column header matching
│       ├── validate-rows.ts          ← ใหม่ — row-level validation
│       └── transform-rows.ts         ← ใหม่ — rows → CargoBox[]
└── app/
    ├── catalog/page.tsx              ← แก้ไข — เพิ่มปุ่ม "Import CSV"
    └── planner/page.tsx              ← แก้ไข — เพิ่มปุ่ม "Import" ใน Items tab
```

---

## Phase 1 — Parse Layer (~3 ชม.)

ใช้ library:
- **CSV**: `papaparse` (เบา, มาตรฐาน)
- **XLSX**: `exceljs` (มีอยู่แล้วในโปรเจกต์ — ใช้ซ้ำได้)

### `lib/import/parse.ts`

```ts
import Papa from 'papaparse'
import ExcelJS from 'exceljs'

export interface ParsedRow {
  rowNumber: number       // 1-indexed (header = row 0)
  data: Record<string, string>  // raw string values
}

export interface ParsedFile {
  headers: string[]
  rows: ParsedRow[]
  errors: string[]
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase()

  if (ext === 'csv') return parseCSV(file)
  if (ext === 'xlsx' || ext === 'xls') return parseXLSX(file)

  return { headers: [], rows: [], errors: [`Unsupported file type: .${ext}`] }
}

function parseCSV(file: File): Promise<ParsedFile> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        resolve({
          headers: results.meta.fields ?? [],
          rows: (results.data as Record<string, string>[]).map((data, i) => ({
            rowNumber: i + 2,
            data,
          })),
          errors: results.errors.map((e) => `Row ${e.row}: ${e.message}`),
        })
      },
    })
  })
}

async function parseXLSX(file: File): Promise<ParsedFile> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(await file.arrayBuffer())

  const sheet = wb.worksheets[0]
  if (!sheet) return { headers: [], rows: [], errors: ['Empty workbook'] }

  // Row 1 = headers
  const headerRow = sheet.getRow(1)
  const headers: string[] = []
  headerRow.eachCell((cell, col) => {
    headers[col - 1] = String(cell.value ?? '').trim()
  })

  const rows: ParsedRow[] = []
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r)
    if (!row.hasValues) continue
    const data: Record<string, string> = {}
    headers.forEach((h, i) => {
      const cell = row.getCell(i + 1)
      data[h] = String(cell.value ?? '').trim()
    })
    rows.push({ rowNumber: r, data })
  }

  return { headers, rows, errors: [] }
}
```

---

## Phase 2 — Auto-Detect Column Mapping (~2 ชม.)

### `lib/import/auto-detect.ts`

```ts
export type FieldKey =
  | 'name' | 'w' | 'h' | 'd' | 'weight' | 'qty'
  | 'category' | 'fragile' | 'thisSideUp' | 'nonStackable'
  | 'maxStackWeight' | 'hazmat' | 'priority' | 'temperature'

const ALIAS_MAP: Record<FieldKey, string[]> = {
  name:           ['name', 'item', 'product', 'description', 'ชื่อ', 'ชื่อสินค้า'],
  w:              ['width', 'w', 'กว้าง', 'wide'],
  h:              ['height', 'h', 'สูง', 'tall'],
  d:              ['depth', 'd', 'length', 'l', 'long', 'ลึก', 'ยาว'],
  weight:         ['weight', 'kg', 'mass', 'น้ำหนัก'],
  qty:            ['qty', 'quantity', 'count', 'จำนวน', 'pcs', 'pieces'],
  category:       ['category', 'cat', 'type', 'ประเภท', 'class'],
  fragile:        ['fragile', 'breakable', 'เปราะ'],
  thisSideUp:     ['this_side_up', 'thissideup', 'side_up', 'up', 'ห้ามคว่ำ'],
  nonStackable:   ['non_stackable', 'nonstackable', 'no_stack', 'ห้ามทับ'],
  maxStackWeight: ['max_stack_weight', 'maxstackweight', 'stack_limit'],
  hazmat:         ['hazmat', 'un', 'un_code', 'dangerous_goods', 'dg'],
  priority:       ['priority', 'stop', 'sequence', 'unload_order'],
  temperature:    ['temperature', 'temp', 'อุณหภูมิ'],
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[\s\-_(]+(cm|kg|m|).*$/, '').replace(/[^\p{L}\p{N}_]/gu, '')

export function detectMapping(headers: string[]): Partial<Record<FieldKey, string>> {
  const result: Partial<Record<FieldKey, string>> = {}

  for (const header of headers) {
    const n = norm(header)
    for (const [field, aliases] of Object.entries(ALIAS_MAP) as [FieldKey, string[]][]) {
      if (result[field]) continue  // already mapped
      if (aliases.some((a) => norm(a) === n)) {
        result[field] = header
        break
      }
    }
  }
  return result
}
```

---

## Phase 3 — Validate + Transform (~3 ชม.)

### `lib/import/validate-rows.ts`

```ts
import type { ParsedRow } from './parse'
import type { FieldKey } from './auto-detect'

export interface ValidatedRow {
  rowNumber: number
  data: Record<FieldKey, string>
  errors: string[]
  parsed: {
    name: string
    size: { w: number; h: number; d: number }
    weight: number
    qty: number
    category?: string
    fragile?: boolean
    thisSideUp?: boolean
    nonStackable?: boolean
    maxStackWeight?: number
    hazmat?: string
    priority?: number
    temperature?: 'ambient' | 'chilled' | 'frozen'
  } | null
}

const truthy = (v: string): boolean | null => {
  const x = v.trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', 'ใช่', 'จริง'].includes(x)) return true
  if (['0', 'false', 'no', 'n', 'ไม่', 'เท็จ', ''].includes(x)) return false
  return null
}

export function validateRows(
  rows: ParsedRow[],
  mapping: Partial<Record<FieldKey, string>>
): ValidatedRow[] {
  return rows.map((row) => {
    const data: Record<string, string> = {}
    for (const [field, header] of Object.entries(mapping)) {
      if (header) data[field] = row.data[header] ?? ''
    }

    const errors: string[] = []

    const requireNumber = (field: FieldKey, label: string, min = 1, max = 5000) => {
      const v = parseFloat(data[field])
      if (isNaN(v)) {
        errors.push(`${label}: ไม่ใช่ตัวเลข (${data[field] || 'empty'})`)
        return NaN
      }
      if (v < min || v > max) {
        errors.push(`${label}: ${v} อยู่นอกช่วง ${min}-${max}`)
        return NaN
      }
      return v
    }

    const name = (data.name ?? '').trim()
    if (!name) errors.push('ไม่มีชื่อ')

    const w = requireNumber('w', 'Width')
    const h = requireNumber('h', 'Height')
    const d = requireNumber('d', 'Depth')
    const weight = requireNumber('weight', 'Weight', 0, 10000)
    const qty = data.qty ? Math.max(1, parseInt(data.qty, 10) || 1) : 1

    if (errors.length > 0) {
      return { rowNumber: row.rowNumber, data: data as never, errors, parsed: null }
    }

    const parsed: ValidatedRow['parsed'] = {
      name,
      size: { w, h, d },
      weight,
      qty,
      category: data.category || undefined,
      fragile:        data.fragile        ? !!truthy(data.fragile)        : undefined,
      thisSideUp:     data.thisSideUp     ? !!truthy(data.thisSideUp)     : undefined,
      nonStackable:   data.nonStackable   ? !!truthy(data.nonStackable)   : undefined,
      maxStackWeight: data.maxStackWeight ? parseFloat(data.maxStackWeight) : undefined,
      hazmat:         data.hazmat || undefined,
      priority:       data.priority ? parseInt(data.priority, 10) || undefined : undefined,
      temperature:    (['ambient', 'chilled', 'frozen'].includes(data.temperature?.toLowerCase())
                        ? data.temperature.toLowerCase() as 'ambient'|'chilled'|'frozen'
                        : undefined),
    }

    return { rowNumber: row.rowNumber, data: data as never, errors: [], parsed }
  })
}
```

### `lib/import/transform-rows.ts`

```ts
import { nanoid } from 'nanoid'
import { getNextColor } from '@/store/use-scene-store'
import type { CargoBox, CatalogItem } from '@/store/use-scene-store'
import type { ValidatedRow } from './validate-rows'

export function rowsToBoxes(validated: ValidatedRow[]): CargoBox[] {
  const boxes: CargoBox[] = []
  for (const row of validated) {
    if (!row.parsed) continue
    for (let i = 0; i < row.parsed.qty; i++) {
      const suffix = row.parsed.qty > 1 ? ` #${i + 1}` : ''
      boxes.push({
        id: nanoid(),
        name: row.parsed.name + suffix,
        size: row.parsed.size,
        weight: row.parsed.weight,
        color: getNextColor(),
        position: {
          x: row.parsed.size.w / 2,
          y: row.parsed.size.h / 2,
          z: row.parsed.size.d / 2,
        },
        category: row.parsed.category,
        orientationId: 0,
        fragile: row.parsed.fragile,
        thisSideUp: row.parsed.thisSideUp,
        nonStackable: row.parsed.nonStackable,
        maxStackWeight: row.parsed.maxStackWeight,
        hazmat: row.parsed.hazmat,
        priority: row.parsed.priority as 1|2|3|4|5,
        temperature: row.parsed.temperature,
      })
    }
  }
  return boxes
}

export function rowsToCatalogItems(
  validated: ValidatedRow[]
): Omit<CatalogItem, 'id'>[] {
  // Deduplicate by name + size signature
  const seen = new Set<string>()
  const items: Omit<CatalogItem, 'id'>[] = []
  for (const row of validated) {
    if (!row.parsed) continue
    const key = `${row.parsed.name}|${row.parsed.size.w}x${row.parsed.size.h}x${row.parsed.size.d}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      name: row.parsed.name,
      size: row.parsed.size,
      weight: row.parsed.weight,
      category: row.parsed.category,
      fragile: row.parsed.fragile,
      thisSideUp: row.parsed.thisSideUp,
      nonStackable: row.parsed.nonStackable,
      maxStackWeight: row.parsed.maxStackWeight,
      hazmat: row.parsed.hazmat,
      priority: row.parsed.priority,
      temperature: row.parsed.temperature,
    })
  }
  return items
}
```

---

## Phase 4 — Wizard UI (~5 ชม.)

3-step wizard ใน `<Dialog>` หรือ full-screen `<Sheet>`:

### Step 1 — Upload

```tsx
<ImportDropzone
  onFile={async (file) => {
    setFileName(file.name)
    const parsed = await parseFile(file)
    setHeaders(parsed.headers)
    setRows(parsed.rows)
    setMapping(detectMapping(parsed.headers))
    setStep('mapping')
  }}
/>
```

แสดง drag-and-drop zone + file picker + sample CSV download link

### Step 2 — Column Mapping

```tsx
<ColumnMapper
  headers={headers}
  mapping={mapping}
  onChange={setMapping}
/>
```

ตารางที่แสดง:
| Required | Field | Mapped to header | Sample value |
|---|---|---|---|
| ✅ | Name | `<Select> name` | "Standard Box A" |
| ✅ | Width | `<Select> width` | "60" |
| ✅ | Height | `<Select> height` | "40" |
| ... | | | |

แต่ละ row มี dropdown ให้เลือก header จากไฟล์ — value ตัวอย่างจากแถวแรกของ data

### Step 3 — Preview + Confirm

```tsx
<ImportPreview validated={validated} />

<div className="flex gap-3 mt-4">
  <label className="flex items-center gap-2">
    <input type="checkbox" checked={addToPlan} onChange={...} />
    Add to current plan ({totalBoxes} boxes after qty expansion)
  </label>
  <label className="flex items-center gap-2">
    <input type="checkbox" checked={saveToCatalog} onChange={...} />
    Save unique items to catalog ({uniqueItems} items)
  </label>
</div>

<button onClick={handleImport} disabled={errorCount > 0 && !skipErrors}>
  Import {validRowCount} rows
</button>
```

Preview table แสดงทั้งหมด (paginated) — error rows highlight สีแดง พร้อม tooltip ข้อผิดพลาด

---

## Phase 5 — Import Execution (~2 ชม.)

```ts
async function handleImport() {
  const validated = validateRows(rows, mapping)
  const valid = validated.filter((v) => v.errors.length === 0)

  // 1. Save to catalog (if option checked) — get DB ids back
  let catalogItemMap = new Map<string, string>()  // localKey → real id
  if (saveToCatalog) {
    const items = rowsToCatalogItems(valid)
    const created = await Promise.all(
      items.map((item) => createCatalogItem(item))
    )
    created.forEach((c, i) => {
      catalogItemMap.set(`${items[i].name}|${items[i].size.w}x${items[i].size.h}x${items[i].size.d}`, c.id)
      addCatalogItemWithId(c)
    })
  }

  // 2. Add to plan (if option checked)
  if (addToPlan) {
    const boxes = rowsToBoxes(valid)
    // Auto-place each box (use existing getSuggestedPosition)
    for (const box of boxes) {
      const suggested = getSuggestedPosition(box)
      if (suggested) {
        box.position = { x: suggested.x, y: suggested.y, z: suggested.z }
      }
      addBox(box)
    }
    logStep('addBox', `Imported ${boxes.length} boxes from ${fileName}`)
  }

  // 3. Show summary toast
  setSummary({
    imported: valid.length,
    expanded: rowsToBoxes(valid).length,
    failed: validated.length - valid.length,
  })
  setStep('done')
}
```

---

## Phase 6 — Error Report Download (~1 ชม.)

ในขั้น Preview (Step 3) เพิ่มปุ่ม "Download error report":

```ts
function downloadErrorReport() {
  const errors = validated.filter((v) => v.errors.length > 0)
  const csv = [
    'Row,Name,Errors,Original Data',
    ...errors.map((e) => [
      e.rowNumber,
      e.data.name ?? '',
      `"${e.errors.join('; ')}"`,
      `"${JSON.stringify(e.data).replace(/"/g, '""')}"`,
    ].join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `import-errors-${Date.now()}.csv`
  a.click()
}
```

---

## Phase 7 — Entry Points (~1 ชม.)

### Catalog page

```tsx
// app/catalog/page.tsx — beside "เพิ่มสินค้า" button
<button
  type="button"
  onClick={() => setImportOpen(true)}
  className="flex items-center gap-2 px-4 py-2 rounded-lg an-btn-outline-primary"
>
  <Upload className="w-4 h-4" />
  Import CSV/Excel
</button>

<ImportDialog open={importOpen} onOpenChange={setImportOpen} target="catalog" />
```

### Planner page (Items tab)

```tsx
// In ItemsTab — add another button next to "Add Item"
<button onClick={() => setImportOpen(true)} className="...">
  <Upload className="w-3.5 h-3.5" />
  Import
</button>
```

---

## Acceptance Criteria

- [x] Drop a `.csv` file → wizard opens with step "Upload"
- [x] Auto-detect maps common headers (`name`, `width`, `weight`) ถูกต้อง
- [x] User สามารถ override mapping ได้
- [x] Preview แสดงทุก row + highlight errors
- [x] qty=10 → expand เป็น 10 boxes ในผลลัพธ์
- [x] Required field ที่หายไป → row error: "Width: ไม่ใช่ตัวเลข"
- [x] Boolean fields รับ `1/0/yes/no/true/false` ทั้งหมด
- [x] Boxes import เข้า plan ปัจจุบัน auto-place ผ่าน suggestPosition
- [x] Catalog import บันทึกเข้า DB + show ใน catalog ทันที
- [x] Error report CSV ดาวน์โหลดได้
- [x] รองรับ .xlsx เหมือน .csv
- [x] ภาษาไทยใน column header (เช่น "ชื่อสินค้า") ทำงานได้

---

## Edge Cases

| Case | Behavior |
|---|---|
| ไฟล์ใหญ่ 10,000 rows | Parse เร็ว, preview จำกัด 50 rows + paginate, import ทำเป็น batches |
| Header มีช่องว่าง / อักขระพิเศษ | `transformHeader: (h) => h.trim()` |
| ไม่มี header row (data starts row 1) | Provide toggle "First row is data, not header" |
| Excel มีหลาย sheet | ใช้ sheet แรก + แสดง warning + selector ให้เปลี่ยน |
| Excel cell มี formula | ExcelJS คืน `result` ของ formula โดย default — ใช้ได้เลย |
| Encoding ผิด (UTF-8 BOM, Windows-1252) | Papaparse handle BOM อัตโนมัติ — for non-UTF8 ขอแสดง warning |
| Box ขนาดใหญ่กว่าตู้ → unfit | ระหว่าง import ยังเพิ่มได้ — auto-place หาที่ไม่ได้ → unfit list |
| User กดปิด dialog ระหว่าง import | Cancel ตามที่กำลัง import (Promise.race vs cancel signal) |

---

## Future Enhancements

- **Templates library** — pre-made CSV templates for common ERPs (SAP, Odoo)
- **API import** — fetch จาก REST endpoint ของ user แทน upload file
- **Scheduled imports** — cron-style auto-fetch ทุก N hours
- **Conflict resolution** — ถ้ามี catalog item ชื่อเดียวกันอยู่แล้ว → choose: skip, overwrite, rename
- **Export Plan as importable CSV** — round-trip workflow
- **Drag-from-Excel** — paste cells โดยตรงจาก Excel clipboard ลงใน app
