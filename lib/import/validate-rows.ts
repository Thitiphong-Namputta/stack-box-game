import type { ParsedRow, FieldKey, ValidatedRow } from './types'

const TEMP_VALUES = ['ambient', 'chilled', 'frozen'] as const

function parseTruthy(v: string): boolean | null {
  const x = v.trim().toLowerCase()
  if (['1', 'true', 'yes', 'y', 'ใช่', 'จริง'].includes(x)) return true
  if (['0', 'false', 'no', 'n', 'ไม่', 'เท็จ', ''].includes(x)) return false
  return null
}

export function validateRows(
  rows: ParsedRow[],
  mapping: Partial<Record<FieldKey, string>>,
): ValidatedRow[] {
  return rows.map((row) => {
    const data: Record<string, string> = {}
    for (const [field, header] of Object.entries(mapping)) {
      if (header) data[field] = (row.data[header] ?? '').trim()
    }

    const errors: string[] = []

    const requireNumber = (field: string, label: string, min: number, max: number): number => {
      const raw = data[field] ?? ''
      if (!raw) { errors.push(`${label}: ไม่มีค่า`); return NaN }
      const v = parseFloat(raw)
      if (isNaN(v)) { errors.push(`${label}: "${raw}" ไม่ใช่ตัวเลข`); return NaN }
      if (v < min || v > max) { errors.push(`${label}: ${v} อยู่นอกช่วง ${min}–${max}`); return NaN }
      return v
    }

    const name = (data.name ?? '').trim()
    if (!name) errors.push('ชื่อสินค้า: ไม่มีค่า')

    const w = requireNumber('w', 'กว้าง', 1, 5000)
    const h = requireNumber('h', 'สูง', 1, 5000)
    const d = requireNumber('d', 'ลึก', 1, 5000)
    const weight = requireNumber('weight', 'น้ำหนัก', 0, 50000)
    const qty = data.qty ? Math.max(1, parseInt(data.qty, 10) || 1) : 1

    if (errors.length > 0) {
      return { rowNumber: row.rowNumber, rawData: data, errors, parsed: null }
    }

    const temperature = TEMP_VALUES.find((t) => t === data.temperature?.toLowerCase().trim())

    const parsed: NonNullable<ValidatedRow['parsed']> = {
      name,
      size: { w, h, d },
      weight,
      qty,
      category: data.category || undefined,
      fragile: data.fragile !== undefined ? (parseTruthy(data.fragile) ?? undefined) : undefined,
      thisSideUp: data.thisSideUp !== undefined ? (parseTruthy(data.thisSideUp) ?? undefined) : undefined,
      nonStackable: data.nonStackable !== undefined ? (parseTruthy(data.nonStackable) ?? undefined) : undefined,
      cannotBeStackedOn: data.cannotBeStackedOn !== undefined ? (parseTruthy(data.cannotBeStackedOn) ?? undefined) : undefined,
      maxStackWeight: data.maxStackWeight ? parseFloat(data.maxStackWeight) || undefined : undefined,
      hazmat: data.hazmat || undefined,
      priority: data.priority ? (Math.min(5, Math.max(1, parseInt(data.priority, 10))) as 1|2|3|4|5) : undefined,
      temperature,
    }

    return { rowNumber: row.rowNumber, rawData: data, errors: [], parsed }
  })
}
