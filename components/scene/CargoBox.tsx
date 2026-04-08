'use client'

import { useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { useThree, ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useSceneStore } from '@/store/useSceneStore'
import { validatePlacement } from '@/lib/packing/packingUtils'
import type { CargoBox as CargoBoxType, ContainerSize } from '@/store/useSceneStore'

interface CargoBoxProps {
  box: CargoBoxType
  onDragStart: () => void
  onDragEnd: () => void
}

const snapToGrid = (v: number, step: number) => Math.round(v / step) * step

/** Check if two boxes' X,Z footprints overlap (ignore Y entirely) */
function footprintOverlaps(
  ax: number, aw: number, az: number, ad: number,
  bx: number, bw: number, bz: number, bd: number
): boolean {
  return (
    ax - aw / 2 < bx + bw / 2 &&
    ax + aw / 2 > bx - bw / 2 &&
    az - ad / 2 < bz + bd / 2 &&
    az + ad / 2 > bz - bd / 2
  )
}

/**
 * Compute the Y center of the dragged box using gravity-snap:
 * - Find the highest support surface (top of another box whose footprint overlaps)
 * - If no support → place on floor (y = box.size.h / 2)
 * - Clamp so box doesn't exceed container top
 */
function computeSnapY(
  x: number,
  z: number,
  dragging: CargoBoxType,
  allBoxes: CargoBoxType[],
  containerSize: ContainerSize
): number {
  let supportTop = 0 // floor

  for (const other of allBoxes) {
    if (other.id === dragging.id) continue
    if (
      footprintOverlaps(
        x, dragging.size.w, z, dragging.size.d,
        other.position.x, other.size.w, other.position.z, other.size.d
      )
    ) {
      const otherTop = other.position.y + other.size.h / 2
      if (otherTop > supportTop) supportTop = otherTop
    }
  }

  const y = supportTop + dragging.size.h / 2
  return Math.min(y, containerSize.h - dragging.size.h / 2)
}

export function CargoBox({ box, onDragStart, onDragEnd }: CargoBoxProps) {
  const { camera, gl } = useThree()
  const { selectedId, setSelected, moveBox, boxes, containerSize, gridStep, ghostOpacity } =
    useSceneStore()

  const isSelected = selectedId === box.id

  const isDraggingRef = useRef(false)
  const ghostPosRef = useRef<THREE.Vector3 | null>(null)
  const ghostValidRef = useRef(true)

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
      setSelected(box.id)

      // Use floor-level plane (y=0) to get X,Z from mouse — Y is computed separately
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

        // Snap X,Z to grid
        const snappedX = snapToGrid(intersection.x, gridStep)
        const snappedZ = snapToGrid(intersection.z, gridStep)

        // Clamp X,Z inside container
        const clampedX = Math.max(box.size.w / 2, Math.min(containerSize.w - box.size.w / 2, snappedX))
        const clampedZ = Math.max(box.size.d / 2, Math.min(containerSize.d - box.size.d / 2, snappedZ))

        // Auto-gravity: find Y from support surface below X,Z
        const snapY = computeSnapY(clampedX, clampedZ, box, boxes, containerSize)

        const snapped = new THREE.Vector3(clampedX, snapY, clampedZ)
        const result = validatePlacement(box, snapped, boxes, containerSize)

        ghostPosRef.current = snapped.clone()
        ghostValidRef.current = result.valid

        setGhostRenderPos(snapped.clone())
        setGhostRenderValid(result.valid)
      }

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerup', onPointerUp)

        if (isDraggingRef.current && ghostPosRef.current && ghostValidRef.current) {
          moveBox(box.id, ghostPosRef.current)
        }

        isDraggingRef.current = false
        ghostPosRef.current = null
        setShowGhost(false)
        onDragEnd()
      }

      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [box, boxes, camera, containerSize, gridStep, moveBox, setSelected, getMouseNDC, onDragStart, onDragEnd]
  )

  const position: [number, number, number] = [box.position.x, box.position.y, box.position.z]
  const size: [number, number, number] = [box.size.w, box.size.h, box.size.d]

  return (
    <>
      {/* Actual box */}
      <mesh
        position={position}
        onPointerDown={handlePointerDown}
        onPointerOver={() => { setShowTooltip(true) }}
        onPointerOut={() => { setShowTooltip(false) }}
        castShadow
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={box.color}
          emissive={isSelected ? '#ffffff' : '#000000'}
          emissiveIntensity={isSelected ? 0.25 : 0}
          transparent={showGhost}
          opacity={showGhost ? 0.25 : 1}
        />
        {isSelected && (
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
            <lineBasicMaterial color="#ffffff" linewidth={2} />
          </lineSegments>
        )}

        {showTooltip && !showGhost && (
          <Html distanceFactor={300} position={[0, box.size.h / 2 + 10, 0]} center>
            <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
              <div className="font-semibold">{box.name}</div>
              <div className="text-slate-300">
                {box.size.w}×{box.size.h}×{box.size.d} cm
              </div>
              <div className="text-slate-400">{box.weight} kg</div>
            </div>
          </Html>
        )}
      </mesh>

      {/* Ghost preview while dragging */}
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
