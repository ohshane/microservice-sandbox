"use client"

import { useToastContext } from '@/context/toast';
import { useAuthContext } from '@/context/auth';
import Link from 'next/link';
import { logout } from '@/services/auth';

export default function LoginButton() {
  const { toasts, addToast } = useToastContext();
  const { auth, authLoading, setAuth } = useAuthContext();

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
      {authLoading ? (
        <button
          disabled
          className="min-w-20 text-center cursor-not-allowed text-sm border-black/20 bg-black/5 rounded-xl px-4 py-2 font-medium transition border flex items-center justify-center"
        >
          <svg
            className="animate-spin h-5 w-5 text-black/50"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        </button>
      ) : (
        <>
        {auth ? (
          <button
            onClick={() => {
              handleLogout();
            }}
            className={`min-w-20 text-center cursor-pointer text-sm border-black/20 hover:border-black/40 hover:bg-black/5 rounded-xl px-4 py-2 font-medium transition border`}
          >
            Log out
          </button>
        ) : (
          <Link
            href="/login"
            className={`min-w-20 text-center cursor-pointer text-sm border-black/20 hover:border-black/40 hover:bg-black/5 rounded-xl px-4 py-2 font-medium transition border`}
          >
            Log in
          </Link>
        )}
        </>

      )}
    </>
  )
}