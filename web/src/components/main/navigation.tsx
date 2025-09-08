"use client";

import React, { useState } from "react";
import { MenuIcon, MessageCircle } from "lucide-react";
import ConversationList from './conversationList';
import { useRouter } from "next/navigation";

export type NavigationProps = {
  onSelectConversation?: (id: string) => void;
  selectedConversationId?: string | null;
  refreshKey?: React.Key;
};

export default function Navigation() {
  const [activeTab, setActiveTab] = useState<string | null>("chat");
  const router = useRouter();

  return (
    <div className="flex h-screen">
      <aside className="flex flex-col w-14 bg-white border-r border-black/10">
        {/* Chat */}
        <div
          className="flex items-center justify-center p-3 cursor-pointer transition-transform active:scale-95 py-4"
          onClick={() => setActiveTab((t) => (t === "chat" ? null : "chat"))}
          aria-label="Chat"
          title="Chat"
          aria-pressed={activeTab === "chat"}
        >
          <MenuIcon className="w-5 h-5" />
        </div>
      </aside>

      {/* Right side panel with slide animation */}
      <div
        className={`relative overflow-y-scroll transition-all duration-200 ${
          activeTab === "chat" ? "w-64 border-r border-black/10" : "w-0 border-r-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-2 border-b border-black/10">
            <button
              type="button"
              onClick={() => {
                router.push("/chat");
              }}
              className="w-full truncate rounded-md border border-black/10 px-3 py-2 text-left text-sm cursor-pointer hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black/20"
            >
              + New Chat
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto py-2">
            <ConversationList />
          </div>
        </div>
      </div>
    </div>
  );
}