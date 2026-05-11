import * as THREE from 'three'
import { getEffectiveSize } from '@/store/use-scene-store'
import type { CargoBox, ContainerSize } from '@/store/use-scene-store'

export type ConstraintSeverity = 'error' | 'warning'

export interface ConstraintViolation {
  severity: ConstraintSeverity
  rule: string
  message: string
  boxIds: string[]
}

const EPS = 0.5

function footprintOverlaps(
  ax: number, aw: number, az: number, ad: number,
  bx: number, bw: number, bz: number, bd: number
): boolean {
  return (
    ax - aw / 2 < bx + bw / 2 &&
    ax + aw / 2 > bx - bw / 2 &&
    az - ad / 2 < bz + bd / 2 &&
    az + ad / 2 > bz - bd / 2
  )
}

/** Returns boxes physically resting on top of `box` */
export function findBoxesAbove(box: CargoBox, allBoxes: CargoBox[]): CargoBox[] {
  const s = getEffectiveSize(box)
  const topY = box.position.y + s.h / 2

  return allBoxes.filter((other) => {
    if (other.id === box.id) return false
    const os = getEffectiveSize(other)
    const otherBottomY = other.position.y - os.h / 2
    if (Math.abs(otherBottomY - topY) > EPS) return false
    return footprintOverlaps(
      box.position.x, s.w, box.position.z, s.d,
      other.position.x, os.w, other.position.z, os.d
    )
  })
}

/** Total weight of all boxes resting (transitively) on top of this one */
export function computeStackWeightOn(box: CargoBox, allBoxes: CargoBox[]): number {
  const visited = new Set<string>()
  const stack = [box]
  let total = 0

  while (stack.length > 0) {
    const current = stack.pop()!
    if (visited.has(current.id)) continue
    visited.add(current.id)

    const above = findBoxesAbove(current, allBoxes)
    for (const a of above) {
      if (!visited.has(a.id)) {
        total += a.weight ?? 0
        stack.push(a)
      }
    }
  }
  return total
}

const UPRIGHT_ORIENTATIONS = new Set([0, 1])

/** Validate ONE box placement against stacking constraints */
export function validateStackingConstraints(
  movingBox: CargoBox,
  newPos: THREE.Vector3,
  otherBoxes: CargoBox[]
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = []
  const s = getEffectiveSize(movingBox)
  const onFloor = Math.abs(newPos.y - s.h / 2) < EPS

  // Rule 1: thisSideUp — orientation must be 0 or 1
  if (movingBox.thisSideUp && !UPRIGHT_ORIENTATIONS.has(movingBox.orientationId ?? 0)) {
    violations.push({
      severity: 'error',
      rule: 'this-side-up',
      message: `${movingBox.name} ห้ามคว่ำ — ต้องอยู่ในแนวตั้งเท่านั้น`,
      boxIds: [movingBox.id],
    })
  }

  // Rule 2: cannotBeStackedOn — must be on floor
  if (movingBox.cannotBeStackedOn && !onFloor) {
    violations.push({
      severity: 'error',
      rule: 'cannot-be-stacked-on',
      message: `${movingBox.name} ต้องวางบนพื้นเท่านั้น`,
      boxIds: [movingBox.id],
    })
  }

  // Find boxes directly below the new position
  const tempBelow = otherBoxes.filter((other) => {
    const os = getEffectiveSize(other)
    const otherTopY = other.position.y + os.h / 2
    if (Math.abs(otherTopY - (newPos.y - s.h / 2)) > EPS) return false
    return footprintOverlaps(
      newPos.x, s.w, newPos.z, s.d,
      other.position.x, os.w, other.position.z, os.d
    )
  })

  // Rule 3: ห้ามวางบน nonStackable
  for (const below of tempBelow) {
    if (below.nonStackable) {
      violations.push({
        severity: 'error',
        rule: 'non-stackable',
        message: `ห้ามวาง ${movingBox.name} บน ${below.name} (nonStackable)`,
        boxIds: [movingBox.id, below.id],
      })
    }
  }

  // Rule 4 & 5: maxStackWeight / fragile
  const FRAGILE_DEFAULT = 50
  for (const below of tempBelow) {
    const isFragileCheck = below.fragile && below.maxStackWeight == null
    const hasMaxWeight = below.maxStackWeight != null

    if (!hasMaxWeight && !isFragileCheck) continue

    const limit = below.maxStackWeight ?? FRAGILE_DEFAULT
    const simulatedWorld = [
      ...otherBoxes,
      { ...movingBox, position: { x: newPos.x, y: newPos.y, z: newPos.z } },
    ]
    const stackW = computeStackWeightOn(below, simulatedWorld)

    if (stackW > limit) {
      if (below.fragile) {
        violations.push({
          severity: 'error',
          rule: 'fragile',
          message: `${below.name} เปราะ — รับน้ำหนักได้เพียง ${limit} kg (ปัจจุบัน ${stackW.toFixed(0)} kg)`,
          boxIds: [movingBox.id, below.id],
        })
      } else {
        violations.push({
          severity: 'error',
          rule: 'max-stack-weight',
          message: `${below.name} รับน้ำหนักได้สูงสุด ${limit} kg แต่จะมี ${stackW.toFixed(0)} kg ทับ`,
          boxIds: [movingBox.id, below.id],
        })
      }
    }
  }

  // Rule 6: Hazmat segregation
  if (movingBox.hazmat) {
    const tooClose = otherBoxes.filter((other) => {
      if (!other.hazmat || other.hazmat === movingBox.hazmat) return false
      const dist = Math.hypot(
        other.position.x - newPos.x,
        other.position.y - newPos.y,
        other.position.z - newPos.z
      )
      return dist < 100
    })
    if (tooClose.length > 0) {
      violations.push({
        severity: 'warning',
        rule: 'hazmat-segregation',
        message: `วัตถุอันตรายต่างประเภทใกล้กันเกินไป (${movingBox.hazmat} vs ${tooClose.map((t) => t.hazmat).join(', ')})`,
        boxIds: [movingBox.id, ...tooClose.map((t) => t.id)],
      })
    }
  }

  return violations
}

/** Validate the entire scene for all constraint violations (audit mode) */
export function auditAllConstraints(
  boxes: CargoBox[],
  _containerSize: ContainerSize
): ConstraintViolation[] {
  const all: ConstraintViolation[] = []
  for (const box of boxes) {
    const others = boxes.filter((b) => b.id !== box.id)
    const pos = new THREE.Vector3(box.position.x, box.position.y, box.position.z)
    all.push(...validateStackingConstraints(box, pos, others))
  }

  // Deduplicate by (rule, sorted boxIds)
  const seen = new Set<string>()
  return all.filter((v) => {
    const key = `${v.rule}:${[...v.boxIds].sort().join(',')}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
