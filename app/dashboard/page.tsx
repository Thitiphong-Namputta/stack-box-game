"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Box,
  FileBox,
  Package,
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Weight,
  Layers,
  ArrowRight,
} from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import { BarChart } from "@/components/chart/bar";
import { LineChart } from "@/components/chart/line";
import { getSavedPlans, useSceneStore } from "@/store/use-scene-store";
import type { SavedPlan } from "@/store/use-scene-store";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "3D Planner", href: "/planner" },
  { label: "Load Plans", href: "/load-plans" },
  { label: "Catalog", href: "/catalog" },
];

// ── Helpers ──────────────────────────────────────────────────────────

function computeUtil(plan: SavedPlan): number {
  const vol = plan.boxes.reduce((s, b) => s + b.size.w * b.size.h * b.size.d, 0);
  const total = plan.containerSize.w * plan.containerSize.h * plan.containerSize.d;
  return total > 0 ? Math.round((vol / total) * 100) : 0;
}

function truncate(str: string, n: number): string {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ── Stat Card ────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}

function StatCard({ icon, label, value, sub, accent }: StatCardProps) {
  return (
    <div className="rounded-2xl p-5 an-bg-surface-container border border-an-outline-variant/10 flex items-start gap-4">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          accent ? "an-bg-primary/10" : "an-bg-surface-low"
        }`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs an-text-on-surface-muted">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${accent ? "an-text-primary" : "an-text-on-surface"}`}>
          {value}
        </p>
        {sub && <p className="text-xs an-text-on-surface-muted mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Empty Chart State ─────────────────────────────────────────────────

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="w-full h-72 flex flex-col items-center justify-center gap-2 an-text-on-surface-muted">
      <FileBox className="w-10 h-10 opacity-30" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────

export default function DashboardPage() {
  const pathname = usePathname();
  const catalog = useSceneStore((s) => s.catalog);
  const [plans] = useState<SavedPlan[]>(() => getSavedPlans());

  // Sort newest first
  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => b.savedAt - a.savedAt),
    [plans],
  );

  // ── Aggregate stats ──────────────────────────────────────────────
  const totalBoxes = useMemo(
    () => plans.reduce((s, p) => s + p.boxes.length, 0),
    [plans],
  );

  const avgUtil = useMemo(() => {
    if (plans.length === 0) return 0;
    return Math.round(
      plans.reduce((s, p) => s + computeUtil(p), 0) / plans.length,
    );
  }, [plans]);

  const totalWeight = useMemo(
    () => plans.reduce((s, p) => s + p.boxes.reduce((w, b) => w + b.weight, 0), 0),
    [plans],
  );

  // ── Bar chart: utilization per plan ─────────────────────────────
  const barLabels = sortedPlans.map((p) => truncate(p.name, 12));
  const barDatasets = [
    {
      label: "การใช้พื้นที่ (%)",
      data: sortedPlans.map(computeUtil),
      backgroundColor: sortedPlans.map((p) => {
        const u = computeUtil(p);
        if (u >= 75) return "rgba(34,197,94,0.75)";
        if (u >= 40) return "rgba(99,102,241,0.75)";
        return "rgba(148,163,184,0.5)";
      }),
      borderColor: sortedPlans.map((p) => {
        const u = computeUtil(p);
        if (u >= 75) return "rgba(34,197,94,1)";
        if (u >= 40) return "rgba(99,102,241,1)";
        return "rgba(148,163,184,0.8)";
      }),
      borderWidth: 1,
      borderRadius: 6,
    },
  ];

  // ── Line chart: box count & weight per plan ──────────────────────
  const lineLabels = sortedPlans.map((p) => truncate(p.name, 12));
  const lineDatasets = [
    {
      label: "จำนวนกล่อง",
      data: sortedPlans.map((p) => p.boxes.length),
      borderColor: "rgb(99,102,241)",
      backgroundColor: "rgba(99,102,241,0.15)",
      tension: 0.4,
      pointRadius: 4,
    },
    {
      label: "น้ำหนักรวม (kg)",
      data: sortedPlans.map((p) => p.boxes.reduce((s, b) => s + b.weight, 0)),
      borderColor: "rgb(251,146,60)",
      backgroundColor: "rgba(251,146,60,0.15)",
      tension: 0.4,
      borderDash: [5, 4],
      pointRadius: 4,
    },
  ];

  // ── Recent plans (top 5) ─────────────────────────────────────────
  const recentPlans = sortedPlans.slice(0, 5);

  return (
    <div className="min-h-screen flex flex-col an-bg-surface an-text-on-surface">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 z-50 shrink-0 an-bg-surface border-b border-(--an-divider-color)">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Box className="w-5 h-5 an-text-primary" />
            <span className="text-xl font-bold tracking-tighter an-text-primary">
              3D Cargo Planner
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navItems.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm transition-colors duration-200 ${
                  pathname === href ? "an-nav-active" : "an-nav-inactive"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <ModeToggle />
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-10 space-y-8">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold an-text-on-surface flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 an-text-primary" />
            Dashboard
          </h1>
          <p className="text-sm mt-1 an-text-on-surface-muted">
            ภาพรวมการจัดวางสินค้าและการใช้พื้นที่ทั้งหมด
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<FileBox className="w-5 h-5 an-text-primary" />}
            label="Plans ที่บันทึกไว้"
            value={plans.length}
            sub="ทั้งหมด"
            accent
          />
          <StatCard
            icon={<BookOpen className="w-5 h-5 an-text-on-surface-muted" />}
            label="รายการใน Catalog"
            value={catalog.length}
            sub="ประเภทสินค้า"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 an-text-on-surface-muted" />}
            label="Avg. การใช้พื้นที่"
            value={`${avgUtil}%`}
            sub="เฉลี่ยทุก plan"
          />
          <StatCard
            icon={<Package className="w-5 h-5 an-text-on-surface-muted" />}
            label="กล่องทั้งหมด"
            value={totalBoxes}
            sub={`รวม ${totalWeight.toFixed(1)} kg`}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bar chart */}
          <div className="rounded-2xl p-6 an-bg-surface-container border border-an-outline-variant/10">
            <div className="mb-4">
              <p className="text-sm font-semibold an-text-on-surface">
                การใช้พื้นที่ต่อ Plan
              </p>
              <p className="text-xs an-text-on-surface-muted mt-0.5">
                เปรียบเทียบ % พื้นที่ใช้งานในแต่ละ plan
              </p>
            </div>
            {sortedPlans.length > 0 ? (
              <BarChart
                labels={barLabels}
                datasets={barDatasets}
                yMax={100}
                yUnit="%"
              />
            ) : (
              <EmptyChart message="ยังไม่มีข้อมูล — สร้าง plan ใน 3D Planner ก่อน" />
            )}
            {sortedPlans.length > 0 && (
              <div className="flex items-center gap-4 mt-3 text-xs an-text-on-surface-muted">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                  ≥ 75% ดีมาก
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                  ≥ 40% ปานกลาง
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 inline-block" />
                  {"< 40%"} ต่ำ
                </span>
              </div>
            )}
          </div>

          {/* Line chart */}
          <div className="rounded-2xl p-6 an-bg-surface-container border border-an-outline-variant/10">
            <div className="mb-4">
              <p className="text-sm font-semibold an-text-on-surface">
                จำนวนกล่องและน้ำหนักรวมต่อ Plan
              </p>
              <p className="text-xs an-text-on-surface-muted mt-0.5">
                เปรียบเทียบ load ของแต่ละ plan
              </p>
            </div>
            {sortedPlans.length > 0 ? (
              <LineChart labels={lineLabels} datasets={lineDatasets} />
            ) : (
              <EmptyChart message="ยังไม่มีข้อมูล — สร้าง plan ใน 3D Planner ก่อน" />
            )}
          </div>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl p-5 an-bg-surface-container border border-an-outline-variant/10 flex items-center gap-4">
            <Weight className="w-5 h-5 an-text-on-surface-muted shrink-0" />
            <div>
              <p className="text-xs an-text-on-surface-muted">น้ำหนักรวมทุก Plan</p>
              <p className="text-lg font-bold an-text-on-surface">{totalWeight.toFixed(1)} kg</p>
            </div>
          </div>
          <div className="rounded-2xl p-5 an-bg-surface-container border border-an-outline-variant/10 flex items-center gap-4">
            <Layers className="w-5 h-5 an-text-on-surface-muted shrink-0" />
            <div>
              <p className="text-xs an-text-on-surface-muted">เฉลี่ยกล่องต่อ Plan</p>
              <p className="text-lg font-bold an-text-on-surface">
                {plans.length > 0 ? (totalBoxes / plans.length).toFixed(1) : "0"}
              </p>
            </div>
          </div>
          <div className="rounded-2xl p-5 an-bg-surface-container border border-an-outline-variant/10 flex items-center gap-4">
            <TrendingUp className="w-5 h-5 an-text-on-surface-muted shrink-0" />
            <div>
              <p className="text-xs an-text-on-surface-muted">Plan ที่ใช้พื้นที่สูงสุด</p>
              <p className="text-lg font-bold an-text-on-surface truncate">
                {plans.length > 0
                  ? (() => {
                      const best = [...plans].sort(
                        (a, b) => computeUtil(b) - computeUtil(a),
                      )[0];
                      return `${truncate(best.name, 14)} (${computeUtil(best)}%)`;
                    })()
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Recent plans */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold an-text-on-surface">Plans ล่าสุด</p>
            <Link
              href="/load-plans"
              className="text-xs an-text-primary hover:opacity-70 transition-opacity flex items-center gap-1"
            >
              ดูทั้งหมด <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 rounded-2xl an-bg-surface-container border border-an-outline-variant/10 an-text-on-surface-muted gap-3">
              <FileBox className="w-10 h-10 opacity-30" />
              <p className="text-sm">ยังไม่มี plan — ไปสร้างใน 3D Planner</p>
              <Link
                href="/planner"
                className="text-sm an-text-primary hover:opacity-70 transition-opacity"
              >
                → เริ่มวางแผน
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl an-bg-surface-container border border-an-outline-variant/10 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 border-b border-an-outline-variant/10 text-xs an-text-on-surface-muted font-medium">
                <span>ชื่อ Plan</span>
                <span className="text-right w-24">บันทึกเมื่อ</span>
                <span className="text-right w-16">กล่อง</span>
                <span className="text-right w-16">การใช้พื้นที่</span>
              </div>

              {/* Table rows */}
              {recentPlans.map((plan, i) => {
                const util = computeUtil(plan);
                return (
                  <Link
                    key={plan.id}
                    href={`/planner?plan=${plan.id}`}
                    className={`grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-4 items-center hover:an-bg-surface-variant transition-colors ${
                      i < recentPlans.length - 1 ? "border-b border-an-outline-variant/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg an-bg-surface-low flex items-center justify-center shrink-0">
                        <FileBox className="w-4 h-4 an-text-primary" />
                      </div>
                      <span className="text-sm font-medium an-text-on-surface truncate">
                        {plan.name}
                      </span>
                    </div>
                    <span className="text-xs an-text-on-surface-muted text-right w-24 shrink-0">
                      {formatDate(plan.savedAt)}
                    </span>
                    <span className="text-sm an-text-on-surface text-right w-16 shrink-0">
                      {plan.boxes.length}
                    </span>
                    <span
                      className={`text-sm font-bold text-right w-16 shrink-0 ${
                        util >= 75
                          ? "text-green-500"
                          : util >= 40
                            ? "an-text-primary"
                            : "an-text-on-surface-muted"
                      }`}
                    >
                      {util}%
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
