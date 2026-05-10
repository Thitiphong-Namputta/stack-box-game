import { getEffectiveSize } from '@/store/use-scene-store'
import type { CargoBox, ContainerSize } from '@/store/use-scene-store'

export interface CoGResult {
  cog: { x: number; y: number; z: number }
  ideal: { x: number; y: number; z: number }
  deviation: {
    x: number
    y: number
    z: number
    magnitude: number
    pctX: number
    pctY: number
    pctZ: number
  }
  totalWeight: number
}

export function computeCoG(boxes: CargoBox[], container: ContainerSize): CoGResult | null {
  if (boxes.length === 0) return null

  const totalWeight = boxes.reduce((s, b) => s + (b.weight ?? 0), 0)
  if (totalWeight === 0) return null

  const weighted = boxes.reduce(
    (acc, b) => {
      const w = b.weight ?? 0
      acc.x += b.position.x * w
      acc.y += b.position.y * w
      acc.z += b.position.z * w
      return acc
    },
    { x: 0, y: 0, z: 0 }
  )

  const cog = {
    x: weighted.x / totalWeight,
    y: weighted.y / totalWeight,
    z: weighted.z / totalWeight,
  }

  // Ideal: centered on x,z; height = average half-box-height (bottom-heavy target)
  const avgBoxHalfH =
    boxes.reduce((s, b) => s + getEffectiveSize(b).h, 0) / (boxes.length * 2)

  const ideal = {
    x: container.w / 2,
    y: avgBoxHalfH,
    z: container.d / 2,
  }

  const dx = cog.x - ideal.x
  const dy = cog.y - ideal.y
  const dz = cog.z - ideal.z

  return {
    cog,
    ideal,
    deviation: {
      x: dx,
      y: dy,
      z: dz,
      magnitude: Math.sqrt(dx * dx + dy * dy + dz * dz),
      pctX: (dx / container.w) * 100,
      pctY: (dy / container.h) * 100,
      pctZ: (dz / container.d) * 100,
    },
    totalWeight,
  }
}
