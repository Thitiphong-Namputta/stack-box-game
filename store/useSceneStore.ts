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

export type ViewMode = '3d' | 'top' | 'side'
export type RenderMode = 'solid' | 'wire' | 'xray'
export type CameraOp = 'zoom-in' | 'zoom-out' | 'reset'

export interface SceneStore {
  containerSize: ContainerSize
  boxes: CargoBox[]
  selectedId: string | null
  gridStep: number
  ghostOpacity: number

  // View / Render
  viewMode: ViewMode
  renderMode: RenderMode
  setViewMode: (v: ViewMode) => void
  setRenderMode: (r: RenderMode) => void

  // Camera ops (triggered from outside Canvas)
  cameraOp: CameraOp | null
  triggerCameraOp: (op: CameraOp) => void
  clearCameraOp: () => void

  // Unfit items (from auto-pack result)
  unfitIds: string[]
  setUnfitIds: (ids: string[]) => void

  // Undo / Redo history
  history: CargoBox[][]
  future: CargoBox[][]
  undo: () => void
  redo: () => void

  // Box actions
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

  viewMode: '3d',
  renderMode: 'solid',
  setViewMode: (viewMode) => set({ viewMode }),
  setRenderMode: (renderMode) => set({ renderMode }),

  cameraOp: null,
  triggerCameraOp: (op) => set({ cameraOp: op }),
  clearCameraOp: () => set({ cameraOp: null }),

  unfitIds: [],
  setUnfitIds: (ids) => set({ unfitIds: ids }),

  history: [],
  future: [],

  undo: () =>
    set((state) => {
      if (state.history.length === 0) return {}
      const prev = state.history[state.history.length - 1]
      return {
        history: state.history.slice(0, -1),
        future: [state.boxes, ...state.future].slice(0, 20),
        boxes: prev,
        selectedId: prev.some((b) => b.id === state.selectedId) ? state.selectedId : null,
      }
    }),

  redo: () =>
    set((state) => {
      if (state.future.length === 0) return {}
      const next = state.future[0]
      return {
        future: state.future.slice(1),
        history: [...state.history, state.boxes].slice(-20),
        boxes: next,
        selectedId: next.some((b) => b.id === state.selectedId) ? state.selectedId : null,
      }
    }),

  setContainerSize: (size) => set({ containerSize: size }),
  setSelected: (id) => set({ selectedId: id }),

  addBox: (box) =>
    set((state) => ({
      history: [...state.history.slice(-19), state.boxes],
      future: [],
      boxes: [...state.boxes, box],
    })),

  removeBox: (id) =>
    set((state) => ({
      history: [...state.history.slice(-19), state.boxes],
      future: [],
      boxes: state.boxes.filter((b) => b.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  moveBox: (id, position) =>
    set((state) => ({
      history: [...state.history.slice(-19), state.boxes],
      future: [],
      boxes: state.boxes.map((b) =>
        b.id === id ? { ...b, position: { x: position.x, y: position.y, z: position.z } } : b
      ),
    })),

  setGridStep: (step) => set({ gridStep: step }),
  setGhostOpacity: (opacity) => set({ ghostOpacity: opacity }),

  clearBoxes: () =>
    set((state) => ({
      history: [...state.history.slice(-19), state.boxes],
      future: [],
      boxes: [],
      selectedId: null,
    })),

  moveAllBoxes: (positions) =>
    set((state) => ({
      history: [...state.history.slice(-19), state.boxes],
      future: [],
      boxes: state.boxes.map((b) => {
        const found = positions.find((p) => p.id === b.id)
        return found ? { ...b, position: found.position } : b
      }),
    })),
}))
