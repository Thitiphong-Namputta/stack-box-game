"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Box, Package, Plus, Pencil, Trash2, LayoutList, Table2 } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { getCatalogColumns } from "./columns";
import { ModeToggle } from "@/components/mode-toggle";
import { UserNav } from "@/components/custom/user-nav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useSceneStore } from "@/store/use-scene-store";
import type { CatalogItem } from "@/store/use-scene-store";
import {
  createCatalogItem,
  updateCatalogItem as apiUpdateCatalogItem,
  deleteCatalogItem as apiDeleteCatalogItem,
} from "@/lib/api-client";

// ── Form schema ─────────────────────────────────────────────────────
const catalogItemSchema = z.object({
  name: z.string().min(1, "กรุณาใส่ชื่อ"),
  w: z.number().min(1, "ต้องมากกว่า 0").max(2000),
  h: z.number().min(1, "ต้องมากกว่า 0").max(2000),
  d: z.number().min(1, "ต้องมากกว่า 0").max(2000),
  weight: z.number().min(0).max(10000),
  category: z.string().optional(),
  fragile: z.boolean().optional(),
  thisSideUp: z.boolean().optional(),
  nonStackable: z.boolean().optional(),
  cannotBeStackedOn: z.boolean().optional(),
  maxStackWeight: z.number().min(0).optional(),
  hazmat: z.string().optional(),
  temperature: z.enum(["ambient", "chilled", "frozen"]).optional(),
  priority: z.number().min(1).max(5).optional(),
});
type CatalogItemForm = z.infer<typeof catalogItemSchema>;

// ── CatalogItemDialog ───────────────────────────────────────────────
function CatalogItemDialog({
  open,
  onOpenChange,
  initialValues,
  onSave,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialValues?: CatalogItemForm;
  onSave: (data: CatalogItemForm) => void;
  title: string;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CatalogItemForm>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: initialValues ?? {
      name: "",
      w: 60,
      h: 60,
      d: 60,
      weight: 10,
      category: "",
    },
  });

  const defaultValues: CatalogItemForm = {
    name: "", w: 60, h: 60, d: 60, weight: 10, category: "",
    fragile: false, thisSideUp: false, nonStackable: false, cannotBeStackedOn: false,
    maxStackWeight: undefined, hazmat: "", temperature: undefined, priority: undefined,
  };

  useEffect(() => {
    if (open) {
      reset(initialValues ?? defaultValues);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues, reset]);

  const onSubmit = (data: CatalogItemForm) => {
    onSave(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="an-dialog-content sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="an-text-on-surface">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div>
            <label className="text-xs mb-1 block an-text-on-surface-muted">
              ชื่อสินค้า
            </label>
            <Input {...register("name")} className="an-input" />
            {errors.name && (
              <p className="text-xs mt-1 text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["w", "h", "d"] as const).map((field) => (
              <div key={field}>
                <label className="text-xs mb-1 block an-text-on-surface-muted">
                  {field === "w" ? "กว้าง" : field === "h" ? "สูง" : "ลึก"} (cm)
                </label>
                <Input
                  type="number"
                  {...register(field, { valueAsNumber: true })}
                  className="an-input"
                />
                {errors[field] && (
                  <p className="text-xs mt-1 text-red-500">
                    {errors[field]?.message}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs mb-1 block an-text-on-surface-muted">
                น้ำหนัก (kg)
              </label>
              <Input
                type="number"
                step="0.1"
                {...register("weight", { valueAsNumber: true })}
                className="an-input"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block an-text-on-surface-muted">
                ประเภท (optional)
              </label>
              <Input {...register("category")} className="an-input" placeholder="Standard" />
            </div>
          </div>

          <details className="border border-an-outline-variant rounded-lg p-3">
            <summary className="text-xs font-bold an-text-on-surface cursor-pointer select-none">
              Stacking Constraints (advanced)
            </summary>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs an-text-on-surface">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("fragile")} className="accent-current" />
                  🍷 Fragile
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("thisSideUp")} className="accent-current" />
                  ⬆️ This Side Up
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("nonStackable")} className="accent-current" />
                  🚫 Non-stackable
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" {...register("cannotBeStackedOn")} className="accent-current" />
                  🏠 Floor only
                </label>
              </div>
              <div>
                <label className="text-xs an-text-on-surface-muted mb-1 block">
                  Max Stack Weight (kg)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  {...register("maxStackWeight", { valueAsNumber: true })}
                  className="an-input"
                  placeholder="ไม่จำกัด"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs an-text-on-surface-muted mb-1 block">UN Hazmat Code</label>
                  <Input {...register("hazmat")} className="an-input" placeholder="เช่น UN1170" />
                </div>
                <div>
                  <label className="text-xs an-text-on-surface-muted mb-1 block">Temperature</label>
                  <select
                    {...register("temperature")}
                    className="an-input w-full rounded-md px-2 py-1.5 text-sm"
                  >
                    <option value="">Any</option>
                    <option value="ambient">Ambient</option>
                    <option value="chilled">Chilled ❄️</option>
                    <option value="frozen">Frozen 🧊</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs an-text-on-surface-muted mb-1 block">
                  Priority (1 = ส่งก่อน, 5 = ส่งหลัง)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  {...register("priority", { valueAsNumber: true })}
                  className="an-input"
                  placeholder="3"
                />
              </div>
            </div>
          </details>

          <DialogFooter>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-sm font-bold transition-opacity hover:opacity-90 an-btn-autopack"
            >
              Save
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Nav ─────────────────────────────────────────────────────────────
const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "3D Planner", href: "/planner" },
  { label: "Load Plans", href: "/load-plans" },
  { label: "Catalog", href: "/catalog" },
];

// ── CatalogPage ─────────────────────────────────────────────────────
export default function CatalogPage() {
  const pathname = usePathname();
  const {
    catalog,
    addCatalogItemWithId,
    updateCatalogItem,
    deleteCatalogItem,
  } = useSceneStore();

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list');

  const buildPayload = (data: CatalogItemForm): Omit<CatalogItem, "id"> => ({
    name: data.name,
    size: { w: data.w, h: data.h, d: data.d },
    weight: data.weight,
    category: data.category || undefined,
    fragile: data.fragile || undefined,
    thisSideUp: data.thisSideUp || undefined,
    nonStackable: data.nonStackable || undefined,
    cannotBeStackedOn: data.cannotBeStackedOn || undefined,
    maxStackWeight: data.maxStackWeight || undefined,
    hazmat: data.hazmat || undefined,
    temperature: data.temperature || undefined,
    priority: data.priority as CatalogItem["priority"] | undefined,
  });

  const handleAdd = async (data: CatalogItemForm) => {
    const payload = buildPayload(data);
    try {
      const created = await createCatalogItem(payload);
      addCatalogItemWithId(created);
    } catch {
      addCatalogItemWithId({ ...payload, id: crypto.randomUUID() });
    }
  };

  const handleEdit = async (data: CatalogItemForm) => {
    if (!editItem) return;
    const payload = buildPayload(data);
    try {
      await apiUpdateCatalogItem(editItem.id, payload);
    } catch {
      // ignore — update store anyway
    }
    updateCatalogItem(editItem.id, payload);
  };

  const handleDelete = async (id: string) => {
    try {
      await apiDeleteCatalogItem(id);
    } catch {
      // ignore — remove from store anyway
    }
    deleteCatalogItem(id);
  };

  const editInitialValues: CatalogItemForm | undefined = editItem
    ? {
        name: editItem.name,
        w: editItem.size.w,
        h: editItem.size.h,
        d: editItem.size.d,
        weight: editItem.weight,
        category: editItem.category ?? "",
        fragile: editItem.fragile ?? false,
        thisSideUp: editItem.thisSideUp ?? false,
        nonStackable: editItem.nonStackable ?? false,
        cannotBeStackedOn: editItem.cannotBeStackedOn ?? false,
        maxStackWeight: editItem.maxStackWeight,
        hazmat: editItem.hazmat ?? "",
        temperature: editItem.temperature,
        priority: editItem.priority,
      }
    : undefined;

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
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold an-text-on-surface">Catalog</h1>
            <p className="text-sm mt-1 an-text-on-surface-muted">
              รายการสินค้าและกล่องทั้งหมด ({catalog.length} รายการ)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-lg an-bg-surface-low">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'an-bg-surface-container an-text-primary' : 'an-text-on-surface-muted hover:an-text-on-surface'}`}
                title="Grid view"
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
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-opacity hover:opacity-90 an-btn-autopack"
            >
              <Plus className="w-4 h-4" />
              เพิ่มสินค้า
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <DataTable
            columns={getCatalogColumns(
              (item) => setEditItem(item),
              handleDelete,
            )}
            data={catalog}
            filterPlaceholder="ค้นหาสินค้า..."
          />
        ) : null}

        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${viewMode === 'table' ? 'hidden' : ''}`}>
          {catalog.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-xl an-bg-surface-container border border-an-outline-variant border-opacity-10 hover:border-opacity-20 transition-all group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center an-bg-surface-low">
                  <Package className="w-5 h-5 an-text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold an-text-on-surface truncate">{item.name}</p>
                  {item.category && (
                    <p className="text-[10px] an-text-on-surface-muted uppercase tracking-wider">
                      {item.category}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs an-text-on-surface-muted mb-3">
                <div className="an-bg-surface-low rounded-lg p-2 text-center">
                  <p className="font-bold an-text-on-surface">{item.size.w}</p>
                  <p>กว้าง</p>
                </div>
                <div className="an-bg-surface-low rounded-lg p-2 text-center">
                  <p className="font-bold an-text-on-surface">{item.size.h}</p>
                  <p>สูง</p>
                </div>
                <div className="an-bg-surface-low rounded-lg p-2 text-center">
                  <p className="font-bold an-text-on-surface">{item.size.d}</p>
                  <p>ลึก</p>
                </div>
              </div>
              {(item.fragile || item.thisSideUp || item.nonStackable || item.hazmat || (item.temperature && item.temperature !== 'ambient')) && (
                <div className="flex gap-1 flex-wrap mb-3">
                  {item.fragile && <span className="text-[10px] px-1.5 py-0.5 rounded an-bg-surface-low an-text-on-surface">🍷 Fragile</span>}
                  {item.thisSideUp && <span className="text-[10px] px-1.5 py-0.5 rounded an-bg-surface-low an-text-on-surface">⬆️ This Side Up</span>}
                  {item.nonStackable && <span className="text-[10px] px-1.5 py-0.5 rounded an-bg-surface-low an-text-on-surface">🚫 Non-stack</span>}
                  {item.cannotBeStackedOn && <span className="text-[10px] px-1.5 py-0.5 rounded an-bg-surface-low an-text-on-surface">🏠 Floor only</span>}
                  {item.hazmat && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">⚠️ {item.hazmat}</span>}
                  {item.temperature && item.temperature !== 'ambient' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">❄️ {item.temperature}</span>}
                </div>
              )}
              <div className="flex items-center justify-between text-xs an-text-on-surface-muted">
                <span>{item.weight} kg</span>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => setEditItem(item)}
                    className="p-1.5 rounded-lg transition-colors hover:opacity-70 an-text-primary"
                    title="แก้ไข"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg transition-colors hover:opacity-70 text-red-500"
                    title="ลบ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <Link
                  href="/planner"
                  className="an-text-primary hover:opacity-70 transition-opacity group-hover:hidden"
                >
                  เปิดใน Planner →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {catalog.length === 0 && viewMode === 'list' && (
          <div className="flex flex-col items-center justify-center py-24 an-text-on-surface-muted">
            <Package className="w-12 h-12 mb-4 opacity-40" />
            <p className="text-sm">ยังไม่มีสินค้าใน Catalog</p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-4 text-sm an-text-primary hover:opacity-70 transition-opacity"
            >
              + เพิ่มสินค้าแรก
            </button>
          </div>
        )}
      </main>

      {/* Add dialog */}
      <CatalogItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={handleAdd}
        title="เพิ่มสินค้าใหม่"
      />

      {/* Edit dialog */}
      <CatalogItemDialog
        open={editItem !== null}
        onOpenChange={(open) => { if (!open) setEditItem(null) }}
        initialValues={editInitialValues}
        onSave={handleEdit}
        title="แก้ไขสินค้า"
      />
    </div>
  );
}
