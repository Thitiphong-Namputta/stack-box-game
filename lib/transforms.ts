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
  }
}
