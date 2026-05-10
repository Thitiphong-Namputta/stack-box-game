import type { ContainerTemplate } from './types'

// Values are standard industry approximations — verify with your shipping line before use.
export const ISO_CONTAINER_PRESETS: ContainerTemplate[] = [
  {
    id: 'iso-20gp',
    code: '20GP',
    name: '20ft Standard (Dry)',
    category: 'sea',
    size: { w: 589, h: 239, d: 235 },
    maxWeight: 28200,
    tareWeight: 2300,
    description: 'ISO 20ft general purpose dry container',
  },
  {
    id: 'iso-40gp',
    code: '40GP',
    name: '40ft Standard (Dry)',
    category: 'sea',
    size: { w: 1203, h: 239, d: 235 },
    maxWeight: 28800,
    tareWeight: 3750,
    description: 'ISO 40ft general purpose dry container',
  },
  {
    id: 'iso-40hc',
    code: '40HC',
    name: '40ft High Cube',
    category: 'sea',
    size: { w: 1203, h: 269, d: 235 },
    maxWeight: 28600,
    tareWeight: 3900,
    description: 'High Cube — 30 cm taller than standard',
  },
  {
    id: 'iso-45hc',
    code: '45HC',
    name: '45ft High Cube',
    category: 'sea',
    size: { w: 1356, h: 269, d: 235 },
    maxWeight: 27700,
    tareWeight: 4800,
  },
  {
    id: 'iso-20rf',
    code: '20RF',
    name: '20ft Reefer (Refrigerated)',
    category: 'sea',
    size: { w: 543, h: 222, d: 228 },
    maxWeight: 27400,
    tareWeight: 3100,
    description: 'Insulated walls reduce internal volume vs dry',
  },
  {
    id: 'iso-40rf',
    code: '40RF',
    name: '40ft Reefer (Refrigerated)',
    category: 'sea',
    size: { w: 1158, h: 222, d: 228 },
    maxWeight: 29200,
    tareWeight: 4800,
  },
  {
    id: 'air-ld3',
    code: 'LD3',
    name: 'LD3 Air ULD',
    category: 'air',
    size: { w: 156, h: 163, d: 153 },
    maxWeight: 1588,
    tareWeight: 82,
    description: 'Unit Load Device for belly-hold aircraft',
  },
  {
    id: 'pallet-eur',
    code: 'EU-PALLET',
    name: 'Euro Pallet (EUR1)',
    category: 'pallet',
    size: { w: 120, h: 144, d: 80 },
    maxWeight: 1500,
    tareWeight: 25,
    description: '1200×800 mm EUR pallet, max load height 144 cm',
  },
]

export const PRESETS_BY_CATEGORY = ISO_CONTAINER_PRESETS.reduce(
  (acc, t) => {
    ;(acc[t.category] ||= []).push(t)
    return acc
  },
  {} as Record<string, ContainerTemplate[]>
)
