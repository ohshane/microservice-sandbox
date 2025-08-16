"use client";

import React, {
  createContext, useContext, useState,
  useCallback, useMemo, useRef, useEffect
} from "react";
import { v4 as uuidv4 } from "uuid";

export interface Message {
  id: string;
  type: "success" | "error" | "info";
  content: string;
  fadeOut?: boolean;
}

type AddArgs = {
  type: Message["type"];
  content: string;
  duration?: number;
  fadeMs?: number;
};

function useToastInternal(): [Message[], (args: AddArgs) => void] {
  const [toasts, setToasts] = useState<Message[]>([]);
  const timersRef = useRef<Record<string, { fade?: number; remove?: number }>>({});

  const addToast = useCallback(
    ({ type, content, duration = 3000, fadeMs = 500 }: AddArgs) => {
      const id = uuidv4();
      setToasts(prev => [...prev, { id, type, content, fadeOut: false }]);

      const fade = window.setTimeout(() => {
        setToasts(prev => prev.map(m => (m.id === id ? { ...m, fadeOut: true } : m)));
      }, duration);

      const remove = window.setTimeout(() => {
        setToasts(prev => prev.filter(m => m.id !== id));
        const t = timersRef.current[id];
        if (t) {
          clearTimeout(t.fade);
          clearTimeout(t.remove);
          delete timersRef.current[id];
        }
      }, duration + fadeMs);

      timersRef.current[id] = { fade, remove };
    },
    []
  );

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(t => {
        clearTimeout(t.fade);
        clearTimeout(t.remove);
      });
      timersRef.current = {};
    };
  }, []);

  return [toasts, addToast];
}

interface ToastContextType {
  toasts: Message[];
  addToast: (args: AddArgs) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, addToast] = useToastInternal();

  const value = useMemo(() => ({ toasts, addToast }), [toasts, addToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToastContext must be used within a ToastProvider");
  return ctx;
}