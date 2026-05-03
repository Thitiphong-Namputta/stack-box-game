'use client'

import { ColumnDef } from '@tanstack/react-table'
import Link from 'next/link'
import { ArrowUpDown, MoreHorizontal, ExternalLink, Trash2 } from 'lucide-react'
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
import type { SavedPlan } from '@/store/use-scene-store'

function calcUtilization(plan: SavedPlan): number {
  const usedVol = plan.boxes.reduce((s, b) => s + b.size.w * b.size.h * b.size.d, 0)
  const total = plan.containerSize.w * plan.containerSize.h * plan.containerSize.d
  return total > 0 ? Math.round((usedVol / total) * 100) : 0
}

export function getPlanColumns(
  onDelete: (id: string) => void
): ColumnDef<SavedPlan>[] {
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
          ชื่อ Plan
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <Link
          href={`/planner?plan=${row.original.id}`}
          className="font-semibold an-text-primary hover:opacity-70 transition-opacity"
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'savedAt',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 an-text-on-surface-muted hover:an-text-on-surface"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          วันที่บันทึก
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) =>
        new Date(row.original.savedAt).toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
    {
      id: 'boxes',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 an-text-on-surface-muted hover:an-text-on-surface"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          กล่อง (ชิ้น)
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      accessorFn: (row) => row.boxes.length,
      cell: ({ row }) => <span className="font-mono">{row.original.boxes.length}</span>,
    },
    {
      id: 'containerSize',
      header: 'ขนาดตู้ (cm)',
      cell: ({ row }) => {
        const { w, h, d } = row.original.containerSize
        return <span className="font-mono text-xs an-text-on-surface-muted">{w}×{h}×{d}</span>
      },
    },
    {
      id: 'utilization',
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 an-text-on-surface-muted hover:an-text-on-surface"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          การใช้พื้นที่
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      accessorFn: (row) => calcUtilization(row),
      cell: ({ row }) => {
        const util = calcUtilization(row.original)
        return <span className="font-bold an-text-primary">{util}%</span>
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const plan = row.original
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
              <DropdownMenuItem>
                <Link href={`/planner?plan=${plan.id}`} className="flex w-full items-center">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  เปิดใน Planner
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(plan.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                ลบ Plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
