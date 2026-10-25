"use client";
import { LayoutDashboard, Globe2, Users, Play, FlaskConical } from "lucide-react";
import { useProject, type PanelKey } from "@/store/useProject";
import { cx } from "@/components/ui";
import { OverviewPanel } from "./panels/Overview";
import { MarketPanel } from "./panels/Market";
import { CustomersPanel } from "./panels/Customers";
import { SimulationPanel } from "./panels/Simulation";
import { AdjustPanel } from "./panels/Adjust";

const TABS: { key: PanelKey; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Visão geral", icon: LayoutDashboard },
  { key: "market", label: "Mercado", icon: Globe2 },
  { key: "customers", label: "Clientes", icon: Users },
  { key: "simulation", label: "Simulação", icon: Play },
  { key: "adjust", label: "Ajustes", icon: FlaskConical },
];

export function SidePanel() {
  const panel = useProject((s) => s.panel);
  const setPanel = useProject((s) => s.setPanel);
  return (
    <aside className="pointer-events-auto glass flex h-full w-full flex-col overflow-hidden rounded-2xl lg:w-[420px]">
      <nav className="flex gap-1 border-b border-white/8 p-1.5">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setPanel(t.key)} className={cx("flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10.5px] font-medium transition", panel === t.key ? "bg-white/10 text-fg" : "text-muted hover:bg-white/5 hover:text-fg")}>
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </nav>
      <div className="scroll-thin flex-1 overflow-y-auto p-4">
        {panel === "overview" && <OverviewPanel />}
        {panel === "market" && <MarketPanel />}
        {panel === "customers" && <CustomersPanel />}
        {panel === "simulation" && <SimulationPanel />}
        {panel === "adjust" && <AdjustPanel />}
      </div>
    </aside>
  );
}
