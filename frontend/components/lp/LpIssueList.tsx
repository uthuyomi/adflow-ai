import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const issues = [
  "Hero promise is broad compared with ad-specific route automation claims.",
  "CTA appears twice but does not communicate the strongest outcome.",
  "FAQ covers format support but not setup time or import limits.",
];

export function LpIssueList() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>LP issues</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {issues.map((issue) => (
          <div className="flex gap-3 rounded-md border border-border p-4" key={issue}>
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
            <div className="text-sm leading-6">{issue}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
