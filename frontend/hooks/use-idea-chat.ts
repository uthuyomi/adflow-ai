"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { listIdeaMessages, sendIdeaChat } from "@/lib/api/client";

export function useIdeaMessages(sessionId: string | null) {
  return useQuery({
    queryKey: ["idea-lab", "messages", sessionId],
    queryFn: () => listIdeaMessages(sessionId ?? ""),
    enabled: Boolean(sessionId),
  });
}

export function useIdeaChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendIdeaChat,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["idea-lab", "sessions"] });
      queryClient.invalidateQueries({ queryKey: ["idea-lab", "session", data.session.id] });
      queryClient.invalidateQueries({ queryKey: ["idea-lab", "messages", data.session.id] });
    },
  });
}
