"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, FileBox, Clock, Package, Trash2, LayoutList, Table2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { getPlanColumns } from "./columns";
import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/custom/user-nav";
import {
  getSavedPlans,
  deleteSavedPlan,
} from "@/store/use-scene-store";
import type { SavedPlan } from "@/store/use-scene-store";
import { fetchPlans, deletePlan as apiDeletePlan } from "@/lib/api-client";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "3D Planner", href: "/planner" },
  { label: "Load Plans", href: "/load-plans" },
  { label: "Catalog", href: "/catalog" },
];

export default function LoadPlansPage() {
  const pathname = usePathname();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');

  useEffect(() => {
    fetchPlans()
      .then(setPlans)
      .catch(() => setPlans(getSavedPlans()))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await apiDeletePlan(id);
    } catch {
      // ignore — still remove from localStorage below
    }
    deleteSavedPlan(id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen flex flex-col an-bg-surface an-text-on-surface">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 z-50 shrink-0 an-bg-surface border-b border-(--an-divider-color)">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Box className="w-5 h-5 an-text-primary" />
            <span className="text-xl font-bold tracking-tighter an-text-primary">
              STACK BOX
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
        <div className="flex items-center gap-2">
          <UserNav />
          <ModeToggle />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold an-text-on-surface">Load Plans</h1>
            <p className="text-sm mt-1 an-text-on-surface-muted">
              เลือก plan ที่บันทึกไว้เพื่อแก้ไขใน 3D Planner
            </p>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-lg an-bg-surface-low">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'an-bg-surface-container an-text-primary' : 'an-text-on-surface-muted hover:an-text-on-surface'}`}
              title="List view"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'an-bg-surface-container an-text-primary' : 'an-text-on-surface-muted hover:an-text-on-surface'}`}
              title="Table view"
            >
              <Table2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24 an-text-on-surface-muted text-sm">
            Loading plans...
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 an-text-on-surface-muted">
            <FileBox className="w-12 h-12 mb-4 opacity-40" />
            <p className="text-sm">ยังไม่มี plan ที่บันทึกไว้</p>
            <Link
              href="/planner"
              className="mt-4 text-sm an-text-primary hover:opacity-70 transition-opacity"
            >
              → ไปที่ 3D Planner
            </Link>
          </div>
        ) : viewMode === 'table' ? (
          <DataTable
            columns={getPlanColumns((id) => {
              // wrap to match handleDelete signature (no event needed in table context)
              setPlans((prev) => prev.filter((p) => p.id !== id));
              try { apiDeletePlan(id) } catch { /* ignore */ }
              deleteSavedPlan(id);
            })}
            data={plans}
            filterPlaceholder="ค้นหา plan..."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {plans.map((plan) => {
              const vol = plan.boxes.reduce(
                (s, b) => s + b.size.w * b.size.h * b.size.d,
                0
              );
              const total =
                plan.containerSize.w *
                plan.containerSize.h *
                plan.containerSize.d;
              const util = total > 0 ? Math.round((vol / total) * 100) : 0;

              return (
                <div key={plan.id} className="relative group">
                  <Link
                    href={`/planner?plan=${plan.id}`}
                    className="flex items-center justify-between p-5 rounded-xl an-bg-surface-container hover:an-bg-surface-variant border border-an-outline-variant border-opacity-10 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center an-bg-surface-low">
                        <FileBox className="w-5 h-5 an-text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold an-text-on-surface group-hover:an-text-primary transition-colors">
                          {plan.name}
                        </p>
                        <div className="flex items-center gap-3 text-xs mt-0.5 an-text-on-surface-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(plan.savedAt).toLocaleDateString("th-TH", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {plan.boxes.length} กล่อง
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right pr-10">
                      <p className="text-sm font-bold an-text-primary">{util}%</p>
                      <p className="text-xs an-text-on-surface-muted">การใช้พื้นที่</p>
                    </div>
                  </Link>

                  {/* Delete button — overlaid, not inside the Link */}
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, plan.id)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:opacity-70"
                    title="ลบ plan นี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}
