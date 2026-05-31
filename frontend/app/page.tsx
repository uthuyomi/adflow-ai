"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, BrainCircuit, CheckCircle2, FileSearch, FlaskConical, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

const pillars = [
  {
    icon: BarChart3,
    title: "Ad + LP analysis",
    description: "Evaluate ad promise, landing page message match, CTA alignment, and improvement history as one workflow.",
  },
  {
    icon: FileSearch,
    title: "Evidence-first review",
    description: "Keep market signals, product review, monitoring, and outcome learning separate from unsupported success claims.",
  },
  {
    icon: FlaskConical,
    title: "Idea Lab",
    description: "Turn rough ideas into structured profiles, evidence checks, opportunity scores, MVP scope, backlog, and roadmap.",
  },
];

export default function PublicHomePage() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <Link className="flex items-center gap-3" href="/">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">AdFlow AI</div>
              <div className="text-xs text-muted-foreground">Review-first ad operations</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/login">
                Open app
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:py-20">
        <div className="flex flex-col justify-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-md border border-border px-3 py-1 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Human approval before implementation
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-normal md:text-6xl">
            AdFlow AI
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            Manage ad and landing page improvements with evidence, AI reviews, implementation prompts, and measured outcomes in one loop.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/login">
                Continue with Google
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <div className="text-sm font-semibold">Improvement Loop</div>
              <div className="text-xs text-muted-foreground">From hypothesis to measured learning</div>
            </div>
            <BrainCircuit className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="mt-5 grid gap-3">
            {["Research signals", "AI proposal", "Risk review", "Codex task", "Outcome tracking"].map((item) => (
              <div className="flex items-center gap-3 rounded-md border border-border p-3 text-sm" key={item}>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 md:grid-cols-3 md:px-6">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <article className="rounded-md border border-border bg-card p-5" key={pillar.title}>
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="mt-4 font-semibold">{pillar.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{pillar.description}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
