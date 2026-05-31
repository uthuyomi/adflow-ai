"use client";

import type { IdeaMessage } from "@/lib/types/adflow";
import { cn } from "@/lib/utils";

export function IdeaThread({ messages }: { messages: IdeaMessage[] }) {
  return (
    <div className="flex min-h-[520px] flex-col gap-3 overflow-y-auto rounded-md border border-border bg-card p-4">
      {messages.length ? messages.map((message) => (
        <div
          className={cn(
            "max-w-[86%] rounded-md border border-border p-3 text-sm leading-6",
            message.role === "user" ? "self-end bg-primary text-primary-foreground" : "self-start bg-background",
          )}
          key={message.id}
        >
          {message.content}
        </div>
      )) : (
        <div className="m-auto max-w-md text-center text-sm leading-6 text-muted-foreground">
          Type a rough idea. Idea Lab will structure the problem, target user, solution, market, and monetization.
        </div>
      )}
    </div>
  );
}
