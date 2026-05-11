'use client'

import { Trash2, Copy, RotateCw } from 'lucide-react'
import { useSceneStore, getEffectiveSize } from '@/store/use-scene-store'
import { AlignmentToolbar } from './alignment-toolbar'

export function MultiSelectPanel() {
  const { boxes, removeSelected, duplicateSelected, rotateSelected, clearSelection } = useSceneStore()
  const selectedIds = useSceneStore((s) => s.selectedIds)
  const selected = boxes.filter((b) => selectedIds.has(b.id))

  const totalWeight = selected.reduce((s, b) => s + (b.weight ?? 0), 0)
  const totalVolume = selected.reduce((s, b) => {
    const e = getEffectiveSize(b)
    return s + e.w * e.h * e.d
  }, 0)

  return (
    <div className="flex-1 overflow-y-auto">
      <section className="p-6 an-section-border-bottom">
        <div className="text-[10px] font-bold uppercase tracking-widest an-section-label">
          Selection ({selected.length} items)
        </div>

        {/* Aggregate stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="p-3 rounded-lg an-stat-card">
            <div className="text-[10px] uppercase an-stat-label">Total Weight</div>
            <div className="font-mono font-bold text-sm an-text-on-surface mt-1">
              {totalWeight.toFixed(1)} kg
            </div>
          </div>
          <div className="p-3 rounded-lg an-stat-card">
            <div className="text-[10px] uppercase an-stat-label">Total Volume</div>
            <div className="font-mono font-bold text-sm an-text-on-surface mt-1">
              {(totalVolume / 1_000_000).toFixed(3)} m³
            </div>
          </div>
        </div>

        {/* Bulk action buttons */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            type="button"
            onClick={() => rotateSelected('fwd')}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-70 an-btn-outline-primary"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Rotate
          </button>
          <button
            type="button"
            onClick={duplicateSelected}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-70 an-btn-outline-primary"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
          <button
            type="button"
            onClick={removeSelected}
            className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-opacity hover:opacity-70 text-red-400 border border-red-500/40 hover:bg-red-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>

        {/* Alignment / distribution toolbar */}
        <AlignmentToolbar />
      </section>

      {/* Selected items list */}
      <section className="p-6">
        <div className="text-[10px] font-bold uppercase tracking-widest an-section-label mb-3">
          Selected Items
        </div>
        <div className="space-y-1 max-h-52 overflow-y-auto">
          {selected.map((b) => (
            <div
              key={b.id}
              className="text-[11px] font-mono an-text-on-surface-muted px-2 py-1.5 rounded an-manifest-item flex justify-between items-center"
            >
              <div className="flex items-center gap-2 min-w-0">
                {/* backgroundColor is dynamic — cannot use CSS class */}
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: b.color }} />
                <span className="truncate">{b.name}</span>
              </div>
              <span className="shrink-0 ml-2 opacity-60">{b.weight}kg</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={clearSelection}
          className="mt-3 w-full py-1.5 rounded text-[10px] font-bold an-text-on-surface-muted hover:opacity-70 transition-opacity an-btn-outline-primary"
        >
          Clear Selection
        </button>
      </section>
    </div>
  )
}
