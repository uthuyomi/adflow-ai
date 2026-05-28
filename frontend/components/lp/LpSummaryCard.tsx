import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LPAnalysis } from "@/lib/schemas";

export function LpSummaryCard({ lp }: { lp: LPAnalysis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>LP preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-background p-6">
          <div className="text-xs uppercase text-muted-foreground">Hero</div>
          <h2 className="mt-2 text-2xl font-semibold">{lp.structure.hero_title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {lp.structure.hero_subtitle}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {lp.structure.buttons.map((button) => (
              <span className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" key={button}>
                {button}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
