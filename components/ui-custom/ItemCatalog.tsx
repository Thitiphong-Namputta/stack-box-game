'use client'

import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Package, Plus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useSceneStore, SAMPLE_CATALOG, getNextColor } from '@/store/useSceneStore'
import { useBinPacking } from '@/lib/packing/useBinPacking'

export function ItemCatalog() {
  const { addBox, boxes, containerSize } = useSceneStore()
  const { getSuggestedPosition } = useBinPacking()
  const [search, setSearch] = useState('')

  const filtered = SAMPLE_CATALOG.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.category?.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = (template: typeof SAMPLE_CATALOG[number]) => {
    const id = nanoid()
    const color = getNextColor()

    const newBox = {
      id,
      name: template.name,
      size: template.size,
      weight: template.weight,
      color,
      position: { x: template.size.w / 2, y: template.size.h / 2, z: template.size.d / 2 },
      category: template.category,
    }

    // Try to get suggested position
    const suggested = getSuggestedPosition(newBox)
    if (suggested) {
      newBox.position = { x: suggested.x, y: suggested.y, z: suggested.z }
    } else {
      // Default: stack at origin if no suggestion
      newBox.position = {
        x: template.size.w / 2,
        y: template.size.h / 2,
        z: template.size.d / 2,
      }
    }

    addBox(newBox)
  }

  const categories = [...new Set(SAMPLE_CATALOG.map((i) => i.category).filter(Boolean))]

  return (
    <Sheet>
      <SheetTrigger className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
        <Package className="w-4 h-4" />
        รายการสินค้า
      </SheetTrigger>
      <SheetContent side="left" className="w-80 bg-slate-950 border-slate-800 text-white">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            Catalog สินค้า
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4">
          <Input
            placeholder="ค้นหาสินค้า..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        <ScrollArea className="h-[calc(100vh-160px)] mt-4">
          {categories.map((category) => {
            const items = filtered.filter((i) => i.category === category)
            if (items.length === 0) return null
            return (
              <div key={category} className="mb-4">
                <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 px-1">
                  {category}
                </div>
                {items.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 mb-1 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{item.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {item.size.w}×{item.size.h}×{item.size.d} cm · {item.weight} kg
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 text-white hover:bg-slate-700 ml-2 h-7 w-7 p-0"
                      onClick={() => handleAdd(item)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Separator className="bg-slate-800 mt-2" />
              </div>
            )
          })}
        </ScrollArea>

        <div className="mt-2 text-xs text-slate-500 text-center">
          กล่องในตู้: {boxes.length} ชิ้น
        </div>
      </SheetContent>
    </Sheet>
  )
}