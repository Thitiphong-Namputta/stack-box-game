'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Settings2, Wand2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { useSceneStore } from '@/store/useSceneStore'
import { useBinPacking } from '@/lib/packing/useBinPacking'

const containerSchema = z.object({
  w: z.number().min(100).max(2000),
  h: z.number().min(50).max(1000),
  d: z.number().min(100).max(2000),
  maxWeight: z.number().min(0).max(100000),
})

type ContainerForm = z.infer<typeof containerSchema>

export function ControlPanel() {
  const {
    containerSize,
    setContainerSize,
    gridStep,
    setGridStep,
    ghostOpacity,
    setGhostOpacity,
    clearBoxes,
    moveAllBoxes,
    boxes,
  } = useSceneStore()
  const { spaceUtilization, autoPack } = useBinPacking()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [unfitCount, setUnfitCount] = useState(0)

  const { register, handleSubmit, formState: { errors } } = useForm<ContainerForm>({
    resolver: zodResolver(containerSchema),
    defaultValues: containerSize,
  })

  const onSave = (data: ContainerForm) => {
    setContainerSize(data)
    setDialogOpen(false)
  }

  const handleAutoPack = () => {
    if (boxes.length === 0) return
    const { packed, unfit } = autoPack()
    moveAllBoxes(packed)
    setUnfitCount(unfit.length)
  }

  return (
    <div className="space-y-4">
      {/* Space Utilization */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-400">พื้นที่ใช้ไป</span>
          <span className="text-xs font-mono text-white">{spaceUtilization}%</span>
        </div>
        <Progress value={spaceUtilization} className="h-2 bg-slate-700" />
        {unfitCount > 0 && (
          <Badge variant="destructive" className="mt-2 text-xs">
            {unfitCount} กล่องไม่พอดี
          </Badge>
        )}
      </div>

      <Separator className="bg-slate-700" />

      {/* Grid Step */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">Snap Grid</span>
          <span className="text-xs font-mono text-white">{gridStep} ซม.</span>
        </div>
        <input
          type="range"
          aria-label="Snap grid size"
          value={gridStep}
          onChange={(e) => setGridStep(Number(e.target.value))}
          min={1}
          max={50}
          step={1}
          className="w-full accent-indigo-500 cursor-pointer"
        />
      </div>

      {/* Ghost Opacity */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-400">ความโปร่งใส Preview</span>
          <span className="text-xs font-mono text-white">{Math.round(ghostOpacity * 100)}%</span>
        </div>
        <input
          type="range"
          aria-label="Ghost preview opacity"
          value={ghostOpacity}
          onChange={(e) => setGhostOpacity(Number(e.target.value))}
          min={0.1}
          max={0.9}
          step={0.05}
          className="w-full accent-indigo-500 cursor-pointer"
        />
      </div>

      <Separator className="bg-slate-700" />

      {/* Actions */}
      <div className="space-y-2">
        <Button
          onClick={handleAutoPack}
          size="sm"
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-2"
          disabled={boxes.length === 0}
        >
          <Wand2 className="w-3.5 h-3.5" />
          จัดเรียงอัตโนมัติ
        </Button>

        {/* Container Settings Dialog — base-ui trigger renders as <button> natively */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-slate-700 bg-transparent px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
            <Settings2 className="w-3.5 h-3.5" />
            ตั้งค่าตู้สินค้า
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader>
              <DialogTitle>ขนาดตู้สินค้า</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSave)} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">กว้าง (ซม.)</label>
                  <Input
                    type="number"
                    {...register('w', { valueAsNumber: true })}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                  {errors.w && <p className="text-red-400 text-xs mt-1">{errors.w.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">สูง (ซม.)</label>
                  <Input
                    type="number"
                    {...register('h', { valueAsNumber: true })}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                  {errors.h && <p className="text-red-400 text-xs mt-1">{errors.h.message}</p>}
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">ลึก (ซม.)</label>
                  <Input
                    type="number"
                    {...register('d', { valueAsNumber: true })}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                  {errors.d && <p className="text-red-400 text-xs mt-1">{errors.d.message}</p>}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">น้ำหนักสูงสุด (kg)</label>
                <Input
                  type="number"
                  {...register('maxWeight', { valueAsNumber: true })}
                  className="bg-slate-800 border-slate-600 text-white"
                />
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500">
                  บันทึก
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Button
          size="sm"
          variant="ghost"
          className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 gap-2"
          onClick={clearBoxes}
          disabled={boxes.length === 0}
        >
          <Trash2 className="w-3.5 h-3.5" />
          ล้างทั้งหมด
        </Button>
      </div>

      {/* Box count */}
      <div className="text-xs text-slate-500 text-center">
        {boxes.length} กล่องในตู้ · ตู้ {containerSize.w}×{containerSize.h}×{containerSize.d} ซม.
      </div>
    </div>
  )
}