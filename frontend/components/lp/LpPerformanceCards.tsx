import { Gauge, MousePointer2, Timer } from "lucide-react";

import { KpiCard } from "@/components/dashboard/KpiCard";
import type { LPAnalysis } from "@/lib/schemas";

export function LpPerformanceCards({ lp }: { lp: LPAnalysis }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <KpiCard icon={<Gauge className="h-5 w-5" />} label="Page speed" value={lp.performance.page_speed} />
      <KpiCard icon={<Timer className="h-5 w-5" />} label="LCP" value={`${lp.performance.lcp}s`} />
      <KpiCard icon={<MousePointer2 className="h-5 w-5" />} label="Bounce rate" value={`${lp.behavior.bounce_rate}%`} tone="bad" />
    </div>
  );
}
