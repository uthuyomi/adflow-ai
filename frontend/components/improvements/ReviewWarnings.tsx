import { ShieldAlert } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Improvement } from "@/lib/schemas";

export function ReviewWarnings({ improvement }: { improvement: Improvement }) {
  const warnings = [
    ...improvement.review.exaggerated_claims,
    ...improvement.review.brand_risks,
    ...improvement.review.ui_risks,
    ...improvement.review.dangerous_changes,
  ];

  return (
    <Alert className={warnings.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}>
      <ShieldAlert className="mb-3 h-5 w-5" />
      <AlertTitle>{warnings.length ? "Review warnings" : "Review passed"}</AlertTitle>
      <AlertDescription>
        {warnings.length ? (
          <ul className="mt-2 space-y-2">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : (
          "No exaggerated claims, brand risks, or dangerous changes were detected."
        )}
      </AlertDescription>
    </Alert>
  );
}
