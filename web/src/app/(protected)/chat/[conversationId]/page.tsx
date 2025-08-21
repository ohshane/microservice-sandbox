"use client";

import React, { useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Navigation from '@/components/main/navigation';
import { getConversation } from '@/services/chat';
import Chat from '@/components/chat';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;
  const [text, setText] = React.useState("");

  return (
    <div className="h-screen w-full flex bg-white text-black">
      {/* Navigation / Conversation list */}
        <div className="h-full flex flex-col">
          <Navigation />
        </div>

      {/* New Chat Pane */}
      <main className="flex-1 min-w-0 flex flex-col max-w-3xl mx-auto w-full">
        <Chat messages={[]} conversationId={conversationId} />
      </main>
    </div>
  );
}