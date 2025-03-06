"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import React from "react";

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps): React.ReactNode {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
