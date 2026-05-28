import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Improvement } from "@/lib/schemas";

export function RecentImprovements({ items }: { items: Improvement[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent improvements</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.slice(0, 4).map((item) => (
          <Link
            className="block rounded-md border border-border p-4 transition-colors hover:bg-accent"
            href={`/improvements/${item.id}`}
            key={item.id}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{item.problem}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Expected CTR +{item.expectedCtrImpact}%
                </div>
              </div>
              <Badge variant={item.riskLevel === "High" ? "warning" : "secondary"}>
                {item.riskLevel}
              </Badge>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
