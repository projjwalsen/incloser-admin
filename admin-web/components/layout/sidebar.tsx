"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { useCallback, useState } from "react";
import {
  ChevronDown,
  CircleUserRound,
  FileSearch,
  HelpCircle,
  Home,
  Images,
  Landmark,
  LineChart,
  LogOut,
  Mic2,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { clearAdminAuth } from "@/lib/api-client";

type NavIcon = ComponentType<{ className?: string }>;

type NavLeaf = {
  href: string;
  label: string;
  icon: NavIcon;
};

type NavGroup = {
  kind: "group";
  id: string;
  label: string;
  icon: NavIcon;
  items: NavLeaf[];
};

type NavSingle = {
  kind: "link";
  href: string;
  label: string;
  icon: NavIcon;
};

const navStructure: (NavSingle | NavGroup)[] = [
  { kind: "link", href: "/dashboard", label: "Dashboard", icon: Home },
  {
    kind: "group",
    id: "all-user",
    label: "All User",
    icon: Users,
    items: [
      { href: "/models", label: "Models", icon: Sparkles },
      { href: "/users", label: "Users", icon: Users },
    ],
  },
  {
    kind: "group",
    id: "verification",
    label: "Verification",
    icon: ShieldCheck,
    items: [
      { href: "/verification/profile", label: "Profile", icon: ShieldCheck },
      { href: "/verification/audio", label: "Audio", icon: Mic2 },
    ],
  },
  {
    kind: "group",
    id: "finance",
    label: "Finance",
    icon: Landmark,
    items: [
      { href: "/finance/wallets", label: "Wallet", icon: Landmark },
      { href: "/finance/revenue", label: "Revenue", icon: LineChart },
    ],
  },
  { kind: "link", href: "/withdrawals", label: "Withdrawal", icon: Wallet },
  {
    kind: "group",
    id: "cms",
    label: "CMS",
    icon: Images,
    items: [
      { href: "/cms/banners", label: "Banner", icon: Images },
      { href: "/cms/avatars", label: "Avatars", icon: CircleUserRound },
      { href: "/cms/faq", label: "FAQ", icon: HelpCircle },
      { href: "/cms/policies", label: "Policies", icon: ScrollText },
    ],
  },
  { kind: "link", href: "/audit-logs", label: "Audit Logs", icon: FileSearch },
  { kind: "link", href: "/settings", label: "Settings", icon: Settings },
];

function childPrefixes(items: NavLeaf[]) {
  return items.map((i) => i.href);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  const logout = () => {
    clearAdminAuth();
    router.push("/login");
    router.refresh();
  };

  const isGroupExpanded = useCallback(
    (group: NavGroup) => {
      const prefixes = childPrefixes(group.items);
      if (prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
      return !collapsed.has(group.id);
    },
    [pathname, collapsed],
  );

  const toggleGroup = (group: NavGroup) => {
    const prefixes = childPrefixes(group.items);
    if (prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group.id)) next.delete(group.id);
      else next.add(group.id);
      return next;
    });
  };

  const linkActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="flex h-full w-[260px] flex-col rounded-[24px] border border-white/80 bg-white/90 p-4 shadow-[var(--shadow-card)] backdrop-blur-sm">
      <div className="mb-6 px-2">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">InCloser</p>
        <h2 className="mt-1 text-lg font-bold text-[var(--text-primary)]">Admin CMS</h2>
      </div>
      <nav className="soft-scroll flex-1 space-y-0.5 overflow-y-auto pr-0.5">
        {navStructure.map((entry) => {
          if (entry.kind === "link") {
            const active = linkActive(entry.href);
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={cn(
                  "flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
                )}
              >
                <entry.icon className="size-4 shrink-0" />
                {entry.label}
              </Link>
            );
          }

          const expanded = isGroupExpanded(entry);
          const groupHasActive = entry.items.some((i) => linkActive(i.href));

          return (
            <div key={entry.id} className="pt-1">
              <button
                type="button"
                onClick={() => toggleGroup(entry)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                  groupHasActive ? "text-[var(--primary)]" : "text-[var(--text-primary)]",
                  "hover:bg-[var(--surface-muted)]",
                )}
                aria-expanded={expanded}
              >
                <entry.icon className="size-4 shrink-0 text-[var(--text-secondary)]" />
                <span className="flex-1">{entry.label}</span>
                <ChevronDown
                  className={cn("size-4 shrink-0 text-[var(--text-muted)] transition-transform", expanded ? "rotate-0" : "-rotate-90")}
                />
              </button>
              {expanded ? (
                <ul className="mt-0.5 space-y-0.5 border-l border-[#e4ebff] pl-2 ml-4 py-1">
                  {entry.items.map((item) => {
                    const active = linkActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-2.5 rounded-[12px] px-3 py-2 text-sm font-medium transition-colors",
                            active ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
                          )}
                        >
                          <item.icon className="size-3.5 shrink-0 opacity-80" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          );
        })}
        <div className="mt-2 border-t border-[#e7ecff] pt-2">
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)]"
          >
            <LogOut className="size-4 shrink-0" />
            Log out
          </button>
        </div>
      </nav>
    </aside>
  );
}
