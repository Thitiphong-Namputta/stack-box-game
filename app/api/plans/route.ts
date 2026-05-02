import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureUser, getUserId } from '@/lib/db-helpers'
import { toSavedPlan, toBoxData } from '@/lib/transforms'
import type { SavedPlan } from '@/store/use-scene-store'

export async function GET(request: Request) {
  const userId = getUserId(request)
  await ensureUser(userId)

  const plans = await prisma.plan.findMany({
    where: { userId },
    include: { boxes: true },
    orderBy: { savedAt: 'desc' },
    take: 50,
  })

  return NextResponse.json(plans.map(toSavedPlan))
}

export async function POST(request: Request) {
  const userId = getUserId(request)
  await ensureUser(userId)

  const plan: SavedPlan = await request.json()

  const created = await prisma.plan.create({
    data: {
      id: plan.id,
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

  return NextResponse.json(toSavedPlan(created), { status: 201 })
}
