"use client";

import type { FieldError, UseFormRegisterReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  registration,
  error,
  type = "text",
  textarea,
  placeholder,
}: {
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  type?: string;
  textarea?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {textarea ? (
        <Textarea placeholder={placeholder} {...registration} />
      ) : (
        <Input type={type} placeholder={placeholder} {...registration} />
      )}
      {error ? <p className="text-xs text-destructive">{error.message}</p> : null}
    </div>
  );
}

export function SelectField({
  label,
  registration,
  error,
  children,
}: {
  label: string;
  registration: UseFormRegisterReturn;
  error?: FieldError;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
        {...registration}
      >
        {children}
      </select>
      {error ? <p className="text-xs text-destructive">{error.message}</p> : null}
    </div>
  );
}
