import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { toCatalogItem, toCatalogItemData } from '@/lib/transforms'
import type { CatalogItem } from '@/store/use-scene-store'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const items = await prisma.catalogItem.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(items.map(toCatalogItem))
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const body: Omit<CatalogItem, 'id'> = await request.json()

  const created = await prisma.catalogItem.create({
    data: toCatalogItemData(body, userId),
  })

  return NextResponse.json(toCatalogItem(created), { status: 201 })
}
