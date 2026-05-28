import { ExternalLink } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PullRequest } from "@/lib/schemas";

export function PendingPrList({ items }: { items: PullRequest[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending PR reviews</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <a
            className="flex items-center justify-between gap-3 rounded-md border border-border p-4 transition-colors hover:bg-accent"
            href={item.url}
            key={item.id}
            rel="noreferrer"
            target="_blank"
          >
            <div>
              <div className="text-sm font-semibold">{item.title}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.createdAt}</div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        ))}
      </CardContent>
    </Card>
  );
}
