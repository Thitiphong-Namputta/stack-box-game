'use client'

import { useSceneStore } from '@/store/use-scene-store'

export function CatalogDropPreview() {
  const { dragPreview, ghostOpacity } = useSceneStore()
  if (!dragPreview?.position) return null

  const { size, position, isValid } = dragPreview

  return (
    <mesh position={[position.x, position.y, position.z]}>
      <boxGeometry args={[size.w, size.h, size.d]} />
      <meshStandardMaterial
        color={isValid ? '#22c55e' : '#ef4444'}
        transparent
        opacity={ghostOpacity}
        depthWrite={false}
      />
    </mesh>
  )
}
