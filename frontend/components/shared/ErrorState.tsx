"use client";

import { AlertTriangle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useI18n } from "@/hooks/use-i18n";

export function ErrorState({ message }: { message?: string }) {
  const { t } = useI18n();
  return (
    <Alert className="border-destructive/30 bg-destructive/5">
      <AlertTriangle className="mb-3 h-5 w-5 text-destructive" />
      <AlertTitle>{t("common.loadFailed")}</AlertTitle>
      <AlertDescription>
        {message || t("common.loadFailedDescription")}
      </AlertDescription>
    </Alert>
  );
}
