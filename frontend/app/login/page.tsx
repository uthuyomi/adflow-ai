"use client";

import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/lib/auth";

export default function LoginPage() {
  const handleLogin = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google login failed.");
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-panel">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">AdFlow AI</h1>
            <p className="text-sm text-muted-foreground">Sign in to manage ad and LP reviews.</p>
          </div>
        </div>
        <Button className="mt-8 w-full" onClick={handleLogin}>
          Continue with Google
        </Button>
        <Button asChild className="mt-3 w-full" variant="ghost">
          <Link href="/">Back to overview</Link>
        </Button>
      </div>
    </main>
  );
}
