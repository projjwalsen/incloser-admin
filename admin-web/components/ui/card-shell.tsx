import type { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

type CardShellProps = PropsWithChildren<{
  className?: string;
}>;

export function CardShell({ className, children }: CardShellProps) {
  return (
    <section
      className={cn(
        "rounded-[20px] border border-white/80 bg-[var(--surface-primary)] p-5",
        "shadow-[var(--shadow-card)] backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}
