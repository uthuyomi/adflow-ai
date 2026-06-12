"use client";

import { useMemo, useState } from "react";

import { ImprovementCard } from "@/components/improvements/ImprovementCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Improvement } from "@/lib/schemas";
import type { ImprovementStatus } from "@/lib/types/adflow";

const statuses: ImprovementStatus[] = ["GENERATED", "APPROVED", "REJECTED", "APPLY_READY", "APPLIED", "FAILED"];

export function ImprovementList({ improvements }: { improvements: Improvement[] }) {
  const [filter, setFilter] = useState<"ALL" | ImprovementStatus>("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "confidence">("newest");
  const counts = useMemo(
    () => Object.fromEntries(statuses.map((status) => [status, improvements.filter((item) => item.reviewStatus === status).length])),
    [improvements],
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return improvements
      .filter((item) => filter === "ALL" || item.reviewStatus === filter)
      .filter((item) => !query || [item.problem, ...item.adSuggestions, ...item.lpSuggestions].join(" ").toLowerCase().includes(query))
      .sort((a, b) => {
        if (sort === "confidence") return b.confidence - a.confidence;
        const delta = new Date(b.statusUpdatedAt).getTime() - new Date(a.statusUpdatedAt).getTime();
        return sort === "oldest" ? -delta : delta;
      });
  }, [filter, improvements, search, sort]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setFilter("ALL")} size="sm" variant={filter === "ALL" ? "default" : "outline"}>
          All ({improvements.length})
        </Button>
        {statuses.map((status) => (
          <Button key={status} onClick={() => setFilter(status)} size="sm" variant={filter === status ? "default" : "outline"}>
            {status} ({counts[status]})
          </Button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <Input onChange={(event) => setSearch(event.target.value)} placeholder="Search improvements" value={search} />
        <select className="rounded-md border border-border bg-background px-3 text-sm" onChange={(event) => setSort(event.target.value as typeof sort)} value={sort}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="confidence">Confidence</option>
        </select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((improvement) => <ImprovementCard improvement={improvement} key={improvement.id} />)}
      </div>
    </div>
  );
}
