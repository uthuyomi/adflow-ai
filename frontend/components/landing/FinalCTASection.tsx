"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LpCopy } from "@/lib/i18n/lp";
import { Reveal } from "./shared";
export function FinalCTASection({c}:{c:LpCopy}){return <section className="mx-auto max-w-[1200px] px-4 pb-20 md:px-6 md:pb-[120px]" id="final-cta"><Reveal className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground md:px-20 md:py-20"><h2 className="whitespace-pre-line text-4xl font-bold tracking-[-0.05em] md:text-6xl">{c.cta.title}</h2><p className="mx-auto mt-6 max-w-xl whitespace-pre-line text-lg leading-8 text-primary-foreground/80">{c.cta.body}</p><div className="mx-auto mt-9 grid max-w-md gap-3 sm:flex sm:justify-center"><Button asChild className="h-12 px-7" variant="secondary"><Link href="/login">{c.common.start}<ArrowRight className="ml-2 h-4 w-4"/></Link></Button><Button asChild className="h-12 border-primary-foreground/30 bg-transparent px-7 text-primary-foreground hover:bg-primary-foreground/10" variant="outline"><Link href="#example-report">{c.common.report}</Link></Button></div></Reveal></section>}
