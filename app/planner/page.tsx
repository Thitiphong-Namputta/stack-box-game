"use client";

import dynamic from "next/dynamic";
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
} from "lucide-react";
import { ItemsTab } from "@/components/ui-custom/ItemCatalog";
import { ContainerTab } from "@/components/ui-custom/ControlPanel";
import { RightPanel } from "@/components/ui-custom/RightPanel";
import { useSceneStore } from "@/store/useSceneStore";
import { useBinPacking } from "@/lib/packing/useBinPacking";
import type { ViewMode, RenderMode } from "@/store/useSceneStore";
import { ModeToggle } from "@/components/mode-toggle";

const SceneCanvas = dynamic(
  () => import("@/components/scene/SceneCanvas").then((m) => m.SceneCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center text-sm an-bg-surface an-text-on-surface-muted">
        Loading 3D Scene...
      </div>
    ),
  },
);

// ── Header ──────────────────────────────────────────────────────────
function PlannerHeader() {
  const { boxes, moveAllBoxes, setUnfitIds, history, future, undo, redo } =
    useSceneStore();
  const { autoPack } = useBinPacking();

  const handleAutoPack = () => {
    if (boxes.length === 0) return;
    const { packed, unfit } = autoPack();
    moveAllBoxes(packed);
    setUnfitIds(unfit);
  };

  const navItems = [
    { label: "Dashboard", active: false },
    { label: "3D Planner", active: true },
    { label: "Load Plans", active: false },
    { label: "Catalog", active: false },
  ];

  return (
    <header className="h-16 flex items-center justify-between px-6 z-50 shrink-0 an-bg-surface">
      {/* Left: Logo + Nav */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 an-text-primary" />
          <span className="text-xl font-bold tracking-tighter an-text-primary">
            3D Cargo Planner
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map(({ label, active }) => (
            <span
              key={label}
              className={`text-sm cursor-pointer transition-colors duration-200 ${active ? "an-nav-active" : "an-nav-inactive"}`}
            >
              {label}
            </span>
          ))}
        </nav>
      </div>

      {/* Right: Undo/Redo + Auto-pack */}
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
  );
}

// ── Breadcrumb ───────────────────────────────────────────────────────
function PlannerBreadcrumb() {
  return (
    <div className="px-6 py-2 flex items-center gap-2 text-xs font-mono uppercase tracking-widest shrink-0 an-breadcrumb">
      <span>Load plans</span>
      <ChevronRight className="w-3.5 h-3.5" />
      <span className="font-bold an-text-primary">Shipment #2041</span>
    </div>
  );
}

// ── Left Sidebar ─────────────────────────────────────────────────────
type TabId = "items" | "container" | "steps";

function StepsTab() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 an-text-on-surface-muted opacity-40">
      <span className="text-xs">Steps log — coming soon</span>
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
import { useState } from "react";

export default function PlannerPage() {
  const [activeTab, setActiveTab] = useState<TabId>("items");
  const { viewMode, renderMode, setViewMode, setRenderMode } = useSceneStore();

  return (
    <div className="flex flex-col h-screen overflow-hidden an-bg-surface an-text-on-surface">
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
