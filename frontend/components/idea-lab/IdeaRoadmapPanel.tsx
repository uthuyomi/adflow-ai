"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IdeaRoadmap } from "@/lib/types/adflow";

export function IdeaRoadmapPanel({ roadmap }: { roadmap?: IdeaRoadmap | null }) {
  const sections = [
    ["Now", roadmap?.now_items ?? []],
    ["Next", roadmap?.next_items ?? []],
    ["Later", roadmap?.later_items ?? []],
  ] as const;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Idea Roadmap</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        {roadmap?.summary ? <p className="text-sm text-muted-foreground">{roadmap.summary}</p> : null}
        {sections.map(([title, items]) => (
          <div key={title}>
            <div className="font-medium">{title}</div>
            <div className="mt-2 grid gap-2">
              {items.length ? items.map((item, index) => (
                <div className="rounded-md border border-border p-2 text-sm" key={`${title}-${index}`}>{String(item.title ?? "Roadmap item")}</div>
              )) : <div className="text-sm text-muted-foreground">-</div>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
