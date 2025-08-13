"use client";

import React, { createContext, useContext, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export interface Message {
  id: string;
  type: "success" | "error" | "info";
  content: string;
  fadeOut?: boolean;
}

export function useToast(): [
  Message[],
  (message: {
    type: Message["type"];
    content: string;
    duration?: number;
  }) => void
] {
  const [toasts, setToasts] = useState<Message[]>([]);

  function addToast({
    type,
    content,
    duration = 3000,
  }: {
    type: Message["type"];
    content: string;
    duration?: number;
  }) {
    const id = uuidv4();
    const message: Message = {
      id,
      type,
      content,
      fadeOut: false,
    };
    setToasts((prev) => [...prev, message]);
    const fadeTimeout = setTimeout(() => {
      setToasts((prev) => prev.map((m) => m.id === id ? { ...m, fadeOut: true } : m));
      clearTimeout(fadeTimeout);
    }, duration);

    const popTimeout = setTimeout(() => {
      setToasts((prev) => prev.filter((m) => m.id !== id));
      clearTimeout(popTimeout);
    }, duration + 500);
  }

  return [toasts, addToast];
}

interface ToastContextType {
  toasts: Message[];
  addToast: (message: { type: Message["type"]; content: string; duration?: number }) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, addToast] = useToast();
  return (
    <ToastContext.Provider value={{ toasts, addToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
}