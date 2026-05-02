# API & Database Design — 3D Cargo Planner

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| ORM | Prisma v7 |
| Driver Adapter | `@prisma/adapter-better-sqlite3` (Node.js) |
| Database (dev) | SQLite (`prisma/dev.db`) |
| Database (prod) | PostgreSQL (Neon / Supabase) |

---

## Setup

```bash
npm install prisma @prisma/client @prisma/adapter-better-sqlite3 better-sqlite3
npm install --save-dev dotenv tsx @types/better-sqlite3

npx prisma init --datasource-provider sqlite   # สร้าง prisma/schema.prisma + prisma.config.ts + .env

npx prisma migrate dev --name init             # สร้าง dev.db + tables
npx prisma generate                            # generate client → lib/generated/prisma/
npx prisma db seed                             # สร้าง demo user
```

> **Prisma v7 เปลี่ยน architecture** — ไม่ใช้ `url` ใน schema.prisma อีกต่อไป  
> URL สำหรับ CLI อยู่ใน `prisma.config.ts` | URL สำหรับ runtime ส่งผ่าน driver adapter

---

## File Structure

```
prisma/
├── schema.prisma       ← Database schema
├── dev.db              ← SQLite file (auto-generated)
├── seed.ts             ← Seed script (demo user)
└── migrations/

prisma.config.ts        ← Prisma CLI config (URL, migration path, seed)

lib/
├── generated/prisma/   ← Generated Prisma client (อย่าแก้มือ)
├── prisma.ts           ← Prisma client singleton (ใช้ adapter)
├── transforms.ts       ← แปลง Prisma ↔ Zustand types
├── db-helpers.ts       ← ensureUser(), getUserId()
└── api-client.ts       ← Frontend fetch wrappers

app/api/
├── plans/
│   ├── route.ts           ← GET, POST
│   └── [id]/route.ts      ← GET, PUT, DELETE
└── catalog/
    ├── route.ts            ← GET, POST
    └── [id]/route.ts       ← PUT, DELETE

components/providers/
└── catalog-provider.tsx    ← โหลด catalog จาก DB เมื่อ app start
```

---

## prisma.config.ts

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

> `env("DATABASE_URL")` ใช้สำหรับ CLI เท่านั้น (migrate, generate, seed)  
> Runtime ใช้ `process.env.DATABASE_URL` ผ่าน driver adapter แทน

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "sqlite"
  // ไม่มี url ที่นี่ — Prisma v7 จัดการ URL ผ่าน prisma.config.ts
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())

  plans   Plan[]
  catalog CatalogItem[]
}

model Plan {
  id            String   @id @default(cuid())
  name          String
  savedAt       DateTime @default(now())
  updatedAt     DateTime @updatedAt
  containerSize String   // JSON string — SQLite ไม่รองรับ Json type
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  boxes         Box[]

  @@index([userId])
}

model Box {
  id            String  @id @default(cuid())
  name          String
  weight        Float
  color         String
  category      String?
  orientationId Int     @default(0)

  sizeW Float
  sizeH Float
  sizeD Float

  posX Float
  posY Float
  posZ Float

  planId String
  plan   Plan   @relation(fields: [planId], references: [id], onDelete: Cascade)
}

model CatalogItem {
  id       String  @id @default(cuid())
  name     String
  sizeW    Float
  sizeH    Float
  sizeD    Float
  weight   Float
  category String?
  userId   String
  user     User   @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

> **SQLite ข้อระวัง** — ไม่รองรับ `Json` type ต้อง `JSON.stringify()` ก่อน save และ `JSON.parse()` ตอน read

---

## Prisma Client Singleton

```ts
// lib/prisma.ts
import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from './generated/prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrisma() {
  const url = `${process.env.DATABASE_URL}`
  const adapter = new PrismaBetterSqlite3({ url })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

> **ทำไมต้อง singleton** — Next.js dev mode hot reload จะสร้าง DB connection ใหม่ทุกครั้งถ้าไม่ทำแบบนี้  
> **ทำไมต้องใช้ adapter** — Prisma v7 ไม่รองรับ URL-based connection โดยตรงอีกต่อไป

---

## DB Helpers

```ts
// lib/db-helpers.ts
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
```

> ทุก API route เรียก `await ensureUser(userId)` ก่อนทำ DB operation เสมอ  
> เพราะไม่มี auth จริง — upsert ป้องกัน FK violation อัตโนมัติ

---

## Transform Helpers

```ts
// lib/transforms.ts
import type { Box, Plan, CatalogItem as PrismaCatalogItem } from './generated/prisma'
import type { SavedPlan, CargoBox, CatalogItem, ContainerSize } from '@/store/use-scene-store'

// Prisma Box → CargoBox (Zustand)
export function toCargoBox(box: Box): CargoBox {
  return {
    id: box.id,
    name: box.name,
    weight: box.weight,
    color: box.color,
    category: box.category ?? undefined,
    orientationId: (Math.min(5, Math.max(0, box.orientationId)) as 0|1|2|3|4|5),
    size: { w: box.sizeW, h: box.sizeH, d: box.sizeD },
    position: { x: box.posX, y: box.posY, z: box.posZ },
  }
}

// Prisma Plan → SavedPlan (Zustand) — DateTime → ms timestamp
export function toSavedPlan(plan: Plan & { boxes: Box[] }): SavedPlan {
  return {
    id: plan.id,
    name: plan.name,
    savedAt: plan.savedAt.getTime(),
    containerSize: JSON.parse(plan.containerSize),
    boxes: plan.boxes.map(toCargoBox),
  }
}

// Prisma CatalogItem → CatalogItem (Zustand)
export function toCatalogItem(row: PrismaCatalogItem): CatalogItem {
  return {
    id: row.id,
    name: row.name,
    weight: row.weight,
    category: row.category ?? undefined,
    size: { w: row.sizeW, h: row.sizeH, d: row.sizeD },
  }
}

// CargoBox → Prisma Box input
export function toBoxData(box: CargoBox) {
  return {
    id: box.id,
    name: box.name,
    weight: box.weight,
    color: box.color,
    category: box.category ?? null,
    orientationId: box.orientationId ?? 0,
    sizeW: box.size.w, sizeH: box.size.h, sizeD: box.size.d,
    posX: box.position.x, posY: box.position.y, posZ: box.position.z,
  }
}

// CatalogItem (Zustand) → Prisma CatalogItem input
export function toCatalogItemData(item: Omit<CatalogItem, 'id'>, userId: string) {
  return {
    name: item.name,
    weight: item.weight,
    category: item.category ?? null,
    userId,
    sizeW: item.size.w, sizeH: item.size.h, sizeD: item.size.d,
  }
}
```

---

## Frontend API Client

```ts
// lib/api-client.ts — fetch wrappers ที่ frontend ใช้
import type { SavedPlan, CatalogItem } from '@/store/use-scene-store'

const HEADERS: HeadersInit = {
  'Content-Type': 'application/json',
  'x-user-id': 'demo',
}

// Plans
export async function fetchPlans(): Promise<SavedPlan[]> { ... }
export async function fetchPlan(id: string): Promise<SavedPlan> { ... }
export async function createPlan(plan: SavedPlan): Promise<SavedPlan> { ... }
export async function updatePlan(plan: SavedPlan): Promise<SavedPlan> { ... }
export async function deletePlan(id: string): Promise<void> { ... }

// Catalog
export async function fetchCatalog(): Promise<CatalogItem[]> { ... }
export async function createCatalogItem(item: Omit<CatalogItem, 'id'>): Promise<CatalogItem> { ... }
export async function updateCatalogItem(id: string, item: Omit<CatalogItem, 'id'>): Promise<CatalogItem> { ... }
export async function deleteCatalogItem(id: string): Promise<void> { ... }
```

---

## API Route Handlers

### `app/api/plans/route.ts` — GET all, POST create

```ts
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
      id: plan.id,                                    // preserve client nanoid
      name: plan.name,
      savedAt: new Date(plan.savedAt),
      containerSize: JSON.stringify(plan.containerSize),
      userId,
      boxes: { create: plan.boxes.map(toBoxData) },
    },
    include: { boxes: true },
  })
  return NextResponse.json(toSavedPlan(created), { status: 201 })
}
```

### `app/api/plans/[id]/route.ts` — GET one, PUT upsert, DELETE

```ts
// PUT — transaction: deleteMany boxes ก่อน แล้ว upsert plan
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params   // ← Next.js 16: params เป็น Promise
  const updated = await prisma.$transaction(async (tx) => {
    await tx.box.deleteMany({ where: { planId: id } })
    return tx.plan.upsert({
      where: { id },
      update: { name, savedAt, containerSize, boxes: { create: ... } },
      create: { id, name, savedAt, containerSize, userId, boxes: { create: ... } },
      include: { boxes: true },
    })
  })
  return NextResponse.json(toSavedPlan(updated))
}

// DELETE — cascade ลบ boxes อัตโนมัติ (onDelete: Cascade ใน schema)
```

### `app/api/catalog/route.ts` และ `[id]/route.ts`

```ts
// POST catalog — ไม่ส่ง id จาก client, ให้ Prisma generate cuid เอง
// → คืน id จริงกลับ client แล้ว addCatalogItemWithId() เข้า Zustand store
```

---

## Seed

```ts
// prisma/seed.ts
import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '../lib/generated/prisma/client'

const adapter = new PrismaBetterSqlite3({ url: `${process.env.DATABASE_URL}` })
const prisma = new PrismaClient({ adapter })

async function main() {
  await prisma.user.upsert({
    where: { email: 'demo@cargo-planner.local' },
    update: {},
    create: { id: 'demo', email: 'demo@cargo-planner.local', name: 'Demo User' },
  })
}

main().catch(console.error).finally(() => prisma.$disconnect())
```

รัน: `npx prisma db seed`

---

## Zustand Store — actions ที่เพิ่มมา

```ts
// store/use-scene-store.ts — เพิ่มจาก original
setCatalog: (items: CatalogItem[]) => void       // โหลด catalog จาก DB แทน in-memory
addCatalogItemWithId: (item: CatalogItem) => void // รับ id จาก server (cuid) ไม่ generate เอง
```

---

## Frontend Persistence Strategy

```
planner/page.tsx — handleSave:
  1. savePlanToStorage(plan)    ← localStorage ก่อนเสมอ (offline fallback)
  2. createPlan/updatePlan()   ← API (async, ไม่บล็อก UI)

load-plans/page.tsx:
  1. fetchPlans()              ← API
  2. fallback → getSavedPlans() ← localStorage ถ้า API ล้มเหลว

catalog/page.tsx:
  1. createCatalogItem() API   ← ได้ cuid กลับมา
  2. addCatalogItemWithId()    ← sync เข้า Zustand ด้วย id จริง
```

---

## Migration to PostgreSQL

เมื่อพร้อมย้าย production เปลี่ยน 3 จุด:

**1. เปลี่ยน `schema.prisma`**

```prisma
datasource db {
  provider = "postgresql"
  // เปลี่ยน containerSize เป็น Json type ได้ (ไม่ต้อง stringify แล้ว)
}
```

**2. เปลี่ยน `lib/prisma.ts`** — swap adapter

```ts
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
```

**3. เปลี่ยน `.env`**

```env
DATABASE_URL="postgresql://user:pass@host:5432/dbname"
```

รัน: `npx prisma migrate dev --name postgres`

> Neon (neon.tech) แนะนำสำหรับ production — free tier ดี และ integrate กับ Vercel ได้โดยตรง

---

## Architecture Overview

```
Frontend (Zustand)
  ├── localStorage    ← offline fallback
  └── fetch()         ← primary (API)
        ↓
API Routes (Next.js App Router)
  ├── GET/POST        /api/plans
  ├── GET/PUT/DELETE  /api/plans/[id]
  ├── GET/POST        /api/catalog
  └── PUT/DELETE      /api/catalog/[id]
        ↓
lib/prisma.ts (singleton + PrismaBetterSqlite3 adapter)
        ↓
Prisma ORM (lib/generated/prisma/)
        ↓
SQLite dev.db (dev)  →  PostgreSQL (prod)
```

---

## ข้อควรระวัง Prisma v7

| ประเด็น | รายละเอียด |
|---|---|
| `url` ใน schema.prisma | ไม่รองรับแล้ว — ย้ายไป `prisma.config.ts` |
| Generator provider | ใช้ `"prisma-client"` (ไม่ใช่ `"prisma-client-js"`) |
| Driver adapter | **บังคับ** — ไม่มี adapter จะ error ตอน instantiate |
| Type names | `Box`, `Plan`, `CatalogItem` (ไม่มี `Model` suffix) |
| `params` ใน route | Next.js 16 — `params` เป็น `Promise<{id}>` ต้อง `await params` |
| libSQL vs better-sqlite3 | Node.js → `better-sqlite3` / Bun → `libsql` |
| `npx prisma studio` | ใช้ดู/แก้ข้อมูลใน dev.db แบบ GUI |