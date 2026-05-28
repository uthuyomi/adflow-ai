import { ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdCreativePreview({
  headline,
  body,
  cta,
}: {
  headline: string;
  body: string;
  cta: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ad creative</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border bg-background p-4">
          <div className="flex aspect-video items-center justify-center rounded-md bg-muted">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="mt-4 text-lg font-semibold">{headline}</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
          <Badge className="mt-4">{cta}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
