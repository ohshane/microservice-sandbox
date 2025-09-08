"use client";

import React, { useCallback, useEffect, useState } from "react";
import { listConversations } from "@/services/chat";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useChatListContext } from '@/context/chat';

// Shape used by the UI. We only rely on id/title/updated_at to keep it robust.
type Conversation = {
  id: string;
  title?: string | null;
  updated_at?: string | null;
};

interface Props {
  selectedConversationId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
}

/**
 * ConversationList
 * - Fetches conversations via services/chat.getConversation()
 * - Renders them as a vertical list of buttons
 * - Safe against varying API shapes to avoid `.map` on undefined
 */
export default function ConversationList({
  selectedConversationId,
  className,
}: Props) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const { version } = useChatListContext();
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listConversations();
    if (!res.ok) {
      throw new Error(`Failed to load conversations: ${res.statusText}`);
    }
    const list: Conversation[] = (await res.json()).data;
    setConversations(list);
  }, []);

  useEffect(() => {
    load();
  }, [load, version]);

  return (
    <nav
      aria-label="Conversation list"
      className={
        `flex-1 min-h-0 overflow-y-auto px-2 pr-3 pb-2 ${className ?? ""}`
      }
      style={{ scrollbarGutter: "stable" }}
    >
      <ul className="space-y-1 text-sm">
        {conversations.length === 0 && !loading && !error && (
          <li className="py-3 text-black/50">No conversations yet.</li>
        )}
        {conversations.map((conv) => {
          const isActive = conv.id === (selectedConversationId ?? "");
          const title = conv.title?.trim() || "(new conversation)";
          return (
            <li key={conv.id}>
              <button
                type="button"
                onClick={() => router.push(`/chat/${conv.id}`)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  router.push(`/chat/${conv.id}`);
                }}
                className={
                  `w-full truncate rounded-md px-3 py-2 text-left cursor-pointer ` +
                  `hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/20 ` +
                  (isActive ? "bg-black/5" : "")
                }
              >
                {title}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}