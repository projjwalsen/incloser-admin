import type { PropsWithChildren } from "react";
import { PublicSiteShell } from "@/components/public/public-site-shell";

export default function PublicMarketingLayout({ children }: PropsWithChildren) {
  return <PublicSiteShell>{children}</PublicSiteShell>;
}
