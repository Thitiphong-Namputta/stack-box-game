import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { toCatalogItem, toCatalogItemData } from '@/lib/transforms'
import type { CatalogItem } from '@/store/use-scene-store'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const body: Omit<CatalogItem, 'id'> = await request.json()

  const item = await prisma.catalogItem.findFirst({ where: { id, userId } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.catalogItem.update({
    where: { id },
    data: toCatalogItemData(body, userId),
  })

  return NextResponse.json(toCatalogItem(updated))
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const item = await prisma.catalogItem.findFirst({ where: { id, userId } })
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.catalogItem.delete({ where: { id } })

  return new NextResponse(null, { status: 204 })
}
