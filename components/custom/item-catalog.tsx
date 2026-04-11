'use client'

import { useState } from 'react'
import { nanoid } from 'nanoid'
import { Package, Plus, Box, Trash2 } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useSceneStore, getNextColor } from '@/store/use-scene-store'
import { useBinPacking } from '@/lib/packing/use-bin-packing'
import type { CargoBox, CatalogItem } from '@/store/use-scene-store'

// ── ManifestItemCard ────────────────────────────────────────────────
function ManifestItemCard({ box }: { box: CargoBox }) {
  const { selectedId, setSelected, removeBox, unfitIds } = useSceneStore()
  const isSelected = selectedId === box.id
  const isUnfit = unfitIds.includes(box.id)

  return (
    <div
      onClick={() => setSelected(isSelected ? null : box.id)}
      className={`p-3 rounded-lg cursor-pointer transition-all group ${isSelected ? 'an-manifest-item-active' : 'an-manifest-item'}`}
    >
      {/* Row 1: color dot + name + status badge */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          {/* backgroundColor and boxShadow are dynamic (per-box color) — cannot use CSS classes */}
          <div
            className="w-3 h-3 rounded-sm shrink-0"
            style={{
              backgroundColor: box.color,
              boxShadow: `0 0 8px ${box.color}66`,
            }}
          />
          <span className="text-xs font-mono font-semibold tracking-tight an-text-on-surface">
            {box.name}
          </span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${isUnfit ? 'an-badge-unfit' : 'an-badge-packed'}`}>
          {isUnfit ? 'Unfit' : 'Packed'}
        </span>
      </div>

      {/* Row 2: dimensions + weight */}
      <div className="grid grid-cols-2 gap-2 text-[10px] an-text-on-surface-muted">
        <div>
          <span className="opacity-40">DIM: </span>
          <span className="font-mono">
            {box.size.w}×{box.size.h}×{box.size.d}
          </span>
        </div>
        <div>
          <span className="opacity-40">WT: </span>
          <span className="font-mono">{box.weight}kg</span>
        </div>
      </div>

      {/* Hover action row */}
      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            removeBox(box.id)
          }}
          className="text-[10px] px-2 py-1 rounded transition-colors inline-flex items-center justify-center gap-1 cursor-pointer leading-none an-btn-delete-sm"
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
  const { addBox, boxes, catalog } = useSceneStore()
  const { getSuggestedPosition } = useBinPacking()
  const [showCatalog, setShowCatalog] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = catalog.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = (template: CatalogItem) => {
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

  const categories = [...new Set(catalog.map((i) => i.category).filter(Boolean))]

  return (
    <div className="flex flex-col h-full">
      {/* Section label */}
      <div className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1 an-section-label">
        Manifest ({boxes.length} Items)
      </div>

      {/* Manifest list */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {boxes.map((box) => (
          <ManifestItemCard key={box.id} box={box} />
        ))}
        {boxes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 an-text-on-surface-muted opacity-40">
            <Box className="w-8 h-8" />
            <span className="text-xs">No items in manifest</span>
          </div>
        )}
      </div>

      {/* Footer: Add Item */}
      <div className="pt-4 mt-4 shrink-0 an-section-border-top">
        <button
          type="button"
          onClick={() => setShowCatalog(true)}
          className="w-full py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all hover:opacity-80 an-btn-outline-primary"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Catalog Sheet */}
      <Sheet open={showCatalog} onOpenChange={setShowCatalog}>
        <SheetContent side="left" className="w-80 p-6 an-sheet-content">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 an-text-on-surface">
              <Package className="w-5 h-5 an-text-primary" />
              Item Catalog
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4">
            <Input
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="an-input"
            />
          </div>

          <ScrollArea className="h-[calc(100vh-200px)] mt-4">
            {categories.map((category) => {
              const items = filtered.filter((i) => i.category === category)
              if (items.length === 0) return null
              return (
                <div key={category} className="mb-4">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2 px-1 an-text-on-surface-muted">
                    {category}
                  </div>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg mb-1 group transition-colors an-catalog-item"
                      onClick={() => handleAdd(item)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate an-text-on-surface">
                          {item.name}
                        </div>
                        <div className="text-xs mt-0.5 font-mono an-text-on-surface-muted">
                          {item.size.w}×{item.size.h}×{item.size.d} cm · {item.weight} kg
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 ml-2 h-7 w-7 p-0 transition-opacity an-text-primary"
                        onClick={(e) => { e.stopPropagation(); handleAdd(item) }}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Separator className="mt-2 an-separator" />
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="text-xs text-center an-text-on-surface-muted opacity-60 py-8">
                No items found
              </div>
            )}
          </ScrollArea>

          <div className="mt-2 text-xs text-center an-text-on-surface-muted opacity-60">
            {boxes.length} items in manifest
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
