import { create } from 'zustand'
import * as THREE from 'three'
import { nanoid } from 'nanoid'

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
  orientationId?: 0 | 1 | 2 | 3 | 4 | 5
}

export interface CatalogItem {
  id: string
  name: string
  size: BoxSize
  weight: number
  category?: string
}

export type StepAction =
  | 'addBox'
  | 'removeBox'
  | 'moveBox'
  | 'rotateBox'
  | 'autoPack'
  | 'clearBoxes'
  | 'undo'
  | 'redo'

export interface StepEntry {
  id: string
  action: StepAction
  label: string
  timestamp: number
}

export interface SavedPlan {
  id: string
  name: string
  savedAt: number
  containerSize: ContainerSize
  boxes: CargoBox[]
}

export type ViewMode = '3d' | 'top' | 'side'
export type RenderMode = 'solid' | 'wire' | 'xray'
export type CameraOp = 'zoom-in' | 'zoom-out' | 'reset'

// ── Orientation helpers ────────────────────────────────────────────

const ORIENTATIONS: Array<(w: number, h: number, d: number) => [number, number, number]> = [
  (w, h, d) => [w, h, d],  // 0: default
  (w, h, d) => [d, h, w],  // 1: Y 90°
  (w, h, d) => [w, d, h],  // 2: lay on side
  (w, h, d) => [d, w, h],  // 3: lay on side + Y rotate
  (w, h, d) => [h, w, d],  // 4: stand tall
  (w, h, d) => [h, d, w],  // 5: stand tall + Y rotate
]

/** Returns the effective (rendered) dimensions after applying orientationId */
export function getEffectiveSize(box: CargoBox): { w: number; h: number; d: number } {
  const id = box.orientationId ?? 0
  const [w, h, d] = ORIENTATIONS[id](box.size.w, box.size.h, box.size.d)
  return { w, h, d }
}

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

  // Catalog
  catalog: CatalogItem[]
  addCatalogItem: (item: Omit<CatalogItem, 'id'>) => void
  updateCatalogItem: (id: string, updates: Omit<CatalogItem, 'id'>) => void
  deleteCatalogItem: (id: string) => void

  // Steps log
  steps: StepEntry[]
  logStep: (action: StepAction, label: string) => void
  clearSteps: () => void

  // Active plan (loaded from URL param)
  activePlanId: string | null
  activePlanName: string | null
  setActivePlan: (id: string | null, name: string | null) => void
  loadPlan: (plan: SavedPlan) => void

  // Flash invalid feedback
  flashId: string | null
  setFlashId: (id: string | null) => void

  // Box actions
  setContainerSize: (size: ContainerSize) => void
  setSelected: (id: string | null) => void
  moveBox: (id: string, position: THREE.Vector3) => void
  addBox: (box: CargoBox) => void
  removeBox: (id: string) => void
  rotateBox: (id: string, dir: 'fwd' | 'bwd') => void
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

export const useSceneStore = create<SceneStore>((set, get) => ({
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

  undo: () => {
    set((state) => {
      if (state.history.length === 0) return {}
      const prev = state.history[state.history.length - 1]
      return {
        history: state.history.slice(0, -1),
        future: [state.boxes, ...state.future].slice(0, 20),
        boxes: prev,
        selectedId: prev.some((b) => b.id === state.selectedId) ? state.selectedId : null,
      }
    })
    get().logStep('undo', 'Undo')
  },

  redo: () => {
    set((state) => {
      if (state.future.length === 0) return {}
      const next = state.future[0]
      return {
        future: state.future.slice(1),
        history: [...state.history, state.boxes].slice(-20),
        boxes: next,
        selectedId: next.some((b) => b.id === state.selectedId) ? state.selectedId : null,
      }
    })
    get().logStep('redo', 'Redo')
  },

  // Catalog
  catalog: SAMPLE_CATALOG.map((item, i) => ({ ...item, id: `catalog-${i}` })),

  addCatalogItem: (item) =>
    set((state) => ({
      catalog: [...state.catalog, { ...item, id: nanoid(8) }],
    })),

  updateCatalogItem: (id, updates) =>
    set((state) => ({
      catalog: state.catalog.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  deleteCatalogItem: (id) =>
    set((state) => ({
      catalog: state.catalog.filter((c) => c.id !== id),
    })),

  // Steps log
  steps: [],

  logStep: (action, label) =>
    set((state) => ({
      steps: [
        { id: nanoid(8), action, label, timestamp: Date.now() },
        ...state.steps,
      ].slice(0, 100),
    })),

  clearSteps: () => set({ steps: [] }),

  // Active plan
  activePlanId: null,
  activePlanName: null,
  setActivePlan: (id, name) => set({ activePlanId: id, activePlanName: name }),

  loadPlan: (plan) =>
    set(() => ({
      boxes: plan.boxes,
      containerSize: plan.containerSize,
      selectedId: null,
      history: [],
      future: [],
      unfitIds: [],
    })),

  // Flash invalid feedback
  flashId: null,
  setFlashId: (id) => set({ flashId: id }),

  // Box actions
  setContainerSize: (size) => set({ containerSize: size }),
  setSelected: (id) => set({ selectedId: id }),

  addBox: (box) => {
    set((state) => ({
      history: [...state.history.slice(-19), state.boxes],
      future: [],
      boxes: [...state.boxes, box],
    }))
    get().logStep('addBox', `Added ${box.name}`)
  },

  removeBox: (id) => {
    const name = get().boxes.find((b) => b.id === id)?.name ?? id
    set((state) => ({
      history: [...state.history.slice(-19), state.boxes],
      future: [],
      boxes: state.boxes.filter((b) => b.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    }))
    get().logStep('removeBox', `Removed ${name}`)
  },

  moveBox: (id, position) => {
    const name = get().boxes.find((b) => b.id === id)?.name ?? id
    set((state) => ({
      history: [...state.history.slice(-19), state.boxes],
      future: [],
      boxes: state.boxes.map((b) =>
        b.id === id ? { ...b, position: { x: position.x, y: position.y, z: position.z } } : b
      ),
    }))
    get().logStep('moveBox', `Moved ${name}`)
  },

  rotateBox: (id, dir) => {
    const box = get().boxes.find((b) => b.id === id)
    if (!box) return
    const current = box.orientationId ?? 0
    const next = (dir === 'fwd' ? current + 1 : current + 5) % 6
    set((state) => ({
      history: [...state.history.slice(-19), state.boxes],
      future: [],
      boxes: state.boxes.map((b) =>
        b.id === id ? { ...b, orientationId: next as 0 | 1 | 2 | 3 | 4 | 5 } : b
      ),
    }))
    get().logStep('rotateBox', `Rotated ${box.name}`)
  },

  setGridStep: (step) => set({ gridStep: step }),
  setGhostOpacity: (opacity) => set({ ghostOpacity: opacity }),

  clearBoxes: () => {
    set((state) => ({
      history: [...state.history.slice(-19), state.boxes],
      future: [],
      boxes: [],
      selectedId: null,
    }))
    get().logStep('clearBoxes', 'Cleared all boxes')
  },

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

// ── localStorage helpers ────────────────────────────────────────────────

const PLANS_KEY = 'cargo-plans'

export function getSavedPlans(): SavedPlan[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(PLANS_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function savePlanToStorage(plan: SavedPlan): void {
  const plans = getSavedPlans()
  const idx = plans.findIndex((p) => p.id === plan.id)
  if (idx >= 0) plans[idx] = plan
  else plans.unshift(plan)
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans.slice(0, 50)))
}

export function deleteSavedPlan(id: string): void {
  localStorage.setItem(
    PLANS_KEY,
    JSON.stringify(getSavedPlans().filter((p) => p.id !== id))
  )
}
