"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { IdeaSession } from "@/lib/types/adflow";
import { cn } from "@/lib/utils";

export function IdeaSidebar({
  sessions,
  selectedId,
  isCreating,
  onCreate,
  onSelect,
}: {
  sessions: IdeaSession[];
  selectedId: string | null;
  isCreating: boolean;
  onCreate: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="grid gap-3">
      <Button onClick={onCreate} disabled={isCreating}>
        <Plus className="mr-2 h-4 w-4" />
        New idea
      </Button>
      <div className="grid gap-2">
        {sessions.map((session) => (
          <button
            className={cn(
              "rounded-md border border-border p-3 text-left text-sm hover:bg-accent",
              selectedId === session.id && "bg-accent",
            )}
            key={session.id}
            onClick={() => onSelect(session.id)}
            type="button"
          >
            <div className="font-medium">{session.title}</div>
            <div className="mt-1 text-xs text-muted-foreground">{session.status}</div>
          </button>
        ))}
        {!sessions.length ? (
          <Card className="p-4 text-sm text-muted-foreground">No idea sessions yet.</Card>
        ) : null}
      </div>
    </aside>
  );
}
