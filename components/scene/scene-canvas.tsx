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
import { CoGMarker } from './cog-marker'
import { SelectionRectangle } from './selection-rectangle'
import { pickBoxesInRect } from '@/lib/selection/frustum-select'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import type { CargoBox as CargoBoxType } from '@/store/use-scene-store'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

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
    selectAll,
    clearSelection,
    removeSelected,
    rotateSelected,
    moveSelected,
    overrideRequest,
    setOverrideRequest,
  } = useSceneStore()
  const selectedCount = useSceneStore((s) => s.selectedIds.size)
  const multiSelectMode = useSceneStore((s) => s.multiSelectMode)
  const orbitRef = useRef<OrbitControlsImpl>(null)
  const canvasWrapperRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  type Point = { x: number; y: number }
  const [dragRect, setDragRect] = useState<{ start: Point; current: Point } | null>(null)
  const [boxSelectStart, setBoxSelectStart] = useState<Point | null>(null)

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

      // Ctrl+A — select all
      if (isMod && e.key === 'a') { e.preventDefault(); selectAll(); return }

      // Escape — deselect or cancel drag preview
      if (e.key === 'Escape') {
        setDragPreview(null)
        clearSelection()
        return
      }

      // Everything below requires at least one selected box
      const currentSelectedIds = useSceneStore.getState().selectedIds
      if (currentSelectedIds.size === 0) return

      // Delete — remove all selected
      if (e.key === 'Delete') {
        e.preventDefault()
        removeSelected()
        return
      }

      // R — rotate all selected
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        const dir = e.shiftKey ? 'bwd' : 'fwd'
        if (currentSelectedIds.size === 1) {
          const box = boxes.find((b) => b.id === Array.from(currentSelectedIds)[0])
          if (!box) return
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
        } else {
          rotateSelected(dir)
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
        if (currentSelectedIds.size === 1) {
          const box = boxes.find((b) => b.id === Array.from(currentSelectedIds)[0])
          if (!box) return
          const newPos = new THREE.Vector3(box.position.x, box.position.y, box.position.z)
          newPos[move.axis] += move.dir * gridStep
          const result = validatePlacement(box, newPos, boxes, containerSize)
          if (result.valid) {
            moveBox(box.id, newPos)
          } else {
            setFlashId(box.id)
            setTimeout(() => setFlashId(null), 500)
          }
        } else {
          const delta = { x: 0, y: 0, z: 0 }
          delta[move.axis] = move.dir * gridStep
          moveSelected(delta)
        }
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [boxes, containerSize, gridStep, setSelected, moveBox, removeBox, rotateBox, undo, redo, setFlashId, setDragPreview, selectAll, clearSelection, removeSelected, rotateSelected, moveSelected])

  // Cancel drag preview when window loses focus
  useEffect(() => {
    const onBlur = () => setDragPreview(null)
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [setDragPreview])

  // Box-select drag: track pointermove/up while dragRect is active
  useEffect(() => {
    if (!dragRect) return
    const onMove = (e: PointerEvent) => {
      const wrapper = canvasWrapperRef.current
      if (!wrapper) return
      const rect = wrapper.getBoundingClientRect()
      setDragRect((prev) =>
        prev
          ? { ...prev, current: { x: e.clientX - rect.left, y: e.clientY - rect.top } }
          : null
      )
    }
    const onUp = () => {
      const wrapper = canvasWrapperRef.current
      const cam = cameraRef.current
      if (wrapper && cam && dragRect) {
        const { width, height } = wrapper.getBoundingClientRect()
        const ids = pickBoxesInRect(
          useSceneStore.getState().boxes,
          cam,
          { width, height },
          { x1: dragRect.start.x, y1: dragRect.start.y, x2: dragRect.current.x, y2: dragRect.current.y }
        )
        if (ids.length > 0) {
          useSceneStore.getState().addToSelection(ids)
        }
      }
      setDragRect(null)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [dragRect])

  // Threshold-based box-select: only activate dragRect after pointer moves > 5px
  useEffect(() => {
    if (!boxSelectStart) return
    const THRESHOLD = 5

    const onMove = (e: PointerEvent) => {
      const wrapper = canvasWrapperRef.current
      if (!wrapper) return
      const rect = wrapper.getBoundingClientRect()
      const current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      const dist = Math.hypot(current.x - boxSelectStart.x, current.y - boxSelectStart.y)
      if (dist >= THRESHOLD) {
        setDragRect({ start: boxSelectStart, current })
        setBoxSelectStart(null)
      }
    }

    const onUp = () => {
      clearSelection()
      setBoxSelectStart(null)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [boxSelectStart, clearSelection])

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
      fragile: dragPreview.fragile,
      thisSideUp: dragPreview.thisSideUp,
      nonStackable: dragPreview.nonStackable,
      cannotBeStackedOn: dragPreview.cannotBeStackedOn,
      maxStackWeight: dragPreview.maxStackWeight,
      hazmat: dragPreview.hazmat,
      temperature: dragPreview.temperature,
      priority: dragPreview.priority,
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
      className="w-full h-full relative"
    >
      <Canvas
        shadows={{ type: THREE.PCFShadowMap }}
        camera={{
          position: [containerSize.w * 1.2, containerSize.h * 1.5, containerSize.d * 1.5],
          fov: 50,
          near: 1,
          far: 10000,
        }}
        onPointerMissed={(e) => {
          if (!multiSelectMode) { clearSelection(); return }
          const wrapper = canvasWrapperRef.current
          if (!wrapper) { clearSelection(); return }
          const rect = wrapper.getBoundingClientRect()
          setBoxSelectStart({ x: e.clientX - rect.left, y: e.clientY - rect.top })
        }}
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
        <CoGMarker />

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

      {/* Box-select rectangle overlay */}
      <SelectionRectangle start={dragRect?.start ?? null} current={dragRect?.current ?? null} />

      {/* Multi-select HUD badge */}
      {selectedCount > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full z-30 pointer-events-none"
          style={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(99,102,241,0.4)' }}
        >
          <span className="text-xs font-bold text-indigo-300">
            {selectedCount} boxes selected
          </span>
        </div>
      )}

      {/* Constraint Override Dialog */}
      <Dialog open={!!overrideRequest} onOpenChange={(open) => { if (!open) setOverrideRequest(null) }}>
        <DialogContent className="an-dialog-content sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="an-text-error">⚠️ ละเมิดกฎการวางซ้อน</DialogTitle>
          </DialogHeader>
          <p className="text-sm an-text-on-surface mt-2">{overrideRequest?.reason}</p>
          <p className="text-xs an-text-on-surface-muted mt-2">
            คุณต้องการดำเนินการต่อหรือไม่? การละเมิดจะแสดงในรายงาน Constraint Analysis
          </p>
          <DialogFooter className="mt-4 gap-2 flex-row justify-end">
            <button
              type="button"
              onClick={() => setOverrideRequest(null)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium an-btn-outline-primary"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={() => {
                if (overrideRequest) {
                  moveBox(overrideRequest.boxId, new THREE.Vector3(
                    overrideRequest.newPos.x,
                    overrideRequest.newPos.y,
                    overrideRequest.newPos.z
                  ))
                }
                setOverrideRequest(null)
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              ดำเนินการต่อ
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
