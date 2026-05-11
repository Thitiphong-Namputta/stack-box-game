export interface ParsedRow {
  rowNumber: number
  data: Record<string, string>
}

export interface ParsedFile {
  headers: string[]
  rows: ParsedRow[]
  errors: string[]
}

export type FieldKey =
  | 'name' | 'w' | 'h' | 'd' | 'weight' | 'qty'
  | 'category' | 'fragile' | 'thisSideUp' | 'nonStackable' | 'cannotBeStackedOn'
  | 'maxStackWeight' | 'hazmat' | 'priority' | 'temperature'

export interface ValidatedRow {
  rowNumber: number
  rawData: Record<string, string>
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
    cannotBeStackedOn?: boolean
    maxStackWeight?: number
    hazmat?: string
    priority?: 1 | 2 | 3 | 4 | 5
    temperature?: 'ambient' | 'chilled' | 'frozen'
  } | null
}
