# Authentication Setup — Stack Box Game

คู่มือการเพิ่มระบบ authentication ให้กับโปรเจค `stack-box-game` โดยใช้ **NextAuth v5 (Auth.js)** + **Credentials Provider** + **Prisma** + **Route Protection ด้วย Middleware**

## Stack ที่ใช้

- Next.js 16 (App Router)
- React 19
- Prisma 7 + better-sqlite3 adapter
- shadcn / react-hook-form / zod (มีอยู่แล้วในโปรเจค)
- NextAuth v5 (Auth.js) — ตัวที่จะเพิ่ม
- bcryptjs — ตัวที่จะเพิ่ม

## ทำไมเลือก NextAuth v5

- รองรับ Next.js App Router + middleware เต็มรูปแบบ
- API ใหม่ (`auth()`, `handlers`, `signIn`, `signOut`) ใช้งานง่ายกว่า v4
- เข้ากับ Next.js 16 / React 19 ได้โดยไม่มีปัญหา peer dependency

---

## 1. ติดตั้ง Package

```bash
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
```

> **หมายเหตุ:** NextAuth v5 ยังเรียก `next-auth@beta` แต่เสถียรแล้ว ใช้ใน production ได้ และเป็นแนวทางอย่างเป็นทางการสำหรับ App Router

---

## 2. เพิ่ม `User` Model ใน Prisma Schema

แก้ `prisma/schema.prisma` เพิ่ม model สำหรับ credentials login (เก็บ `username` + `passwordHash`):

```prisma
model User {
  id           String   @id @default(cuid())
  username     String   @unique
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

แล้วรัน migration:

```bash
npx prisma migrate dev --name add_user_auth
npx prisma generate
```

> **ทำไมไม่ใช้ Prisma Adapter:** เพราะ Credentials provider **บังคับ** ต้องใช้ JWT session strategy (database session ใช้กับ credentials ไม่ได้) เลยไม่จำเป็นต้องมีตาราง `Account`, `Session`, `VerificationToken` ของ NextAuth — schema จะเรียบและคุมเองง่ายกว่า

---

## 3. สร้างไฟล์ `auth.ts` ที่ Root Project

ไฟล์นี้คือ "หัวใจ" ของ NextAuth v5 export ทุกอย่างที่ต้องใช้ในแอป:

```ts
// auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { username },
        });
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        // ห้าม return passwordHash ออกไปเด็ดขาด
        return {
          id: user.id,
          name: user.name ?? user.username,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as { username?: string }).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { username?: string }).username =
          token.username as string;
      }
      return session;
    },
  },
});
```

---

## 4. ขยาย Type ของ Session (TypeScript)

สร้างไฟล์ `types/next-auth.d.ts` เพื่อให้ `session.user.id` และ `username` ถูก type-safe:

```ts
// types/next-auth.d.ts
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      name?: string | null;
    };
  }

  interface User {
    username: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
  }
}
```

แล้วเช็คว่า `tsconfig.json` มี `"include"` ครอบ `types/**/*.d.ts` ด้วย (ปกติ Next.js ใส่ `**/*.ts` อยู่แล้วก็ครอบให้)

---

## 5. สร้าง Route Handler

```ts
// app/api/auth/[...nextauth]/route.ts
export { GET, POST } from "@/auth";
```

สั้นแค่นี้ครับ — `handlers` ใน `auth.ts` ถูกแยกเป็น `GET`/`POST` ให้พร้อมใช้

---

## 6. ทำ Route Protection ด้วย Middleware

ไฟล์นี้แหละที่ทำให้ user ที่ยังไม่ login เข้าหน้าที่ป้องกันไว้ไม่ได้ — และที่สำคัญ middleware จะรันก่อนที่ page จะ render เลย ไม่ต้องเช็คซ้ำในทุกหน้า

```ts
// middleware.ts (ที่ root project)
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));

  // ยังไม่ login + เข้าหน้า protected → redirect ไป /login
  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // login แล้วแต่เข้าหน้า /login → เด้งกลับ home
  if (isLoggedIn && isPublic) {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // เช็คทุก path ยกเว้น static, image, api/auth (สำคัญ! ห้าม block)
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
```

> **จุดที่คนพลาดบ่อย:** `matcher` ต้อง **ยกเว้น** `api/auth` ไม่งั้น NextAuth เอง redirect วนลูป

---

## 7. หน้า Login (ใช้ react-hook-form + zod ที่มีอยู่แล้ว)

```tsx
// app/login/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const loginSchema = z.object({
  username: z.string().min(1, "กรุณากรอก username"),
  password: z.string().min(1, "กรุณากรอก password"),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setError(null);
    const res = await signIn("credentials", {
      username: data.username,
      password: data.password,
      redirect: false,
    });

    if (res?.error) {
      setError("Username หรือ password ไม่ถูกต้อง");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg border p-6"
      >
        <h1 className="text-2xl font-bold">เข้าสู่ระบบ</h1>

        <div>
          <label className="text-sm">Username</label>
          <input
            {...register("username")}
            className="w-full rounded border px-3 py-2"
            autoComplete="username"
          />
          {errors.username && (
            <p className="text-sm text-red-500">{errors.username.message}</p>
          )}
        </div>

        <div>
          <label className="text-sm">Password</label>
          <input
            type="password"
            {...register("password")}
            className="w-full rounded border px-3 py-2"
            autoComplete="current-password"
          />
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-black py-2 text-white disabled:opacity-50"
        >
          {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "Login"}
        </button>
      </form>
    </div>
  );
}
```

---

## 8. ครอบ `<SessionProvider>` ที่ Root Layout

เพื่อให้ `useSession()` ใช้ได้ในฝั่ง client component:

```tsx
// app/providers.tsx
"use client";
import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

```tsx
// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## 9. ใช้ Session ใน Server Component / API Route

### Server Component

```tsx
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  return <div>สวัสดี {session?.user.username}</div>;
}
```

### API Route

```ts
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ทำต่อ...
}
```

### ปุ่ม Logout (Client Component)

```tsx
"use client";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })}>
      Logout
    </button>
  );
}
```

---

## 10. ENV Variables

เพิ่มใน `.env`:

```bash
# Generate ด้วยคำสั่ง: openssl rand -base64 32
AUTH_SECRET="your-random-secret-here"
```

> NextAuth v5 อ่านชื่อ `AUTH_SECRET` (เปลี่ยนจาก v4 ที่ใช้ `NEXTAUTH_SECRET`) ใน production บังคับต้องมี

---

## 11. (ทางเลือก) Seed User สำหรับทดสอบ

เพิ่มใน `prisma/seed.ts`:

```ts
import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", passwordHash, name: "Admin" },
  });
}

main().finally(() => prisma.$disconnect());
```

แล้วรัน:

```bash
npx prisma db seed
```

---

## โครงสร้างไฟล์ที่จะถูกเพิ่ม/แก้

```
stack-box-game/
├── auth.ts                              ← ใหม่ (NextAuth config)
├── middleware.ts                        ← ใหม่ (Route protection)
├── .env                                 ← เพิ่ม AUTH_SECRET
├── types/
│   └── next-auth.d.ts                   ← ใหม่ (Type augmentation)
├── prisma/
│   ├── schema.prisma                    ← เพิ่ม User model
│   └── seed.ts                          ← (ทางเลือก) เพิ่ม seed admin
└── app/
    ├── layout.tsx                       ← ครอบ <Providers>
    ├── providers.tsx                    ← ใหม่ (SessionProvider)
    ├── login/
    │   └── page.tsx                     ← ใหม่ (Login form)
    └── api/auth/[...nextauth]/
        └── route.ts                     ← ใหม่ (Route handler)
```

---

## Flow ที่จะได้

1. User เข้า `/` → middleware เห็นว่ายังไม่มี session → redirect `/login?callbackUrl=/`
2. User กรอก form → `signIn("credentials", ...)` → ยิงไปที่ `authorize()` ใน `auth.ts`
3. `authorize()` query DB ผ่าน Prisma → `bcrypt.compare()` → return user หรือ `null`
4. ผ่าน → JWT ถูก sign และเก็บเป็น cookie → redirect กลับ callbackUrl
5. ทุก request ถัดไป middleware เช็ค `req.auth` ก่อน

---

## Checklist ก่อน Deploy

- [ ] รัน `npx prisma migrate dev` สำเร็จ
- [ ] ตั้งค่า `AUTH_SECRET` ใน `.env` (production ห้ามลืม)
- [ ] ทดสอบเข้า `/` ตอนยังไม่ login → ต้องเด้งไป `/login`
- [ ] ทดสอบ login ด้วย username/password ที่ผิด → ต้องขึ้น error
- [ ] ทดสอบ login สำเร็จ → ต้องเด้งกลับหน้าเดิม (callbackUrl)
- [ ] ทดสอบ login แล้วเข้า `/login` ซ้ำ → ต้องเด้งกลับ home
- [ ] ทดสอบ `signOut()` → ต้องล้าง session และเด้งไป `/login`
