"use client";

import { X } from "lucide-react";
import { type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={() => onOpenChange(false)}
        type="button"
      />
      {children}
    </div>
  );
}

function DialogContent({
  children,
  className,
  onClose,
}: {
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}) {
  return (
    <div
      className={cn(
        "relative z-10 w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-panel",
        className,
      )}
    >
      {onClose ? (
        <Button
          aria-label="Close"
          className="absolute right-3 top-3"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
      {children}
    </div>
  );
}

function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="space-y-2 pr-8">{children}</div>;
}

function DialogTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

function DialogDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-6 text-muted-foreground">{children}</p>;
}

export { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle };
