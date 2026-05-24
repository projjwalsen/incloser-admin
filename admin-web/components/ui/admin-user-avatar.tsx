"use client";

import { cn } from "@/lib/cn";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0][0] && parts[1][0]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name.trim().slice(0, 2) || "?").toUpperCase();
}

type AdminUserAvatarProps = {
  imageUrl: string | null;
  name: string;
  /** `sm` = 40px circle (tables); `md` = 56px rounded square (detail headers). */
  size?: "sm" | "md";
};

const shellBySize = {
  sm: "size-10 rounded-full text-sm",
  md: "size-14 rounded-2xl text-lg",
} as const;

/**
 * Onboarding / profile image when `imageUrl` is set (e.g. Supabase Storage public URL); otherwise initials from `name`.
 */
export function AdminUserAvatar({ imageUrl, name, size = "sm" }: AdminUserAvatarProps) {
  const initials = initialsFromName(name);
  const base = cn(
    "flex shrink-0 items-center justify-center overflow-hidden border border-white/80 font-bold text-[var(--primary)] shadow-[var(--shadow-soft)]",
    shellBySize[size],
  );

  if (imageUrl) {
    return (
      <div className={cn(base, "bg-[var(--surface-subtle)] ring-1 ring-black/[0.04]")}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        base,
        "bg-gradient-to-br from-[#e8efff] via-white to-[#f3e9ff]",
        size === "md" && "to-[#fdeef2]",
      )}
    >
      {initials}
    </div>
  );
}
