"use client";
import { ChevronRight } from "lucide-react";
import type { LpCopy } from "@/lib/i18n/lp";
import { Reveal, SectionHeading } from "./shared";
export function WorkflowSection({c}:{c:LpCopy}){return <section className="border-y border-border bg-[#F9FAFB] py-20 md:py-[120px]" id="workflow"><div className="mx-auto max-w-[1200px] px-4 md:px-6"><SectionHeading title={c.workflow.title} body={c.workflow.body}/><Reveal className="mt-12 grid gap-3 md:grid-cols-7">{c.workflow.items.map((x,i)=><div className={`relative border-l-2 py-3 pl-5 text-sm font-semibold md:border-l-0 md:border-t-2 md:px-2 md:pt-5 ${i===6?"border-primary text-primary":"border-border"}`} key={x}><span className="mb-2 block text-xs text-muted-foreground">0{i+1}</span>{x}{i<6?<ChevronRight className="absolute -right-3 top-6 hidden h-4 w-4 bg-[#F9FAFB] text-muted-foreground md:block"/>:null}</div>)}</Reveal></div></section>}
