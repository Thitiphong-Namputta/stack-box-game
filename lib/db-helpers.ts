import { prisma } from './prisma'

export const DEMO_USER_ID = 'demo'

export async function ensureUser(userId: string = DEMO_USER_ID) {
  return prisma.user.upsert({
    where: { email: `${userId}@cargo-planner.local` },
    update: {},
    create: {
      id: userId,
      email: `${userId}@cargo-planner.local`,
      name: 'Demo User',
    },
  })
}

export function getUserId(request: Request): string {
  return request.headers.get('x-user-id') ?? DEMO_USER_ID
}
