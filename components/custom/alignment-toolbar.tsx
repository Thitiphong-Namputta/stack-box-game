'use client'

import {
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  MoveHorizontal,
} from 'lucide-react'
import { useSceneStore } from '@/store/use-scene-store'

function ToolBtn({
  icon,
  label,
  title,
  onClick,
  disabled,
}: {
  icon?: React.ReactNode
  label?: string
  title?: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-1 py-1.5 px-1 rounded text-[10px] font-bold transition-opacity hover:opacity-70 disabled:opacity-30 an-btn-outline-primary"
    >
      {icon && <span className="w-3.5 h-3.5">{icon}</span>}
      {label && <span>{label}</span>}
    </button>
  )
}

export function AlignmentToolbar() {
  const { alignSelected, distributeSelected } = useSceneStore()
  const selectedCount = useSceneStore((s) => s.selectedIds.size)

  if (selectedCount < 2) return null

  return (
    <div className="mt-4 pt-4 an-section-border-top">
      <div className="text-[10px] font-bold uppercase tracking-widest an-section-label mb-3">
        Align &amp; Distribute
      </div>

      {/* Align X (left/right) */}
      <div className="mb-1">
        <div className="text-[9px] an-text-on-surface-muted mb-1 uppercase tracking-wide">X axis</div>
        <div className="grid grid-cols-3 gap-1">
          <ToolBtn icon={<AlignStartHorizontal className="w-full h-full" />} title="Align X min (left)" onClick={() => alignSelected('x', 'min')} />
          <ToolBtn icon={<AlignCenterHorizontal className="w-full h-full" />} title="Center on X" onClick={() => alignSelected('x', 'center')} />
          <ToolBtn icon={<AlignEndHorizontal className="w-full h-full" />} title="Align X max (right)" onClick={() => alignSelected('x', 'max')} />
        </div>
      </div>

      {/* Align Y (up/down) */}
      <div className="mb-1">
        <div className="text-[9px] an-text-on-surface-muted mb-1 uppercase tracking-wide">Y axis</div>
        <div className="grid grid-cols-3 gap-1">
          <ToolBtn icon={<AlignStartVertical className="w-full h-full" />} title="Align Y min (bottom)" onClick={() => alignSelected('y', 'min')} />
          <ToolBtn icon={<AlignCenterVertical className="w-full h-full" />} title="Center on Y" onClick={() => alignSelected('y', 'center')} />
          <ToolBtn icon={<AlignEndVertical className="w-full h-full" />} title="Align Y max (top)" onClick={() => alignSelected('y', 'max')} />
        </div>
      </div>

      {/* Align Z (depth) */}
      <div className="mb-1">
        <div className="text-[9px] an-text-on-surface-muted mb-1 uppercase tracking-wide">Z axis</div>
        <div className="grid grid-cols-3 gap-1">
          <ToolBtn icon={<AlignStartHorizontal className="w-full h-full" />} title="Align Z min (front)" onClick={() => alignSelected('z', 'min')} />
          <ToolBtn icon={<AlignCenterHorizontal className="w-full h-full" />} title="Center on Z" onClick={() => alignSelected('z', 'center')} />
          <ToolBtn icon={<AlignEndHorizontal className="w-full h-full" />} title="Align Z max (back)" onClick={() => alignSelected('z', 'max')} />
        </div>
      </div>

      {/* Distribute — requires ≥ 3 */}
      {selectedCount >= 3 && (
        <div className="mt-2">
          <div className="text-[9px] an-text-on-surface-muted mb-1 uppercase tracking-wide">Distribute</div>
          <div className="grid grid-cols-3 gap-1">
            <ToolBtn icon={<AlignHorizontalDistributeCenter className="w-full h-full" />} label="X" title="Distribute X" onClick={() => distributeSelected('x')} />
            <ToolBtn icon={<MoveHorizontal className="w-full h-full" />} label="Y" title="Distribute Y" onClick={() => distributeSelected('y')} />
            <ToolBtn icon={<AlignVerticalDistributeCenter className="w-full h-full" />} label="Z" title="Distribute Z" onClick={() => distributeSelected('z')} />
          </div>
        </div>
      )}
    </div>
  )
}
