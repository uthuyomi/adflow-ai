"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ImprovementCard } from "@/components/improvements/ImprovementCard";
import type { Improvement } from "@/lib/schemas";

export function ImprovementList({ improvements }: { improvements: Improvement[] }) {
  const [filter, setFilter] = useState<"All" | "Pending" | "Approved">("All");
  const filtered =
    filter === "All"
      ? improvements
      : improvements.filter((item) => item.reviewStatus === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["All", "Pending", "Approved"] as const).map((item) => (
          <Button
            key={item}
            onClick={() => setFilter(item)}
            size="sm"
            variant={filter === item ? "default" : "outline"}
          >
            {item}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((improvement) => (
          <ImprovementCard improvement={improvement} key={improvement.id} />
        ))}
      </div>
    </div>
  );
}
