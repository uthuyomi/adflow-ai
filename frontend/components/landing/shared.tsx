"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 16 }} transition={{ duration: 0.45 }} viewport={{ once: true, amount: 0.15 }} whileInView={{ opacity: 1, y: 0 }}>{children}</motion.div>;
}

export function SectionHeading({ title, body, label }: { title: string; body?: string; label?: string }) {
  return <Reveal className="max-w-3xl">{label ? <p className="mb-4 text-sm font-semibold text-primary">{label}</p> : null}<h2 className="whitespace-pre-line text-4xl font-bold tracking-[-0.04em] md:text-5xl">{title}</h2>{body ? <p className="mt-6 whitespace-pre-line text-lg leading-8 text-muted-foreground">{body}</p> : null}</Reveal>;
}
