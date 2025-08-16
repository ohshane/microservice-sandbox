import { CakeSlice, Github, Menu, X } from 'lucide-react';
import LoginButton from './auth';
import { useEffect, useState } from 'react';
import { useAuthContext } from '@/context/auth';
import Link from 'next/link';

export default function Header() {
  const [open, setOpen] = useState(false);
  const { auth, authLoading } = useAuthContext();
  const [nav, setNav] = useState([
    { name: "Features", href: "#features" },
    { name: "Architecture", href: "#architecture" },
    { name: "Get started", href: "#cli" },
  ]);

  useEffect(() => {
    if (authLoading) return;
    if (auth) {
      setNav([
        { name: "Features", href: "#features" },
        { name: "Architecture", href: "#architecture" },
        { name: "Get started", href: "#cli" },
        { name: "Me", href: "/me" },
      ]);
    }
  }, [auth, authLoading]);

  return (
      <header className={`sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-white/40`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className={`grid h-8 w-8 place-items-center rounded-lg bg-black text-white`}>
              <CakeSlice className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">CakeStack</span>
          </Link>

          <nav className="hidden items-center gap-3 md:flex">
            {nav.map((n) => (
              <a key={n.name} href={n.href} className={`px-2 text-sm transition text-black/80 hover:text-black`}>
                {n.name}
              </a>
            ))}

            <LoginButton />

            <a href="https://github.com/ohshane/microservice-sandbox" target="_blank" rel="noreferrer" className={`bg-black text-white hover:opacity-90 rounded-xl px-4 py-2 text-sm font-semibold inline-flex items-center gap-2`}>
              <Github className="h-4 w-4" />GitHub
            </a>
          </nav>

          {/* Mobile */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              className={`cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/15`}
              onClick={() => setOpen((v: boolean) => !v)}
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
                  <LoginButton />
                  <a href="https://github.com/ohshane/microservice-sandbox" target="_blank" rel="noreferrer" className={`flex flex-1 items-center justify-center gap-2 bg-black text-white hover:opacity-90 rounded-xl px-4 py-2 text-sm font-semibold`}>
                    <Github className="h-4 w-4" /> GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
  )
}