"use client";

import React from "react";
import { Toaster } from "sonner";

import { QueryProvider } from "./query-provider";
import { SessionProvider } from "./session-provider";
import { ThemeProvider } from "./theme-provider";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps): React.ReactNode {
  return (
    <ThemeProvider defaultTheme="system" storageKey="claude-batch-theme">
      <SessionProvider>
        <QueryProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </QueryProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
