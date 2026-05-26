"use client";

import { Bell, Download, FileText, Filter, Plus, Shield, Upload } from "lucide-react";
import { usePathname } from "next/navigation";
import { SearchBar } from "@/components/ui/search-bar";
import { SecondaryButton } from "@/components/ui/secondary-button";

export function Topbar() {
  const pathname = usePathname() ?? "";
  const isModelDetail = pathname.startsWith("/models/") && pathname !== "/models";
  const isModelsList = pathname === "/models";
  const isUsersList = pathname === "/users";
  const isVerificationProfile = pathname.startsWith("/verification/profile");
  const isVerificationAudio = pathname.startsWith("/verification/audio");
  const isWithdrawals = pathname.startsWith("/withdrawals");
  const isFinanceWallets = pathname.startsWith("/finance/wallets");
  const isFinanceRevenue = pathname.startsWith("/finance/revenue");
  const isCmsBanners = pathname.startsWith("/cms/banners");
  const isCmsAvatars = pathname.startsWith("/cms/avatars");
  const isCmsFaq = pathname.startsWith("/cms/faq");
  const isCmsPolicies = pathname.startsWith("/cms/policies");
  const isSettings = pathname.startsWith("/settings");
  const isAuditLogs = pathname.startsWith("/audit-logs");
  const title = isModelDetail
    ? "Model detail"
    : pathname.startsWith("/models")
      ? "Models"
      : pathname.startsWith("/users")
        ? "Users"
        : isWithdrawals
          ? "Withdrawals"
          : isFinanceWallets
            ? "Finance · Wallets"
            : isFinanceRevenue
              ? "Finance · Revenue"
              : isCmsBanners
                ? "CMS · Banners"
                : isCmsAvatars
                  ? "CMS · Avatars"
                : isCmsFaq
                  ? "CMS · FAQ"
                  : isCmsPolicies
                    ? "CMS · Policies"
                    : isSettings
                      ? "Settings"
                      : isAuditLogs
                        ? "Audit logs"
                        : isVerificationProfile
                          ? "Verification · Profiles"
                          : isVerificationAudio
                            ? "Verification · Audio"
                            : pathname.startsWith("/dashboard")
                              ? "Dashboard"
                              : "Admin";
  const subtitle = pathname.startsWith("/users")
    ? "Manage user accounts, wallets, and lifecycle states."
    : isModelDetail
      ? "Deep dive into profile, verification, earnings, and operational history."
      : pathname.startsWith("/models")
        ? "Review female profiles, verification states, and earnings signals."
        : isWithdrawals
          ? "Approve, reject, mark paid, and keep finance audit trails tight."
          : isFinanceWallets
            ? "Monitor wallet balances, velocity, and account states across the user base."
            : isFinanceRevenue
              ? "Track revenue momentum, token sales, and payout health in one finance view."
              : isCmsBanners
                ? "Manage promotional surfaces with crisp editorial controls."
                : isCmsAvatars
                  ? "Curate onboarding avatars for male and female users."
                : isCmsFaq
                  ? "Keep help center answers accurate, short, and easy to scan."
                  : isCmsPolicies
                    ? "Author canonical legal pages with preview and publish discipline."
                    : isSettings
                      ? "Tune pricing, payouts, languages, feature flags, and support contacts."
                      : isAuditLogs
                        ? "Trace admin actions across entities with fast filters and readable notes."
                        : isVerificationProfile
                          ? "Approve, reject, or request changes on pending female profile submissions."
                          : isVerificationAudio
                            ? "Listen to samples and route approvals, rejections, or resubmits."
                            : "Welcome back to the InCloser admin panel.";
  const searchPlaceholder = pathname.startsWith("/users")
    ? "Search users, phone numbers, cities..."
    : isModelDetail
      ? "Search within this profile…"
      : pathname.startsWith("/models")
        ? "Search models, cities, verification states..."
        : isWithdrawals
          ? "Search withdrawals, models, payout ids..."
          : isFinanceWallets
            ? "Search wallets, ledgers, user ids..."
            : isFinanceRevenue
              ? "Search revenue drivers, SKUs, campaigns…"
              : isCmsBanners
                ? "Search banners, campaigns, asset ids..."
                : isCmsAvatars
                  ? "Search avatar title, category, id..."
                : isCmsFaq
                  ? "Search FAQ entries..."
                  : isCmsPolicies
                    ? "Search policy sections…"
                    : isSettings
                      ? "Search settings keys…"
                      : isAuditLogs
                        ? "Search audit entries…"
                        : isVerificationProfile
                          ? "Search pending profiles, cities, model ids..."
                          : isVerificationAudio
                            ? "Search audio submissions, model ids..."
                            : "Search content, users, reports...";

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-white/75 bg-white/85 p-4 shadow-[var(--shadow-soft)] backdrop-blur-sm">
      <div>
        <h1 className="text-heading-2 text-[var(--text-primary)]">{title}</h1>
        <p className="text-body-sm text-[var(--text-muted)]">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <SearchBar className="w-[350px] shrink-0" placeholder={searchPlaceholder} />
        {isModelsList || isUsersList ? (
          <>
            <SecondaryButton
              type="button"
              className="gap-2 px-4"
              onClick={() =>
                window.dispatchEvent(new Event(isModelsList ? "models:open-filters" : "users:open-filters"))
              }
            >
              <Filter className="size-4" />
              Filters
            </SecondaryButton>
            <SecondaryButton type="button" className="gap-2 px-4">
              <Download className="size-4" />
              Export
            </SecondaryButton>
          </>
        ) : null}
        {isCmsAvatars ? (
          <SecondaryButton type="button" className="gap-2 px-4" onClick={() => window.dispatchEvent(new Event("cms-avatars:open-upload"))}>
            <Upload className="size-4" />
            Upload New Avatar
          </SecondaryButton>
        ) : null}
        {isCmsFaq ? (
          <SecondaryButton type="button" className="gap-2 px-4" onClick={() => window.dispatchEvent(new Event("cms-faq:open-create"))}>
            <Plus className="size-4" />
            New question
          </SecondaryButton>
        ) : null}
        {isCmsPolicies ? (
          <>
            <SecondaryButton
              type="button"
              className="h-10 w-10 rounded-full p-0"
              title="Terms"
              aria-label="Terms"
              onClick={() => window.dispatchEvent(new Event("cms-policies:switch-terms"))}
            >
              <FileText className="size-4" />
            </SecondaryButton>
            <SecondaryButton
              type="button"
              className="h-10 w-10 rounded-full p-0"
              title="Privacy"
              aria-label="Privacy"
              onClick={() => window.dispatchEvent(new Event("cms-policies:switch-privacy"))}
            >
              <Shield className="size-4" />
            </SecondaryButton>
          </>
        ) : null}
        {isAuditLogs ? (
          <SecondaryButton type="button" className="gap-2 px-4" onClick={() => window.dispatchEvent(new Event("audit-logs:reset-filters"))}>
            Reset filters
          </SecondaryButton>
        ) : null}
        {isSettings ? (
          <SecondaryButton type="button" className="gap-2 px-4" onClick={() => window.dispatchEvent(new Event("settings:reset"))}>
            Reset
          </SecondaryButton>
        ) : null}
        <SecondaryButton className="h-10 w-10 rounded-full p-0" type="button" aria-label="Notifications">
          <Bell className="size-4" />
        </SecondaryButton>
      </div>
    </header>
  );
}
