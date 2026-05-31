"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { IdeaDiscoveryResult } from "@/lib/types/adflow";

export function IdeaDiscoveryDialog({ isDiscovering, result, onDiscover }: { isDiscovering: boolean; result?: IdeaDiscoveryResult; onDiscover: (query: string) => void }) {
  const [query, setQuery] = useState("What should I build?");
  return (
    <Card className="p-4">
      <div className="font-semibold">Idea Discovery</div>
      <div className="mt-3 flex gap-2">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} />
        <Button disabled={isDiscovering} onClick={() => onDiscover(query)}>Discover</Button>
      </div>
      <div className="mt-3 grid gap-2">
        {result?.top_opportunities?.map((item) => (
          <div className="rounded-md border border-border p-3 text-sm" key={item.title}>
            <div className="font-medium">{item.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">Need {item.need} / Pain {item.pain}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
