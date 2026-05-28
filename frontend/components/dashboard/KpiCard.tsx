import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn, formatNumber } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  delta,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  delta?: string;
  icon: ReactNode;
  tone?: "neutral" | "good" | "bad";
}) {
  return (
    <Card className="p-5 transition-transform hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
          {icon}
        </div>
      </div>
      <div className="mt-5 text-2xl font-semibold">
        {typeof value === "number" ? formatNumber(value) : value}
      </div>
      {delta ? (
        <div
          className={cn(
            "mt-2 text-xs font-medium",
            tone === "good" && "text-emerald-600",
            tone === "bad" && "text-destructive",
            tone === "neutral" && "text-muted-foreground",
          )}
        >
          {delta}
        </div>
      ) : null}
    </Card>
  );
}
