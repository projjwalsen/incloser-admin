import type { PropsWithChildren } from "react";

export function PageContainer({ children }: PropsWithChildren) {
  return <section className="space-y-5">{children}</section>;
}
