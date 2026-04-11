"use client";

import { Suspense, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import {
  Zap,
  Undo2,
  Redo2,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Grid3x3,
  Layers,
  Eye,
  Box,
  ArrowDown,
  ArrowRight,
  Save,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ItemsTab } from "@/components/custom/item-catalog";
import { ContainerTab } from "@/components/custom/control-panel";
import { RightPanel } from "@/components/custom/right-panel";
import {
  useSceneStore,
  getSavedPlans,
  savePlanToStorage,
} from "@/store/use-scene-store";
import { useBinPacking } from "@/lib/packing/use-bin-packing";
import type { ViewMode, RenderMode, StepAction, SavedPlan } from "@/store/use-scene-store";
import { ModeToggle } from "@/components/mode-toggle";

const SceneCanvas = dynamic(
  () => import("@/components/scene/scene-canvas").then((m) => m.SceneCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-sm an-bg-surface an-text-on-surface-muted">
        Loading 3D Scene...
      </div>
    ),
  },
);

// ── PlannerLoader — reads ?plan= param and loads into store ──────────
function PlannerLoader() {
  const searchParams = useSearchParams();
  const { loadPlan, setActivePlan } = useSceneStore();

  useEffect(() => {
    const planId = searchParams.get("plan");
    if (!planId) return;
    const found = getSavedPlans().find((p) => p.id === planId);
    if (found) {
      loadPlan(found);
      setActivePlan(found.id, found.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

// ── Header ──────────────────────────────────────────────────────────
function PlannerHeader() {
  const {
    boxes,
    containerSize,
    moveAllBoxes,
    setUnfitIds,
    history,
    future,
    undo,
    redo,
    logStep,
    activePlanId,
    setActivePlan,
  } = useSceneStore();
  const { autoPack } = useBinPacking();
  const pathname = usePathname();
  const router = useRouter();

  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const handleAutoPack = () => {
    if (boxes.length === 0) return;
    const { packed, unfit } = autoPack();
    moveAllBoxes(packed);
    setUnfitIds(unfit);
    logStep("autoPack", `Auto-packed ${packed.length} boxes`);
  };

  const handleSave = () => {
    const id = activePlanId ?? nanoid(8);
    const plan: SavedPlan = {
      id,
      name: saveName.trim() || `Plan ${id.slice(0, 4).toUpperCase()}`,
      savedAt: Date.now(),
      containerSize,
      boxes,
    };
    savePlanToStorage(plan);
    setActivePlan(id, plan.name);
    setSaveOpen(false);
    if (!activePlanId) {
      router.push(`/planner?plan=${id}`);
    }
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "3D Planner", href: "/planner" },
    { label: "Load Plans", href: "/load-plans" },
    { label: "Catalog", href: "/catalog" },
  ];

  return (
    <>
      <header className="h-16 flex items-center justify-between px-6 z-50 shrink-0 an-bg-surface">
        {/* Left: Logo + Nav */}
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

        {/* Right: Undo/Redo + Save + Auto-pack */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg an-undo-redo-group">
            <button
              type="button"
              title="Undo (Ctrl+Z)"
              onClick={undo}
              disabled={history.length === 0}
              className="p-1 rounded transition-opacity disabled:opacity-30 hover:opacity-70"
            >
              <Undo2 className="w-4 h-4 an-text-primary" />
            </button>
            <button
              type="button"
              title="Redo (Ctrl+Y)"
              onClick={redo}
              disabled={future.length === 0}
              className="p-1 rounded transition-opacity disabled:opacity-30 hover:opacity-70"
            >
              <Redo2 className="w-4 h-4 an-text-primary" />
            </button>
          </div>
          <div className="h-6 w-px an-divider-subtle" />
          <button
            type="button"
            onClick={() => { setSaveName(""); setSaveOpen(true); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80 an-btn-outline-primary"
          >
            <Save className="w-3.5 h-3.5" />
            Save
          </button>
          <div className="h-6 w-px an-divider-subtle" />
          <ModeToggle />
          <div className="h-6 w-px an-divider-subtle" />
          <button
            type="button"
            onClick={handleAutoPack}
            disabled={boxes.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-40 an-btn-autopack"
          >
            <Zap className="w-4 h-4" />
            Auto-pack
          </button>
        </div>
      </header>

      {/* Save Plan Dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="an-dialog-content sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="an-text-on-surface">Save Plan</DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            <label className="text-xs mb-1 block an-text-on-surface-muted">ชื่อแผน</label>
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
              placeholder="e.g. Shipment #2042"
              className="an-input"
              autoFocus
            />
          </div>
          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-opacity hover:opacity-90 an-btn-autopack"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Breadcrumb ───────────────────────────────────────────────────────
function PlannerBreadcrumb() {
  const { activePlanName } = useSceneStore();
  return (
    <div className="px-6 py-2 flex items-center gap-2 text-xs font-mono uppercase tracking-widest shrink-0 an-breadcrumb">
      <Link href="/load-plans" className="hover:opacity-70 transition-opacity">
        Load plans
      </Link>
      <ChevronRight className="w-3.5 h-3.5" />
      <span className="font-bold an-text-primary">
        {activePlanName ?? "New Plan"}
      </span>
    </div>
  );
}

// ── Left Sidebar ─────────────────────────────────────────────────────
type TabId = "items" | "container" | "steps";

const STEP_ICONS: Record<StepAction, string> = {
  addBox: "+",
  removeBox: "−",
  moveBox: "↔",
  rotateBox: "↻",
  autoPack: "⚡",
  clearBoxes: "✕",
  undo: "↩",
  redo: "↪",
};

const STEP_COLORS: Record<StepAction, string> = {
  addBox: "an-text-tertiary",
  removeBox: "text-red-500",
  moveBox: "an-text-primary",
  rotateBox: "an-text-primary",
  autoPack: "an-text-primary",
  clearBoxes: "text-red-500",
  undo: "an-text-on-surface-muted",
  redo: "an-text-on-surface-muted",
};

function StepsTab() {
  const { steps, clearSteps } = useSceneStore();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10px] font-bold uppercase tracking-widest an-section-label">
          Steps ({steps.length})
        </div>
        {steps.length > 0 && (
          <button
            type="button"
            onClick={clearSteps}
            className="text-[9px] px-2 py-0.5 rounded an-btn-delete-sm"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 an-text-on-surface-muted opacity-40">
            <span className="text-xs">No steps yet</span>
          </div>
        ) : (
          steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg an-manifest-item"
            >
              <span
                className={`text-xs font-bold w-4 text-center shrink-0 ${STEP_COLORS[step.action]}`}
              >
                {STEP_ICONS[step.action]}
              </span>
              <span className="flex-1 text-[11px] an-text-on-surface truncate">
                {step.label}
              </span>
              <span className="text-[9px] font-mono an-text-on-surface-muted shrink-0">
                {new Date(step.timestamp).toLocaleTimeString("th-TH", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LeftSidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "items", label: "Items" },
    { id: "container", label: "Container" },
    { id: "steps", label: "Steps" },
  ];

  return (
    <aside className="w-[320px] shrink-0 flex flex-col z-40 an-sidebar">
      {/* Tab switcher */}
      <div className="flex p-4 gap-1 shrink-0">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${activeTab === id ? "an-tab-active" : "an-tab-inactive"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4 min-h-0">
        {activeTab === "items" && <ItemsTab />}
        {activeTab === "container" && <ContainerTab />}
        {activeTab === "steps" && <StepsTab />}
      </div>
    </aside>
  );
}

// ── Floating Toolbar ─────────────────────────────────────────────────
function FloatingToolbar({
  viewMode,
  onViewMode,
  renderMode,
  onRenderMode,
}: {
  viewMode: ViewMode;
  onViewMode: (v: ViewMode) => void;
  renderMode: RenderMode;
  onRenderMode: (r: RenderMode) => void;
}) {
  const viewOptions: { id: ViewMode; icon: React.ReactNode; title: string }[] =
    [
      { id: "3d", icon: <Box className="w-4 h-4" />, title: "3D View" },
      { id: "top", icon: <ArrowDown className="w-4 h-4" />, title: "Top View" },
      {
        id: "side",
        icon: <ArrowRight className="w-4 h-4" />,
        title: "Side View",
      },
    ];

  const renderOptions: {
    id: RenderMode;
    icon: React.ReactNode;
    label: string;
  }[] = [
    { id: "solid", icon: <Grid3x3 className="w-4 h-4" />, label: "Solid" },
    { id: "wire", icon: <Layers className="w-4 h-4" />, label: "Wire" },
    { id: "xray", icon: <Eye className="w-4 h-4" />, label: "X-ray" },
  ];

  return (
    <div className="an-glass an-toolbar-border absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 rounded-2xl z-20">
      {/* View group */}
      <div className="flex items-center gap-1 pr-2 an-toolbar-section-divider">
        {viewOptions.map(({ id, icon, title }) => (
          <button
            key={id}
            type="button"
            title={title}
            onClick={() => onViewMode(id)}
            className={`p-2 rounded-lg transition-colors ${viewMode === id ? "an-toolbar-view-active" : "an-toolbar-view-inactive"}`}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* Render mode group */}
      <div className="flex items-center gap-1">
        {renderOptions.map(({ id, icon, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onRenderMode(id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${renderMode === id ? "an-render-btn-active" : "an-render-btn-inactive"}`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Canvas HUD ───────────────────────────────────────────────────────
function CanvasHUD() {
  const { triggerCameraOp } = useSceneStore();

  return (
    <div className="absolute top-6 right-6 flex flex-col gap-2 z-20">
      <button
        type="button"
        title="Zoom in"
        onClick={() => triggerCameraOp("zoom-in")}
        className="an-glass an-hud-btn w-10 h-10 flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Zoom out"
        onClick={() => triggerCameraOp("zoom-out")}
        className="an-glass an-hud-btn w-10 h-10 flex items-center justify-center rounded-lg transition-colors hover:opacity-80"
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        type="button"
        title="Reset view"
        onClick={() => triggerCameraOp("reset")}
        className="an-glass an-hud-btn w-10 h-10 flex items-center justify-center rounded-lg transition-colors hover:opacity-80 mt-4"
      >
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function PlannerPage() {
  const [activeTab, setActiveTab] = useState<TabId>("items");
  const { viewMode, renderMode, setViewMode, setRenderMode } = useSceneStore();

  return (
    <div className="flex flex-col h-screen overflow-hidden an-bg-surface an-text-on-surface">
      {/* Load plan from URL param before rendering header */}
      <Suspense fallback={null}>
        <PlannerLoader />
      </Suspense>

      <PlannerHeader />
      <PlannerBreadcrumb />

      <main className="flex flex-1 overflow-hidden">
        <LeftSidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Center Canvas */}
        <section className="flex-1 relative an-canvas-grid an-bg-surface overflow-hidden">
          <SceneCanvas />
          <FloatingToolbar
            viewMode={viewMode}
            onViewMode={setViewMode}
            renderMode={renderMode}
            onRenderMode={setRenderMode}
          />
          <CanvasHUD />
        </section>

        <RightPanel />
      </main>
    </div>
  );
}
