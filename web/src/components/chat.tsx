// POST-streaming implementation, parses text/event-stream from fetch(POST)
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Markdown from 'react-markdown';
import { v4 as uuidv4 } from 'uuid';
import { API_URL } from '@/config';

interface Message {
  id: string;
  role: "developer" | "user" | "assistant";
  content: string;
}
type Role = Message["role"];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "", role: "assistant", content: "Hi there! How can I assist you today?" },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [controller, setController] = useState<AbortController | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !pending, [input, pending]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [messages]);

  useEffect(() => {
    if (!localStorage.getItem("cs-conversationid")) {
      localStorage.setItem("cs-conversationid", uuidv4());
    }
  }, []);

  function handleStop() {
    controller?.abort();
    setPending(false);
    setController(null);
  }

  async function sendMessage(content: string) {
    if (!content.trim()) return;

    const userMsg: Message = { id: uuidv4(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);

    const ac = new AbortController();
    setController(ac);
    setPending(true);

    try {
      // Build payload using current messages plus the new user message
      const prevMsgs = [...messages, userMsg].slice(1);

      const res = await fetch(`${API_URL}/api/v1/conversation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({
          conversation_id: localStorage.getItem("cs-conversationid"),
          messages: prevMsgs,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
        }),
        signal: ac.signal,
      });

      if (!res.ok || !res.body) {
        console.error("Streaming response not ok/body missing", res.status, res.statusText);
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";            // accumulates raw text chunks
      let eventData = "";         // accumulates multi-line "data:" fields for one SSE event

      const flushEvent = () => {
        const payload = eventData.trim();
        eventData = "";
        if (!payload) return;

        if (payload === "[DONE]") {
          setPending(false);
          return "DONE";
        }

        try {
          const obj = JSON.parse(payload);
          const delta =
            obj?.choices?.[0]?.delta?.content ??
            obj?.delta?.content ??
            obj?.content ??
            "";

          if (typeof delta === "string" && delta.length) {
            setMessages((prev) => {
              const exists = prev.some((m) => m.id === obj.id);
              if (!exists) {
                return [...prev, { id: obj.id, role: "assistant", content: delta }];
              }
              return prev.map((m) =>
                m.id === obj.id ? { ...m, content: m.content + delta } : m
              );
            });
            // ensure the typing indicator stops as soon as we get the first token
            setPending(false);
          }
        } catch {}
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        buffer += chunk;

        // Extract lines from buffer
        while (true) {
          const nlIndex = buffer.indexOf("\n");
          if (nlIndex === -1) break;

          // Take one line (trim trailing CR)
          let line = buffer.slice(0, nlIndex);
          buffer = buffer.slice(nlIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);

          if (line === "") {
            // Blank line = end of one SSE event
            const status = flushEvent();
            if (status === "DONE") {
              break;
            }
            continue;
          }

          // Parse SSE fields: data:, event:, id:, retry:
          if (line.startsWith("data:")) {
            // "data:" plus optional space
            const v = line.length >= 5 ? line.slice(5).trimStart() : "";
            // Accumulate (SSE allows multi-line data fields)
            eventData += (eventData ? "\n" : "") + v;
          }
          // We ignore "event:", "id:", "retry:" for now — extend if needed
        }
      }
    } catch (err) {
      console.error("streaming error:", err);
    } finally {
      setController(null);
      setInput("");
    }
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-sm text-black/60">Start a conversation.</div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role}>
            {m.content}
          </Bubble>
        ))}
        {pending && (
          <Bubble role="assistant">
            <span className="inline-flex items-center gap-1">
              <Dot />
              <Dot />
              <Dot />
            </span>
          </Bubble>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-black/10 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Cherry..."
            className="min-h-[44px] max-h-40 flex-1 resize-y rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            disabled={pending}
          />
          {!pending ? (
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white shadow transition enabled:active:scale-95 enabled:hover:opacity-90 disabled:opacity-50"
            >
              Send
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStop}
              className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium shadow hover:bg-black/5 active:scale-95"
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
  const bg = isUser ? "bg-rose-400 text-white" : "bg-black/5";
  const align = isUser ? "justify-end" : "justify-start";
  return (
    <div className={`flex ${align}`}>
      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${bg}`}>
        { typeof children === 'string' ? (<Markdown>{children}</Markdown>) : children }
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span
      className="inline-block h-1 w-1 animate-bounce rounded-full bg-current opacity-80 shadow-sm [animation-duration:800ms]"
      style={{ transformOrigin: "center" }}
    />
  );
}