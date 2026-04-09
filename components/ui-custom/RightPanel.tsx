'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { CheckCircle2, XCircle, Download, AlertTriangle } from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import { useBinPacking } from '@/lib/packing/useBinPacking'
import type { CargoBox } from '@/store/useSceneStore'

// ── helpers ─────────────────────────────────────────────────────────

function hasAnyCollision(boxes: CargoBox[]): boolean {
  const EPS = 0.5
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i]
      const b = boxes[j]
      const aBox = new THREE.Box3(
        new THREE.Vector3(
          a.position.x - a.size.w / 2 + EPS,
          a.position.y - a.size.h / 2 + EPS,
          a.position.z - a.size.d / 2 + EPS
        ),
        new THREE.Vector3(
          a.position.x + a.size.w / 2 - EPS,
          a.position.y + a.size.h / 2 - EPS,
          a.position.z + a.size.d / 2 - EPS
        )
      )
      const bBox = new THREE.Box3(
        new THREE.Vector3(
          b.position.x - b.size.w / 2 + EPS,
          b.position.y - b.size.h / 2 + EPS,
          b.position.z - b.size.d / 2 + EPS
        ),
        new THREE.Vector3(
          b.position.x + b.size.w / 2 - EPS,
          b.position.y + b.size.h / 2 - EPS,
          b.position.z + b.size.d / 2 - EPS
        )
      )
      if (aBox.intersectsBox(bBox)) return true
    }
  }
  return false
}

// ── sub-components ───────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-widest an-section-label">
      {children}
    </div>
  )
}

function UtilizationBar({
  label,
  value,
  valueColor,
  gradient,
}: {
  label: string
  value: number
  valueColor: string
  gradient: string
}) {
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-medium an-text-on-surface">{label}</span>
        {/* valueColor is a dynamic prop — cannot use a CSS class */}
        <span className="text-lg font-bold font-mono" style={{ color: valueColor }}>
          {value}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden an-util-bar-bg">
        {/* width and gradient are dynamic props — cannot use CSS classes */}
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(Math.max(value, 0), 100)}%`,
            background: gradient,
          }}
        />
      </div>
    </div>
  )
}

// ── RightPanel ───────────────────────────────────────────────────────

export function RightPanel() {
  const { boxes, selectedId, containerSize, unfitIds } = useSceneStore()
  const { spaceUtilization } = useBinPacking()
  const selected = boxes.find((b) => b.id === selectedId)

  const totalWeight = boxes.reduce((sum, b) => sum + (b.weight ?? 0), 0)
  const weightUtilization = containerSize.maxWeight
    ? Math.round((totalWeight / containerSize.maxWeight) * 100)
    : 0

  const constraints = useMemo(() => {
    const weightOk = totalWeight <= (containerSize.maxWeight ?? Infinity)
    const volumeOk = spaceUtilization <= 100
    const noCollision = boxes.length < 2 || !hasAnyCollision(boxes)
    return [
      { label: 'Weight limit', pass: weightOk },
      { label: 'Volume capacity', pass: volumeOk },
      { label: 'No collisions', pass: noCollision },
    ]
  }, [boxes, totalWeight, containerSize.maxWeight, spaceUtilization])

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      containerSize,
      boxes: boxes.map((b) => ({
        id: b.id,
        name: b.name,
        size: b.size,
        weight: b.weight,
        position: b.position,
        category: b.category,
      })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cargo-plan-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <aside className="w-[320px] shrink-0 flex flex-col z-40 an-right-panel">
      {/* Utilization Metrics */}
      <section className="p-6 shrink-0 an-section-border-bottom">
        <SectionLabel>Utilization Metrics</SectionLabel>
        <div className="space-y-6 mt-4">
          <UtilizationBar
            label="Volume Efficiency"
            value={spaceUtilization}
            valueColor="var(--color-an-tertiary)"
            gradient="linear-gradient(to right, var(--color-an-primary), var(--color-an-tertiary))"
          />
          <UtilizationBar
            label="Weight Capacity"
            value={weightUtilization}
            valueColor={weightUtilization > 100 ? 'var(--color-an-error)' : 'var(--color-an-on-surface)'}
            gradient={weightUtilization > 100 ? 'var(--color-an-error)' : 'var(--color-an-primary)'}
          />
        </div>
      </section>

      {/* Unfit items warning */}
      {unfitIds.length > 0 && (
        <section className="px-6 py-4 shrink-0 an-unfit-section">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 shrink-0 an-text-error" />
            <span className="text-xs font-bold an-text-error">
              {unfitIds.length} item{unfitIds.length > 1 ? 's' : ''} could not be packed
            </span>
          </div>
          <div className="space-y-1">
            {unfitIds.map((id) => {
              const box = boxes.find((b) => b.id === id)
              return box ? (
                <div key={id} className="text-[11px] font-mono px-2 py-0.5 rounded an-unfit-item-badge">
                  {box.name} ({box.size.w}×{box.size.h}×{box.size.d})
                </div>
              ) : null
            })}
          </div>
        </section>
      )}

      {/* Constraint Analysis */}
      <section className="p-6 shrink-0 an-section-border-bottom">
        <SectionLabel>Constraint Analysis</SectionLabel>
        <div className="space-y-3 mt-4">
          {constraints.map(({ label, pass }) => (
            <div
              key={label}
              className={`flex items-center justify-between p-2 rounded-lg ${pass ? 'an-constraint-item' : 'an-constraint-item-fail'}`}
            >
              <div className="flex items-center gap-3">
                {pass ? (
                  <CheckCircle2 className="w-4 h-4 an-text-tertiary" />
                ) : (
                  <XCircle className="w-4 h-4 an-text-error" />
                )}
                <span className="text-xs an-text-on-surface">{label}</span>
              </div>
              <span className={`text-[10px] font-mono ${pass ? 'an-constraint-pass' : 'an-constraint-fail'}`}>
                {pass ? 'PASS' : 'FAIL'}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Selected Item Details */}
      <section className="flex-1 p-6 overflow-y-auto">
        <SectionLabel>
          {selected ? `Selection: ${selected.name}` : 'Selection'}
        </SectionLabel>

        {selected ? (
          <>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {[
                { label: 'Length', value: `${selected.size.w}.0 cm` },
                { label: 'Width', value: `${selected.size.d}.0 cm` },
                { label: 'Height', value: `${selected.size.h}.0 cm` },
                { label: 'Weight', value: `${selected.weight} kg` },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-lg an-stat-card">
                  <div className="text-[10px] uppercase mb-1 an-stat-label">{label}</div>
                  <div className="font-mono font-bold text-sm an-text-on-surface">{value}</div>
                </div>
              ))}
            </div>

            <div className="mt-3 p-3 rounded-lg an-stat-card">
              <div className="text-[10px] uppercase mb-1 an-stat-label">Volume</div>
              <div className="font-mono font-bold text-sm an-text-on-surface">
                {(
                  (selected.size.w * selected.size.h * selected.size.d) /
                  1_000_000
                ).toFixed(3)}{' '}
                m³
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 gap-3 mt-4 an-text-on-surface-muted opacity-40">
            <span className="text-xs">Click a box to inspect</span>
          </div>
        )}

        {/* Export */}
        <div className="mt-6 pt-6 an-section-border-top">
          <button
            type="button"
            onClick={handleExport}
            disabled={boxes.length === 0}
            className="w-full py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all hover:opacity-80 disabled:opacity-30 an-btn-export"
          >
            <Download className="w-3.5 h-3.5" />
            Export Plan (.JSON)
          </button>
        </div>
      </section>
    </aside>
  )
}
