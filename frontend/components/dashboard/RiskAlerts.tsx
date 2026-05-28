import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function RiskAlerts() {
  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-950">
      <AlertTriangle className="mb-3 h-5 w-5" />
      <AlertTitle>Review needed before PR creation</AlertTitle>
      <AlertDescription>
        One mobile UI warning is present in the generated diff. Check before/after copy
        and approve manually.
      </AlertDescription>
    </Alert>
  );
}
