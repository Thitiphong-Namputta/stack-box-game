'use client'

import { Html } from '@react-three/drei'
import { getEffectiveSize } from '@/store/use-scene-store'
import type { CargoBox } from '@/store/use-scene-store'

interface Props {
  box: CargoBox
}

export function ConstraintIcons({ box }: Props) {
  const e = getEffectiveSize(box)
  const topY = e.h / 2 + 8

  const icons: { emoji: string; label: string }[] = []
  if (box.fragile) icons.push({ emoji: '🍷', label: 'Fragile' })
  if (box.thisSideUp) icons.push({ emoji: '⬆️', label: 'This Side Up' })
  if (box.nonStackable) icons.push({ emoji: '🚫', label: 'Non-stackable' })
  if (box.hazmat) icons.push({ emoji: '⚠️', label: box.hazmat })

  if (icons.length === 0) return null

  return (
    <Html position={[0, topY, 0]} center distanceFactor={300}>
      <div className="flex gap-0.5 pointer-events-none select-none">
        {icons.map((i, idx) => (
          <span
            key={idx}
            title={i.label}
            className="text-xs bg-white/90 dark:bg-black/70 rounded shadow px-1 py-0.5"
          >
            {i.emoji}
          </span>
        ))}
      </div>
    </Html>
  )
}
