import { cn } from "@/lib/cn";
import type { BadgeVariant } from "@/types/ui";

const styles: Record<BadgeVariant, string> = {
  success: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
  warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
  danger: "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]",
  info: "bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
};

type StatusBadgeProps = {
  label: string;
  variant?: BadgeVariant;
};

export function StatusBadge({ label, variant = "info" }: StatusBadgeProps) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", styles[variant])}>{label}</span>;
}
