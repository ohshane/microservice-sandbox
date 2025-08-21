"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import Navigation from '@/components/main/navigation';
import { prepareConversation } from '@/services/chat';
import { v4 as uuidv4 } from 'uuid';

export default function ChatPage() {
  const router = useRouter();
  const [text, setText] = React.useState("");

  const startNew = useCallback(async () => {
    const message = text.trim();
    const conversationId = uuidv4();
    const res = await prepareConversation(conversationId, [{role: "user", content: message}]);
    if (!res.ok) {
      throw new Error(`Failed to prepare conversation: ${res.statusText}`);
    }


    router.push(`/chat/${conversationId}`);
    setText("");
  }, [router, text]);

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && text.trim()) {
      startNew();
    }
  };

  return (
    <div className="h-screen w-full flex bg-white text-black">
      {/* Navigation / Conversation list */}
        <div className="h-full flex flex-col">
          <Navigation />
        </div>

      {/* New Chat Pane */}
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold">Start a new conversation</h1>
              <p className="mt-2 text-sm text-black/60">Ask me anything. Press Enter to send.</p>
            </div>
            <div className="border border-black/10 rounded-xl p-3">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type a message…"
                className="w-full outline-none text-base placeholder-black/40"
                autoFocus
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}