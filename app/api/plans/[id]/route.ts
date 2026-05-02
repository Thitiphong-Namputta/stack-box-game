import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser, getUserId } from '@/lib/db-helpers'
import { toSavedPlan, toBoxData } from '@/lib/transforms'
import type { SavedPlan } from '@/store/use-scene-store'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = getUserId(request)
  await ensureUser(userId)

  const plan = await prisma.plan.findFirst({
    where: { id, userId },
    include: { boxes: true },
  })

  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(toSavedPlan(plan))
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = getUserId(request)
  await ensureUser(userId)

  const plan: SavedPlan = await request.json()

  const updated = await prisma.$transaction(async (tx) => {
    await tx.box.deleteMany({ where: { planId: id } })

    return tx.plan.upsert({
      where: { id },
      update: {
        name: plan.name,
        savedAt: new Date(plan.savedAt),
        containerSize: JSON.stringify(plan.containerSize),
        boxes: {
          create: plan.boxes.map(toBoxData),
        },
      },
      create: {
        id,
        name: plan.name,
        savedAt: new Date(plan.savedAt),
        containerSize: JSON.stringify(plan.containerSize),
        userId,
        boxes: {
          create: plan.boxes.map(toBoxData),
        },
      },
      include: { boxes: true },
    })
  })

  return NextResponse.json(toSavedPlan(updated))
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userId = getUserId(request)
  await ensureUser(userId)

  const plan = await prisma.plan.findFirst({ where: { id, userId } })
  if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.plan.delete({ where: { id } })

  return new NextResponse(null, { status: 204 })
}
