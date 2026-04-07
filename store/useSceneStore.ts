import { create } from 'zustand'
import * as THREE from 'three'

export interface BoxSize {
  w: number
  h: number
  d: number
}

export interface ContainerSize {
  w: number
  h: number
  d: number
  maxWeight?: number
}

export interface CargoBox {
  id: string
  name: string
  size: BoxSize
  weight: number
  color: string
  position: { x: number; y: number; z: number }
  category?: string
}

export interface SceneStore {
  containerSize: ContainerSize
  boxes: CargoBox[]
  selectedId: string | null
  gridStep: number
  ghostOpacity: number
  setContainerSize: (size: ContainerSize) => void
  setSelected: (id: string | null) => void
  moveBox: (id: string, position: THREE.Vector3) => void
  addBox: (box: CargoBox) => void
  removeBox: (id: string) => void
  setGridStep: (step: number) => void
  setGhostOpacity: (opacity: number) => void
  clearBoxes: () => void
  moveAllBoxes: (positions: { id: string; position: { x: number; y: number; z: number } }[]) => void
}

const BOX_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f59e0b', '#6366f1',
]

let colorIndex = 0

export const getNextColor = () => {
  const color = BOX_COLORS[colorIndex % BOX_COLORS.length]
  colorIndex++
  return color
}

export const SAMPLE_CATALOG: Omit<CargoBox, 'id' | 'position' | 'color'>[] = [
  { name: 'กล่องเล็ก S', size: { w: 30, h: 30, d: 30 }, weight: 5, category: 'Standard' },
  { name: 'กล่องกลาง M', size: { w: 60, h: 60, d: 60 }, weight: 10, category: 'Standard' },
  { name: 'กล่องใหญ่ L', size: { w: 100, h: 80, d: 80 }, weight: 20, category: 'Standard' },
  { name: 'กล่องแบน', size: { w: 120, h: 30, d: 80 }, weight: 8, category: 'Special' },
  { name: 'กล่องสูง', size: { w: 40, h: 120, d: 40 }, weight: 12, category: 'Special' },
  { name: 'กล่องยาว', size: { w: 150, h: 40, d: 40 }, weight: 15, category: 'Special' },
]

export const useSceneStore = create<SceneStore>((set) => ({
  containerSize: { w: 600, h: 240, d: 240, maxWeight: 20000 },
  boxes: [],
  selectedId: null,
  gridStep: 10,
  ghostOpacity: 0.4,

  setContainerSize: (size) => set({ containerSize: size }),

  setSelected: (id) => set({ selectedId: id }),

  moveBox: (id, position) =>
    set((state) => ({
      boxes: state.boxes.map((b) =>
        b.id === id ? { ...b, position: { x: position.x, y: position.y, z: position.z } } : b
      ),
    })),

  addBox: (box) => set((state) => ({ boxes: [...state.boxes, box] })),

  removeBox: (id) =>
    set((state) => ({
      boxes: state.boxes.filter((b) => b.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  setGridStep: (step) => set({ gridStep: step }),

  setGhostOpacity: (opacity) => set({ ghostOpacity: opacity }),

  clearBoxes: () => set({ boxes: [], selectedId: null }),

  moveAllBoxes: (positions) =>
    set((state) => ({
      boxes: state.boxes.map((b) => {
        const found = positions.find((p) => p.id === b.id)
        return found ? { ...b, position: found.position } : b
      }),
    })),
}))