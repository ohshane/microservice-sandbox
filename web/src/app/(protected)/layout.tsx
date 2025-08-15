"use client";

import React from "react";
import { AuthProvider, useAuthContext } from '@/context/auth';
import { useToastContext } from '@/context/toast';
import { useRouter } from 'next/navigation';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { auth } = useAuthContext();
  const { addToast } = useToastContext();
  const router = useRouter();

  if (!auth) {
    addToast({ type: "error", content: "You must be logged in to access this page." });
    router.replace("/login?redirect=" + encodeURIComponent(window.location.pathname));
  }
  return <AuthProvider>{children}</AuthProvider>;
}