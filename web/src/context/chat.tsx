"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

/**
 * ChatListContext
 * React-style: bump `version` when a chat send completes (SSE DONE).
 * Consumers subscribe to `version` in a useEffect to refetch lists.
 */
type ChatListContextValue = {
  version: number;
  bumpVersion: () => void;
};

const ChatListContext = createContext<ChatListContextValue | undefined>(undefined);

export function ChatListProvider({ children }: PropsWithChildren) {
  const [version, setVersion] = useState(0);

  const bumpVersion = useCallback(() => {
    setVersion((v) => (v === Number.MAX_SAFE_INTEGER ? 1 : v + 1));
  }, []);

  const value = useMemo<ChatListContextValue>(
    () => ({ version, bumpVersion }),
    [version, bumpVersion]
  );

  return <ChatListContext.Provider value={value}>{children}</ChatListContext.Provider>;
}

/**
 * useChatList
 * - `version`: deps로 사용해 사이드바/홈에서 목록 재조회
 * - `bumpVersion()`: chat.tsx의 SSE DONE에서 호출
 */
export function useChatListContext(): ChatListContextValue {
  const ctx = useContext(ChatListContext);
  if (!ctx) {
    throw new Error("useChatList must be used within <ChatListProvider>");
  }
  return ctx;
}