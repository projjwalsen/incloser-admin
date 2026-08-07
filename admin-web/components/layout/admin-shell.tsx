"use client";

import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthToken } from "@/lib/api-client";
import { fetchAdminProfile } from "@/lib/admin-users-api";
import {
  canAccessNav,
  defaultLandingPath,
  getAdminRole,
  setAdminSession,
} from "@/lib/admin-session";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AdminShell({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    void (async () => {
      const token = getAuthToken();
      if (!token?.trim()) {
        router.replace("/login");
        return;
      }

      let role = getAdminRole();
      if (!role) {
        try {
          const profile = await fetchAdminProfile();
          setAdminSession({
            token,
            role: profile.role,
            username: profile.username,
            fullName: profile.fullName,
            email: profile.email,
          });
          role = profile.role;
        } catch {
          router.replace("/login");
          return;
        }
      }

      if (pathname && role && !canAccessNav(pathname, role)) {
        router.replace(defaultLandingPath(role));
        return;
      }

      setSessionReady(true);
    })();
  }, [router, pathname]);

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
