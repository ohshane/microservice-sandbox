// POST-streaming implementation, parses text/event-stream from fetch(POST)
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "react-markdown";
import { v4 as uuidv4 } from "uuid";
import { API_URL } from "@/config";
import { getConversation } from "@/services/chat";
import { useChatListContext } from "@/context/chat";
import Code from "@/components/code";

interface Message {
  id: string;
  role: "developer" | "user" | "assistant";
  content: string;
}

type Role = Message["role"];

type ChatProps = { messages: Message[]; conversationId: string | null, isNew: boolean };

export default function Chat({ messages: initialMessages = [], conversationId: initialConversationId = null, isNew = false }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [controller, setController] = useState<AbortController | null>(null);

  const { bumpVersion } = useChatListContext();

  // Lazily create a conversation id on first user message
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);

  const autoKickRef = useRef<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !pending, [input, pending]);

  // --- Utilities -----------------------------------------------------------
  const focusInput = () => requestAnimationFrame(() => inputRef.current?.focus());

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const top = el.scrollHeight;
    if (pending) {
      el.scrollTop = top; // fast during streaming
    } else {
      el.scrollTo({ top, behavior: "smooth" });
    }
  }, [messages, pending]);

  // Keep the input focused
  useEffect(() => {
    focusInput();
  }, [messages, pending]);

  function handleStop() {
    controller?.abort();
    setPending(false);
    setController(null);
    setShowTyping(false);
  }

  // Stream parser shared by both send/continue paths
  const postAndStream = useCallback(async (cid: string, history: Message[]) => {
    const ac = new AbortController();
    setController(ac);
    setPending(true);
    setShowTyping(true);

    const res = await fetch(`${API_URL}/api/v1/conversation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      credentials: "include",
      body: JSON.stringify({
        conversation_id: cid,
        messages: history,
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
    let buffer = ""; // accumulates raw text chunks
    let eventData = ""; // accumulates multi-line data: fields for one SSE event

    const flushEvent = () => {
      const payload = eventData.trim();
      eventData = "";
      if (!payload) return "CONT" as const;
      if (payload === "[DONE]") {
        setPending(false);
        return "DONE" as const;
      }
      try {
        const obj = JSON.parse(payload);
        const delta =
          obj?.choices?.[0]?.delta?.content ?? obj?.delta?.content ?? obj?.content ?? "";
        if (typeof delta === "string" && delta.length) {
          setMessages((prev) => {
            const exists = prev.some((m) => m.id === obj.id);
            if (!exists) {
              return [...prev, { id: obj.id, role: "assistant", content: delta } as Message];
            }
            return prev.map((m) => (m.id === obj.id ? { ...m, content: m.content + delta } : m));
          });
          setShowTyping(false); // first token arrived
        }
      } catch {
        // ignore malformed lines
      }
      return "CONT" as const;
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (!chunk) continue;
      buffer += chunk;
      while (true) {
        const nlIndex = buffer.indexOf("\n");
        if (nlIndex === -1) break;
        let line = buffer.slice(0, nlIndex);
        buffer = buffer.slice(nlIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line === "") {
          const status = flushEvent();
          if (status === "DONE") return; // finish stream
          continue;
        }
        if (line.startsWith("data:")) {
          const v = line.length >= 5 ? line.slice(5).trimStart() : "";
          eventData += (eventData ? "\n" : "") + v;
        }
      }
    }
  }, []);

  // Continue existing conversation without appending a new user message
  const continueConversation = useCallback(
    async (history: Message[]) => {
      const cid = conversationId;
      if (!cid || history.length === 0) return;
      try {
        await postAndStream(cid, history);
      } catch (err) {
        console.error("streaming error:", err);
      } finally {
        setController(null);
      }
    },
    [conversationId, postAndStream]
  );

  // Initial load: if we have a conversation id, fetch its history and auto-continue if last role is user.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cid = conversationId;
      try {
        if (!cid) {
          // No id yet: show only seed messages and wait for first send
          if (!cancelled) setMessages(initialMessages ?? []);
          return;
        }
        let loaded: Message[] = []
        if (!isNew) {
          const res = await getConversation(cid);
          loaded = (await res.json()).data.messages;
        }
        const merged = [...loaded, ...(initialMessages ?? [])];
        if (!cancelled) setMessages(merged);

        const last = merged[merged.length - 1];
        if (!cancelled && last && last.role === "user" && autoKickRef.current !== cid) {
          autoKickRef.current = cid;
          await continueConversation(merged);
        }
      } catch {
        // Ignore fetch/parse errors here; UI will behave as new chat
      } finally {
        await bumpVersion();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, initialMessages, continueConversation, bumpVersion, isNew]);

  // Send a new user message (creates a conversation id if needed)
  async function sendMessage(content: string) {
    if (!content.trim()) return;

    // Assign conversation id lazily on first send
    let cid = conversationId;
    if (!cid) {
      cid = uuidv4();
      setConversationId(cid);
    }

    const userMsg: Message = { id: uuidv4(), role: "user", content };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const history = [...messages, userMsg];
      await postAndStream(cid, history);
    } catch (err) {
      console.error("streaming error:", err);
    } finally {
      setController(null);
      setInput("");
      void bumpVersion();
    }
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-sm text-black/60">Start a conversation.</div>
        )}
        {messages.map((m) => (
          <Bubble key={m.id} role={m.role}>
            {m.content}
          </Bubble>
        ))}
        {pending && showTyping && (
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
      <div className="p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
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
                if (!pending) {
                  const toSend = input;
                  setInput("");
                  void sendMessage(toSend);
                }
              }
            }}
            onBlur={focusInput}
          />
          {!pending ? (
            <button
              type="button"
              onClick={() => {
                if (canSend) {
                  const toSend = input;
                  setInput("");
                  void sendMessage(toSend);
                }
              }}
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
      <div className={`${role === "assistant" ? "max-w-full" : "max-w-[80%]"} rounded-2xl px-3 py-2 text-sm ${bg}`}>
        {typeof children === "string" ? (
          <Markdown
            components={{
              code: (props: any) => <Code {...props} />,
            }}
          >
            {children as string}
          </Markdown>
        ) : (
          children
        )}
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