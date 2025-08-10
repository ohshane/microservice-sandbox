

"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type Role = "system" | "user" | "assistant" | "tool";

export interface Message {
  id: string;
  role: Role;
  content: string;
}

export interface ChatProps {
  /** HTTP endpoint that accepts { messages, model?, system?, stream?: true } and returns a streamed text body */
  endpoint?: string;
  /** Optional static headers (e.g., Authorization) */
  headers?: Record<string, string>;
  /** Model hint passed to the endpoint */
  model?: string;
  /** System prompt prepended to the conversation */
  system?: string;
  /** Initial messages to seed the chat */
  initialMessages?: Message[];
  /** ClassName for outer container */
  className?: string;
}

/**
 * Minimal, framework-agnostic LLM chat component with streaming support.
 *
 * Backend contract (simple): POST endpoint with JSON body
 *   { messages: Message[], model?: string, system?: string, stream?: true }
 * Should respond with streamed UTF-8 text (incremental tokens). If your server uses
 * Server-Sent Events, adapt the reader to parse `data:` lines.
 */
export default function Chat({
  endpoint = "/api/chat",
  headers,
  model,
  system,
  initialMessages = [],
  className,
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(() => initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [controller, setController] = useState<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !pending, [input, pending]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function handleSend() {
    const text = input.trim();
    if (!text || pending) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "" };

    const body: any = {
      messages: [
        ...(system ? [{ id: "system", role: "system", content: system } as Message] : []),
        ...messages,
        userMsg,
      ],
      model,
      stream: true,
    };

    setMessages((m) => [...m, userMsg, assistantMsg]);
    setInput("");
    setPending(true);

    const ctrl = new AbortController();
    setController(ctrl);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(headers || {}),
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const chunk = await reader.read();
        done = chunk.done || false;
        const text = decoder.decode(chunk.value || new Uint8Array(), { stream: !done });
        if (text) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: m.content + text } : m))
          );
        }
      }
    } catch (err) {
      console.error("chat error", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.role === "assistant" && m.content === "" ? { ...m, content: "⚠️ Generation stopped." } : m
        )
      );
    } finally {
      setPending(false);
      setController(null);
    }
  }

  function handleStop() {
    controller?.abort();
  }

  return (
    <div className={clsx("flex h-full w-full flex-col", className)}>
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-sm text-black/60 dark:text-white/60">Start a conversation.</div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role}>
            {m.content}
          </Bubble>
        ))}
        {pending && (
          <Bubble role="assistant">
            <span className="inline-flex items-center gap-2">
              <Dot />
              <Dot />
              <Dot />
            </span>
          </Bubble>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-black/10 p-3 dark:border-white/10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Cherry..."
            className="min-h-[44px] max-h-40 flex-1 resize-y rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:border-white/10 dark:focus:ring-white/20"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          {!pending ? (
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow transition enabled:active:scale-95 enabled:hover:opacity-90 disabled:opacity-50 dark:bg-white dark:text-black"
            >
              Send
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStop}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium shadow hover:bg-black/5 active:scale-95 dark:border-white/10 dark:hover:bg-white/10"
            >
              Stop
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function Bubble({ role, children }: { role: Role; children: React.ReactNode }) {
  const isUser = role === "user";
  const isAssistant = role === "assistant";
  const tone = isUser ? "bg-rose-400 text-white" : "bg-black/5 dark:bg-white/10";
  const align = isUser ? "justify-end" : "justify-start"; // right for user, left for model
  const avatar = isUser ? "U" : isAssistant ? "C" : role[0]?.toUpperCase();
  return (
    <div className={`flex ${align}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${tone}`}>
        {children}
      </div>
      <div className="sr-only" aria-hidden>
        {avatar}
      </div>
    </div>
  );
}

function Dot() {
  return <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-duration:900ms]" />;
}

function clsx(...xs: Array<string | undefined | null | false>) {
  return xs.filter(Boolean).join(" ");
}