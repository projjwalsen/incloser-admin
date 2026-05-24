import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SecondaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function SecondaryButton({ className, ...props }: SecondaryButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[14px] px-4 py-2.5 text-sm font-semibold transition-colors",
        "border border-[#d8e2ff] bg-white text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
