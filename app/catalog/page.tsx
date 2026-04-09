"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Package, Plus } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";

const mockCatalog = [
  { id: "1", name: "กล่องเล็ก",  w: 30,  h: 30,  d: 30,  weight: 5  },
  { id: "2", name: "กล่องกลาง", w: 60,  h: 60,  d: 60,  weight: 10 },
  { id: "3", name: "กล่องใหญ่", w: 100, h: 80,  d: 80,  weight: 20 },
  { id: "4", name: "กล่องแบน",  w: 120, h: 30,  d: 80,  weight: 8  },
  { id: "5", name: "กล่องสูง",  w: 40,  h: 120, d: 40,  weight: 12 },
  { id: "6", name: "พาเลท",     w: 120, h: 15,  d: 100, weight: 15 },
];

const navItems = [
  { label: "Dashboard",  href: "/" },
  { label: "3D Planner", href: "/planner" },
  { label: "Load Plans", href: "/load-plans" },
  { label: "Catalog",    href: "/catalog" },
];

export default function CatalogPage() {
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
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold an-text-on-surface">Catalog</h1>
            <p className="text-sm mt-1 an-text-on-surface-muted">รายการสินค้าและกล่องทั้งหมด</p>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-opacity hover:opacity-90 an-btn-autopack"
          >
            <Plus className="w-4 h-4" />
            เพิ่มสินค้า
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockCatalog.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl an-bg-surface-container border border-an-outline-variant border-opacity-10 hover:border-opacity-20 transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center an-bg-surface-low">
                  <Package className="w-5 h-5 an-text-primary" />
                </div>
                <p className="font-semibold an-text-on-surface">{item.name}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs an-text-on-surface-muted mb-3">
                <div className="an-bg-surface-low rounded-lg p-2 text-center">
                  <p className="font-bold an-text-on-surface">{item.w}</p>
                  <p>กว้าง</p>
                </div>
                <div className="an-bg-surface-low rounded-lg p-2 text-center">
                  <p className="font-bold an-text-on-surface">{item.h}</p>
                  <p>สูง</p>
                </div>
                <div className="an-bg-surface-low rounded-lg p-2 text-center">
                  <p className="font-bold an-text-on-surface">{item.d}</p>
                  <p>ลึก</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs an-text-on-surface-muted">
                <span>{item.weight} kg</span>
                <Link
                  href="/planner"
                  className="an-text-primary hover:opacity-70 transition-opacity"
                >
                  เปิดใน Planner →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
