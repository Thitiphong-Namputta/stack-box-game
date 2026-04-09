'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Settings2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { useSceneStore } from '@/store/useSceneStore'

const containerSchema = z.object({
  w: z.number().min(100).max(2000),
  h: z.number().min(50).max(1000),
  d: z.number().min(100).max(2000),
  maxWeight: z.number().min(0).max(100000),
})

type ContainerForm = z.infer<typeof containerSchema>

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10px] font-bold uppercase tracking-widest mb-3"
      style={{ color: 'color-mix(in srgb, var(--color-an-on-surface-variant) 50%, transparent)' }}
    >
      {children}
    </div>
  )
}

export function ContainerTab() {
  const {
    containerSize,
    setContainerSize,
    gridStep,
    setGridStep,
    ghostOpacity,
    setGhostOpacity,
    clearBoxes,
    boxes,
  } = useSceneStore()
  const [dialogOpen, setDialogOpen] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContainerForm>({
    resolver: zodResolver(containerSchema),
    defaultValues: containerSize,
  })

  const onSave = (data: ContainerForm) => {
    setContainerSize(data)
    setDialogOpen(false)
  }

  return (
    <div className="space-y-6 py-2">
      {/* Snap Grid */}
      <div>
        <SectionLabel>Viewport Settings</SectionLabel>
        <div>
          <div
            className="flex items-center justify-between mb-2"
            style={{ color: 'var(--color-an-on-surface)' }}
          >
            <span className="text-xs">Snap Grid</span>
            <span className="text-xs font-mono">{gridStep} cm</span>
          </div>
          <input
            type="range"
            aria-label="Snap grid size"
            value={gridStep}
            onChange={(e) => setGridStep(Number(e.target.value))}
            min={1}
            max={50}
            step={1}
            className="w-full cursor-pointer"
            style={{ accentColor: 'var(--color-an-primary)' }}
          />
        </div>
      </div>

      {/* Ghost Opacity */}
      <div>
        <div
          className="flex items-center justify-between mb-2"
          style={{ color: 'var(--color-an-on-surface)' }}
        >
          <span className="text-xs">Preview Opacity</span>
          <span className="text-xs font-mono">{Math.round(ghostOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          aria-label="Ghost preview opacity"
          value={ghostOpacity}
          onChange={(e) => setGhostOpacity(Number(e.target.value))}
          min={0.1}
          max={0.9}
          step={0.05}
          className="w-full cursor-pointer"
          style={{ accentColor: 'var(--color-an-primary)' }}
        />
      </div>

      {/* Container Info */}
      <div>
        <SectionLabel>Container</SectionLabel>
        <div
          className="p-3 rounded-lg text-xs font-mono mb-3"
          style={{
            background: 'var(--color-an-surface-container)',
            color: 'var(--color-an-on-surface-variant)',
          }}
        >
          {containerSize.w} × {containerSize.h} × {containerSize.d} cm
          <div className="mt-1" style={{ opacity: 0.6 }}>
            Max {containerSize.maxWeight} kg
          </div>
        </div>

        {/* Container Settings Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all hover:opacity-80 mb-2"
            style={{
              background: 'color-mix(in srgb, var(--color-an-primary) 10%, transparent)',
              color: 'var(--color-an-primary)',
              border: '1px solid color-mix(in srgb, var(--color-an-primary) 15%, transparent)',
            }}
          >
            <Settings2 className="w-3.5 h-3.5" />
            Container Settings
          </DialogTrigger>
          <DialogContent
            style={{
              background: 'var(--color-an-surface-container-low)',
              color: 'var(--color-an-on-surface)',
              border: '1px solid color-mix(in srgb, var(--color-an-outline-variant) 15%, transparent)',
            }}
          >
            <DialogHeader>
              <DialogTitle style={{ color: 'var(--color-an-on-surface)' }}>
                Container Size
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { field: 'w' as const, label: 'Width (cm)' },
                  { field: 'h' as const, label: 'Height (cm)' },
                  { field: 'd' as const, label: 'Depth (cm)' },
                ].map(({ field, label }) => (
                  <div key={field}>
                    <label
                      className="text-xs mb-1 block"
                      style={{ color: 'var(--color-an-on-surface-variant)' }}
                    >
                      {label}
                    </label>
                    <Input
                      type="number"
                      {...register(field, { valueAsNumber: true })}
                      style={{
                        background: 'var(--color-an-surface-variant)',
                        borderColor:
                          'color-mix(in srgb, var(--color-an-outline-variant) 20%, transparent)',
                        color: 'var(--color-an-on-surface)',
                      }}
                    />
                    {errors[field] && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-an-error)' }}>
                        {errors[field]?.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <label
                  className="text-xs mb-1 block"
                  style={{ color: 'var(--color-an-on-surface-variant)' }}
                >
                  Max Weight (kg)
                </label>
                <Input
                  type="number"
                  {...register('maxWeight', { valueAsNumber: true })}
                  style={{
                    background: 'var(--color-an-surface-variant)',
                    borderColor:
                      'color-mix(in srgb, var(--color-an-outline-variant) 20%, transparent)',
                    color: 'var(--color-an-on-surface)',
                  }}
                />
              </div>
              <DialogFooter>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-bold transition-all hover:opacity-90"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--color-an-primary), var(--color-an-on-primary-container))',
                    color: 'var(--color-an-on-primary)',
                  }}
                >
                  Save
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Clear All */}
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-xs gap-2 hover:opacity-80"
          style={{
            color: 'var(--color-an-error)',
            background: 'transparent',
          }}
          onClick={clearBoxes}
          disabled={boxes.length === 0}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear All
        </Button>
      </div>

      {/* Box count */}
      <div
        className="text-xs text-center pt-2"
        style={{
          color: 'var(--color-an-on-surface-variant)',
          opacity: 0.5,
          borderTop: '1px solid color-mix(in srgb, var(--color-an-outline-variant) 5%, transparent)',
        }}
      >
        {boxes.length} boxes in container
      </div>
    </div>
  )
}
