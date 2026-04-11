import * as THREE from 'three'
import { getEffectiveSize } from '@/store/use-scene-store'
import type { CargoBox, ContainerSize } from '@/store/use-scene-store'

// binpackingjs has no type declarations — use require
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { BP3D } = require('binpackingjs') as any
const { Item, Bin, Packer } = BP3D

// binpackingjs scales every dimension by 1e5 internally.
const SCALE = 1e5

export function toPackingItem(box: CargoBox) {
  const s = getEffectiveSize(box)
  return new Item(box.id, s.w, s.h, s.d, box.weight ?? 0)
}

export function toPackingBin(size: ContainerSize) {
  return new Bin('container', size.w, size.h, size.d, size.maxWeight ?? 99999)
}

function itemCenter(item: { position: number[]; width: number; height: number; depth: number }) {
  return {
    x: (item.position[0] + item.width / 2) / SCALE,
    y: (item.position[1] + item.height / 2) / SCALE,
    z: (item.position[2] + item.depth / 2) / SCALE,
  }
}

/** Check if two box footprints overlap in X,Z only (ignores Y) */
export function footprintOverlaps(
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
 * Find the highest support surface Y at a given (x, z) position.
 * Returns floor (0) if no box supports at that footprint.
 */
export function getSupportY(
  x: number,
  z: number,
  newBox: CargoBox,
  placedBoxes: CargoBox[],
  containerSize: ContainerSize
): number {
  const ns = getEffectiveSize(newBox)
  let supportTop = 0
  for (const other of placedBoxes) {
    if (other.id === newBox.id) continue
    const os = getEffectiveSize(other)
    if (
      footprintOverlaps(
        x, ns.w, z, ns.d,
        other.position.x, os.w, other.position.z, os.d
      )
    ) {
      const top = other.position.y + os.h / 2
      if (top > supportTop) supportTop = top
    }
  }
  const y = supportTop + ns.h / 2
  return Math.min(y, containerSize.h - ns.h / 2)
}

/**
 * Find the first free position for a new box by scanning the container in a grid.
 * Respects actual current positions of placed boxes (unlike binpackingjs which repacks from scratch).
 */
export function suggestPosition(
  newBox: CargoBox,
  placedBoxes: CargoBox[],
  containerSize: ContainerSize
): THREE.Vector3 | null {
  const ns = getEffectiveSize(newBox)
  const stepX = Math.max(ns.w / 2, 1)
  const stepZ = Math.max(ns.d / 2, 1)

  for (let z = ns.d / 2; z <= containerSize.d - ns.d / 2; z += stepZ) {
    for (let x = ns.w / 2; x <= containerSize.w - ns.w / 2; x += stepX) {
      const y = getSupportY(x, z, newBox, placedBoxes, containerSize)
      if (y + ns.h / 2 > containerSize.h) continue

      const candidate = new THREE.Vector3(x, y, z)
      const result = validatePlacement(newBox, candidate, placedBoxes, containerSize)
      if (result.valid) return candidate
    }
  }
  return null
}

export function validatePlacement(
  movingBox: CargoBox,
  newPos: THREE.Vector3,
  otherBoxes: CargoBox[],
  containerSize: ContainerSize
): { valid: boolean; reason?: string } {
  const ms = getEffectiveSize(movingBox)

  // Boundary check (position = center of box)
  if (
    newPos.x - ms.w / 2 < 0 ||
    newPos.x + ms.w / 2 > containerSize.w ||
    newPos.y - ms.h / 2 < 0 ||
    newPos.y + ms.h / 2 > containerSize.h ||
    newPos.z - ms.d / 2 < 0 ||
    newPos.z + ms.d / 2 > containerSize.d
  ) {
    return { valid: false, reason: 'กล่องเกินขอบตู้' }
  }

  // AABB collision — shrink by epsilon so touching faces (stacking) are valid
  const EPS = 0.1
  const aNew = new THREE.Box3(
    new THREE.Vector3(
      newPos.x - ms.w / 2 + EPS,
      newPos.y - ms.h / 2 + EPS,
      newPos.z - ms.d / 2 + EPS
    ),
    new THREE.Vector3(
      newPos.x + ms.w / 2 - EPS,
      newPos.y + ms.h / 2 - EPS,
      newPos.z + ms.d / 2 - EPS
    )
  )

  for (const other of otherBoxes) {
    if (other.id === movingBox.id) continue
    const os = getEffectiveSize(other)
    const aOther = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(other.position.x, other.position.y, other.position.z),
      new THREE.Vector3(os.w, os.h, os.d)
    )
    if (aNew.intersectsBox(aOther)) {
      return { valid: false, reason: `ชนกับ ${other.name}` }
    }
  }

  return { valid: true }
}

export function runAutoPack(
  boxes: CargoBox[],
  containerSize: ContainerSize
): { packed: { id: string; position: { x: number; y: number; z: number } }[]; unfit: string[] } {
  try {
    const packer = new Packer()
    packer.addBin(toPackingBin(containerSize))
    boxes.forEach((b) => packer.addItem(toPackingItem(b)))
    packer.pack()

    const bin = packer.bins[0]
    const packed = (bin?.items ?? []).map(
      (item: { name: string; position: number[]; width: number; height: number; depth: number }) => ({
        id: item.name,
        position: itemCenter(item),
      })
    )

    const unfit = (packer.unfitItems ?? []).map((item: { name: string }) => item.name)
    return { packed, unfit }
  } catch (e) {
    console.error('AutoPack failed:', e)
    return { packed: [], unfit: boxes.map((b) => b.id) }
  }
}
