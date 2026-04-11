'use client'

import * as THREE from 'three'
import { useSceneStore } from '@/store/use-scene-store'

export function CargoContainer() {
  const { containerSize } = useSceneStore()
  const { w, h, d } = containerSize

  // Container is positioned with bottom at y=0, centered on x and z
  const position: [number, number, number] = [w / 2, h / 2, d / 2]

  return (
    <group>
      {/* Wireframe box */}
      <lineSegments position={position}>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color="#64748b" linewidth={2} />
      </lineSegments>

      {/* Semi-transparent walls */}
      <mesh position={position}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color="#1e293b" transparent opacity={0.05} side={THREE.BackSide} />
      </mesh>

      {/* Floor grid plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0, d / 2]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.3} />
      </mesh>
    </group>
  )
}
