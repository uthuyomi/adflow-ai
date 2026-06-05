"use client";

import { useEffect, useState } from "react";

import type { BillingCurrency } from "@/lib/billing/plans";

const STORAGE_KEY = "adflow-billing-currency";

export function useBillingCurrency() {
  const [currency, setCurrencyState] = useState<BillingCurrency>("jpy");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "jpy" || stored === "usd") {
      setCurrencyState(stored);
      return;
    }

    const locale = window.navigator.language.toLowerCase();
    setCurrencyState(locale.startsWith("ja") ? "jpy" : "usd");
  }, []);

  const setCurrency = (next: BillingCurrency) => {
    setCurrencyState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  };

  return { currency, setCurrency };
}
