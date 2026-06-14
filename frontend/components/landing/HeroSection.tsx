"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import type { LpCopy } from "@/lib/i18n/lp";

export function HeroSection({ c }: { c: LpCopy }) {
  return <section className="border-b border-border bg-white" id="hero">
    <div className="mx-auto grid min-h-[720px] max-w-[1280px] gap-14 px-4 py-20 md:px-8 lg:grid-cols-[45%_55%] lg:items-center">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <p className="text-sm font-semibold text-primary">{c.hero.eyebrow}</p>
        <h1 className="mt-6 whitespace-pre-line text-5xl font-extrabold leading-[0.98] tracking-[-0.06em] md:text-7xl">{c.hero.title}</h1>
        <p className="mt-7 whitespace-pre-line text-lg leading-8 text-muted-foreground">{c.hero.body}</p>
        <div className="mt-9 grid gap-3 sm:flex">
          <Button asChild className="h-12 px-7"><Link href="/login">{c.common.start}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          <Button asChild className="h-12 px-7" variant="outline"><Link href="#example-report">{c.common.report}</Link></Button>
        </div>
        <div className="mt-12 border-t border-border pt-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{c.hero.builtFor}</p><p className="mt-3 text-sm font-medium leading-7">{c.hero.audiences.join("  ·  ")}</p></div>
      </motion.div>
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1 }}><HeroMemo c={c} /></motion.div>
    </div>
    <div className="border-t border-border bg-[#F9FAFB]"><div className="mx-auto flex max-w-[1200px] flex-wrap gap-x-7 gap-y-3 px-4 py-5 text-sm md:px-6"><strong className="text-muted-foreground">{c.hero.outputLabel}</strong>{c.hero.outputs.map(x=><span className="flex items-center gap-2 font-medium" key={x}><Check className="h-4 w-4 text-primary" />{x}</span>)}</div></div>
  </section>;
}

function HeroMemo({ c }: { c: LpCopy }) {
  const r=c.report;
  return <div className="mx-auto max-w-[560px] rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-[0_18px_50px_rgba(17,17,17,0.06)] md:p-8">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{c.common.sample}</p>
    <div className="mt-7 border-b border-border pb-7"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{r.decision}</p><div className="mt-3 flex items-end justify-between gap-4"><span className="text-5xl font-extrabold tracking-[-0.05em] text-primary md:text-6xl">{r.build}</span><span className="text-xs font-semibold text-muted-foreground">{c.common.confidence}</span></div></div>
    <div className="py-7"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{r.next}</p><p className="mt-3 text-2xl font-bold leading-tight">{r.nextValue}</p></div>
    <div className="grid gap-5 border-t border-border pt-6 sm:grid-cols-2"><div><p className="text-xs font-semibold text-muted-foreground">{r.opportunity}</p><p className="mt-2 text-xl font-bold">{r.opportunityValue}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{r.opportunityBody}</p></div><div><p className="text-xs font-semibold text-muted-foreground">{r.positioning}</p><p className="mt-2 text-sm font-semibold leading-6">{r.positioningValue}</p></div></div>
    <p className="mt-6 border-t border-border pt-4 text-xs text-muted-foreground">{r.evidence}: {r.evidenceItems.join(" · ")}</p>
  </div>;
}
