"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IdeaBacklogItem } from "@/lib/types/adflow";

export function IdeaBacklogPanel({ items }: { items: IdeaBacklogItem[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Idea Backlog</CardTitle></CardHeader>
      <CardContent className="grid gap-2">
        {items.length ? items.map((item) => (
          <div className="rounded-md border border-border p-3 text-sm" key={item.id}>
            <div className="font-medium">{item.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{item.category} / {item.priority} / evidence {item.evidence_count}</div>
          </div>
        )) : <div className="text-sm text-muted-foreground">Run Idea Review to generate backlog.</div>}
      </CardContent>
    </Card>
  );
}
