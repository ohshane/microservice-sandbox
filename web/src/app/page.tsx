"use client"

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Rocket,
  Boxes,
  ShieldCheck,
  Cloud,
  Network,
  TerminalSquare,
  Github,
  Menu,
  X,
  Sparkles,
  LineChart,
  CakeSlice,
} from "lucide-react";

import Cherry from "@/components/cherry";
import { useToastContext } from '@/context/toast';
import { ToastContainer } from '@/components/toast';
import { useAuthContext } from '@/context/auth';
import Link from 'next/link';

export default function Landing() {
  // Light theme only; dark toggle removed
  const [open, setOpen] = useState(false);
  const { toasts, addToast } = useToastContext();
  const { auth, setAuth } = useAuthContext();
  const isLight = true;

  // Ensure page starts at top on initial load
  useEffect(() => {
    // Clear any hash from URL and scroll to top
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
      window.scrollTo(0, 0);
    }
  }, []);


  const nav = [
    { name: "Features", href: "#features" },
    { name: "Architecture", href: "#architecture" },
    { name: "Get started", href: "#cli" },
  ];

  return (
    <div className={`min-h-screen bg-white text-black selection:bg-black/80 selection:text-white`}>
      {/* Background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className={`absolute -top-40 left-1/2 h-[60rem] w-[60rem] -translate-x-1/2 rounded-full bg-gradient-to-tr from-indigo-500/20 via-fuchsia-500/10 to-sky-500/20 blur-3xl opacity-70`}
        />
        <GridBackdrop stroke="rgba(0,0,0,0.06)" fadeTop="rgba(255,255,255,0.6)" fadeBottom="rgba(255,255,255,0.9)" />
      </div>

      {/* Nav */}
      <header className={`sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/40`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <a href="" className="flex items-center gap-2">
            <div className={`grid h-8 w-8 place-items-center rounded-lg bg-black text-white`}>
              <CakeSlice className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">CakeStack</span>
          </a>

          <nav className="hidden items-center gap-3 md:flex">
            {nav.map((n) => (
              <a key={n.name} href={n.href} className={`px-2 text-sm transition text-black/80 hover:text-black`}>
                {n.name}
              </a>
            ))}

            {auth ? (
              <button
                onClick={() => {
                  setAuth(null);
                  addToast({ type: "success", content: "Logged out successfully!" });
                }}
                className={`cursor-pointer text-sm border-black/20 hover:border-black/40 hover:bg-black/5 rounded-xl px-4 py-2 font-medium transition border`}
              >
                Log out
              </button>
            ) : (
              <Link
                href="/login"
                className={`cursor-pointer text-sm border-black/20 hover:border-black/40 hover:bg-black/5 rounded-xl px-4 py-2 font-medium transition border`}
              >
                Log in
              </Link>
            )}

            <a href="https://github.com/ohshane/microservice-sandbox" target="_blank" rel="noreferrer" className={`bg-black text-white hover:opacity-90 rounded-xl px-4 py-2 text-sm font-semibold inline-flex items-center gap-2`}>
              <Github className="h-4 w-4" />GitHub
            </a>
          </nav>

          {/* Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              className={`cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/15`}
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden">
            <div className={`mx-4 mb-4 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-xl`}>
              <div className="grid gap-4">
                {nav.map((n) => (
                  <a
                    key={n.name}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-xl px-3 py-2 transition text-black/80 hover:text-black hover:bg-black/5`}
                  >
                    {n.name}
                  </a>
                ))}
                <div className="flex gap-3 pt-2">
                    {auth ? (
                    <button
                      onClick={() => {
                        setAuth(null)
                        addToast({ type: "success", content: "Logged out successfully!" });
                      }}
                      className={`cursor-pointer flex-1 text-center text-sm border-black/20 hover:border-black/40 hover:bg-black/5 rounded-xl px-4 py-2 font-medium transition border`}
                    >
                      Log out
                    </button>
                    ) : (
                    <Link
                      href="/login"
                      className={`cursor-pointer flex-1 text-center text-sm border-black/20 hover:border-black/40 hover:bg-black/5 rounded-xl px-4 py-2 font-medium transition border`}
                    >
                      Log in
                    </Link>
                    )}
                  <a href="https://github.com/ohshane/microservice-sandbox" target="_blank" rel="noreferrer" className={`flex flex-1 items-center justify-center gap-2 bg-black text-white hover:opacity-90 rounded-xl px-4 py-2 text-sm font-semibold`}>
                    <Github className="h-4 w-4" /> GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative flex items-center" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-20 md:grid-cols-2 md:px-6">
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-4xl font-extrabold tracking-tight md:text-6xl"
            >
              Build{" "}
                <span className="inline-block">
                <RollingWords
                  words={["modern", "LLM", "production ready", "RAG", "mutli-tenant"]}
                  className="inline-block text-rose-400"
                />
                </span>
              microservices, with no pain.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.05 }}
              className={`mt-5 max-w-xl text-base leading-relaxed md:text-lg text-black/70`}
            >
              Microservice Sandbox is a batteries-included starter that ships with CQRS + Kafka, multi-tenant auth, PostgreSQL, Redis, and Kubernetes-ready deploys. Developer experience first. Production from day one.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <a id="get-started" href="#cli" className={`bg-black text-white hover:opacity-90 rounded-xl px-4 py-2 text-sm font-semibold inline-flex items-center gap-2`}>
                <Rocket className="h-4 w-4" />
                Get Started
              </a>
              <span className={`ml-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs border-black/10 text-black/60`}>
                <Sparkles className="h-3.5 w-3.5" /> v0.1 • OSS MIT
              </span>
            </motion.div>
          </div>

          {/* Hero Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative"
          >
            <div className={`relative overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-b from-white/60 to-white/80 p-4 shadow-2xl`}>
              <div className={`absolute -right-20 -top-20 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl`} />
              <div className={`absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl`} />

              <div className={`rounded-xl border border-black/10 bg-white/60 p-3`}>
                <div className="rounded-lg bg-gradient-to-b from-zinc-900 to-black p-4 text-white">
                  <div className={`mb-3 flex items-center justify-between text-xs`}>
                    <span>docker-compose.yml</span>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] border-black/10`}>preview</span>
                  </div>
                  <pre className="max-h-[24rem] overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed">
{`services:
  nginx:
    image: nginx
    ports: ["80:80"]
  authn:
    image: services/authn
  authz:
    image: services/authz
  kafka:
    image: apache/kafka
  postgres:
    image: postgres:16
  redis:
    image: redis:7
  web:
    image: node
    ports: ["80:3000"]
networks:
  sandbox:`}
                  </pre>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                {[
                  { k: "Services", v: "12" },
                  { k: "Events/min", v: "48k" },
                  { k: "Uptime", v: "99.95%" },
                ].map((m) => (
                  <div key={m.k} className={`rounded-xl border border-black/10 bg-black/5 p-3 text-xs`}>
                    <div className={`text-black/60`}>{m.k}</div>
                    <div className="text-base font-semibold">{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-4xl">Everything you need to ship microservices</h2>
          <p className={`mt-3 text-black/70`}>Opinionated defaults, modular services, zero-config local dev, and production-grade deploys.</p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Feature icon={Boxes} title="Monorepo, done right" desc="Turbo-powered tooling, workspaces, and shared libs with strict typing & linting." isLight={isLight} />
          <Feature icon={Network} title="CQRS + Kafka" desc="Event-driven boundaries, idempotent consumers, and durable outbox patterns." isLight={isLight} />
          <Feature icon={ShieldCheck} title="Multi-tenant Auth" desc="AuthN/AuthZ split, JWT + PDP, tenant-aware policies, and audit trails." isLight={isLight} />
          <Feature icon={Cloud} title="Kubernetes-ready" desc="GitOps manifests, health probes, HPA, and zero-downtime rollouts." isLight={isLight} />
          <Feature icon={TerminalSquare} title="DX-first CLI" desc="Spin up services, seed data, and tail logs with a single command." isLight={isLight} />
          <Feature icon={LineChart} title="Observability" desc="OpenTelemetry traces, metrics, structured logs, and golden signals." isLight={isLight} />
        </div>
      </section>

      {/* Architecture */}
      <section id="architecture" className="mx-auto max-w-7xl px-4 pb-4 md:px-6">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <h3 className="text-xl font-semibold md:text-3xl">Clean boundaries. Productive teams.</h3>
            <p className={`mt-3 text-black/70`}>
              Keep services autonomous without sacrificing speed. Sandbox packages patterns that scale: request/response for reads, event streaming for writes, and a directory-driven authorization model.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Typed contracts with OpenAPI + JSONSchema",
                "Async messaging via Kafka with outbox & retries",
                "Tenant & org separation with directory service",
                "Policy evaluation (PDP) decoupled from apps",
              ].map((li) => (
                <li key={li} className="flex items-start gap-3">
                  <span className={`mt-1 inline-grid h-5 w-5 place-items-center rounded-full bg-black/10`}>
                    <Sparkles className="h-3 w-3" />
                  </span>
                  <span>{li}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-1 md:order-2">
            <ArchDiagram isLight={isLight} />
          </div>
        </div>
      </section>

      {/* CLI */}
      <section id="cli" className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className={`rounded-2xl border border-black/10 bg-gradient-to-b from-black/[0.04] to-black/[0.02] p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold">Get going in seconds</h3>
              <p className={`text-sm text-black/70`}>Scaffold a new service with a single command.</p>
            </div>
          </div>
          <pre className={`overflow-auto rounded-xl border border-black/10 bg-white/70 p-4 text-[12px]/6`}>
{`docker compose -f docker-compose-infra.yaml -f docker-compose-service.yaml up -d`}
          </pre>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-24 md:px-6">
        <div className={`relative overflow-hidden rounded-2xl border border-black/10 bg-gradient-to-r from-indigo-600/10 via-fuchsia-600/10 to-sky-600/10 p-8`}>
          <div className={`absolute -right-20 -top-10 h-64 w-64 rounded-full bg-black/10 blur-2xl`} />
          <div className={`absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-black/10 blur-2xl`} />
          <div className="relative grid items-center gap-6 md:grid-cols-[1.2fr,0.8fr]">
            <div>
              <h3 className="text-2xl font-bold md:text-3xl">Ship faster. Scale safely.</h3>
              <p className={`mt-2 max-w-2xl text-black/70`}>Start with a proven foundation and focus on what matters — your product. Star the repo and join the community.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <a href="https://github.com/ohshane/microservice-sandbox" target="_blank" rel="noreferrer" className={`bg-black text-white hover:opacity-90 rounded-xl px-4 py-2 text-sm font-semibold inline-flex items-center gap-2`}>
                <Github className="h-4 w-4" />GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t border-black/10 py-10`}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 md:grid-cols-3 md:px-6">
          <div>
            <div className="flex items-center gap-2">
              <div className={`grid h-8 w-8 place-items-center rounded-lg bg-black text-white`}>
                <CakeSlice className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight">CakeStack</span>
            </div>
            <p className={`mt-3 text-sm text-black/60`}>Build microservices, with no pain.</p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <div className={`text-black/60`}>Product</div>
              <a className={`block text-black/80 hover:text-black`} href="#features">Features</a>
              <a className={`block text-black/80 hover:text-black`} href="#architecture">Architecture</a>
              <a className={`block text-black/80 hover:text-black`} href="#cli">Get started</a>
            </div>
            <div className="space-y-2">
              <div className={`text-black/60`}>Community</div>
              <a className={`block text-black/80 hover:text-black`} href="https://x.com">Twitter/X</a>
              <a className={`block text-black/80 hover:text-black`} href="https://discord.com">Discord</a>
            </div>
          </div>
          <div className={`flex items-end justify-between text-sm text-black/60 md:items-center`}>
            <div>&copy; {new Date().getFullYear()} CakeStack</div>
            <div className="space-x-4">
              <a href="#terms" className={`hover:opacity-80`}>Terms</a>
              <a href="#privacy" className={`hover:opacity-80`}>Privacy</a>
            </div>
          </div>
        </div>
      </footer>
      <Cherry />
      <ToastContainer toasts={toasts} />
    </div>
  );
}

/**
 * RollingWords
 * - Cycles through `words` with a small fade/slide transition.
 * - Uses regular text color (from className). No gradient by default.
 */
function RollingWords({
  words,
  interval = 5000,
  className = "",
}: {
  words: string[];
  interval?: number;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!words || words.length === 0) return;
    const id = setInterval(() => {
      setIdx((v) => (v + 1) % words.length);
    }, interval);
    return () => clearInterval(id);
  }, [interval, words]);

  return (
    <span className={className} style={{ minWidth: "6ch" }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={words[idx]}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.28 }}
          className="inline-block"
        >
          {words[idx]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function Feature({ icon: Icon, title, desc, isLight }: { icon: any; title: string; desc: string; isLight: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-2xl border ${isLight ? "border-black/10 bg-black/[0.03]" : "border-white/10 bg-white/[0.03]"} p-5`}
    >
      <div className={`mb-3 inline-flex rounded-xl border ${isLight ? "border-black/10 bg-black/10" : "border-white/10 bg-white/10"} p-2`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className={`mt-1 text-sm ${isLight ? "text-black/70" : "text-white/70"}`}>{desc}</p>
    </motion.div>
  );
}

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

function ArchDiagram({ isLight }: { isLight: boolean }) {
  const border = isLight ? "border-black/10" : "border-white/10";
  const tile = isLight ? "bg-black/[0.03]" : "bg-white/[0.03]";
  return (
    <div className={`relative rounded-2xl border ${border} ${isLight ? "bg-black/5" : "bg-black/40"} p-4`}>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-2">
        <Block title="Infra" icon={Cloud} items={["Postgres", "Kafka", "Redis"]} border={border} tile={tile} />
        <Block title="Directory" icon={Network} items={["Tenants", "Orgs", "Roles"]} border={border} tile={tile} />
        <Block title="AuthN" icon={ShieldCheck} items={["Login", "Tokens", "Refresh"]} border={border} tile={tile} />
        <Block title="AuthZ (PDP)" icon={ShieldCheck} items={["Policies", "ABAC", "Audit"]} border={border} tile={tile} />
      </div>
    </div>
  );
}

function Block({ title, icon: Icon, items, border, tile }: { title: string; icon: any; items: string[]; border: string; tile: string }) {
  return (
    <div className={`rounded-xl border ${border} ${tile} p-4`}>
      <div className="mb-2 flex items-center gap-2">
        <div className="inline-grid h-9 w-9 place-items-center rounded-lg bg-white/10">
          <Icon className="h-5 w-5" />
        </div>
        <div className="font-medium">{title}</div>
      </div>
      <ul className="space-y-1 text-sm opacity-90">
        {items.map((i) => (
          <li key={i}>• {i}</li>
        ))}
      </ul>
    </div>
  );
}
