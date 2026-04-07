import Link from 'next/link'
import { Box, ArrowRight } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
      <div className="text-center space-y-6 px-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Box className="w-12 h-12 text-indigo-400" />
          <h1 className="text-4xl font-bold">3D Cargo Box Planner</h1>
        </div>
        <p className="text-slate-400 text-lg max-w-md">
          จัดวางสินค้าภายในตู้สินค้าแบบ 3D ได้อย่างแม่นยำ
          พร้อมระบบ Snap-to-Grid และ Auto-Pack อัตโนมัติ
        </p>
        <Link
          href="/planner"
          className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-full font-semibold transition-colors"
        >
          เริ่มใช้งาน
          <ArrowRight className="w-4 h-4" />
        </Link>
        <div className="grid grid-cols-3 gap-4 mt-8 text-sm text-slate-400">
          <div className="bg-slate-900 rounded-lg p-4">
            <div className="text-2xl mb-1">🖱️</div>
            <div>ลาก-วางกล่อง</div>
            <div className="text-xs mt-1">ใน 3D Space</div>
          </div>
          <div className="bg-slate-900 rounded-lg p-4">
            <div className="text-2xl mb-1">🎯</div>
            <div>Snap-to-Grid</div>
            <div className="text-xs mt-1">แม่นยำ</div>
          </div>
          <div className="bg-slate-900 rounded-lg p-4">
            <div className="text-2xl mb-1">✨</div>
            <div>Auto-Pack</div>
            <div className="text-xs mt-1">จัดเรียงอัตโนมัติ</div>
          </div>
        </div>
      </div>
    </div>
  )
}