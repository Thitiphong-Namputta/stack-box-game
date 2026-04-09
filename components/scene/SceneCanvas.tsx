'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useSceneStore } from '@/store/useSceneStore'
import { CargoContainer } from './CargoContainer'
import { CargoBox } from './CargoBox'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

// ── CameraController ───────────────────────────────────────────────────
// Runs inside Canvas to imperatively control the camera based on store state.
function CameraController({
  orbitRef,
}: {
  orbitRef: { current: OrbitControlsImpl | null }
}) {
  const { viewMode, cameraOp, clearCameraOp, containerSize } = useSceneStore()

  // Snap camera when viewMode or containerSize changes
  useEffect(() => {
    const ctrl = orbitRef.current
    if (!ctrl) return
    const { w, h, d } = containerSize
    const cam = ctrl.object as THREE.Camera
    const center = new THREE.Vector3(w / 2, h / 2, d / 2)

    if (viewMode === '3d') {
      cam.position.set(w * 1.2, h * 1.5, d * 1.5)
    } else if (viewMode === 'top') {
      cam.position.set(w / 2, h * 4, d / 2)
    } else if (viewMode === 'side') {
      cam.position.set(w * 3, h / 2, d / 2)
    }

    ctrl.target.copy(center)
    ctrl.update()
  }, [viewMode, containerSize, orbitRef])

  // Execute one-shot camera ops (zoom / reset)
  useEffect(() => {
    const ctrl = orbitRef.current
    if (!cameraOp || !ctrl) return

    const cam = ctrl.object as THREE.Camera

    if (cameraOp === 'zoom-in' || cameraOp === 'zoom-out') {
      const factor = cameraOp === 'zoom-in' ? 0.8 : 1.25
      const dir = cam.position.clone().sub(ctrl.target).multiplyScalar(factor)
      cam.position.copy(ctrl.target.clone().add(dir))
      ctrl.update()
    } else if (cameraOp === 'reset') {
      const { w, h, d } = containerSize
      cam.position.set(w * 1.2, h * 1.5, d * 1.5)
      ctrl.target.set(w / 2, h / 2, d / 2)
      ctrl.update()
    }

    clearCameraOp()
  }, [cameraOp, containerSize, orbitRef, clearCameraOp])

  return null
}

// ── SceneCanvas ────────────────────────────────────────────────────────
export function SceneCanvas() {
  const { boxes, containerSize, setSelected } = useSceneStore()
  const orbitRef = useRef<OrbitControlsImpl>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Escape key → deselect
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setSelected])

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
      shadows={{ type: THREE.PCFShadowMap }}
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
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[containerSize.w, containerSize.h * 2, containerSize.d]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-200, 300, -200]} intensity={0.4} />
      <hemisphereLight args={['#334155', '#0f172a', 0.5]} />

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

      {/* Imperative camera controller */}
      <CameraController orbitRef={orbitRef} />

      {/* Orbit Controls */}
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
