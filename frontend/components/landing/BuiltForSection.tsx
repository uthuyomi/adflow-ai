"use client";
import type { LpCopy } from "@/lib/i18n/lp";
import { Reveal, SectionHeading } from "./shared";
export function BuiltForSection({c}:{c:LpCopy}){return <section className="border-y border-border bg-[#F9FAFB] py-20 md:py-[120px]" id="built-for"><div className="mx-auto max-w-[1200px] px-4 md:px-6"><SectionHeading title={c.builtFor.title}/><div className="mt-12 grid gap-8 md:grid-cols-4">{c.builtFor.items.map(([t,b],i)=><Reveal className="border-t-2 border-border pt-5" key={t}><span className="text-xs font-semibold text-primary">0{i+1}</span><h3 className="mt-4 font-semibold">{t}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{b}</p></Reveal>)}</div></div></section>}
