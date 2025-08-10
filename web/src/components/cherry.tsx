

"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import Chat from "./chat";

/**
 * Cherry: a tiny toggle that shows/hides the Chat UI.
 * Renders a floating button (bottom-right). Clicking it opens a chat panel.
 */
export default function Cherry() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Close with ESC when panel is open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-rose-400 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:opacity-90 active:scale-95 dark:bg-rose-400 dark:text-white"
        aria-expanded={open}
        aria-controls="cherry-chat"
      >
        <span className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          {open ? "Close" : "Ask Cherry"}
        </span>
      </button>

      {open && (
        <div
          id="cherry-chat"
          className="fixed bottom-20 right-4 z-50 h-[60vh] w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl dark:border-white/10 dark:bg-black"
          role="dialog"
          aria-label="Cherry chat"
        >
          <Chat className="h-full" />
        </div>
      )}
    </>
  );
}