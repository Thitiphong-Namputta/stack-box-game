'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { nanoid } from 'nanoid'
import { useSceneStore } from '@/store/use-scene-store'
import { validatePlacement, getSupportY } from '@/lib/packing/packing-utils'
import { CargoContainer } from './cargo-container'
import { CargoBox } from './cargo-box'
import { CatalogDropPreview } from './catalog-drop-preview'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { CargoBox as CargoBoxType } from '@/store/use-scene-store'

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

// Exposes the R3F camera to a ref outside the Canvas
function CameraGrabber({ onReady }: { onReady: (cam: THREE.Camera) => void }) {
  const { camera } = useThree()
  useEffect(() => onReady(camera), [camera, onReady])
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
    dragPreview,
    setDragPreview,
    updateDragPreviewPosition,
    addBox,
  } = useSceneStore()
  const orbitRef = useRef<OrbitControlsImpl>(null)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
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

      // Escape — deselect or cancel drag preview
      if (e.key === 'Escape') {
        setDragPreview(null)
        setSelected(null)
        return
      }

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
  }, [boxes, containerSize, gridStep, selectedId, setSelected, moveBox, removeBox, rotateBox, undo, redo, setFlashId, setDragPreview])

  // Cancel drag preview when window loses focus
  useEffect(() => {
    const onBlur = () => setDragPreview(null)
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [setDragPreview])

  const handleBoxDragStart = useCallback(() => {
    setIsDragging(true)
    if (orbitRef.current) orbitRef.current.enabled = false
  }, [])

  const handleBoxDragEnd = useCallback(() => {
    setIsDragging(false)
    if (orbitRef.current) orbitRef.current.enabled = true
  }, [])

  // ── Catalog drag handlers ────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    if (!dragPreview || !canvasWrapperRef.current || !cameraRef.current) return

    const rect = canvasWrapperRef.current.getBoundingClientRect()
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(ndc, cameraRef.current)
    const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hit = new THREE.Vector3()
    if (!raycaster.ray.intersectPlane(floorPlane, hit)) return

    const s = dragPreview.size
    const snap = (v: number) => Math.round(v / gridStep) * gridStep
    const clampedX = Math.max(s.w / 2, Math.min(containerSize.w - s.w / 2, snap(hit.x)))
    const clampedZ = Math.max(s.d / 2, Math.min(containerSize.d - s.d / 2, snap(hit.z)))

    const tempBox: CargoBoxType = {
      id: '__preview__',
      name: dragPreview.name,
      size: dragPreview.size,
      weight: dragPreview.weight,
      color: dragPreview.color,
      orientationId: 0,
      position: { x: 0, y: 0, z: 0 },
    }

    const y = getSupportY(clampedX, clampedZ, tempBox, boxes, containerSize)
    const candidate = new THREE.Vector3(clampedX, y, clampedZ)
    const result = validatePlacement(tempBox, candidate, boxes, containerSize)

    updateDragPreviewPosition({ x: candidate.x, y: candidate.y, z: candidate.z }, result.valid)
  }, [dragPreview, boxes, containerSize, gridStep, updateDragPreviewPosition])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!dragPreview?.position || !dragPreview.isValid) {
      setDragPreview(null)
      return
    }
    addBox({
      id: nanoid(),
      name: dragPreview.name,
      size: dragPreview.size,
      weight: dragPreview.weight,
      color: dragPreview.color,
      category: dragPreview.category,
      orientationId: 0,
      position: dragPreview.position,
    })
    setDragPreview(null)
  }, [dragPreview, addBox, setDragPreview])

  const handleDragLeave = useCallback(() => {
    updateDragPreviewPosition(null, false)
  }, [updateDragPreviewPosition])

  const centerX = containerSize.w / 2
  const centerZ = containerSize.d / 2

  return (
    <div
      ref={canvasWrapperRef}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      className="w-full h-full"
    >
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
            onDragStart={handleBoxDragStart}
            onDragEnd={handleBoxDragEnd}
          />
        ))}

        {/* Catalog drop ghost */}
        <CatalogDropPreview />

        {/* Imperative camera controller */}
        <CameraController orbitRef={orbitRef} />

        {/* Expose camera to drag handlers outside Canvas */}
        <CameraGrabber onReady={(cam) => { cameraRef.current = cam }} />

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
    </div>
  )
}
