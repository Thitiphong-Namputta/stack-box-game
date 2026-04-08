import * as THREE from 'three'
import type { CargoBox, ContainerSize } from '@/store/useSceneStore'

// binpackingjs has no type declarations — use require
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { BP3D } = require('binpackingjs') as any
const { Item, Bin, Packer } = BP3D

// binpackingjs scales every dimension by 1e5 internally.
// All position/dimension values coming back must be divided by 1e5 to restore cm units.
const SCALE = 1e5

export function toPackingItem(box: CargoBox) {
  return new Item(box.id, box.size.w, box.size.h, box.size.d, box.weight ?? 0)
}

export function toPackingBin(size: ContainerSize) {
  return new Bin('container', size.w, size.h, size.d, size.maxWeight ?? 99999)
}

// Convert packed item's internal (scaled) position back to real-world cm, center of box
function itemCenter(item: { position: number[]; width: number; height: number; depth: number }) {
  return {
    x: (item.position[0] + item.width / 2) / SCALE,
    y: (item.position[1] + item.height / 2) / SCALE,
    z: (item.position[2] + item.depth / 2) / SCALE,
  }
}

export function suggestPosition(
  newBox: CargoBox,
  placedBoxes: CargoBox[],
  containerSize: ContainerSize
): THREE.Vector3 | null {
  try {
    const packer = new Packer()
    packer.addBin(toPackingBin(containerSize))
    placedBoxes.forEach((b) => packer.addItem(toPackingItem(b)))
    packer.addItem(toPackingItem(newBox))
    packer.pack()

    const bin = packer.bins[0]
    if (!bin) return null

    const packed = bin.items.find((i: { name: string }) => i.name === newBox.id)
    if (!packed) return null

    const c = itemCenter(packed)
    return new THREE.Vector3(c.x, c.y, c.z)
  } catch {
    return null
  }
}

export function validatePlacement(
  movingBox: CargoBox,
  newPos: THREE.Vector3,
  otherBoxes: CargoBox[],
  containerSize: ContainerSize
): { valid: boolean; reason?: string } {
  // Boundary check (position = center of box)
  if (
    newPos.x - movingBox.size.w / 2 < 0 ||
    newPos.x + movingBox.size.w / 2 > containerSize.w ||
    newPos.y - movingBox.size.h / 2 < 0 ||
    newPos.y + movingBox.size.h / 2 > containerSize.h ||
    newPos.z - movingBox.size.d / 2 < 0 ||
    newPos.z + movingBox.size.d / 2 > containerSize.d
  ) {
    return { valid: false, reason: 'กล่องเกินขอบตู้' }
  }

  // AABB collision check — use epsilon so touching faces (stacking) are allowed
  const EPS = 0.1
  const aMin = new THREE.Vector3(
    newPos.x - movingBox.size.w / 2 + EPS,
    newPos.y - movingBox.size.h / 2 + EPS,
    newPos.z - movingBox.size.d / 2 + EPS
  )
  const aMax = new THREE.Vector3(
    newPos.x + movingBox.size.w / 2 - EPS,
    newPos.y + movingBox.size.h / 2 - EPS,
    newPos.z + movingBox.size.d / 2 - EPS
  )
  const aNew = new THREE.Box3(aMin, aMax)

  for (const other of otherBoxes) {
    if (other.id === movingBox.id) continue
    const aOther = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(other.position.x, other.position.y, other.position.z),
      new THREE.Vector3(other.size.w, other.size.h, other.size.d)
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