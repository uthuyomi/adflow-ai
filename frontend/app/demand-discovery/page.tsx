"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useExternalStoreRuntime,
  type AppendMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { Bot, Copy, ExternalLink, HelpCircle, Loader2, PanelRight, Plus, RefreshCw, Search, Send, Sparkles, Square, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";
import {
  createDemandDiscoverySession,
  runDemandDiscoveryResearch,
  sendDemandDiscoveryMessage,
  type DemandDiscoveryInsight,
  type DemandDiscoveryMessage,
  type DemandResearchContext,
  type DemandResearchStatus,
} from "@/lib/api/product";
import { cn } from "@/lib/utils";

type ChatMessage = DemandDiscoveryMessage & {
  id: string;
};

const starterPromptKeys = [
  "demandDiscovery.prompt.saas",
  "demandDiscovery.prompt.competitor",
  "demandDiscovery.prompt.adlp",
] as const;

export default function DemandDiscoveryPage() {
  const { locale, t } = useI18n();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [insight, setInsight] = useState<DemandDiscoveryInsight | null>(null);
  const [researchStatus, setResearchStatus] = useState<DemandResearchStatus>("conversation");
  const [researchContext, setResearchContext] = useState<DemandResearchContext>({});
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendText = useCallback(
    async (input: string) => {
      const trimmed = input.trim();
      if (!trimmed || isRunning) return;

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed,
      };

      setError(null);
      setShowHints(false);
      setIsRunning(true);
      setMessages((current) => [...current, userMessage]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = sessionId
          ? await sendDemandDiscoveryMessage(sessionId, trimmed, locale, controller.signal)
          : await createDemandDiscoverySession(trimmed, locale, controller.signal);

        setSessionId(result.id);
        setInsight(result.insight);
        setResearchStatus(result.research_status);
        setResearchContext(result.research_context);
        setMessages(
          result.messages.map((message, index) => ({
            ...message,
            id: `${result.id}-${index}`,
          })),
        );
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : t("demandDiscovery.error"));
      } finally {
        abortRef.current = null;
        setIsRunning(false);
      }
    },
    [isRunning, locale, sessionId, t],
  );

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const text = message.content
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("")
        .trim();
      await sendText(text);
    },
    [sendText],
  );

  const onCancel = useCallback(async () => {
    abortRef.current?.abort();
    setIsRunning(false);
  }, []);

  const runtimeMessages = useMemo(
    () =>
      messages.map((message): ThreadMessageLike => ({
        id: message.id,
        role: message.role,
        content: [{ type: "text", text: message.content }],
      })),
    [messages],
  );

  const runtime = useExternalStoreRuntime({
    messages: runtimeMessages,
    isRunning,
    convertMessage: (message) => message,
    onNew,
    onCancel,
  });

  const resetChat = () => {
    abortRef.current?.abort();
    setSessionId(null);
    setMessages([]);
    setInsight(null);
    setResearchStatus("conversation");
    setResearchContext({});
    setError(null);
    setShowHints(false);
    setShowInsights(false);
    setIsRunning(false);
  };

  const runResearch = useCallback(
    async (force = false) => {
      if (!sessionId || isRunning) return;
      setError(null);
      setIsRunning(true);
      setResearchStatus("research_running");
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const result = await runDemandDiscoveryResearch(sessionId, { locale, force }, controller.signal);
        setInsight(result.session.insight);
        setResearchStatus(result.session.research_status);
        setResearchContext(result.session.research_context);
        setMessages(
          result.session.messages.map((message, index) => ({
            ...message,
            id: `${result.session.id}-${index}`,
          })),
        );
      } catch (caught) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setResearchStatus("research_failed");
        setError(caught instanceof Error ? caught.message : t("demandDiscovery.researchFailed"));
      } finally {
        abortRef.current = null;
        setIsRunning(false);
      }
    },
    [isRunning, locale, sessionId, t],
  );

  return (
    <div className="relative -m-6 flex min-h-[calc(100vh-4rem)] flex-col bg-background">
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">{t("demandDiscovery.title")}</h1>
            <p className="truncate text-xs text-muted-foreground">{t("demandDiscovery.chatSubtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={resetChat} size="sm" variant="ghost">
            <Plus className="mr-2 h-4 w-4" />
            {t("demandDiscovery.newChat")}
          </Button>
          <Button onClick={() => setShowInsights((current) => !current)} size="icon" variant="ghost" aria-label={t("demandDiscovery.insightPanel")}>
            <PanelRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AssistantRuntimeProvider runtime={runtime}>
        <AssistantThread
          error={error}
          insight={insight}
          isRunning={isRunning}
          onPrompt={sendText}
          onResearch={runResearch}
          researchContext={researchContext}
          researchStatus={researchStatus}
          onToggleHints={() => setShowHints((current) => !current)}
          showHints={showHints}
        />
      </AssistantRuntimeProvider>

      {showInsights ? <InsightDrawer insight={insight} onClose={() => setShowInsights(false)} /> : null}
    </div>
  );
}

function AssistantThread({
  error,
  insight,
  isRunning,
  onPrompt,
  onResearch,
  researchContext,
  researchStatus,
  onToggleHints,
  showHints,
}: {
  error: string | null;
  insight: DemandDiscoveryInsight | null;
  isRunning: boolean;
  onPrompt: (prompt: string) => void;
  onResearch: (force?: boolean) => void;
  researchContext: DemandResearchContext;
  researchStatus: DemandResearchStatus;
  onToggleHints: () => void;
  showHints: boolean;
}) {
  const { t } = useI18n();

  return (
    <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
      <ThreadPrimitive.Viewport className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <ThreadPrimitive.Empty>
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 pb-20 pt-12 text-center">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-semibold tracking-normal">{t("demandDiscovery.welcomeTitle")}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{t("demandDiscovery.welcomeBody")}</p>
          </div>
        </ThreadPrimitive.Empty>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pb-32 pt-6">
          <ThreadPrimitive.Messages>{() => <ThreadMessage />}</ThreadPrimitive.Messages>
          {isRunning ? (
            <div className="flex items-center gap-2 px-1 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("demandDiscovery.thinking")}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {insight ? <CompactInsight insight={insight} /> : null}
          {researchStatus !== "conversation" ? (
            <ResearchPanel
              context={researchContext}
              disabled={isRunning}
              onResearch={onResearch}
              status={researchStatus}
            />
          ) : null}
        </div>

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 z-10 bg-background px-3 pb-4 pt-2">
          <div className="mx-auto w-full max-w-3xl">
            {showHints ? <PromptExamples disabled={isRunning} onPrompt={onPrompt} onClose={onToggleHints} /> : null}
            <Composer isRunning={isRunning} onToggleHints={onToggleHints} />
            <p className="mt-2 text-center text-xs text-muted-foreground">{t("demandDiscovery.footerNote")}</p>
          </div>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function ThreadMessage() {
  const role = useAuiState((state) => state.message.role);
  const isUser = role === "user";

  return (
    <MessagePrimitive.Root className={cn("group flex w-full gap-4", isUser && "justify-end")}>
      {!isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
          <Bot className="h-4 w-4" />
        </div>
      ) : null}
      <div className={cn("max-w-[88%] space-y-2", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "text-sm leading-7",
            isUser
              ? "rounded-3xl bg-muted px-4 py-2 text-foreground"
              : "min-h-8 px-0 py-1 text-foreground",
          )}
        >
          <MessagePrimitive.Parts />
        </div>
        <ActionBarPrimitive.Root className={cn("flex gap-1 opacity-0 transition-opacity group-hover:opacity-100", isUser && "justify-end")}>
          <ActionBarPrimitive.Copy asChild>
            <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" type="button" aria-label="Copy">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </ActionBarPrimitive.Copy>
        </ActionBarPrimitive.Root>
      </div>
      {isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserRound className="h-4 w-4" />
        </div>
      ) : null}
    </MessagePrimitive.Root>
  );
}

function Composer({ isRunning, onToggleHints }: { isRunning: boolean; onToggleHints: () => void }) {
  const { t } = useI18n();

  return (
    <ComposerPrimitive.Root className="flex w-full items-end gap-2 rounded-[28px] border border-border bg-card p-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
      <button
        className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        onClick={onToggleHints}
        type="button"
        aria-label={t("demandDiscovery.showPromptExamples")}
      >
        <HelpCircle className="h-5 w-5" />
      </button>
      <ComposerPrimitive.Input
        className="max-h-52 min-h-11 flex-1 resize-none bg-transparent px-1 py-3 text-sm leading-6 outline-none placeholder:text-muted-foreground"
        placeholder={t("demandDiscovery.placeholder")}
        submitMode="enter"
      />
      {isRunning ? (
        <ComposerPrimitive.Cancel asChild>
          <Button aria-label={t("demandDiscovery.stop")} className="mb-0.5 rounded-full" size="icon" type="button" variant="outline">
            <Square className="h-4 w-4" />
          </Button>
        </ComposerPrimitive.Cancel>
      ) : (
        <ComposerPrimitive.Send asChild>
          <Button aria-label={t("common.send")} className="mb-0.5 rounded-full" size="icon" type="submit">
            <Send className="h-4 w-4" />
          </Button>
        </ComposerPrimitive.Send>
      )}
    </ComposerPrimitive.Root>
  );
}

function PromptExamples({
  disabled,
  onClose,
  onPrompt,
}: {
  disabled: boolean;
  onClose: () => void;
  onPrompt: (prompt: string) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="mb-3 rounded-2xl border border-border bg-card p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <HelpCircle className="h-4 w-4" />
          {t("demandDiscovery.promptExamples")}
        </div>
        <button className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={onClose} type="button" aria-label={t("common.closeNavigation")}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {starterPromptKeys.map((key) => {
          const prompt = t(key);
          return (
            <button
              className="rounded-xl border border-border bg-background p-3 text-left text-xs leading-5 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled}
              key={key}
              onClick={() => onPrompt(prompt)}
              type="button"
            >
              {prompt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompactInsight({ insight }: { insight: DemandDiscoveryInsight }) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-border bg-card p-4 text-sm">
      <div className="mb-2 flex items-center gap-2 font-medium">
        <Sparkles className="h-4 w-4" />
        {t("demandDiscovery.insightPanel")}
      </div>
      <p className="leading-6 text-muted-foreground">{insight.summary}</p>
    </div>
  );
}

function ResearchPanel({
  context,
  disabled,
  onResearch,
  status,
}: {
  context: DemandResearchContext;
  disabled: boolean;
  onResearch: (force?: boolean) => void;
  status: DemandResearchStatus;
}) {
  const { t } = useI18n();
  const clusters = context.top_pain_clusters ?? [];
  const hasResearch = status === "research_completed" && Boolean(context.run_id);
  const sourceKind = context.source_kind ?? "none";
  const sourceStatus = context.source_status as { failed_count?: number; skipped_count?: number } | undefined;

  return (
    <section className="rounded-2xl border border-border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-medium">
            <Search className="h-4 w-4" />
            {t("demandDiscovery.researchTitle")}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t(`demandDiscovery.researchStatus.${status}`)}
          </p>
        </div>
        {hasResearch ? (
          <Button disabled={disabled} onClick={() => onResearch(true)} size="sm" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("demandDiscovery.rerunResearch")}
          </Button>
        ) : (
          <Button
            disabled={disabled || status === "clarification_required" || status === "research_running"}
            onClick={() => onResearch(false)}
            size="sm"
          >
            {status === "research_running" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            {t("demandDiscovery.runResearch")} · 50 credits
          </Button>
        )}
      </div>

      {hasResearch ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-md border border-border px-2 py-1">
              {t("demandDiscovery.sourceType")}: {t(`demandDiscovery.sourceKind.${sourceKind}`)}
            </span>
            <span className="rounded-md border border-border px-2 py-1">
              {t("demandDiscovery.sourceCount")}: {context.source_count ?? 0}
            </span>
            <span className="rounded-md border border-border px-2 py-1">
              {t("demandDiscovery.signalCount")}: {context.signal_count ?? 0}
            </span>
          </div>
          {(sourceStatus?.failed_count ?? 0) > 0 || (sourceStatus?.skipped_count ?? 0) > 0 ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {t("demandDiscovery.sourceWarning")}
            </p>
          ) : null}

          {clusters.slice(0, 3).map((cluster, index) => (
            <div className="rounded-lg bg-muted p-3" key={cluster.id ?? `${cluster.name}-${index}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{cluster.name || t("demandDiscovery.unknownPain")}</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>{t("demandDiscovery.demandScore")}: {Math.round(cluster.demand_signal_score ?? 0)}</span>
                  <span>{t("demandDiscovery.validationScore")}: {Math.round(cluster.validation_score ?? 0)}</span>
                </div>
              </div>
              {cluster.representative_quotes?.[0] ? (
                <p className="mt-2 leading-6 text-muted-foreground">{cluster.representative_quotes[0]}</p>
              ) : null}
            </div>
          ))}

          {(context.evidence ?? []).filter((item) => item.url && !item.synthetic).slice(0, 4).length ? (
            <div>
              <p className="mb-2 font-medium">{t("demandDiscovery.evidenceLinks")}</p>
              <div className="space-y-2">
                {(context.evidence ?? []).filter((item) => item.url && !item.synthetic).slice(0, 4).map((item, index) => (
                  <a
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
                    href={item.url ?? "#"}
                    key={`${item.url}-${index}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span className="truncate">{item.title || item.source_name || item.url}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function InsightDrawer({ insight, onClose }: { insight: DemandDiscoveryInsight | null; onClose: () => void }) {
  const { t } = useI18n();

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
      <div className="flex h-14 items-center justify-between border-b border-border px-4">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4 w-4" />
          {t("demandDiscovery.insightPanel")}
        </div>
        <button className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground" onClick={onClose} type="button" aria-label={t("common.closeNavigation")}>
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {!insight ? (
          <p className="text-sm leading-6 text-muted-foreground">{t("demandDiscovery.insightEmpty")}</p>
        ) : (
          <>
            <InsightSection title={t("demandDiscovery.summary")} items={[insight.summary]} />
            <InsightSection title={t("demandDiscovery.marketSignals")} items={insight.marketSignals} />
            <InsightSection title={t("demandDiscovery.competitors")} items={insight.competitors} />
            <InsightSection title={t("demandDiscovery.opportunity")} items={[insight.opportunity]} />
            <InsightSection title={t("demandDiscovery.risks")} items={insight.risks} />
            <InsightSection title={t("demandDiscovery.direction")} items={[insight.suggestedDirection]} />
            <InsightSection title={t("demandDiscovery.nextActions")} items={insight.nextActions} />
          </>
        )}
      </div>
    </div>
  );
}

function InsightSection({ items, title }: { items: string[]; title: string }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li className="rounded-xl bg-muted px-3 py-2 leading-6" key={`${title}-${index}`}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
