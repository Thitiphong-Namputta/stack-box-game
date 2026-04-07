'use client'

import { useRef, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Environment } from '@react-three/drei'
import { useSceneStore } from '@/store/useSceneStore'
import { CargoContainer } from './CargoContainer'
import { CargoBox } from './CargoBox'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export function SceneCanvas() {
  const { boxes, containerSize, setSelected } = useSceneStore()
  const orbitRef = useRef<OrbitControlsImpl>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDragStart = useCallback(() => {
    setIsDragging(true)
    if (orbitRef.current) orbitRef.current.enabled = false
  }, [])

  const handleDragEnd = useCallback(() => {
    setIsDragging(false)
    if (orbitRef.current) orbitRef.current.enabled = true
  }, [])

  const centerX = containerSize.w / 2
  const centerZ = containerSize.d / 2

  return (
    <Canvas
      shadows
      camera={{
        position: [containerSize.w * 1.2, containerSize.h * 1.5, containerSize.d * 1.5],
        fov: 50,
        near: 1,
        far: 10000,
      }}
      onPointerMissed={() => setSelected(null)}
      className="w-full h-full"
    >
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[containerSize.w, containerSize.h * 2, containerSize.d]}
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-200, 300, -200]} intensity={0.5} />

      {/* Environment */}
      <Environment preset="city" />

      {/* Grid */}
      <Grid
        position={[centerX, 0, centerZ]}
        args={[containerSize.w + 200, containerSize.d + 200]}
        cellSize={containerSize.w / 10}
        cellThickness={0.5}
        cellColor="#334155"
        sectionSize={containerSize.w / 2}
        sectionThickness={1}
        sectionColor="#475569"
        fadeDistance={2000}
        fadeStrength={1}
        infiniteGrid={false}
      />

      {/* Cargo Container */}
      <CargoContainer />

      {/* Boxes */}
      {boxes.map((box) => (
        <CargoBox
          key={box.id}
          box={box}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        />
      ))}

      {/* Camera Controls */}
      <OrbitControls
        ref={orbitRef}
        target={[centerX, containerSize.h / 2, centerZ]}
        enablePan={true}
        enableZoom={true}
        enableRotate={!isDragging}
        minDistance={100}
        maxDistance={3000}
      />
    </Canvas>
  )
}