'use client'

import dynamic from 'next/dynamic'
import { Separator } from '@/components/ui/separator'
import { ItemCatalog } from '@/components/ui-custom/ItemCatalog'
import { ControlPanel } from '@/components/ui-custom/ControlPanel'
import { InfoPanel } from '@/components/ui-custom/InfoPanel'
import { Box } from 'lucide-react'

// Dynamic import to avoid SSR issues with Three.js
const SceneCanvas = dynamic(
  () => import('@/components/scene/SceneCanvas').then((m) => m.SceneCanvas),
  { ssr: false, loading: () => <div className="w-full h-full bg-slate-950 flex items-center justify-center text-slate-500">กำลังโหลด 3D Scene...</div> }
)

export default function PlannerPage() {
  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-2 mb-3">
            <Box className="w-5 h-5 text-indigo-400" />
            <h1 className="text-sm font-bold text-white">3D Cargo Planner</h1>
          </div>
          <ItemCatalog />
        </div>

        {/* Info Panel */}
        <div className="border-b border-slate-800">
          <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            รายละเอียด
          </div>
          <InfoPanel />
        </div>

        {/* Control Panel */}
        <div className="flex-1 overflow-auto">
          <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            ตั้งค่า
          </div>
          <div className="px-4 pb-4">
            <ControlPanel />
          </div>
        </div>
      </aside>

      {/* 3D Canvas */}
      <main className="flex-1 relative">
        <SceneCanvas />

        {/* HUD overlay */}
        <div className="absolute top-4 right-4 text-xs text-slate-500 bg-slate-900/80 rounded px-2 py-1">
          <div>คลิก: เลือกกล่อง</div>
          <div>ลาก: ย้ายตำแหน่ง</div>
          <div>Scroll: Zoom</div>
          <div>คลิกขวา + ลาก: หมุนกล้อง</div>
        </div>
      </main>
    </div>
  )
}