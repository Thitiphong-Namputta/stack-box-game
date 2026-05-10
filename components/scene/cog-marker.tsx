'use client'

import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import { useSceneStore } from '@/store/use-scene-store'
import { computeCoG } from '@/lib/physics/center-of-gravity'
import { computeStability } from '@/lib/physics/stability'

const LEVEL_COLOR: Record<string, string> = {
  excellent: '#22c55e',
  good: '#3b82f6',
  warning: '#eab308',
  danger: '#ef4444',
}

export function CoGMarker() {
  const { boxes, containerSize, showCoG } = useSceneStore()

  const data = useMemo(() => {
    if (!showCoG || boxes.length === 0) return null
    const cog = computeCoG(boxes, containerSize)
    if (!cog) return null
    const stab = computeStability(cog, boxes, containerSize)
    const color = LEVEL_COLOR[stab.level]
    const deviationPoints: [number, number, number][] = [
      [cog.ideal.x, cog.ideal.y, cog.ideal.z],
      [cog.cog.x, cog.cog.y, cog.cog.z],
    ]
    const dropPoints: [number, number, number][] = [
      [cog.cog.x, 0, cog.cog.z],
      [cog.cog.x, cog.cog.y, cog.cog.z],
    ]
    return { cog, stab, color, deviationPoints, dropPoints }
  }, [boxes, containerSize, showCoG])

  if (!data) return null

  const { cog, color, deviationPoints, dropPoints } = data

  return (
    <group>
      {/* Actual CoG — solid colored sphere */}
      <mesh position={[cog.cog.x, cog.cog.y, cog.cog.z]}>
        <sphereGeometry args={[8, 24, 24]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>

      {/* Ideal CoG — wireframe sphere */}
      <mesh position={[cog.ideal.x, cog.ideal.y, cog.ideal.z]}>
        <sphereGeometry args={[6, 16, 16]} />
        <meshBasicMaterial color="#94a3b8" wireframe transparent opacity={0.5} />
      </mesh>

      {/* Deviation line: ideal → actual */}
      <Line points={deviationPoints} color={color} lineWidth={2} dashed dashSize={5} gapSize={3} />

      {/* Vertical drop line from CoG to floor */}
      <Line points={dropPoints} color={color} lineWidth={1} transparent opacity={0.3} />
    </group>
  )
}
