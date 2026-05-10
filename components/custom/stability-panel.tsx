'use client'

import { useMemo } from 'react'
import { Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { useSceneStore } from '@/store/use-scene-store'
import { computeCoG } from '@/lib/physics/center-of-gravity'
import { computeStability } from '@/lib/physics/stability'
import type { StabilityLevel } from '@/lib/physics/stability'

const LEVEL_LABEL: Record<StabilityLevel, string> = {
  excellent: 'EXCELLENT',
  good: 'GOOD',
  warning: 'WARNING',
  danger: 'DANGER',
}

const LEVEL_COLOR: Record<StabilityLevel, string> = {
  excellent: 'var(--color-an-tertiary)',
  good: 'var(--color-an-primary)',
  warning: '#eab308',
  danger: 'var(--color-an-error)',
}

export function StabilityPanel() {
  const { boxes, containerSize, showCoG, toggleCoG } = useSceneStore()

  const result = useMemo(() => {
    const cog = computeCoG(boxes, containerSize)
    if (!cog) return null
    return { cog, stab: computeStability(cog, boxes, containerSize) }
  }, [boxes, containerSize])

  if (!result) {
    return (
      <section className="p-6 an-section-border-bottom">
        <SectionLabel>Stability Analysis</SectionLabel>
        <p className="text-xs an-text-on-surface-muted mt-3">
          เพิ่มกล่องเพื่อดูการวิเคราะห์ศูนย์ถ่วง
        </p>
      </section>
    )
  }

  const { cog, stab } = result
  const color = LEVEL_COLOR[stab.level]

  return (
    <section className="p-6 an-section-border-bottom">
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Stability Analysis</SectionLabel>
        <button
          type="button"
          onClick={toggleCoG}
          className="p-1 rounded hover:opacity-70"
          title={showCoG ? 'Hide CoG marker' : 'Show CoG marker'}
        >
          {showCoG
            ? <Eye className="w-3.5 h-3.5 an-text-primary" />
            : <EyeOff className="w-3.5 h-3.5 an-text-on-surface-muted" />}
        </button>
      </div>

      {/* Score gauge */}
      <div className="text-center mb-4">
        <div className="text-3xl font-bold font-mono" style={{ color }}>
          {stab.score.toFixed(0)}
        </div>
        <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color }}>
          {LEVEL_LABEL[stab.level]}
        </div>
        <div className="text-[10px] an-text-on-surface-muted mt-1">Stability Score</div>
      </div>

      {/* CoG coordinates */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {(['x', 'y', 'z'] as const).map((axis) => {
          const dev = cog.deviation[`pct${axis.toUpperCase()}` as 'pctX' | 'pctY' | 'pctZ']
          const warn = Math.abs(dev) > 10
          return (
            <div key={axis} className="p-2 rounded-lg an-stat-card text-center">
              <div className="text-[9px] uppercase an-stat-label">CoG {axis}</div>
              <div className="text-xs font-mono font-bold an-text-on-surface mt-0.5">
                {cog.cog[axis].toFixed(0)}
              </div>
              <div className={`text-[9px] font-mono ${warn ? 'an-text-error' : 'an-text-on-surface-muted'}`}>
                {dev > 0 ? '+' : ''}{dev.toFixed(1)}%
              </div>
            </div>
          )
        })}
      </div>

      {/* Axle distribution bar */}
      <div className="mb-4">
        <div className="flex justify-between text-[10px] an-text-on-surface-muted mb-1">
          <span>Front {stab.axleDistribution.front.pct.toFixed(0)}%</span>
          <span>Rear {stab.axleDistribution.rear.pct.toFixed(0)}%</span>
        </div>
        <div className="h-2 flex rounded-full overflow-hidden an-util-bar-bg">
          <div
            className="h-full"
            style={{
              width: `${stab.axleDistribution.front.pct}%`,
              background: stab.axleDistribution.balanced
                ? 'var(--color-an-primary)'
                : 'var(--color-an-error)',
            }}
          />
          <div
            className="h-full"
            style={{
              width: `${stab.axleDistribution.rear.pct}%`,
              background: stab.axleDistribution.balanced
                ? 'var(--color-an-tertiary)'
                : '#eab308',
            }}
          />
        </div>
        <div className="text-[10px] an-text-on-surface-muted mt-1 text-center">
          Front: {stab.axleDistribution.front.weight.toFixed(0)} kg ·{' '}
          Rear: {stab.axleDistribution.rear.weight.toFixed(0)} kg
        </div>
      </div>

      {/* Warnings */}
      {stab.warnings.length > 0 && (
        <div className="mt-2 p-3 rounded-lg an-unfit-section">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 an-text-error" />
            <span className="text-[10px] font-bold an-text-error uppercase">
              Stability Warnings
            </span>
          </div>
          <ul className="space-y-1">
            {stab.warnings.map((w, i) => (
              <li key={i} className="text-[11px] an-text-on-surface">
                • {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-widest an-section-label">
      {children}
    </div>
  )
}
