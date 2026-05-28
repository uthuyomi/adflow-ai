import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ErrorState({ message }: { message?: string }) {
  return (
    <Alert className="border-destructive/30 bg-destructive/5">
      <AlertTriangle className="mb-3 h-5 w-5 text-destructive" />
      <AlertTitle>Unable to load this view</AlertTitle>
      <AlertDescription>
        {message || "The API request failed. Check the backend URL and try again."}
      </AlertDescription>
    </Alert>
  );
}
