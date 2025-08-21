"use client"

import { useRouter } from "next/navigation";
import { getConversation } from "@/services/chat";
import React, { useEffect } from "react";

type RouteParams = { conversationId?: string };

export default function ChatLayout(
  { children, params }: { children: React.ReactNode; params: Promise<RouteParams> }
) {
  const router = useRouter();
  const { conversationId } = React.use(params);

  useEffect(() => {
    if (!conversationId) {
      router.push("/chat");
      return;
    }

    let cancelled = false;

    const fetchConversation = async () => {
      try {
        const res = await getConversation(conversationId);
        if (cancelled) return;
        if (res.status === 404) {
          router.push("/chat");
        }
      } catch {

      }
    };

    fetchConversation();

    return () => {
      cancelled = true;
    };
  }, [conversationId, router]);

  return <>{children}</>;
}