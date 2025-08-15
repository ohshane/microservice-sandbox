"use client"

import { auth as authservice } from '@/services';
import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from 'next/navigation';

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

export interface AuthContextType {
  auth: User | null
  setAuth: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      let res = await authservice.me();
      if (res.status === 200) {
        setAuth(await res.json());
        return;
      }

      res = await authservice.refresh();
      if (res.status !== 200) {
        setAuth(null)
        return;
      }

      res = await authservice.me();
      if (res.status === 200) {
        setAuth(await res.json());
        return;
      }
    })();
  }, [router]);

  return <AuthContext.Provider value={{ auth, setAuth }}>{children}</AuthContext.Provider>;
}