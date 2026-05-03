"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Box } from "lucide-react";

const schema = z
  .object({
    email: z.string().email("อีเมลไม่ถูกต้อง"),
    name: z.string().min(1, "กรุณาใส่ชื่อ").max(100),
    password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, name: data.name, password: data.password }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
      return;
    }

    // สมัครสำเร็จ — login ทันที
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      setError("สมัครสำเร็จแต่ไม่สามารถเข้าสู่ระบบได้ กรุณา login ด้วยตนเอง");
      router.push("/login");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2 justify-center">
          <Box className="w-6 h-6 text-indigo-400" />
          <span className="text-xl font-bold text-white">3D Cargo Planner</span>
        </div>

        <div>
          <h1 className="text-lg font-semibold text-white text-center">สมัครสมาชิก</h1>
          <p className="text-xs text-slate-400 text-center mt-1">สร้างบัญชีใหม่เพื่อเริ่มใช้งาน</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">ชื่อ</label>
            <Input
              {...register("name")}
              className="bg-slate-800 border-slate-700"
              autoComplete="name"
              placeholder="ชื่อที่แสดง"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Email</label>
            <Input
              type="email"
              {...register("email")}
              className="bg-slate-800 border-slate-700"
              autoComplete="email"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">Password</label>
            <Input
              type="password"
              {...register("password")}
              className="bg-slate-800 border-slate-700"
              autoComplete="new-password"
              placeholder="อย่างน้อย 8 ตัวอักษร"
            />
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs text-slate-400 mb-1 block">ยืนยัน Password</label>
            <Input
              type="password"
              {...register("confirmPassword")}
              className="bg-slate-800 border-slate-700"
              autoComplete="new-password"
              placeholder="พิมพ์รหัสผ่านอีกครั้ง"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "กำลังสมัคร..." : "สมัครสมาชิก"}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center">
          มีบัญชีอยู่แล้ว?{" "}
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
            เข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </div>
  );
}
