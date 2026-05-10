import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import type { ContainerTemplate } from '@/lib/container-templates/types'

function toContainerTemplate(row: {
  id: string
  code: string
  name: string
  category: string
  sizeW: number
  sizeH: number
  sizeD: number
  maxWeight: number
  tareWeight: number | null
  description: string | null
  userId: string
}): ContainerTemplate {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    category: row.category as ContainerTemplate['category'],
    size: { w: row.sizeW, h: row.sizeH, d: row.sizeD },
    maxWeight: row.maxWeight,
    tareWeight: row.tareWeight ?? undefined,
    description: row.description ?? undefined,
    isCustom: true,
    userId: row.userId,
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const templates = await prisma.containerTemplate.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(templates.map(toContainerTemplate))
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body: {
    code: string
    name: string
    category?: string
    size: { w: number; h: number; d: number }
    maxWeight: number
    tareWeight?: number
    description?: string
  } = await request.json()

  const created = await prisma.containerTemplate.create({
    data: {
      code: body.code,
      name: body.name,
      category: body.category ?? 'custom',
      sizeW: body.size.w,
      sizeH: body.size.h,
      sizeD: body.size.d,
      maxWeight: body.maxWeight,
      tareWeight: body.tareWeight,
      description: body.description,
      userId: session.user.id,
    },
  })

  return NextResponse.json(toContainerTemplate(created), { status: 201 })
}
