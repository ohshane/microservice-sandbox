"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  Pencil,
  Mail,
  User2,
  ShieldCheck,
  KeySquare,
  Link as LinkIcon,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import Link from "next/link";

import { useAuthContext } from "@/context/auth";
import { useToastContext } from "@/context/toast";
import { ToastContainer } from "@/components/toast";

export interface User {
  email: string;
  username: string;
  name: string;
  bio: string;
  profileUrl: string;
  role: string;
  isFirstLogin: boolean;
  isActive: boolean;
  changePasswordOnNextLogin: boolean;
}

export default function MePage() {
  const { auth } = useAuthContext();
  const { toasts, addToast } = useToastContext();
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const initials = useMemo(() => {
    const n = me?.name || me?.username || "";
    const parts = n.trim().split(" ").filter(Boolean);
    return (parts[0]?.[0] || "U").toUpperCase() + (parts[1]?.[0] || "").toUpperCase();
  }, [me]);

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black/80 selection:text-white">
      {/* background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/20 via-fuchsia-500/10 to-sky-500/20 blur-3xl opacity-70" />
        <GridBackdrop stroke="rgba(0,0,0,0.06)" fadeTop="rgba(255,255,255,0.6)" fadeBottom="rgba(255,255,255,0.9)" />
      </div>

      {/* header */}
      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="text-2xl font-bold md:text-3xl">
          Your profile
        </motion.h1>
        <p className="mt-1 text-sm text-black/60">Manage your account details and security preferences.</p>
      </section>

      {/* content */}
      <section className="mx-auto max-w-7xl px-4 pb-14 md:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="rounded-2xl border border-black/10 bg-white/70 p-5 lg:col-span-1"
          >
            <div className="flex items-center gap-4">
              <Avatar src={me?.profileUrl} initials={initials} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="truncate text-lg font-semibold">{me?.name || me?.username || "—"}</div>
                  {me?.isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-black/5 px-2 py-0.5 text-[11px]">
                      <BadgeCheck className="h-3.5 w-3.5" /> Active
                    </span>
                  )}
                </div>
                <div className="truncate text-sm text-black/60">@{me?.username || "—"}</div>
                <div className="flex items-center gap-1 text-sm text-black/70">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{me?.email || "—"}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              <InfoRow icon={User2} label="Name" value={me?.name} />
              <InfoRow icon={ShieldCheck} label="Role" value={me?.role} />
              <InfoRow icon={LinkIcon} label="Profile URL" value={me?.profileUrl} isLink />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/me/edit"
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 text-sm hover:bg-black/[0.06]"
              >
                <Pencil className="h-4 w-4" />
                Edit profile
              </Link>
              <Link
                href="/me/password"
                className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-black/[0.03] px-3 py-2 text-sm hover:bg-black/[0.06]"
              >
                <KeySquare className="h-4 w-4" />
                Change password
              </Link>
            </div>
          </motion.div>

          {/* About + Flags */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.08 }}
            className="rounded-2xl border border-black/10 bg-white/70 p-5 lg:col-span-2"
          >
            <div className="grid gap-6 md:grid-cols-2">
              {/* About */}
              <div className="rounded-xl border border-black/10 bg-black/[0.03] p-4">
                <div className="mb-2 text-sm font-semibold">About</div>
                <p className="whitespace-pre-wrap text-sm text-black/80">
                  {loading ? "Loading..." : me?.bio || "No bio yet."}
                </p>
              </div>

              {/* Account flags */}
              <div className="rounded-xl border border-black/10 bg-black/[0.03] p-4">
                <div className="mb-2 text-sm font-semibold">Account status</div>
                <div className="grid gap-2">
                  <Flag label="Active" value={!!me?.isActive} />
                  <Flag label="First login" value={!!me?.isFirstLogin} />
                  <Flag label="Force password change" value={!!me?.changePasswordOnNextLogin} />
                </div>
              </div>
            </div>

            {/* Security quick actions */}
            <div className="mt-6 rounded-xl border border-black/10 bg-black/[0.03] p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-sm font-semibold">Security</div>
                <div className="text-xs text-black/60">Manage sign-in & password policies</div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  onClick={() => addToast({ type: "info", content: "Opening: change password" })}
                  className="inline-flex items-center justify-between rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm hover:bg-white/90"
                >
                  <span className="inline-flex items-center gap-2">
                    <KeySquare className="h-4 w-4" />
                    Change password
                  </span>
                  <span className="text-black/50">›</span>
                </button>
                <button
                  onClick={() => addToast({ type: "info", content: "Enforce password change at next login" })}
                  className="inline-flex items-center justify-between rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm hover:bg-white/90"
                >
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Require change on next login
                  </span>
                  {me?.changePasswordOnNextLogin ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <ToastContainer toasts={toasts} />
    </div>
  );
}

/* ---------- UI bits (reused style) ---------- */

function GridBackdrop({ stroke, fadeTop, fadeBottom }: { stroke: string; fadeTop: string; fadeBottom: string }) {
  return (
    <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={stroke} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      <rect width="100%" height="100%" fill="url(#fade)" />
      <defs>
        <linearGradient id="fade" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fadeTop} />
          <stop offset="100%" stopColor={fadeBottom} />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Avatar({ src, initials }: { src?: string; initials: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="profile" className="h-16 w-16 rounded-xl object-cover ring-1 ring-black/10" />;
  }
  return (
    <div className="grid h-16 w-16 place-items-center rounded-xl bg-black/10 font-semibold ring-1 ring-black/10">
      {initials}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  isLink,
}: {
  icon: any;
  label: string;
  value?: string;
  isLink?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-black/[0.03] px-3 py-2 text-sm">
      <Icon className="h-4 w-4" />
      <div className="text-black/60">{label}</div>
      <div className="truncate font-medium">
        {value ? (isLink ? <a href={value} className="underline underline-offset-2 hover:opacity-80">{value}</a> : value) : "—"}
      </div>
    </div>
  );
}

function Flag({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-sm">
      <span className="text-black/80">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs ${value ? "bg-green-500/10 text-green-700" : "bg-black/10 text-black/70"}`}>
        {value ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}