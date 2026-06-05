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
import { Bot, Copy, Lightbulb, Loader2, Plus, Send, Sparkles, Square, UserRound } from "lucide-react";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/hooks/use-i18n";
import {
  createDemandDiscoverySession,
  sendDemandDiscoveryMessage,
  type DemandDiscoveryInsight,
  type DemandDiscoveryMessage,
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
  const { t } = useI18n();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [insight, setInsight] = useState<DemandDiscoveryInsight | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setIsRunning(true);
      setMessages((current) => [...current, userMessage]);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const result = sessionId
          ? await sendDemandDiscoveryMessage(sessionId, trimmed, controller.signal)
          : await createDemandDiscoverySession(trimmed, controller.signal);

        setSessionId(result.id);
        setInsight(result.insight);
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
    [isRunning, sessionId, t],
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
    setError(null);
    setIsRunning(false);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title={t("demandDiscovery.title")}
        description={t("demandDiscovery.description")}
        action={
          <Button onClick={resetChat} variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            {t("demandDiscovery.newChat")}
          </Button>
        }
      />

      <div className="grid min-h-[calc(100vh-12rem)] gap-6 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <PromptPanel disabled={isRunning} onPrompt={sendText} />

        <Card className="overflow-hidden">
          <AssistantRuntimeProvider runtime={runtime}>
            <AssistantThread error={error} isRunning={isRunning} />
          </AssistantRuntimeProvider>
        </Card>

        <InsightPanel insight={insight} />
      </div>
    </div>
  );
}

function PromptPanel({ disabled, onPrompt }: { disabled: boolean; onPrompt: (prompt: string) => void }) {
  const { t } = useI18n();

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4" />
          {t("demandDiscovery.starters")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {starterPromptKeys.map((key) => {
          const prompt = t(key);
          return (
            <button
              className="w-full rounded-md border border-border p-3 text-left text-sm leading-6 transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              disabled={disabled}
              key={key}
              onClick={() => onPrompt(prompt)}
              type="button"
            >
              {prompt}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AssistantThread({ error, isRunning }: { error: string | null; isRunning: boolean }) {
  const { t } = useI18n();

  return (
    <ThreadPrimitive.Root className="flex h-full min-h-[680px] flex-col bg-background">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto">
        <ThreadPrimitive.Empty>
          <div className="mx-auto flex max-w-2xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <div className="rounded-md bg-primary/10 p-3 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold">{t("demandDiscovery.welcomeTitle")}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t("demandDiscovery.welcomeBody")}</p>
          </div>
        </ThreadPrimitive.Empty>

        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
          <ThreadPrimitive.Messages>{() => <ThreadMessage />}</ThreadPrimitive.Messages>
          {isRunning ? (
            <div className="flex items-center gap-2 self-start rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("demandDiscovery.thinking")}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
        </div>

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 border-t border-border bg-background/95 px-4 py-4 backdrop-blur">
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function ThreadMessage() {
  const role = useAuiState((state) => state.message.role);
  const isUser = role === "user";

  return (
    <MessagePrimitive.Root className={cn("group flex w-full gap-3", isUser && "justify-end")}>
      {!isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </div>
      ) : null}
      <div className={cn("max-w-[82%] space-y-2", isUser && "flex flex-col items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm leading-6",
            isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          )}
        >
          <MessagePrimitive.Parts />
        </div>
        <ActionBarPrimitive.Root className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <ActionBarPrimitive.Copy asChild>
            <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground" type="button">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </ActionBarPrimitive.Copy>
        </ActionBarPrimitive.Root>
      </div>
      {isUser ? (
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <UserRound className="h-4 w-4" />
        </div>
      ) : null}
    </MessagePrimitive.Root>
  );
}

function Composer() {
  const { t } = useI18n();

  return (
    <ComposerPrimitive.Root className="mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
      <ComposerPrimitive.Input
        className="max-h-48 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
        placeholder={t("demandDiscovery.placeholder")}
        submitMode="enter"
      />
      <ComposerPrimitive.Cancel asChild>
        <Button aria-label={t("demandDiscovery.stop")} size="icon" type="button" variant="outline">
          <Square className="h-4 w-4" />
        </Button>
      </ComposerPrimitive.Cancel>
      <ComposerPrimitive.Send asChild>
        <Button aria-label={t("common.send")} size="icon" type="submit">
          <Send className="h-4 w-4" />
        </Button>
      </ComposerPrimitive.Send>
    </ComposerPrimitive.Root>
  );
}

function InsightPanel({ insight }: { insight: DemandDiscoveryInsight | null }) {
  const { t } = useI18n();

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          {t("demandDiscovery.insightPanel")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
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
      </CardContent>
    </Card>
  );
}

function InsightSection({ items, title }: { items: string[]; title: string }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li className="rounded-md bg-muted px-3 py-2 leading-6" key={`${title}-${index}`}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
