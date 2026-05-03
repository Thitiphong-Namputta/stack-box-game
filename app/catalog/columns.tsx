'use client'

import { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CatalogItem } from '@/store/use-scene-store'

export function getCatalogColumns(
  onEdit: (item: CatalogItem) => void,
  onDelete: (id: string) => void
): ColumnDef<CatalogItem>[] {
  return [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 an-text-on-surface-muted hover:an-text-on-surface"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          ชื่อสินค้า
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-semibold an-text-on-surface">{row.original.name}</span>
      ),
    },
    {
      accessorKey: 'category',
      header: 'ประเภท',
      cell: ({ row }) => (
        <span className="text-xs an-text-on-surface-muted uppercase tracking-wider">
          {row.original.category ?? '—'}
        </span>
      ),
    },
    {
      id: 'dimensions',
      header: 'ขนาด (cm)',
      cell: ({ row }) => {
        const { w, h, d } = row.original.size
        return <span className="font-mono text-xs an-text-on-surface-muted">{w}×{h}×{d}</span>
      },
    },
    {
      accessorKey: 'weight',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 an-text-on-surface-muted hover:an-text-on-surface"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          น้ำหนัก (kg)
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono">{row.original.weight}</span>
      ),
    },
    {
      id: 'volume',
      header: 'ปริมาตร (m³)',
      cell: ({ row }) => {
        const { w, h, d } = row.original.size
        const vol = (w * h * d) / 1_000_000
        return <span className="font-mono text-xs">{vol.toFixed(4)}</span>
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const item = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent transition-colors">
              <span className="sr-only">เปิดเมนู</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Pencil className="mr-2 h-4 w-4" />
                แก้ไข
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/planner" className="flex w-full items-center">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  เปิดใน Planner
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(item.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                ลบ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
