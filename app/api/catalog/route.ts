import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser, getUserId } from '@/lib/db-helpers'
import { toCatalogItem, toCatalogItemData } from '@/lib/transforms'
import type { CatalogItem } from '@/store/use-scene-store'

export async function GET(request: Request) {
  const userId = getUserId(request)
  await ensureUser(userId)

  const items = await prisma.catalogItem.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(items.map(toCatalogItem))
}

export async function POST(request: Request) {
  const userId = getUserId(request)
  await ensureUser(userId)

  const body: Omit<CatalogItem, 'id'> = await request.json()

  const created = await prisma.catalogItem.create({
    data: toCatalogItemData(body, userId),
  })

  return NextResponse.json(toCatalogItem(created), { status: 201 })
}
