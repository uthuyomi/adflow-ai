"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const TabsContext = createContext<{
  value: string;
  setValue: (value: string) => void;
} | null>(null);

function Tabs({
  defaultValue,
  children,
  className,
}: {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("inline-flex h-10 items-center rounded-md bg-muted p-1", className)}>
      {children}
    </div>
  );
}

function TabsTrigger({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const context = useContext(TabsContext);
  if (!context) {
    return null;
  }
  return (
    <button
      className={cn(
        "inline-flex h-8 items-center justify-center rounded px-3 text-sm font-medium text-muted-foreground transition-colors",
        context.value === value && "bg-background text-foreground shadow-sm",
      )}
      onClick={() => context.setValue(value)}
      type="button"
    >
      {children}
    </button>
  );
}

function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const context = useContext(TabsContext);
  if (!context || context.value !== value) {
    return null;
  }
  return <div className={cn("mt-6", className)}>{children}</div>;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
