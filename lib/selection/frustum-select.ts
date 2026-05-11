import * as THREE from 'three'
import { getEffectiveSize } from '@/store/use-scene-store'
import type { CargoBox } from '@/store/use-scene-store'

function projectPoint(p: THREE.Vector3, camera: THREE.Camera): THREE.Vector3 {
  return p.clone().project(camera)
}

/**
 * Returns the ids of boxes whose bounding-box has at least one corner
 * projecting inside the given screen-space rectangle.
 */
export function pickBoxesInRect(
  boxes: CargoBox[],
  camera: THREE.Camera,
  domSize: { width: number; height: number },
  rect: { x1: number; y1: number; x2: number; y2: number }
): string[] {
  const xMin = Math.min(rect.x1, rect.x2)
  const xMax = Math.max(rect.x1, rect.x2)
  const yMin = Math.min(rect.y1, rect.y2)
  const yMax = Math.max(rect.y1, rect.y2)

  // Ignore trivial drag (< 5px)
  if (xMax - xMin < 5 && yMax - yMin < 5) return []

  return boxes
    .filter((box) => {
      const s = getEffectiveSize(box)
      const c = box.position
      const hw = s.w / 2
      const hh = s.h / 2
      const hd = s.d / 2

      const corners = [
        new THREE.Vector3(c.x - hw, c.y - hh, c.z - hd),
        new THREE.Vector3(c.x + hw, c.y - hh, c.z - hd),
        new THREE.Vector3(c.x - hw, c.y + hh, c.z - hd),
        new THREE.Vector3(c.x + hw, c.y + hh, c.z - hd),
        new THREE.Vector3(c.x - hw, c.y - hh, c.z + hd),
        new THREE.Vector3(c.x + hw, c.y - hh, c.z + hd),
        new THREE.Vector3(c.x - hw, c.y + hh, c.z + hd),
        new THREE.Vector3(c.x + hw, c.y + hh, c.z + hd),
      ]

      return corners.some((corner) => {
        const projected = projectPoint(corner, camera)
        const screenX = ((projected.x + 1) / 2) * domSize.width
        const screenY = ((1 - projected.y) / 2) * domSize.height
        return screenX >= xMin && screenX <= xMax && screenY >= yMin && screenY <= yMax
      })
    })
    .map((box) => box.id)
}
