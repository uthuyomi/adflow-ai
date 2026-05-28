import { FileCode2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Improvement } from "@/lib/schemas";

export function DiffViewer({ improvement }: { improvement: Improvement }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Before / after diff</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {improvement.diff.files.map((file) => (
          <div className="rounded-lg border border-border" key={file.path}>
            <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-semibold">
              <FileCode2 className="h-4 w-4 text-muted-foreground" />
              {file.path}
            </div>
            {file.changes.map((change) => (
              <div className="grid gap-0 md:grid-cols-2" key={`${file.path}-${change.before}`}>
                <div className="border-b border-border p-4 md:border-b-0 md:border-r">
                  <div className="mb-2 text-xs font-semibold uppercase text-destructive">Before</div>
                  <div className="rounded-md bg-destructive/5 p-4 text-sm leading-6">{change.before}</div>
                </div>
                <div className="p-4">
                  <div className="mb-2 text-xs font-semibold uppercase text-emerald-600">After</div>
                  <div className="rounded-md bg-emerald-50 p-4 text-sm leading-6 text-emerald-950">
                    {change.after}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
