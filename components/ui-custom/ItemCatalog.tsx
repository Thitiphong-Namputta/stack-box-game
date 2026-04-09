'use client'

import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Package, Plus, Box, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useSceneStore, SAMPLE_CATALOG, getNextColor } from '@/store/useSceneStore'
import { useBinPacking } from '@/lib/packing/useBinPacking'
import type { CargoBox } from '@/store/useSceneStore'

// ── ManifestItemCard ────────────────────────────────────────────────
function ManifestItemCard({ box }: { box: CargoBox }) {
  const { selectedId, setSelected, removeBox } = useSceneStore()
  const isSelected = selectedId === box.id

  return (
    <div
      onClick={() => setSelected(isSelected ? null : box.id)}
      className="p-3 rounded-lg cursor-pointer transition-all group"
      style={{
        background: isSelected
          ? 'var(--color-an-surface-container-highest)'
          : 'var(--color-an-surface-container)',
        border: isSelected
          ? '1px solid color-mix(in srgb, var(--color-an-primary) 20%, transparent)'
          : '1px solid transparent',
      }}
    >
      {/* Row 1: color dot + name + status badge */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{
              backgroundColor: box.color,
              boxShadow: `0 0 8px ${box.color}66`,
            }}
          />
          <span
            className="text-xs font-mono font-semibold tracking-tight"
            style={{ color: 'var(--color-an-on-surface)' }}
          >
            {box.name}
          </span>
        </div>
        <span
          className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex-shrink-0"
          style={{
            background: 'color-mix(in srgb, var(--color-an-tertiary) 10%, transparent)',
            color: 'var(--color-an-tertiary)',
          }}
        >
          Packed
        </span>
      </div>

      {/* Row 2: dimensions + weight */}
      <div
        className="grid grid-cols-2 gap-2 text-[10px]"
        style={{ color: 'var(--color-an-on-surface-variant)' }}
      >
        <div>
          <span style={{ opacity: 0.4 }}>DIM: </span>
          <span className="font-mono">
            {box.size.w}×{box.size.h}×{box.size.d}
          </span>
        </div>
        <div>
          <span style={{ opacity: 0.4 }}>WT: </span>
          <span className="font-mono">{box.weight}kg</span>
        </div>
      </div>

      {/* Hover action row */}
      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation()
            removeBox(box.id)
          }}
          className="text-[10px] px-2 py-1 rounded transition-colors inline-flex items-center justify-center gap-1 cursor-pointer leading-none"
          style={{
            color: 'var(--color-an-error)',
            background: 'color-mix(in srgb, var(--color-an-error) 10%, transparent)',
          }}
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  )
}

// ── ItemsTab ────────────────────────────────────────────────────────
export function ItemsTab() {
  const { addBox, boxes, containerSize } = useSceneStore()
  const { getSuggestedPosition } = useBinPacking()
  const [showCatalog, setShowCatalog] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = SAMPLE_CATALOG.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = (template: (typeof SAMPLE_CATALOG)[number]) => {
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

    const suggested = getSuggestedPosition(newBox)
    if (suggested) {
      newBox.position = { x: suggested.x, y: suggested.y, z: suggested.z }
    }

    addBox(newBox)
  }

  const categories = [...new Set(SAMPLE_CATALOG.map((i) => i.category).filter(Boolean))]

  return (
    <div className="flex flex-col h-full">
      {/* Section label */}
      <div
        className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1"
        style={{
          color: 'color-mix(in srgb, var(--color-an-on-surface-variant) 50%, transparent)',
        }}
      >
        Manifest ({boxes.length} Items)
      </div>

      {/* Manifest list */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {boxes.map((box) => (
          <ManifestItemCard key={box.id} box={box} />
        ))}
        {boxes.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-12 gap-3"
            style={{ color: 'var(--color-an-on-surface-variant)', opacity: 0.4 }}
          >
            <Box className="w-8 h-8" />
            <span className="text-xs">No items in manifest</span>
          </div>
        )}
      </div>

      {/* Footer: Add Item */}
      <div
        className="pt-4 mt-4 flex-shrink-0"
        style={{
          borderTop:
            '1px solid color-mix(in srgb, var(--color-an-outline-variant) 5%, transparent)',
        }}
      >
        <button
          onClick={() => setShowCatalog(true)}
          className="w-full py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all hover:opacity-80"
          style={{
            background: 'color-mix(in srgb, var(--color-an-primary) 10%, transparent)',
            color: 'var(--color-an-primary)',
          }}
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Catalog Sheet */}
      <Sheet open={showCatalog} onOpenChange={setShowCatalog}>
        <SheetContent
          side="left"
          className="w-80 p-6"
          style={{
            background: 'var(--color-an-surface-container-low)',
            color: 'var(--color-an-on-surface)',
            border: 'none',
          }}
        >
          <SheetHeader>
            <SheetTitle
              className="flex items-center gap-2"
              style={{ color: 'var(--color-an-on-surface)' }}
            >
              <Package className="w-5 h-5" style={{ color: 'var(--color-an-primary)' }} />
              Item Catalog
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4">
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'var(--color-an-surface-container)',
                borderColor: 'color-mix(in srgb, var(--color-an-outline-variant) 20%, transparent)',
                color: 'var(--color-an-on-surface)',
              }}
            />
          </div>

          <ScrollArea className="h-[calc(100vh-200px)] mt-4">
            {categories.map((category) => {
              const items = filtered.filter((i) => i.category === category)
              if (items.length === 0) return null
              return (
                <div key={category} className="mb-4">
                  <div
                    className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
                    style={{ color: 'var(--color-an-on-surface-variant)' }}
                  >
                    {category}
                  </div>
                  {items.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between p-3 rounded-lg mb-1 group transition-colors"
                      style={{
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        ;(e.currentTarget as HTMLDivElement).style.background =
                          'var(--color-an-surface-container)'
                      }}
                      onMouseLeave={(e) => {
                        ;(e.currentTarget as HTMLDivElement).style.background = 'transparent'
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-medium truncate"
                          style={{ color: 'var(--color-an-on-surface)' }}
                        >
                          {item.name}
                        </div>
                        <div
                          className="text-xs mt-0.5 font-mono"
                          style={{ color: 'var(--color-an-on-surface-variant)' }}
                        >
                          {item.size.w}×{item.size.h}×{item.size.d} cm · {item.weight} kg
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 ml-2 h-7 w-7 p-0 transition-opacity"
                        style={{ color: 'var(--color-an-primary)' }}
                        onClick={() => handleAdd(item)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Separator
                    className="mt-2"
                    style={{
                      background:
                        'color-mix(in srgb, var(--color-an-outline-variant) 15%, transparent)',
                    }}
                  />
                </div>
              )
            })}
          </ScrollArea>

          <div
            className="mt-2 text-xs text-center"
            style={{ color: 'var(--color-an-on-surface-variant)', opacity: 0.6 }}
          >
            {boxes.length} items in manifest
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
