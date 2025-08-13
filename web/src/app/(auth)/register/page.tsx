"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/config";
import { useRouter } from 'next/navigation';
import { useToastContext } from '@/context/toast';
import { ToastContainer } from '@/components/toast';

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const [pwMatch, setPwMatch] = useState(true);
  const [pwStrength, setPwStrength] = useState(0);
  const { toasts, addToast } = useToastContext();

  const router = useRouter();

  const calcStrength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s; // 0-4
  };

  const strengthLabel = useMemo(() => {
    switch (pwStrength) {
      case 0:
        return "Too short";
      case 1:
        return "Weak";
      case 2:
        return "Fair";
      case 3:
        return "Good";
      default:
        return "Strong";
    }
  }, [pwStrength]);

  useEffect(() => {
    setPwStrength(calcStrength(password));
  }, [password]);

  useEffect(() => {
    setPwMatch(repeatPassword.length === 0 || password === repeatPassword);
  }, [password, repeatPassword]);

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    if (!pwMatch) {
      return;
    }
    const res = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    if (res.status === 201) {
      addToast({ type: "success", content: "Registration successful! You can now log in." });
      router.push("/login")
    } else if (res.status === 409) {
      addToast({ type: "error", content: "Email already taken." });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black px-4">
      <div className="mx-auto w-full max-w-lg">
        <h1 className="text-2xl font-bold text-center">Create your CakeStack account</h1>
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
              autoComplete="new-password"
              aria-describedby="password-strength"
              aria-invalid={false}
            />
            <div id="password-strength" className="mt-1 text-xs">
              <div className="flex gap-1 mb-1">
                <div className={`h-1 flex-1 rounded ${pwStrength > 0 ? 'bg-black/80' : 'bg-black/10'}`} />
                <div className={`h-1 flex-1 rounded ${pwStrength > 1 ? 'bg-black/80' : 'bg-black/10'}`} />
                <div className={`h-1 flex-1 rounded ${pwStrength > 2 ? 'bg-black/80' : 'bg-black/10'}`} />
                <div className={`h-1 flex-1 rounded ${pwStrength > 3 ? 'bg-black/80' : 'bg-black/10'}`} />
              </div>
              <span className="text-black/70">Strength: {strengthLabel}</span>
            </div>
          </div>
          <div className="mt-4">
            <label
              htmlFor="password-confirm"
              className="block text-sm font-medium mb-1"
            >
              Repeat Password
            </label>
            <input
              id="password-confirm"
              type="password"
              className={`rounded-lg border ${pwMatch ? 'border-black/15' : 'border-red-500'} bg-white px-3 py-2 text-sm w-full`}
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              required
              autoComplete="new-password"
              aria-invalid={!pwMatch}
            />
            {!pwMatch && (
              <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>
            )}
          </div>
          <button
            type="submit"
            disabled={!pwMatch}
            className={`cursor-pointer mt-5 w-full rounded-xl px-4 py-2 text-sm font-semibold text-white hover:opacity-90 ${!pwMatch ? 'bg-black/40 cursor-not-allowed' : 'bg-black'}`}
          >
            Register
          </button>
        </form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
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