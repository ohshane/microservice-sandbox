"use client"

import React, { createContext, useContext } from "react";

export interface Me {
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
  auth: Me | null;
  setAuth: React.Dispatch<React.SetStateAction<Me | null>>;
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
  const [auth, setAuth] = React.useState<Me | null>(null);

  return <AuthContext.Provider value={{ auth, setAuth }}>{children}</AuthContext.Provider>;
}