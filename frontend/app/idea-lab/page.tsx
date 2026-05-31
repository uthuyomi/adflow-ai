"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { IdeaBacklogPanel } from "@/components/idea-lab/IdeaBacklogPanel";
import { IdeaCompareDialog } from "@/components/idea-lab/IdeaCompareDialog";
import { IdeaComposer } from "@/components/idea-lab/IdeaComposer";
import { IdeaDiscoveryDialog } from "@/components/idea-lab/IdeaDiscoveryDialog";
import { IdeaIntelligencePanel } from "@/components/idea-lab/IdeaIntelligencePanel";
import { IdeaMonitoringPanel } from "@/components/idea-lab/IdeaMonitoringPanel";
import { IdeaRoadmapPanel } from "@/components/idea-lab/IdeaRoadmapPanel";
import { IdeaSidebar } from "@/components/idea-lab/IdeaSidebar";
import { IdeaThread } from "@/components/idea-lab/IdeaThread";
import { ErrorState } from "@/components/shared/ErrorState";
import { PageSkeleton } from "@/components/shared/PageSkeleton";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { convertIdeaToProduct } from "@/lib/api/client";
import { useIdeaBacklog } from "@/hooks/use-idea-backlog";
import { useIdeaChat, useIdeaMessages } from "@/hooks/use-idea-chat";
import { useIdeaCompare } from "@/hooks/use-idea-compare";
import { useIdeaDiscovery } from "@/hooks/use-idea-discovery";
import { useIdeaMonitoring, useRunIdeaMonitoring } from "@/hooks/use-idea-monitoring";
import { useIdeaReview, useRunIdeaReview } from "@/hooks/use-idea-review";
import { useIdeaRoadmap } from "@/hooks/use-idea-roadmap";
import { useCreateIdeaSession, useIdeaSession, useIdeaSessions } from "@/hooks/use-idea-session";

export default function IdeaLabPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sessions = useIdeaSessions();
  const createSession = useCreateIdeaSession();
  const session = useIdeaSession(selectedId);
  const messages = useIdeaMessages(selectedId);
  const chat = useIdeaChat();
  const review = useIdeaReview(selectedId);
  const runReview = useRunIdeaReview(selectedId);
  const backlog = useIdeaBacklog(selectedId);
  const roadmap = useIdeaRoadmap(selectedId);
  const monitoring = useIdeaMonitoring(selectedId);
  const runMonitoring = useRunIdeaMonitoring(selectedId);
  const discovery = useIdeaDiscovery();
  const compare = useIdeaCompare();
  const [isConverting, setIsConverting] = useState(false);

  const currentSessionId = selectedId ?? sessions.data?.[0]?.id ?? null;

  useEffect(() => {
    if (!selectedId && currentSessionId) {
      setSelectedId(currentSessionId);
    }
  }, [currentSessionId, selectedId]);

  if (sessions.isLoading) return <PageSkeleton />;
  if (sessions.isError) return <ErrorState />;

  const current = session.data;
  const currentReview = review.data ?? current?.latest_review ?? null;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Idea Lab"
        description="Chat through rough ideas, gather evidence, score opportunities, generate MVP scope, and convert validated ideas into Product Review."
      />
      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
        <IdeaSidebar
          isCreating={createSession.isPending}
          onCreate={async () => {
            try {
              const created = await createSession.mutateAsync({ title: "Untitled idea" });
              setSelectedId(created.id);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Session creation failed.");
            }
          }}
          onSelect={setSelectedId}
          selectedId={selectedId}
          sessions={sessions.data ?? []}
        />
        <main className="grid gap-3">
          <IdeaThread messages={messages.data ?? []} />
          <IdeaComposer
            isSending={chat.isPending}
            onSend={async (message) => {
              try {
                const result = await chat.mutateAsync({ session_id: selectedId, message });
                setSelectedId(result.session.id);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Message failed.");
              }
            }}
          />
        </main>
        <aside>
          <IdeaIntelligencePanel
            isConverting={isConverting}
            isReviewing={runReview.isPending}
            onConvert={async () => {
              if (!selectedId) return;
              try {
                setIsConverting(true);
                await convertIdeaToProduct({ session_id: selectedId });
                toast.success("Idea converted to Product Profile.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Conversion failed.");
              } finally {
                setIsConverting(false);
              }
            }}
            onReview={async () => {
              try {
                await runReview.mutateAsync(100);
                toast.success("Idea review completed.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Idea review failed.");
              }
            }}
            profile={current?.profile}
            review={currentReview}
          />
        </aside>
      </div>
      <Tabs defaultValue="backlog">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="backlog">Backlog</TabsTrigger>
          <TabsTrigger value="roadmap">Roadmap</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="discover">Discovery</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
        </TabsList>
        <TabsContent value="backlog">
          <IdeaBacklogPanel items={backlog.data ?? []} />
        </TabsContent>
        <TabsContent value="roadmap">
          <IdeaRoadmapPanel roadmap={roadmap.data ?? current?.roadmap} />
        </TabsContent>
        <TabsContent value="monitoring">
          <IdeaMonitoringPanel
            isRunning={runMonitoring.isPending}
            onRun={async (payload) => {
              try {
                await runMonitoring.mutateAsync(payload);
                toast.success("Idea monitoring completed.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Monitoring failed.");
              }
            }}
            runs={monitoring.data ?? []}
          />
        </TabsContent>
        <TabsContent value="discover">
          <IdeaDiscoveryDialog
            isDiscovering={discovery.isPending}
            onDiscover={(query) => discovery.mutate({ query })}
            result={discovery.data}
          />
        </TabsContent>
        <TabsContent value="compare">
          <IdeaCompareDialog
            isComparing={compare.isPending}
            onCompare={(ideas) => compare.mutate({ ideas })}
            result={compare.data}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
