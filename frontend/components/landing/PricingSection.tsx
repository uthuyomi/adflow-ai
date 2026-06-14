"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatBillingAmount, PLANS, type PlanId } from "@/lib/billing/plans";
import type { LpCopy } from "@/lib/i18n/lp";
import { Reveal, SectionHeading } from "./shared";
const ids:PlanId[]=["free","starter","growth"];
export function PricingSection({c,locale}:{c:LpCopy;locale:"en"|"ja"}){const currency=locale==="ja"?"jpy":"usd";return <section className="mx-auto max-w-[1100px] px-4 py-20 md:px-6 md:py-[120px]" id="pricing"><SectionHeading title={c.pricing.title} body={c.pricing.body}/><Reveal className="mt-12 grid gap-0 overflow-hidden rounded-2xl border border-border md:grid-cols-3">{ids.map(id=>{const p=PLANS[id];return <article className={`p-7 md:border-l md:first:border-l-0 ${id==="starter"?"bg-primary/5 ring-1 ring-inset ring-primary":"bg-white"}`} key={id}><h3 className="text-lg font-semibold">{p.name}</h3><p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">{c.pricing.copies[id]}</p><p className="mt-7 text-3xl font-bold">{formatBillingAmount(p.prices[currency].amount,currency)}{p.prices[currency].amount>0?<span className="text-sm font-normal text-muted-foreground"> {c.pricing.month}</span>:null}</p><p className="mt-2 text-xs text-muted-foreground">{p.monthlyCredits.toLocaleString()} {c.pricing.credits}</p><Button asChild className="mt-7 w-full" variant={id==="starter"?"default":"outline"}><Link href="/pricing">{c.common.start}</Link></Button></article>})}</Reveal></section>}
