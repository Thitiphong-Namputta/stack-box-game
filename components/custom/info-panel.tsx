'use client'

import { Trash2, Move3D } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useSceneStore } from '@/store/use-scene-store'

export function InfoPanel() {
  const { boxes, selectedId, setSelected, removeBox } = useSceneStore()
  const selected = boxes.find((b) => b.id === selectedId)

  if (!selected) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm gap-2">
        <Move3D className="w-8 h-8 opacity-40" />
        <span>คลิกกล่องเพื่อดูข้อมูล</span>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* backgroundColor is dynamic (per-box color) — cannot use a CSS class */}
          <div className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: selected.color }} />
          <span className="text-sm font-semibold text-white leading-tight">{selected.name}</span>
        </div>
        {selected.category && (
          <Badge variant="secondary" className="text-xs bg-slate-700 text-slate-300 shrink-0">
            {selected.category}
          </Badge>
        )}
      </div>

      <Separator className="bg-slate-700" />

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="text-slate-400 mb-0.5">ขนาด (ซม.)</div>
          <div className="text-white font-mono">
            {selected.size.w} × {selected.size.h} × {selected.size.d}
          </div>
        </div>
        <div>
          <div className="text-slate-400 mb-0.5">น้ำหนัก</div>
          <div className="text-white font-mono">{selected.weight} kg</div>
        </div>
        <div>
          <div className="text-slate-400 mb-0.5">ปริมาตร</div>
          <div className="text-white font-mono text-xs">
            {((selected.size.w * selected.size.h * selected.size.d) / 1_000_000).toFixed(3)} m³
          </div>
        </div>
        <div>
          <div className="text-slate-400 mb-0.5">ตำแหน่ง</div>
          <div className="text-white font-mono text-xs">
            ({Math.round(selected.position.x)}, {Math.round(selected.position.y)}, {Math.round(selected.position.z)})
          </div>
        </div>
      </div>

      <Separator className="bg-slate-700" />

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 text-xs"
          onClick={() => removeBox(selected.id)}
        >
          <Trash2 className="w-3 h-3 mr-1" />
          ลบกล่อง
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 text-slate-400 hover:text-white hover:bg-slate-700 h-8 text-xs"
          onClick={() => setSelected(null)}
        >
          ยกเลิก
        </Button>
      </div>
    </div>
  )
}
