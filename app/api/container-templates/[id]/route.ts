import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const template = await prisma.containerTemplate.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!template) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.containerTemplate.delete({ where: { id } })

  return new NextResponse(null, { status: 204 })
}
