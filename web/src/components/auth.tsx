"use client"

import { useToastContext } from '@/context/toast';
import { useAuthContext } from '@/context/auth';
import Link from 'next/link';
import { logout } from '@/services/auth';

export default function LoginButton() {
  const { toasts, addToast } = useToastContext();
  const { auth, setAuth } = useAuthContext();

  const handleLogout = async () => {
    try {
      const res = await logout();
      if (res.status === 200) {
        setAuth(null);
        addToast({ type: "success", content: "Logged out successfully!" });
      } else {
        addToast({ type: "error", content: "Failed to log out. Please try again." });
      }
    } catch {
      addToast({ type: "error", content: "Network error. Please try again." });
    }
  };

  return (
    <>
    {auth ? (
      <button
        onClick={() => {
          handleLogout();
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
    </>
  )
}