"use client";
import { useState } from "react";
import Link from "next/link";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Registration logic placeholder
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
            />
          </div>
          <button
            type="submit"
            className="mt-5 w-full rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Register
          </button>
        </form>
        <div className="mt-6 text-center text-sm">
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
    </div>
  );
}