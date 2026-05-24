import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({ className, ...props }: PrimaryButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-[14px] px-4 py-2.5 text-sm font-semibold text-white transition-colors",
        "bg-[var(--primary)] shadow-[var(--shadow-soft)] hover:bg-[var(--primary-hover)]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
