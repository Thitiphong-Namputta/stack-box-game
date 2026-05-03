import 'dotenv/config'
import bcrypt from 'bcryptjs'
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

  const hash = await bcrypt.hash('admin1234', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@cargo-planner.local' },
    update: {},
    create: {
      email: 'admin@cargo-planner.local',
      name: 'Admin',
      passwordHash: hash,
    },
  })
  console.log('Seeded admin user:', admin.id)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
