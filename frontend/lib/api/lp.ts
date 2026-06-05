import { listEntities } from "@/lib/supabase/adflow-repository";
import type { LPAnalysis } from "@/lib/schemas";

export async function getLpAnalysis(): Promise<LPAnalysis | null> {
  const pages = await listEntities("landing_pages");
  const lp = pages[0];
  if (!lp) return null;
  return {
    structure: {
      hero_title: lp.hero_title ?? "",
      hero_subtitle: lp.hero_subtitle ?? "",
      cta_count: [lp.primary_cta, lp.secondary_cta].filter(Boolean).length,
      buttons: [lp.primary_cta, lp.secondary_cta].filter((item): item is string => Boolean(item)),
      faq: [],
    },
    behavior: {
      bounce_rate: Number(lp.bounce_rate ?? 0),
      session_duration: Number(lp.session_duration ?? 0),
      scroll_depth: Number(lp.scroll_depth ?? 0),
    },
    performance: {
      page_speed: Number(lp.page_speed ?? 0),
      fcp: Number(lp.fcp ?? 0),
      lcp: Number(lp.lcp ?? 0),
    },
  };
}
