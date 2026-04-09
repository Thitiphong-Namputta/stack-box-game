'use client'

import { CheckCircle2, XCircle, Download } from 'lucide-react'
import { useSceneStore } from '@/store/useSceneStore'
import { useBinPacking } from '@/lib/packing/useBinPacking'

const CONSTRAINTS = [
  { label: 'Stackability limits', pass: true },
  { label: 'Weight distribution', pass: true },
  { label: 'Fragility orientation', pass: false },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] font-bold uppercase tracking-widest"
      style={{ color: 'color-mix(in srgb, var(--color-an-on-surface-variant) 50%, transparent)' }}
    >
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
        <span className="text-xs font-medium" style={{ color: 'var(--color-an-on-surface)' }}>
          {label}
        </span>
        <span className="text-lg font-bold font-mono" style={{ color: valueColor }}>
          {value}%
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full overflow-hidden"
        style={{ background: 'var(--color-an-surface-variant)' }}
      >
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

export function RightPanel() {
  const { boxes, selectedId, containerSize } = useSceneStore()
  const { spaceUtilization } = useBinPacking()
  const selected = boxes.find((b) => b.id === selectedId)

  const totalWeight = boxes.reduce((sum, b) => sum + (b.weight ?? 0), 0)
  const weightUtilization = containerSize.maxWeight
    ? Math.round((totalWeight / containerSize.maxWeight) * 100)
    : 0

  return (
    <aside
      className="w-[320px] flex-shrink-0 flex flex-col z-40"
      style={{
        background: 'var(--color-an-surface-container-low)',
        borderLeft: '1px solid color-mix(in srgb, var(--color-an-outline-variant) 5%, transparent)',
      }}
    >
      {/* Utilization Metrics */}
      <section
        className="p-6 flex-shrink-0"
        style={{
          borderBottom: '1px solid color-mix(in srgb, var(--color-an-outline-variant) 5%, transparent)',
        }}
      >
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
            valueColor="var(--color-an-on-surface)"
            gradient="var(--color-an-primary)"
          />
        </div>
      </section>

      {/* Constraint Analysis */}
      <section
        className="p-6 flex-shrink-0"
        style={{
          borderBottom: '1px solid color-mix(in srgb, var(--color-an-outline-variant) 5%, transparent)',
        }}
      >
        <SectionLabel>Constraint Analysis</SectionLabel>
        <div className="space-y-3 mt-4">
          {CONSTRAINTS.map(({ label, pass }) => (
            <div
              key={label}
              className="flex items-center justify-between p-2 rounded-lg"
              style={{
                background: 'var(--color-an-surface-container)',
                border: !pass
                  ? '1px solid color-mix(in srgb, var(--color-an-error) 20%, transparent)'
                  : '1px solid transparent',
              }}
            >
              <div className="flex items-center gap-3">
                {pass ? (
                  <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--color-an-tertiary)' }} />
                ) : (
                  <XCircle className="w-4 h-4" style={{ color: 'var(--color-an-error)' }} />
                )}
                <span className="text-xs" style={{ color: 'var(--color-an-on-surface)' }}>
                  {label}
                </span>
              </div>
              <span
                className="text-[10px] font-mono"
                style={{
                  color: pass ? 'var(--color-an-on-surface-variant)' : 'var(--color-an-error)',
                  fontWeight: pass ? 'normal' : 'bold',
                }}
              >
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
                <div
                  key={label}
                  className="p-3 rounded-lg"
                  style={{
                    background:
                      'color-mix(in srgb, var(--color-an-surface-container-highest) 50%, transparent)',
                  }}
                >
                  <div
                    className="text-[10px] uppercase mb-1"
                    style={{
                      color:
                        'color-mix(in srgb, var(--color-an-on-surface-variant) 60%, transparent)',
                    }}
                  >
                    {label}
                  </div>
                  <div
                    className="font-mono font-bold text-sm"
                    style={{ color: 'var(--color-an-on-surface)' }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mt-3 p-3 rounded-lg"
              style={{
                background:
                  'color-mix(in srgb, var(--color-an-surface-container-highest) 50%, transparent)',
              }}
            >
              <div
                className="text-[10px] uppercase mb-1"
                style={{
                  color:
                    'color-mix(in srgb, var(--color-an-on-surface-variant) 60%, transparent)',
                }}
              >
                Volume
              </div>
              <div
                className="font-mono font-bold text-sm"
                style={{ color: 'var(--color-an-on-surface)' }}
              >
                {(
                  (selected.size.w * selected.size.h * selected.size.d) /
                  1_000_000
                ).toFixed(3)}{' '}
                m³
              </div>
            </div>
          </>
        ) : (
          <div
            className="flex flex-col items-center justify-center py-12 gap-3 mt-4"
            style={{ color: 'var(--color-an-on-surface-variant)', opacity: 0.4 }}
          >
            <span className="text-xs">Click a box to inspect</span>
          </div>
        )}

        {/* Export + Share */}
        <div
          className="mt-6 pt-6"
          style={{
            borderTop:
              '1px solid color-mix(in srgb, var(--color-an-outline-variant) 5%, transparent)',
          }}
        >
          <button
            className="w-full py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all hover:opacity-80"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--color-an-on-surface)',
              border:
                '1px solid color-mix(in srgb, var(--color-an-outline-variant) 10%, transparent)',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Export Plan (.JSON)
          </button>
          <button
            className="w-full mt-2 py-2 text-xs font-medium transition-all hover:opacity-100"
            style={{
              color: 'color-mix(in srgb, var(--color-an-primary) 60%, transparent)',
            }}
          >
            Share Link
          </button>
        </div>
      </section>
    </aside>
  )
}
