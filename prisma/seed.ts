import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../lib/generated/prisma/client'

const adapter = new PrismaBetterSqlite3({ url: `${process.env.DATABASE_URL}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  const demo = await prisma.user.upsert({
    where: { email: 'demo@cargo-planner.local' },
    update: {},
    create: {
      id: 'demo',
      email: 'demo@cargo-planner.local',
      name: 'Demo User',
    },
  })
  console.log('Seeded demo user:', demo.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
