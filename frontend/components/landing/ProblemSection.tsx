"use client";
import { AlertCircle, Compass, Users } from "lucide-react";
import type { LpCopy } from "@/lib/i18n/lp";
import { Reveal, SectionHeading } from "./shared";
const icons=[Users,Compass,AlertCircle];
export function ProblemSection({c}:{c:LpCopy}){return <section className="mx-auto max-w-[1200px] px-4 py-20 md:px-6 md:py-[120px]" id="problem"><SectionHeading title={c.problem.title} body={c.problem.body}/><div className="mt-12 grid gap-5 md:grid-cols-3">{c.problem.items.map(([t,b],i)=>{const Icon=icons[i];return <Reveal className="flex gap-4 border-t border-border pt-6" key={t}><Icon className="h-5 w-5 shrink-0 text-primary"/><div><h3 className="text-xl font-semibold">{t}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{b}</p></div></Reveal>})}</div><p className="mt-14 whitespace-pre-line text-2xl font-bold leading-tight">{c.problem.close}</p></section>}
