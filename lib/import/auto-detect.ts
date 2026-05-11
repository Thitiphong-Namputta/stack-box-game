import type { FieldKey } from './types'

const ALIAS_MAP: Record<FieldKey, string[]> = {
  name:             ['name', 'item', 'product', 'description', 'ชื่อ', 'ชื่อสินค้า', 'สินค้า'],
  w:                ['width', 'w', 'กว้าง', 'wide', 'ความกว้าง'],
  h:                ['height', 'h', 'สูง', 'tall', 'ความสูง'],
  d:                ['depth', 'd', 'length', 'l', 'long', 'ลึก', 'ยาว', 'ความลึก', 'ความยาว'],
  weight:           ['weight', 'kg', 'mass', 'น้ำหนัก', 'wt'],
  qty:              ['qty', 'quantity', 'count', 'จำนวน', 'pcs', 'pieces', 'amount'],
  category:         ['category', 'cat', 'type', 'ประเภท', 'class', 'group'],
  fragile:          ['fragile', 'breakable', 'เปราะ', 'แตกง่าย'],
  thisSideUp:       ['this_side_up', 'thissideup', 'side_up', 'up', 'ห้ามคว่ำ'],
  nonStackable:     ['non_stackable', 'nonstackable', 'no_stack', 'ห้ามทับ', 'ห้ามวางซ้อน'],
  cannotBeStackedOn:['cannot_be_stacked_on', 'floor_only', 'cannotbestackedon'],
  maxStackWeight:   ['max_stack_weight', 'maxstackweight', 'stack_limit', 'max_weight_above'],
  hazmat:           ['hazmat', 'un', 'un_code', 'dangerous_goods', 'dg', 'อันตราย'],
  priority:         ['priority', 'stop', 'sequence', 'unload_order', 'ลำดับ'],
  temperature:      ['temperature', 'temp', 'อุณหภูมิ', 'cold_chain'],
}

const norm = (s: string) =>
  s.toLowerCase()
    .replace(/\s*\(.*?\)\s*/g, '') // remove parenthetical e.g. "(cm)"
    .replace(/[\s\-_]+/g, '')       // remove spaces, dashes, underscores
    .trim()

export function detectMapping(headers: string[]): Partial<Record<FieldKey, string>> {
  const result: Partial<Record<FieldKey, string>> = {}
  for (const header of headers) {
    const n = norm(header)
    for (const [field, aliases] of Object.entries(ALIAS_MAP) as [FieldKey, string[]][]) {
      if (result[field]) continue
      if (aliases.some((a) => norm(a) === n)) {
        result[field] = header
        break
      }
    }
  }
  return result
}

export const REQUIRED_FIELDS: FieldKey[] = ['name', 'w', 'h', 'd', 'weight']

export const FIELD_LABELS: Record<FieldKey, string> = {
  name: 'ชื่อสินค้า', w: 'กว้าง (cm)', h: 'สูง (cm)', d: 'ลึก (cm)',
  weight: 'น้ำหนัก (kg)', qty: 'จำนวน', category: 'ประเภท',
  fragile: 'เปราะบาง', thisSideUp: 'ห้ามคว่ำ', nonStackable: 'ห้ามวางซ้อน',
  cannotBeStackedOn: 'วางได้เฉพาะพื้น', maxStackWeight: 'น้ำหนักทับสูงสุด (kg)',
  hazmat: 'รหัส UN (Hazmat)', priority: 'ลำดับการส่ง (1-5)', temperature: 'อุณหภูมิ',
}
