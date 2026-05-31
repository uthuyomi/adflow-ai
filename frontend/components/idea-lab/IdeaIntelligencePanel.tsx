"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { IdeaProfile, IdeaReviewRun } from "@/lib/types/adflow";

export function IdeaIntelligencePanel({
  profile,
  review,
  isReviewing,
  isConverting,
  onReview,
  onConvert,
}: {
  profile?: IdeaProfile | null;
  review?: IdeaReviewRun | null;
  isReviewing: boolean;
  isConverting: boolean;
  onReview: () => void;
  onConvert: () => void;
}) {
  const scores = [
    ["Need", review?.need_score],
    ["Pain", review?.pain_score],
    ["Competition", review?.competition_score],
    ["Monetization", review?.monetization_score],
    ["Implementation", review?.implementation_score],
    ["Confidence", review?.confidence_score],
  ] as const;
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{profile?.title ?? "Idea Profile"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <Info label="Problem" value={profile?.problem_statement} />
          <Info label="Target" value={profile?.target_users} />
          <Info label="Solution" value={profile?.proposed_solution} />
          <Info label="Market" value={profile?.market_category} />
          <Info label="Monetization" value={profile?.monetization_model} />
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md bg-primary px-3 py-2 text-primary-foreground" disabled={isReviewing || !profile} onClick={onReview} type="button">
              {isReviewing ? "Reviewing..." : "Run Idea Review"}
            </button>
            <button className="rounded-md border border-border px-3 py-2" disabled={isConverting || !profile} onClick={onConvert} type="button">
              {isConverting ? "Converting..." : "Convert To Product"}
            </button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Idea Opportunity
            <Badge variant={review?.decision === "build" ? "warning" : "secondary"}>{review?.decision ?? "not reviewed"}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="text-3xl font-semibold">{Math.round(review?.idea_opportunity_score ?? 0)}/100</div>
          <p className="text-muted-foreground">{review?.decision_reason ?? "Run review to generate Build / Maybe / Avoid."}</p>
          {scores.map(([label, value]) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-muted-foreground"><span>{label}</span><span>{Math.round(value ?? 0)}</span></div>
              <Progress className="mt-1" value={Math.max(0, Math.min(100, value ?? 0))} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">MVP</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <List title="Must Have" items={review?.mvp_plan?.must_have ?? []} />
          <List title="Should Have" items={review?.mvp_plan?.should_have ?? []} />
          <List title="Do Not Build" items={review?.mvp_plan?.do_not_build ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div>{value || "-"}</div></div>;
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="font-medium">{title}</div>
      <div className="mt-2 grid gap-1">
        {items.length ? items.map((item) => <div className="rounded-md border border-border p-2" key={item}>{item}</div>) : <div className="text-muted-foreground">-</div>}
      </div>
    </div>
  );
}
