'use client'

import { useState } from 'react'
import { GripVertical } from 'lucide-react'
import { useSceneStore } from '@/store/use-scene-store'

export function SequenceList() {
  const { boxes, loadingOrder, setLoadingOrder, currentStep, setStep, playbackState } =
    useSceneStore()
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const items = loadingOrder
    .map((id) => boxes.find((b) => b.id === id))
    .filter((b): b is NonNullable<typeof b> => b != null)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <p className="text-xs an-text-on-surface-muted text-center px-4">
          เพิ่มกล่องในตู้เพื่อดูลำดับการโหลด
        </p>
      </div>
    )
  }

  const handleDrop = (targetIdx: number) => {
    setDragOverIdx(null)
    if (draggingIdx === null || draggingIdx === targetIdx) {
      setDraggingIdx(null)
      return
    }
    const next = [...loadingOrder]
    const [moved] = next.splice(draggingIdx, 1)
    next.splice(targetIdx, 0, moved)
    setLoadingOrder(next)
    setDraggingIdx(null)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1 an-section-label">
        Loading Sequence ({items.length})
      </div>

      {playbackState !== 'idle' && (
        <div className="mb-2 px-1 py-1 rounded text-[10px] an-text-primary bg-indigo-500/10 text-center">
          กำลังเล่น — ลาก reorder จะทำงานเมื่อ reset แล้ว
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {items.map((box, i) => {
          const isLoaded = i < currentStep
          const isCurrent = i === currentStep - 1
          const isDragOver = dragOverIdx === i

          return (
            <div
              key={box.id}
              draggable={playbackState === 'idle'}
              onDragStart={() => setDraggingIdx(i)}
              onDragOver={(e) => { e.preventDefault(); setDragOverIdx(i) }}
              onDragLeave={() => setDragOverIdx(null)}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { setDraggingIdx(null); setDragOverIdx(null) }}
              onClick={() => setStep(i + 1)}
              className={[
                'flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer select-none transition-colors',
                isCurrent
                  ? 'an-manifest-item-active ring-1 ring-indigo-500/50'
                  : isLoaded
                  ? 'an-manifest-item'
                  : 'an-manifest-item opacity-50',
                isDragOver ? 'ring-2 ring-indigo-400' : '',
                draggingIdx === i ? 'opacity-30' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <GripVertical className="w-3 h-3 an-text-on-surface-muted shrink-0" />
              <span className="text-[10px] font-mono an-text-primary w-6 text-right shrink-0">
                #{i + 1}
              </span>
              <div
                className="w-3 h-3 rounded shrink-0"
                style={{ backgroundColor: box.color }}
              />
              <span className="flex-1 text-xs an-text-on-surface truncate">{box.name}</span>
              <span className="text-[10px] an-text-on-surface-muted shrink-0">
                {box.weight}kg
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
