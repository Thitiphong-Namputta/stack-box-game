"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, FileBox, Clock, Package } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

const mockPlans = [
  { id: "2041", name: "Shipment #2041", date: "2026-04-08", boxes: 12, utilization: 78 },
  { id: "2040", name: "Shipment #2040", date: "2026-04-05", boxes: 8,  utilization: 61 },
  { id: "2039", name: "Shipment #2039", date: "2026-04-01", boxes: 20, utilization: 94 },
];

const navItems = [
  { label: "Dashboard",  href: "/" },
  { label: "3D Planner", href: "/planner" },
  { label: "Load Plans", href: "/load-plans" },
  { label: "Catalog",    href: "/catalog" },
];

export default function LoadPlansPage() {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col an-bg-surface an-text-on-surface">
      {/* Header — matches PlannerHeader layout */}
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
                className={`text-sm transition-colors duration-200 ${pathname === href ? "an-nav-active" : "an-nav-inactive"}`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <ModeToggle />
      </header>

      {/* Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold an-text-on-surface">Load Plans</h1>
          <p className="text-sm mt-1 an-text-on-surface-muted">
            เลือก plan ที่บันทึกไว้เพื่อแก้ไขใน 3D Planner
          </p>
        </div>

        {mockPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 an-text-on-surface-muted">
            <FileBox className="w-12 h-12 mb-4 opacity-40" />
            <p className="text-sm">ยังไม่มี plan ที่บันทึกไว้</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {mockPlans.map((plan) => (
              <Link
                key={plan.id}
                href={`/planner?plan=${plan.id}`}
                className="flex items-center justify-between p-5 rounded-xl an-bg-surface-container hover:an-bg-surface-variant border border-an-outline-variant border-opacity-10 transition-all group"
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
                        {plan.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {plan.boxes} กล่อง
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold an-text-primary">{plan.utilization}%</p>
                  <p className="text-xs an-text-on-surface-muted">การใช้พื้นที่</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
