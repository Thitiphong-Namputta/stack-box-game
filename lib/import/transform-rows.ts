import { nanoid } from 'nanoid'
import { getNextColor } from '@/store/use-scene-store'
import type { CargoBox, CatalogItem } from '@/store/use-scene-store'
import type { ValidatedRow } from './types'

export function rowsToBoxes(validated: ValidatedRow[]): CargoBox[] {
  const boxes: CargoBox[] = []
  for (const row of validated) {
    if (!row.parsed) continue
    for (let i = 0; i < row.parsed.qty; i++) {
      const suffix = row.parsed.qty > 1 ? ` #${i + 1}` : ''
      const s = row.parsed.size
      boxes.push({
        id: nanoid(),
        name: row.parsed.name + suffix,
        size: s,
        weight: row.parsed.weight,
        color: getNextColor(),
        position: { x: s.w / 2, y: s.h / 2, z: s.d / 2 },
        category: row.parsed.category,
        orientationId: 0,
        fragile: row.parsed.fragile,
        thisSideUp: row.parsed.thisSideUp,
        nonStackable: row.parsed.nonStackable,
        cannotBeStackedOn: row.parsed.cannotBeStackedOn,
        maxStackWeight: row.parsed.maxStackWeight,
        hazmat: row.parsed.hazmat,
        priority: row.parsed.priority,
        temperature: row.parsed.temperature,
      })
    }
  }
  return boxes
}

export function rowsToCatalogItems(
  validated: ValidatedRow[],
): Omit<CatalogItem, 'id'>[] {
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
      cannotBeStackedOn: row.parsed.cannotBeStackedOn,
      maxStackWeight: row.parsed.maxStackWeight,
      hazmat: row.parsed.hazmat,
      priority: row.parsed.priority,
      temperature: row.parsed.temperature,
    })
  }
  return items
}
