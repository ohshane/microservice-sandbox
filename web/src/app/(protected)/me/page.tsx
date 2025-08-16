"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "@/context/auth";
import { useToastContext } from "@/context/toast";
import { ToastContainer } from "@/components/toast";
import Header from "@/components/header";
import { updateMe, changePassword } from "@/services/auth"; // <-- ensure this exists in your service
import { User as UserIcon } from "lucide-react";
import Image from "next/image";

// Editable fields: username, name, bio, is_active
// Showable only: email, profileUrl, role

export default function MePage() {
  const { authLoading, auth, setAuth } = useAuthContext();
  const { toasts, addToast } = useToastContext();

  const [form, setForm] = useState({
    username: "",
    name: "",
    bio: "",
    is_active: true,
  });

  const [saving, setSaving] = useState(false);

  // avatar fallback toggle
  const [imgBroken, setImgBroken] = useState(false);

  // change password form
  const [pw, setPw] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    console.log("authLoading:", authLoading, "auth:", auth);
    if (!auth || authLoading) return;
    setForm({
      username: auth.username ?? "",
      name: auth.name ?? "",
      bio: auth.bio ?? "",
      is_active: auth.isActive ?? true,
    });
  }, [auth, authLoading]);

  const isDirty = useMemo(() => {
    if (!auth) return false;
    return (
      form.username !== (auth.username ?? "") ||
      form.name !== (auth.name ?? "") ||
      form.bio !== (auth.bio ?? "")
    );
  }, [form, auth]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return;

    const payload: { username?: string; name?: string; bio?: string } = {};
    if (form.username !== (auth.username ?? "")) payload.username = form.username;
    if (form.name !== (auth.name ?? "")) payload.name = form.name;
    if (form.bio !== (auth.bio ?? "")) payload.bio = form.bio;

    if (Object.keys(payload).length === 0) {
      addToast({ type: "info", content: "No changes to save." });
      return;
    }

    try {
      setSaving(true);
      const res = await updateMe(payload);
      if (!res.ok) {
        const msg = await safeText(res);
        addToast({ type: "error", content: msg || "Failed to update profile." });
        return;
      }
      const updated = (await res.json()).data;
      setAuth(updated);
      addToast({ type: "success", content: "Profile updated." });
    } catch (err: any) {
      addToast({ type: "error", content: err?.message ?? "Update failed." });
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    if (!auth) return;
    setForm({
      username: auth.username ?? "",
      name: auth.name ?? "",
      bio: auth.bio ?? "",
      is_active: auth.isActive ?? true,
    });
  }

  const showImg = !!auth?.profileUrl && !imgBroken;

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();

    // Basic client-side checks
    if (!pw.current || !pw.next || !pw.confirm) {
      addToast({ type: "error", content: "Fill out all password fields." });
      return;
    }
    if (pw.next.length < 8) {
      addToast({ type: "error", content: "New password must be at least 8 characters." });
      return;
    }
    if (pw.next !== pw.confirm) {
      addToast({ type: "error", content: "New passwords do not match." });
      return;
    }
    if (pw.current === pw.next) {
      addToast({ type: "error", content: "New password must be different from current password." });
      return;
    }

    try {
      setChangingPw(true);
      const res = await changePassword({ old_password: pw.current, new_password: pw.next });
      if (!res.ok) {
        const msg = await safeText(res);
        addToast({ type: "error", content: msg || "Failed to change password." });
        return;
      }
      addToast({ type: "success", content: "Password changed successfully." });
      setPw({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      addToast({ type: "error", content: err?.message ?? "Password change failed." });
    } finally {
      setChangingPw(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black/80 selection:text-white">
      <Header />
      <ToastContainer toasts={toasts} />

      <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 md:px-6">
        <h1 className="text-2xl font-semibold">My Account</h1>

        {authLoading ? (
          <p className="mt-8 text-sm text-black/60">Loading...</p>
        ) : !auth ? (
          <p className="mt-8 text-sm text-black/60">You are not signed in.</p>
        ) : (
          <div className="mt-8 grid gap-10 md:grid-cols-2">
            {/* Read-only profile info */}
            <section className="rounded-2xl border border-black/10 bg-white/70 p-5">
              <div className="flex items-center gap-4">
                {showImg ? (
                  <Image
                    src={auth.profileUrl!}
                    alt="Profile"
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full border border-black/10 object-cover"
                    onError={() => setImgBroken(true)}
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full border border-black/10 bg-black/5 flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-black/40" />
                  </div>
                )}

                <div className="min-w-0">
                  <div className="truncate text-lg font-bold">{auth.name}</div>
                  <div className="truncate text-md font-semibold">{auth.username}</div>
                  <div className="truncate text-sm text-black/60">{auth.email}</div>
                </div>
              </div>

              {/* Role (only if present) */}
              {auth.role ? (
                <dl className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-black/60">Role</dt>
                    <dd className="font-medium">{auth.role}</dd>
                  </div>
                </dl>
              ) : null}
            </section>

            {/* Editable form */}
            <section className="rounded-2xl border border-black/10 bg-white/70 p-5">
              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium">Email</label>
                  <input
                    value={auth.email || ""}
                    disabled
                    className="mt-1 w-full rounded-xl border border-black/20 bg-black/5 p-2.5 text-sm outline-none disabled:text-black/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Username</label>
                  <input
                    value={form.username ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                    placeholder="username"
                    className="mt-1 w-full rounded-xl border border-black/20 p-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Name</label>
                  <input
                    value={form.name ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                    className="mt-1 w-full rounded-xl border border-black/20 p-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Bio</label>
                  <textarea
                    value={form.bio ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                    rows={4}
                    placeholder="Tell us about yourself"
                    className="mt-1 w-full rounded-xl border border-black/20 p-2.5 text-sm outline-none focus:border-black"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving || !isDirty}
                    className="inline-flex items-center justify-center rounded-xl border border-black/20 px-4 py-2 text-sm font-medium transition hover:border-black/40 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={saving || !isDirty}
                    className="inline-flex items-center justify-center rounded-xl border border-black/20 px-4 py-2 text-sm font-medium transition hover:border-black/40 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Reset
                  </button>
                </div>
              </form>

              {/* Change Password */}
              <div className="mt-8 border-t border-black/10 pt-6">
                <h2 className="text-sm font-semibold">Change password</h2>
                <form onSubmit={onChangePassword} className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium">Current password</label>
                    <input
                      type="password"
                      value={pw.current ?? ""}
                      onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-black/20 p-2.5 text-sm outline-none focus:border-black"
                      autoComplete="current-password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">New password</label>
                    <input
                      type="password"
                      value={pw.next ?? ""}
                      onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-black/20 p-2.5 text-sm outline-none focus:border-black"
                      autoComplete="new-password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Confirm new password</label>
                    <input
                      type="password"
                      value={pw.confirm ?? ""}
                      onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-black/20 p-2.5 text-sm outline-none focus:border-black"
                      autoComplete="new-password"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={changingPw}
                    className="inline-flex items-center justify-center rounded-xl border border-black/20 px-4 py-2 text-sm font-medium transition hover:border-black/40 hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {changingPw ? "Changing..." : "Change password"}
                  </button>
                </form>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}