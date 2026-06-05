import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LPAnalysis } from "@/lib/schemas";

export function LpIssueList({ lp }: { lp: LPAnalysis }) {
  const issues = buildIssues(lp);
  return (
    <Card>
      <CardHeader>
        <CardTitle>LP issues</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {issues.length ? issues.map((issue) => (
          <div className="flex gap-3 rounded-md border border-border p-4" key={issue}>
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
            <div className="text-sm leading-6">{issue}</div>
          </div>
        )) : <div className="text-sm text-muted-foreground">No rule-based LP issues detected.</div>}
      </CardContent>
    </Card>
  );
}

function buildIssues(lp: LPAnalysis) {
  const issues: string[] = [];
  if (!lp.structure.hero_title.trim()) issues.push("Hero title is missing.");
  if (!lp.structure.hero_subtitle.trim()) issues.push("Hero subtitle is missing.");
  if (lp.structure.cta_count === 0) issues.push("Primary CTA is missing.");
  if (lp.behavior.bounce_rate >= 70) issues.push("Bounce rate is high; review message match and first-view clarity.");
  if (lp.performance.lcp >= 2.5) issues.push("LCP is above the recommended threshold.");
  return issues;
}
