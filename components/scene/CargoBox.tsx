'use client'

import { useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { useThree, ThreeEvent } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useSceneStore } from '@/store/useSceneStore'
import { validatePlacement } from '@/lib/packing/packingUtils'
import type { CargoBox as CargoBoxType } from '@/store/useSceneStore'

interface CargoBoxProps {
  box: CargoBoxType
  onDragStart: () => void
  onDragEnd: () => void
}

const snapToGrid = (v: number, step: number) => Math.round(v / step) * step

export function CargoBox({ box, onDragStart, onDragEnd }: CargoBoxProps) {
  const { camera, gl } = useThree()
  const { selectedId, setSelected, moveBox, boxes, containerSize, gridStep, ghostOpacity } = useSceneStore()

  const isSelected = selectedId === box.id
  const isDraggingRef = useRef(false)
  const dragPlaneRef = useRef<THREE.Plane>(new THREE.Plane())
  const raycasterRef = useRef(new THREE.Raycaster())
  const [isDragging, setIsDragging] = useState(false)
  const [ghostPos, setGhostPos] = useState<THREE.Vector3 | null>(null)
  const [ghostValid, setGhostValid] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  const position: [number, number, number] = [box.position.x, box.position.y, box.position.z]
  const size: [number, number, number] = [box.size.w, box.size.h, box.size.d]

  const getMouseNDC = useCallback((e: PointerEvent | MouseEvent) => {
    const rect = gl.domElement.getBoundingClientRect()
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    )
  }, [gl])

  const handlePointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setSelected(box.id)
    isDraggingRef.current = false

    // Setup drag plane at box's Y height
    dragPlaneRef.current.set(new THREE.Vector3(0, 1, 0), -box.position.y)

    const onPointerMove = (me: PointerEvent) => {
      if (!isDraggingRef.current) {
        isDraggingRef.current = true
        setIsDragging(true)
        onDragStart()
      }

      const ndc = getMouseNDC(me)
      raycasterRef.current.setFromCamera(ndc, camera)

      const intersection = new THREE.Vector3()
      raycasterRef.current.ray.intersectPlane(dragPlaneRef.current, intersection)

      // Snap to grid
      const snapped = new THREE.Vector3(
        snapToGrid(intersection.x, gridStep),
        box.position.y,
        snapToGrid(intersection.z, gridStep)
      )

      // Clamp inside container
      snapped.x = Math.max(box.size.w / 2, Math.min(containerSize.w - box.size.w / 2, snapped.x))
      snapped.z = Math.max(box.size.d / 2, Math.min(containerSize.d - box.size.d / 2, snapped.z))

      const result = validatePlacement(box, snapped, boxes, containerSize)
      setGhostPos(snapped.clone())
      setGhostValid(result.valid)
    }

    const onPointerUp = (me: PointerEvent) => {
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerup', onPointerUp)

      if (isDraggingRef.current && ghostPos) {
        if (ghostValid) {
          moveBox(box.id, ghostPos)
        }
      }

      isDraggingRef.current = false
      setIsDragging(false)
      setGhostPos(null)
      onDragEnd()
      me.stopPropagation()
    }

    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [box, boxes, camera, containerSize, ghostPos, ghostValid, gridStep, moveBox, setSelected, getMouseNDC, onDragStart, onDragEnd])

  const emissiveColor = isSelected ? '#ffffff' : '#000000'
  const emissiveIntensity = isSelected ? 0.3 : 0

  return (
    <>
      {/* Actual box */}
      <mesh
        position={position}
        onPointerDown={handlePointerDown}
        onPointerOver={() => setShowTooltip(true)}
        onPointerOut={() => setShowTooltip(false)}
        castShadow
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={box.color}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          transparent={isDragging}
          opacity={isDragging ? 0.3 : 1}
        />
        {isSelected && (
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(...size)]} />
            <lineBasicMaterial color="#ffffff" linewidth={2} />
          </lineSegments>
        )}

        {showTooltip && !isDragging && (
          <Html distanceFactor={300} position={[0, box.size.h / 2 + 10, 0]} center>
            <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
              <div className="font-semibold">{box.name}</div>
              <div className="text-slate-300">{box.size.w}×{box.size.h}×{box.size.d} cm</div>
              <div className="text-slate-400">{box.weight} kg</div>
            </div>
          </Html>
        )}
      </mesh>

      {/* Ghost preview while dragging */}
      {isDragging && ghostPos && (
        <mesh position={[ghostPos.x, ghostPos.y, ghostPos.z]}>
          <boxGeometry args={size} />
          <meshStandardMaterial
            color={ghostValid ? '#22c55e' : '#ef4444'}
            transparent
            opacity={ghostOpacity}
          />
        </mesh>
      )}
    </>
  )
}