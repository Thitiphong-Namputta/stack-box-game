import type { CargoBox, ContainerSize } from '@/store/use-scene-store'
import type { CoGResult } from './center-of-gravity'

export type StabilityLevel = 'excellent' | 'good' | 'warning' | 'danger'

export interface StabilityResult {
  score: number
  level: StabilityLevel
  warnings: string[]
  axleDistribution: {
    front: { weight: number; pct: number }
    rear: { weight: number; pct: number }
    balanced: boolean
  }
  cogHeightPct: number
}

export function computeStability(
  cog: CoGResult,
  boxes: CargoBox[],
  container: ContainerSize
): StabilityResult {
  const heightPct = (cog.cog.y / container.h) * 100
  const heightFactor = Math.max(0, heightPct / 100 - 0.5)

  const xPenalty = Math.abs(cog.deviation.pctX) * 1.5
  const zPenalty = Math.abs(cog.deviation.pctZ) * 1.5
  const heightPenalty = heightFactor * 100 * 2.0

  const score = Math.max(0, Math.min(100, 100 - xPenalty - zPenalty - heightPenalty))

  let level: StabilityLevel = 'excellent'
  if (score < 40) level = 'danger'
  else if (score < 60) level = 'warning'
  else if (score < 80) level = 'good'

  const warnings: string[] = []
  if (Math.abs(cog.deviation.pctX) > 10)
    warnings.push(`CoG เอียงในแกน X เกิน 10% (${cog.deviation.pctX.toFixed(1)}%)`)
  if (Math.abs(cog.deviation.pctZ) > 10)
    warnings.push(`CoG เอียงในแกน Z เกิน 10% (${cog.deviation.pctZ.toFixed(1)}%)`)
  if (heightPct > 60)
    warnings.push(`CoG สูงเกินครึ่งตู้ (${heightPct.toFixed(0)}%) — เสี่ยงพลิก`)

  // Axle distribution: x-axis = container length; front = near x=0, rear = near x=W
  const frontWeight = boxes.reduce((s, b) => {
    const lever = (container.w - b.position.x) / container.w
    return s + (b.weight ?? 0) * lever
  }, 0)
  const rearWeight = cog.totalWeight - frontWeight
  const frontPct = cog.totalWeight > 0 ? (frontWeight / cog.totalWeight) * 100 : 50
  const balanced = Math.abs(frontPct - 50) <= 10

  if (!balanced)
    warnings.push(
      `น้ำหนักไม่สมดุล Front/Rear (${frontPct.toFixed(0)}%/${(100 - frontPct).toFixed(0)}%)`
    )

  return {
    score,
    level,
    warnings,
    axleDistribution: {
      front: { weight: frontWeight, pct: frontPct },
      rear: { weight: rearWeight, pct: 100 - frontPct },
      balanced,
    },
    cogHeightPct: heightPct,
  }
}
