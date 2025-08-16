"use client";

import { useEffect } from "react";
import { useAuthContext } from "@/context/auth";
import { useToastContext } from "@/context/toast";
import { useRouter } from "next/navigation";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { auth, authLoading } = useAuthContext();
  const { addToast } = useToastContext();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!auth) {
      addToast({ type: "error", content: "Please log in." });
      router.replace("/login?redirect=" + encodeURIComponent(window.location.pathname));
    }
  }, [authLoading, auth, addToast, router]);

  if (!auth) return null;
  return <>{children}</>;
}