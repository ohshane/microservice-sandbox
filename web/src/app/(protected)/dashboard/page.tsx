"use client";

import Header from "@/components/header";
import Chat from "@/components/chat";

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-dvh bg-white text-black selection:bg-black/80 selection:text-white">
      <Header />
      <div className="flex-1 min-h-0 mx-auto w-full max-w-7xl px-4 md:px-6 py-4">
        <div className="flex h-full min-h-0 overflow-hidden rounded-2xl border border-black/10 bg-white/70 shadow-sm">
          <Chat />
        </div>
      </div>
    </div>
  );
}