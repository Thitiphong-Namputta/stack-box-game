import type { Box, Plan, CatalogItem as PrismaCatalogItem } from './generated/prisma'
import type { SavedPlan, CargoBox, CatalogItem, ContainerSize } from '@/store/use-scene-store'

// ── Prisma → Zustand ────────────────────────────────────────────────

export function toCargoBox(box: Box): CargoBox {
  return {
    id: box.id,
    name: box.name,
    weight: box.weight,
    color: box.color,
    category: box.category ?? undefined,
    orientationId: (Math.min(5, Math.max(0, box.orientationId)) as 0 | 1 | 2 | 3 | 4 | 5),
    size: { w: box.sizeW, h: box.sizeH, d: box.sizeD },
    position: { x: box.posX, y: box.posY, z: box.posZ },
    fragile: box.fragile || undefined,
    thisSideUp: box.thisSideUp || undefined,
    nonStackable: box.nonStackable || undefined,
    cannotBeStackedOn: box.cannotBeStackedOn || undefined,
    maxStackWeight: box.maxStackWeight ?? undefined,
    hazmat: box.hazmat ?? undefined,
    temperature: (box.temperature as CargoBox['temperature']) ?? undefined,
    priority: (box.priority as CargoBox['priority']) ?? undefined,
  }
}

export function toSavedPlan(plan: Plan & { boxes: Box[] }): SavedPlan {
  let containerSize: ContainerSize
  try {
    containerSize = JSON.parse(plan.containerSize) as ContainerSize
  } catch {
    containerSize = { w: 600, h: 240, d: 240, maxWeight: 20000 }
  }
  return {
    id: plan.id,
    name: plan.name,
    savedAt: plan.savedAt.getTime(),
    containerSize,
    boxes: plan.boxes.map(toCargoBox),
  }
}

export function toCatalogItem(row: PrismaCatalogItem): CatalogItem {
  return {
    id: row.id,
    name: row.name,
    weight: row.weight,
    category: row.category ?? undefined,
    size: { w: row.sizeW, h: row.sizeH, d: row.sizeD },
    fragile: row.fragile || undefined,
    thisSideUp: row.thisSideUp || undefined,
    nonStackable: row.nonStackable || undefined,
    cannotBeStackedOn: row.cannotBeStackedOn || undefined,
    maxStackWeight: row.maxStackWeight ?? undefined,
    hazmat: row.hazmat ?? undefined,
    temperature: (row.temperature as CatalogItem['temperature']) ?? undefined,
    priority: (row.priority as CatalogItem['priority']) ?? undefined,
  }
}

// ── Zustand → Prisma input ──────────────────────────────────────────

export function toBoxData(box: CargoBox) {
  return {
    id: box.id,
    name: box.name,
    weight: box.weight,
    color: box.color,
    category: box.category ?? null,
    orientationId: box.orientationId ?? 0,
    sizeW: box.size.w,
    sizeH: box.size.h,
    sizeD: box.size.d,
    posX: box.position.x,
    posY: box.position.y,
    posZ: box.position.z,
    fragile: box.fragile ?? false,
    thisSideUp: box.thisSideUp ?? false,
    nonStackable: box.nonStackable ?? false,
    cannotBeStackedOn: box.cannotBeStackedOn ?? false,
    maxStackWeight: box.maxStackWeight ?? null,
    hazmat: box.hazmat ?? null,
    temperature: box.temperature ?? null,
    priority: box.priority ?? 3,
  }
}

export function toCatalogItemData(item: Omit<CatalogItem, 'id'>, userId: string) {
  return {
    name: item.name,
    weight: item.weight,
    category: item.category ?? null,
    userId,
    sizeW: item.size.w,
    sizeH: item.size.h,
    sizeD: item.size.d,
    fragile: item.fragile ?? false,
    thisSideUp: item.thisSideUp ?? false,
    nonStackable: item.nonStackable ?? false,
    cannotBeStackedOn: item.cannotBeStackedOn ?? false,
    maxStackWeight: item.maxStackWeight ?? null,
    hazmat: item.hazmat ?? null,
    temperature: item.temperature ?? null,
    priority: item.priority ?? 3,
  }
}
