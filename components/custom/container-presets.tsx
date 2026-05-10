'use client'

import { Ship, Plane, Package, Star } from 'lucide-react'
import { ISO_CONTAINER_PRESETS, PRESETS_BY_CATEGORY } from '@/lib/container-templates/presets'
import type { ContainerTemplate } from '@/lib/container-templates/types'

const CATEGORY_META = {
  sea:    { icon: Ship,    label: 'Sea Freight (ISO)' },
  air:    { icon: Plane,   label: 'Air Cargo' },
  pallet: { icon: Package, label: 'Pallets' },
  custom: { icon: Star,    label: 'My Templates' },
} as const

interface Props {
  customTemplates?: ContainerTemplate[]
  onSelect: (t: ContainerTemplate) => void
  selectedId?: string
}

export function ContainerPresets({ customTemplates = [], onSelect, selectedId }: Props) {
  const grouped: Record<string, ContainerTemplate[]> = {
    ...PRESETS_BY_CATEGORY,
    custom: customTemplates,
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, items]) => {
        if (items.length === 0) return null
        const meta = CATEGORY_META[cat as keyof typeof CATEGORY_META]
        if (!meta) return null
        const { icon: Icon, label } = meta
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2 px-1">
              <Icon className="w-3.5 h-3.5 an-text-on-surface-muted" />
              <span className="text-[10px] font-bold uppercase tracking-widest an-section-label">
                {label}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {items.map((t) => (
                <PresetCard
                  key={t.id}
                  template={t}
                  selected={selectedId === t.id}
                  onClick={() => onSelect(t)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PresetCard({
  template,
  selected,
  onClick,
}: {
  template: ContainerTemplate
  selected?: boolean
  onClick: () => void
}) {
  const vol = (template.size.w * template.size.h * template.size.d) / 1_000_000
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-lg border transition-all ${
        selected
          ? 'an-bg-surface-container-highest border-an-primary'
          : 'an-bg-surface-container border-transparent hover:an-bg-surface-variant'
      }`}
    >
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-xs font-bold an-text-on-surface">{template.name}</div>
          <div className="text-[10px] font-mono an-text-on-surface-muted">{template.code}</div>
        </div>
        <div className="text-[10px] font-mono an-text-primary">{vol.toFixed(1)} m³</div>
      </div>
      <div className="text-[10px] an-text-on-surface-muted font-mono">
        {template.size.w} × {template.size.h} × {template.size.d} cm
      </div>
      <div className="text-[10px] an-text-on-surface-muted mt-1">
        Max payload: {template.maxWeight.toLocaleString()} kg
        {template.tareWeight ? ` · Tare: ${template.tareWeight.toLocaleString()} kg` : null}
      </div>
    </button>
  )
}

// Re-export preset list for use in other components if needed
export { ISO_CONTAINER_PRESETS }
