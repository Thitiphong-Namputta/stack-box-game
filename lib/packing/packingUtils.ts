import * as THREE from 'three'
import type { CargoBox, ContainerSize } from '@/store/useSceneStore'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BP3D } = require('binpackingjs')
const { Item, Bin, Packer } = BP3D

export function toPackingItem(box: CargoBox) {
  return new Item(box.id, box.size.w, box.size.h, box.size.d, box.weight ?? 0)
}

export function toPackingBin(size: ContainerSize) {
  return new Bin('container', size.w, size.h, size.d, size.maxWeight ?? 99999)
}

export function suggestPosition(
  newBox: CargoBox,
  placedBoxes: CargoBox[],
  containerSize: ContainerSize
): THREE.Vector3 | null {
  const packer = new Packer()
  packer.addBin(toPackingBin(containerSize))

  placedBoxes.forEach((b) => packer.addItem(toPackingItem(b)))
  packer.addItem(toPackingItem(newBox))
  packer.pack()

  const bin = packer.bins[0]
  if (!bin) return null

  const packed = bin.items.find((i: { name: string }) => i.name === newBox.id)
  if (!packed) return null

  return new THREE.Vector3(
    packed.position[0] + packed.width / 2,
    packed.position[1] + packed.height / 2,
    packed.position[2] + packed.depth / 2
  )
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

  // AABB collision check
  const aNew = new THREE.Box3().setFromCenterAndSize(
    newPos,
    new THREE.Vector3(movingBox.size.w, movingBox.size.h, movingBox.size.d)
  )

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
  const packer = new Packer()
  packer.addBin(toPackingBin(containerSize))
  boxes.forEach((b) => packer.addItem(toPackingItem(b)))
  packer.pack()

  const bin = packer.bins[0]
  const packed = (bin?.items ?? []).map((item: { name: string; position: number[]; width: number; height: number; depth: number }) => ({
    id: item.name,
    position: {
      x: item.position[0] + item.width / 2,
      y: item.position[1] + item.height / 2,
      z: item.position[2] + item.depth / 2,
    },
  }))

  const unfit = (packer.unfitItems ?? []).map((item: { name: string }) => item.name)

  return { packed, unfit }
}