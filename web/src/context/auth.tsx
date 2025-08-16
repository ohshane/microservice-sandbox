"use client"

import { getMe, refresh } from '@/services/auth';
import React, { createContext, useContext, useEffect, useState } from "react";

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
  authLoading: boolean;
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
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        let res = await getMe();
        if (res.status === 200) {
          setAuth((await res.json()).data);
          return;
        }

        res = await refresh();
        if (res.status !== 200) {
          setAuth(null)
          return;
        }

        res = await getMe();
        if (res.status === 200) {
          setAuth((await res.json()).data);
          return;
        }
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  return <AuthContext.Provider value={{ authLoading, auth, setAuth }}>{children}</AuthContext.Provider>;
}