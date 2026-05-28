import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Improvement } from "@/lib/schemas";

export function ImprovementCard({ improvement }: { improvement: Improvement }) {
  return (
    <Link href={`/improvements/${improvement.id}`}>
      <Card className="p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">{improvement.problem}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              Expected CTR +{improvement.expectedCtrImpact}% / CVR +{improvement.expectedCvrImpact}%
            </div>
          </div>
          <Badge variant={improvement.riskLevel === "Medium" ? "warning" : "secondary"}>
            {improvement.riskLevel}
          </Badge>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-semibold">{improvement.confidence}%</span>
          </div>
          <Progress value={improvement.confidence} />
        </div>
      </Card>
    </Link>
  );
}
