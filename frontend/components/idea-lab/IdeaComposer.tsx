"use client";

import { Send } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function IdeaComposer({ isSending, onSend }: { isSending: boolean; onSend: (message: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="grid gap-2">
      <textarea
        className="min-h-24 rounded-md border border-input bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onChange={(event) => setValue(event.target.value)}
        placeholder="こういうツールを作ろうと思う..."
        value={value}
      />
      <div className="flex justify-end">
        <Button
          disabled={isSending || !value.trim()}
          onClick={() => {
            onSend(value.trim());
            setValue("");
          }}
        >
          <Send className="mr-2 h-4 w-4" />
          Send
        </Button>
      </div>
    </div>
  );
}
