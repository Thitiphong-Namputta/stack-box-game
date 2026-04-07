'use client'

import { useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/store/useSceneStore'
import type { CargoBox } from '@/store/useSceneStore'
import { suggestPosition, validatePlacement, runAutoPack } from './packingUtils'

export function useBinPacking() {
  const { boxes, containerSize } = useSceneStore()

  const getSuggestedPosition = useCallback(
    (newBox: CargoBox) => suggestPosition(newBox, boxes, containerSize),
    [boxes, containerSize]
  )

  const validate = useCallback(
    (box: CargoBox, pos: THREE.Vector3) => validatePlacement(box, pos, boxes, containerSize),
    [boxes, containerSize]
  )

  const autoPack = useCallback(
    () => runAutoPack(boxes, containerSize),
    [boxes, containerSize]
  )

  const spaceUtilization = useMemo(() => {
    const used = boxes.reduce((sum, b) => sum + b.size.w * b.size.h * b.size.d, 0)
    const total = containerSize.w * containerSize.h * containerSize.d
    return Math.round((used / total) * 100)
  }, [boxes, containerSize])

  return { getSuggestedPosition, validate, autoPack, spaceUtilization }
}