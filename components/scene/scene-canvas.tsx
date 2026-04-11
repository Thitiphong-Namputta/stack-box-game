'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useSceneStore } from '@/store/use-scene-store'
import { validatePlacement } from '@/lib/packing/packing-utils'
import { CargoContainer } from './cargo-container'
import { CargoBox } from './cargo-box'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

// ── CameraController ───────────────────────────────────────────────────
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
  const {
    boxes,
    containerSize,
    gridStep,
    selectedId,
    setSelected,
    moveBox,
    removeBox,
    rotateBox,
    undo,
    redo,
    setFlashId,
  } = useSceneStore()
  const orbitRef = useRef<OrbitControlsImpl>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't intercept when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const isMod = e.ctrlKey || e.metaKey

      // Undo / Redo
      if (isMod && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); return }
      if (isMod && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return }

      // Escape — deselect
      if (e.key === 'Escape') { setSelected(null); return }

      // Everything below requires a selected box
      const box = selectedId ? boxes.find((b) => b.id === selectedId) : null
      if (!box) return

      // Delete — remove selected box
      if (e.key === 'Delete') {
        e.preventDefault()
        removeBox(box.id)
        return
      }

      // R — rotate selected box
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        const dir = e.shiftKey ? 'bwd' : 'fwd'
        const current = box.orientationId ?? 0
        const next = (dir === 'fwd' ? current + 1 : current + 5) % 6
        const rotated = { ...box, orientationId: next as 0 | 1 | 2 | 3 | 4 | 5 }
        const pos = new THREE.Vector3(box.position.x, box.position.y, box.position.z)
        const result = validatePlacement(rotated, pos, boxes, containerSize)
        if (result.valid) {
          rotateBox(box.id, dir)
        } else {
          setFlashId(box.id)
          setTimeout(() => setFlashId(null), 500)
        }
        return
      }

      // Arrow keys + PageUp/PageDown — move 1 gridStep
      const MOVE_MAP: Record<string, { axis: 'x' | 'y' | 'z'; dir: 1 | -1 }> = {
        ArrowLeft:  { axis: 'x', dir: -1 },
        ArrowRight: { axis: 'x', dir:  1 },
        ArrowUp:    { axis: 'z', dir: -1 },
        ArrowDown:  { axis: 'z', dir:  1 },
        PageUp:     { axis: 'y', dir:  1 },
        PageDown:   { axis: 'y', dir: -1 },
      }
      const move = MOVE_MAP[e.key]
      if (move) {
        e.preventDefault()
        const newPos = new THREE.Vector3(box.position.x, box.position.y, box.position.z)
        newPos[move.axis] += move.dir * gridStep
        const result = validatePlacement(box, newPos, boxes, containerSize)
        if (result.valid) {
          moveBox(box.id, newPos)
        } else {
          setFlashId(box.id)
          setTimeout(() => setFlashId(null), 500)
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [boxes, containerSize, gridStep, selectedId, setSelected, moveBox, removeBox, rotateBox, undo, redo, setFlashId])

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
