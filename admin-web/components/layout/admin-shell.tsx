"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/api-client";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AdminShell({ children }: PropsWithChildren) {
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const token = getAuthToken();
      if (!token?.trim()) {
        router.replace("/login");
        return;
      }
      setSessionReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router]);

  if (!sessionReady) {
    return (
      <div
        className="grid min-h-screen place-items-center bg-fixed p-6"
        style={{
          backgroundImage: "linear-gradient(135deg, #e8f0ff 0%, #f5f8ff 38%, #fdeef2 72%, #ffe8ea 100%)",
        }}
      >
        <p className="text-sm font-medium text-[var(--text-muted)]">Checking session…</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-fixed p-5"
      style={{
        backgroundImage: "linear-gradient(135deg, #e8f0ff 0%, #f5f8ff 38%, #fdeef2 72%, #ffe8ea 100%)",
      }}
    >
      <div className="flex w-full gap-5">
        <Sidebar />
        <main className="flex min-h-[780px] flex-1 flex-col gap-5">
          <Topbar />
          <div className="flex-1">{children}</div>
        </main>
      </div>
    </div>
  );
}
