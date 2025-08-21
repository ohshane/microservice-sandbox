import type { Message } from "@/types";
import { API_URL } from "@/config";

export async function listConversations() {
  return await fetch(`${API_URL}/api/v1/conversation/list`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });
}

export async function getConversation(conversationId: string) {
  return await fetch(`${API_URL}/api/v1/conversation/list/${conversationId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });
}

export async function prepareConversation(
  conversationId: string,
  messages: Message[] = []
) {
  return await fetch(`${API_URL}/api/v1/conversation/prepare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      conversation_id: conversationId,
      messages,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
    }),
  });
}
