import { getEffectiveSize } from '@/store/use-scene-store'
import { footprintOverlaps } from '@/lib/packing/packing-utils'
import type { CargoBox } from '@/store/use-scene-store'

const EPS = 0.5

/** Returns boxes whose top surface supports the bottom of `box` */
export function findSupporters(box: CargoBox, allBoxes: CargoBox[]): CargoBox[] {
  const s = getEffectiveSize(box)
  const bottomY = box.position.y - s.h / 2
  if (bottomY < EPS) return [] // resting on floor

  return allBoxes.filter((other) => {
    if (other.id === box.id) return false
    const os = getEffectiveSize(other)
    const otherTop = other.position.y + os.h / 2
    if (Math.abs(otherTop - bottomY) > EPS) return false
    return footprintOverlaps(
      box.position.x, s.w, box.position.z, s.d,
      other.position.x, os.w, other.position.z, os.d,
    )
  })
}

/**
 * Compute the loading order for a set of boxes.
 *
 * Steps:
 * 1. Business sort: priority desc → Y asc → weight desc → fragile last
 * 2. Topological enforcement via ready-set: a box is "ready" only when all
 *    its supporters have already been placed.
 */
export function computeLoadingOrder(boxes: CargoBox[]): CargoBox[] {
  if (boxes.length === 0) return []

  // Step 1: business priority sort
  const businessSorted = [...boxes].sort((a, b) => {
    const pa = a.priority ?? 3
    const pb = b.priority ?? 3
    if (pa !== pb) return pb - pa // higher priority (= unloaded last) → loaded first

    const ay = a.position.y
    const by = b.position.y
    if (Math.abs(ay - by) > 1) return ay - by // lower Y first

    if (a.weight !== b.weight) return b.weight - a.weight // heavier first

    const af = a.fragile ?? false
    const bf = b.fragile ?? false
    if (af !== bf) return af ? 1 : -1 // non-fragile before fragile

    return a.id.localeCompare(b.id) // stable fallback
  })

  // Step 2: build supporter map
  const businessRank = new Map(businessSorted.map((b, i) => [b.id, i]))
  const supporterMap = new Map(
    boxes.map((b) => [b.id, new Set(findSupporters(b, boxes).map((s) => s.id))]),
  )

  const placed = new Set<string>()
  const result: CargoBox[] = []

  while (result.length < boxes.length) {
    // Pick all boxes whose supporters are already placed
    const ready = boxes.filter(
      (b) =>
        !placed.has(b.id) &&
        Array.from(supporterMap.get(b.id) ?? []).every((sid) => placed.has(sid)),
    )

    if (ready.length === 0) {
      // Circular dependency or broken graph — push remaining as-is
      console.error('[computeLoadingOrder] Cannot resolve support graph — appending remaining boxes')
      boxes.filter((b) => !placed.has(b.id)).forEach((b) => result.push(b))
      break
    }

    // Among ready boxes, pick by business rank
    ready.sort((a, b) => (businessRank.get(a.id) ?? 0) - (businessRank.get(b.id) ?? 0))
    const next = ready[0]
    placed.add(next.id)
    result.push(next)
  }

  return result
}
