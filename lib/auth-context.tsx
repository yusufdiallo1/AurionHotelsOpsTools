"use client";

import { createContext, useContext } from "react";
import type { Role } from "@/lib/auth";

export type AuthValue = {
  userId: string | null;
  role: Role | null;
  fullName: string;
  propertyId: string | null;
};

const AuthContext = createContext<AuthValue>({
  userId: null,
  role: null,
  fullName: "",
  propertyId: null,
});

export function AuthProvider({
  value,
  children,
}: {
  value: AuthValue;
  children: React.ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  return useContext(AuthContext);
}
