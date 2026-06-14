"use client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { LpCopy } from "@/lib/i18n/lp";
import { Reveal, SectionHeading } from "./shared";
export function FaqSection({c}:{c:LpCopy}){return <section className="border-t border-border py-20 md:py-[120px]" id="faq"><div className="mx-auto max-w-[900px] px-4 md:px-6"><SectionHeading title={c.faq.title}/><Reveal className="mt-10"><Accordion collapsible type="single">{c.faq.items.map(([q,a],i)=><AccordionItem key={q} value={`faq-${i}`}><AccordionTrigger>{q}</AccordionTrigger><AccordionContent>{a}</AccordionContent></AccordionItem>)}</Accordion></Reveal></div></section>}
