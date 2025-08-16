"use client";
import { useState } from "react";
import Link from "next/link";
import { useToastContext } from '@/context/toast';
import { ToastContainer } from '@/components/toast';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/auth';
import { login } from '@/services/auth';
import { useSearchParams } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { toasts, addToast } = useToastContext();
  const { auth, setAuth } = useAuthContext();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await login({ email, password });
      if (res.status !== 200) {
        addToast({ type: "error", content: "Invalid email or password." });
        return;
      }
      setAuth((await res.json()).data);
      addToast({ type: "success", content: "Logged in successfully!" });
      router.replace(redirectTo);
    } catch {
      addToast({ type: "error", content: "Network error. Please try again." });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black px-4">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="text-2xl font-bold text-center">Sign in to CakeStack</h1>
        <form
          className="mx-auto mt-6 rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm backdrop-blur"
          onSubmit={handleSubmit}
        >
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="mt-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              className="rounded-lg border border-black/15 bg-white px-3 py-2 text-sm w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="password"
            />
          </div>
          <button
            type="submit"
            className="cursor-pointer mt-5 w-full rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Sign in
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            Sign up
          </Link>
        </div>
        <div className="m-4 text-center text-sm">
          <Link href="/" className="text-blue-600 hover:underline">
            Back to Home
          </Link>
        </div>
      </div>
      <ToastContainer toasts={toasts} />
    </div>
  );
}