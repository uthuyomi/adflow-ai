"use client";
import { Compass, FileCheck2, Focus, Search } from "lucide-react";
import type { LpCopy } from "@/lib/i18n/lp";
import { Reveal, SectionHeading } from "./shared";
const icons=[FileCheck2,Search,Compass,Focus];
export function FeaturesSection({c}:{c:LpCopy}){return <section className="mx-auto max-w-[1100px] px-4 py-20 md:px-6 md:py-[120px]" id="features"><SectionHeading title={c.features.title}/><div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">{c.features.items.map(([t,b],i)=>{const Icon=icons[i];return <Reveal className="border-t border-border pt-6" key={t}><Icon className="h-5 w-5 text-primary"/><h3 className="mt-5 text-xl font-semibold">{t}</h3><p className="mt-3 leading-7 text-muted-foreground">{b}</p></Reveal>})}</div><div className="mt-14 flex flex-wrap gap-3 border-t border-border pt-7">{c.features.secondary.map(x=><span className="text-sm text-muted-foreground" key={x}>• {x}</span>)}</div></section>}
