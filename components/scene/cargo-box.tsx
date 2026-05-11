'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import * as THREE from 'three'
import { useThree, ThreeEvent, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useSceneStore, getEffectiveSize } from '@/store/use-scene-store'
import { validatePlacement, getSupportY } from '@/lib/packing/packing-utils'
import { ConstraintIcons } from './constraint-icons'
import type { CargoBox as CargoBoxType } from '@/store/use-scene-store'

interface CargoBoxProps {
  box: CargoBoxType
  onDragStart: () => void
  onDragEnd: () => void
}

const snapToGrid = (v: number, step: number) => Math.round(v / step) * step

export function CargoBox({ box, onDragStart, onDragEnd }: CargoBoxProps) {
  const { camera, gl } = useThree()
  const {
    setSelected,
    toggleSelected,
    moveBox,
    moveSelected,
    boxes,
    containerSize,
    gridStep,
    ghostOpacity,
    renderMode,
    flashId,
    setOverrideRequest,
  } = useSceneStore()

  const isSelected = useSceneStore((s) => s.selectedIds.has(box.id))
  const multiSelectMode = useSceneStore((s) => s.multiSelectMode)
  const isFlashing = flashId === box.id

  // Loading sequence
  const loadingOrder = useSceneStore((s) => s.loadingOrder)
  const currentStep = useSceneStore((s) => s.currentStep)
  const playbackState = useSceneStore((s) => s.playbackState)

  const stepIndex = loadingOrder.indexOf(box.id)
  const isLoaded = stepIndex !== -1 && stepIndex < currentStep
  const isCurrent = stepIndex === currentStep - 1

  // Animation: slide box in from above when it becomes the current step
  const meshRef = useRef<THREE.Mesh>(null)
  const animatedY = useRef(box.position.y)
  const prevIsCurrent = useRef(false)

  // Reset animatedY to above when isCurrent first becomes true
  useEffect(() => {
    if (isCurrent && !prevIsCurrent.current && playbackState !== 'idle') {
      animatedY.current = box.position.y + 200
    }
    prevIsCurrent.current = isCurrent
  }, [isCurrent, playbackState, box.position.y])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    if (isCurrent && playbackState !== 'idle') {
      animatedY.current = THREE.MathUtils.lerp(
        animatedY.current,
        box.position.y,
        Math.min(delta * 5, 1),
      )
      meshRef.current.position.y = animatedY.current
    } else {
      animatedY.current = box.position.y
    }
  })

  // Hide boxes that haven't been loaded yet during active playback
  if (playbackState !== 'idle' && !isLoaded && !isCurrent) return null

  const isDraggingRef = useRef(false)
  const ghostPosRef = useRef<THREE.Vector3 | null>(null)
  const ghostValidRef = useRef(true)
  const ghostReasonRef = useRef<string | undefined>(undefined)
  const ghostDeltaRef = useRef<{ delta: THREE.Vector3; valid: boolean } | null>(null)

  const [showGhost, setShowGhost] = useState(false)
  const [ghostRenderPos, setGhostRenderPos] = useState<THREE.Vector3>(
    new THREE.Vector3(box.position.x, box.position.y, box.position.z)
  )
  const [ghostRenderValid, setGhostRenderValid] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  const getMouseNDC = useCallback(
    (e: PointerEvent | MouseEvent) => {
      const rect = gl.domElement.getBoundingClientRect()
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      )
    },
    [gl]
  )

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()

      const isShift = e.nativeEvent.shiftKey
      const isMod = e.nativeEvent.ctrlKey || e.nativeEvent.metaKey

      if (multiSelectMode && (isShift || isMod)) {
        toggleSelected(box.id)
        return
      }

      const storeState = useSceneStore.getState()
      const isMultiSelected = multiSelectMode && storeState.selectedIds.size > 1 && storeState.selectedIds.has(box.id)

      // Click on unselected box → replace selection
      if (!storeState.selectedIds.has(box.id)) {
        setSelected(box.id)
      }

      const effectiveSize = getEffectiveSize(box)
      const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
      const raycaster = new THREE.Raycaster()

      const onPointerMove = (me: PointerEvent) => {
        if (!isDraggingRef.current) {
          isDraggingRef.current = true
          setShowGhost(true)
          onDragStart()
        }

        const ndc = getMouseNDC(me)
        raycaster.setFromCamera(ndc, camera)

        const intersection = new THREE.Vector3()
        if (!raycaster.ray.intersectPlane(dragPlane, intersection)) return

        const clampedX = Math.max(
          effectiveSize.w / 2,
          Math.min(containerSize.w - effectiveSize.w / 2, snapToGrid(intersection.x, gridStep))
        )
        const clampedZ = Math.max(
          effectiveSize.d / 2,
          Math.min(containerSize.d - effectiveSize.d / 2, snapToGrid(intersection.z, gridStep))
        )

        const snapY = getSupportY(clampedX, clampedZ, box, boxes, containerSize)
        const snapped = new THREE.Vector3(clampedX, snapY, clampedZ)

        if (isMultiSelected) {
          // Group drag: compute delta and validate all selected boxes
          const delta = new THREE.Vector3(
            snapped.x - box.position.x,
            snapped.y - box.position.y,
            snapped.z - box.position.z
          )
          const currentBoxes = useSceneStore.getState().boxes
          const currentSelectedIds = useSceneStore.getState().selectedIds
          const selectedBoxes = currentBoxes.filter((b) => currentSelectedIds.has(b.id))
          const others = currentBoxes.filter((b) => !currentSelectedIds.has(b.id))

          const allValid = selectedBoxes.every((b) => {
            const newPos = new THREE.Vector3(
              b.position.x + delta.x,
              b.position.y + delta.y,
              b.position.z + delta.z
            )
            return validatePlacement(b, newPos, others, containerSize).valid
          })

          ghostDeltaRef.current = { delta, valid: allValid }
          ghostPosRef.current = snapped.clone()
          ghostValidRef.current = allValid
          setGhostRenderPos(snapped.clone())
          setGhostRenderValid(allValid)
        } else {
          // Single drag
          const result = validatePlacement(box, snapped, boxes, containerSize)
          ghostPosRef.current = snapped.clone()
          ghostValidRef.current = result.valid
          ghostReasonRef.current = result.reason
          ghostDeltaRef.current = null
          setGhostRenderPos(snapped.clone())
          setGhostRenderValid(result.valid)
        }
      }

      const isConstraintViolation = (reason?: string) =>
        !!reason && reason !== 'กล่องเกินขอบตู้' && !reason.startsWith('ชนกับ')

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerup', onPointerUp)

        if (isDraggingRef.current) {
          if (isMultiSelected && ghostDeltaRef.current?.valid) {
            moveSelected(ghostDeltaRef.current.delta)
          } else if (!isMultiSelected && ghostPosRef.current) {
            if (ghostValidRef.current) {
              moveBox(box.id, ghostPosRef.current)
            } else if (isConstraintViolation(ghostReasonRef.current)) {
              // Constraint violation — ask user for override instead of silently snapping back
              setOverrideRequest({
                boxId: box.id,
                newPos: { x: ghostPosRef.current.x, y: ghostPosRef.current.y, z: ghostPosRef.current.z },
                reason: ghostReasonRef.current!,
              })
            }
          }
        }

        isDraggingRef.current = false
        ghostPosRef.current = null
        ghostReasonRef.current = undefined
        ghostDeltaRef.current = null
        setShowGhost(false)
        onDragEnd()
      }

      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
    },
    [box, boxes, camera, containerSize, gridStep, moveBox, moveSelected, setSelected, setOverrideRequest, toggleSelected, getMouseNDC, onDragStart, onDragEnd]
  )

  const effectiveSize = getEffectiveSize(box)
  const position: [number, number, number] = [box.position.x, box.position.y, box.position.z]
  const size: [number, number, number] = [effectiveSize.w, effectiveSize.h, effectiveSize.d]

  const outlineColor = isFlashing ? '#ef4444' : '#ffffff'
  const showOutline = isSelected || isFlashing

  return (
    <>
      <mesh
        ref={meshRef}
        position={position}
        onPointerDown={handlePointerDown}
        onPointerOver={() => { setShowTooltip(true) }}
        onPointerOut={() => { setShowTooltip(false) }}
        castShadow
      >
        <boxGeometry args={size} />
        {renderMode === 'wire' ? (
          <meshStandardMaterial color={box.color} wireframe />
        ) : renderMode === 'xray' ? (
          <meshStandardMaterial
            color={box.color}
            transparent
            opacity={0.25}
            depthWrite={false}
          />
        ) : (
          <meshStandardMaterial
            color={box.color}
            emissive={isSelected ? '#ffffff' : '#000000'}
            emissiveIntensity={isSelected ? 0.25 : 0}
            transparent={showGhost}
            opacity={showGhost ? 0.25 : 1}
          />
        )}

        {showOutline && (
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
            <lineBasicMaterial color={outlineColor} linewidth={2} />
          </lineSegments>
        )}

        {!showGhost && <ConstraintIcons box={box} />}

        {box.thisSideUp && !showGhost && (
          <mesh position={[0, effectiveSize.h / 2 + 4, 0]}>
            <coneGeometry args={[3, 8, 4]} />
            <meshBasicMaterial color="#10b981" />
          </mesh>
        )}

        {showTooltip && !showGhost && (
          <Html distanceFactor={300} position={[0, effectiveSize.h / 2 + 10, 0]} center>
            <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
              <div className="font-semibold">{box.name}</div>
              <div className="text-slate-300">
                {effectiveSize.w}×{effectiveSize.h}×{effectiveSize.d} cm
              </div>
              <div className="text-slate-400">{box.weight} kg</div>
            </div>
          </Html>
        )}

        {isCurrent && playbackState !== 'idle' && (
          <Html distanceFactor={300} position={[0, effectiveSize.h / 2 + 18, 0]} center>
            <div className="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg pointer-events-none">
              #{stepIndex + 1}
            </div>
          </Html>
        )}
      </mesh>

      {showGhost && (
        <mesh position={[ghostRenderPos.x, ghostRenderPos.y, ghostRenderPos.z]}>
          <boxGeometry args={size} />
          <meshStandardMaterial
            color={ghostRenderValid ? '#22c55e' : '#ef4444'}
            transparent
            opacity={ghostOpacity}
          />
        </mesh>
      )}
    </>
  )
}
