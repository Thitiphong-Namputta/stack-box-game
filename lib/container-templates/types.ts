export interface ContainerTemplate {
  id: string
  code: string
  name: string
  category: 'sea' | 'air' | 'pallet' | 'custom'
  size: { w: number; h: number; d: number }
  maxWeight: number
  tareWeight?: number
  description?: string
  isCustom?: boolean
  userId?: string
}
