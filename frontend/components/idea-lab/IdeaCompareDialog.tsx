"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { IdeaCompareResult } from "@/lib/types/adflow";

export function IdeaCompareDialog({ isComparing, result, onCompare }: { isComparing: boolean; result?: IdeaCompareResult; onCompare: (ideas: Array<Record<string, unknown>>) => void }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  return (
    <Card className="p-4">
      <div className="font-semibold">Idea Compare</div>
      <div className="mt-3 grid gap-2">
        <textarea className="min-h-20 rounded-md border border-input bg-background p-3 text-sm" value={a} onChange={(event) => setA(event.target.value)} placeholder="Idea A" />
        <textarea className="min-h-20 rounded-md border border-input bg-background p-3 text-sm" value={b} onChange={(event) => setB(event.target.value)} placeholder="Idea B" />
        <Button disabled={isComparing || !a.trim() || !b.trim()} onClick={() => onCompare([{ title: "Idea A", text: a }, { title: "Idea B", text: b }])}>Compare</Button>
      </div>
      {result ? <pre className="mt-3 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(result, null, 2)}</pre> : null}
    </Card>
  );
}
