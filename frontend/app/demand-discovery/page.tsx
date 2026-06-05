"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Lightbulb, Loader2, Send, Sparkles } from "lucide-react";

import { SectionHeader } from "@/components/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { analyzeDemandDiscovery, type DemandDiscoveryInsight, type DemandDiscoveryMessage } from "@/lib/api/product";

const starterPrompts = [
  "このアプリ案は作る価値がありますか？",
  "競合が多いなら、どの方向にずらすべきですか？",
  "広告訴求とLP構成を考えてください。",
];

export default function DemandDiscoveryPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DemandDiscoveryMessage[]>([
    {
      role: "assistant",
      content: "アプリ案、サービス案、広告案、LP案を相談してください。需要、競合、市場ギャップ、方向性を整理します。",
    },
  ]);
  const [insight, setInsight] = useState<DemandDiscoveryInsight | null>(null);

  const analyze = useMutation({
    mutationFn: analyzeDemandDiscovery,
    onSuccess: (result) => {
      setMessages((current) => [...current, { role: "assistant", content: result.assistant_message }]);
      setInsight(result.insight);
    },
  });

  const submit = async (value = input) => {
    const trimmed = value.trim();
    if (!trimmed || analyze.isPending) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", content: trimmed }]);
    await analyze.mutateAsync(trimmed);
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Demand Discovery"
        description="チャットでアイデアや訴求を相談し、需要シグナル、競合ギャップ、推奨方向性を整理します。"
      />

      <div className="grid gap-6 xl:grid-cols-[260px_1fr_360px]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {starterPrompts.map((prompt) => (
              <button
                className="w-full rounded-md border border-border p-3 text-left text-sm transition-colors hover:bg-accent"
                disabled={analyze.isPending}
                key={prompt}
                onClick={() => submit(prompt)}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="min-h-[620px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Assistant Chat
            </CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-[520px] flex-col gap-4">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-md border border-border bg-background p-4">
              {messages.map((message, index) => (
                <div
                  className={message.role === "user" ? "ml-auto max-w-[82%] rounded-md bg-primary p-3 text-sm text-primary-foreground" : "mr-auto max-w-[82%] rounded-md bg-muted p-3 text-sm"}
                  key={`${message.role}-${index}`}
                >
                  {message.content}
                </div>
              ))}
              {analyze.isPending ? (
                <div className="mr-auto flex max-w-[82%] items-center gap-2 rounded-md bg-muted p-3 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing demand signals...
                </div>
              ) : null}
              {analyze.isError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                  {analyze.error instanceof Error ? analyze.error.message : "Demand Discovery failed."}
                </div>
              ) : null}
            </div>
            <div className="flex flex-col gap-2">
              <Textarea
                onChange={(event) => setInput(event.target.value)}
                placeholder="例: 中小企業向けに広告とLP改善を自動化するSaaSを作りたい"
                value={input}
              />
              <div className="flex justify-end">
                <Button disabled={!input.trim() || analyze.isPending} onClick={() => submit()}>
                  {analyze.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <InsightPanel insight={insight} />
      </div>
    </div>
  );
}

function InsightPanel({ insight }: { insight: DemandDiscoveryInsight | null }) {
  if (!insight) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Insight Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-6 text-muted-foreground">
          チャットを送信すると、Idea Summary、Market Signals、Competitor Gaps、Risk Factors、Next Actions がここに表示されます。
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Insight Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Section title="Idea Summary" items={[insight.summary]} />
        <Section title="Market Signals" items={insight.marketSignals} />
        <Section title="Competitors" items={insight.competitors} />
        <Section title="Opportunity" items={[insight.opportunity]} />
        <Section title="Risk Factors" items={insight.risks} />
        <Section title="Suggested Direction" items={[insight.suggestedDirection]} />
        <Section title="Next Actions" items={insight.nextActions} />
      </CardContent>
    </Card>
  );
}

function Section({ items, title }: { items: string[]; title: string }) {
  return (
    <div>
      <div className="text-sm font-semibold">{title}</div>
      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li className="rounded-md bg-muted px-3 py-2" key={`${title}-${index}`}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
