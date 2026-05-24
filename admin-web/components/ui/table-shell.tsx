import type { PropsWithChildren } from "react";
import { CardShell } from "./card-shell";

type TableShellProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
}>;

export function TableShell({ title, subtitle, children }: TableShellProps) {
  return (
    <CardShell className="w-full">
      <div className="mb-4">
        <h3 className="text-heading-2 text-[var(--text-primary)]">{title}</h3>
        {subtitle ? <p className="text-body-sm text-[var(--text-muted)]">{subtitle}</p> : null}
      </div>
      <div className="w-full overflow-hidden rounded-[14px] border border-[#e4ebff] bg-white">{children}</div>
    </CardShell>
  );
}
