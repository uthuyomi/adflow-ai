"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    try {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getUser().then(({ data, error: authError }) => {
        if (!mounted) return;
        if (authError) setError(authError);
        setUser(data.user);
        setIsLoading(false);
      });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!mounted) return;
        setUser(session?.user ?? null);
        setIsLoading(false);
      });

      return () => {
        mounted = false;
        data.subscription.unsubscribe();
      };
    } catch (caught) {
      if (mounted) {
        setError(caught instanceof Error ? caught : new Error("Supabase auth failed."));
        setIsLoading(false);
      }
    }

    return () => {
      mounted = false;
    };
  }, []);

  return { user, isLoading, error, isAuthenticated: Boolean(user) };
}
