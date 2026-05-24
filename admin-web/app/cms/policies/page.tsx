"use client";

import { useCallback, useEffect, useState } from "react";
import type { CmsPoliciesResponse } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchCmsPolicies } from "@/lib/cms-api";

type PolicyKey = "terms" | "privacy";

export default function CmsPoliciesPage() {
  const [policy, setPolicy] = useState<PolicyKey>("terms");
  const [policies, setPolicies] = useState<CmsPoliciesResponse | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [banner, setBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await fetchCmsPolicies();
          setPolicies(data);
          setDraftBody(data.terms.body);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Failed to load policies");
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const active = policies ? policies[policy] : null;

  const switchPolicy = useCallback(
    (next: PolicyKey) => {
      if (!policies) return;
      setPolicy(next);
      setDraftBody(policies[next].body);
      setBanner(null);
    },
    [policies],
  );

  const commit = (mode: "draft" | "publish") => {
    if (!policies || !active) return;
    // TODO: Wire POST/PATCH /api/admin/cms/policies when write endpoints exist; versioning + audit should run server-side.
    const now = new Date().toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
    setPolicies((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [policy]: { ...prev[policy], body: draftBody, updatedAt: now },
      };
    });
    setBanner(
      mode === "draft" ? `${active.title} draft saved locally (not persisted).` : `${active.title} published locally (not persisted).`,
    );
  };

  useEffect(() => {
    const onTerms = () => switchPolicy("terms");
    const onPrivacy = () => switchPolicy("privacy");
    window.addEventListener("cms-policies:switch-terms", onTerms);
    window.addEventListener("cms-policies:switch-privacy", onPrivacy);
    return () => {
      window.removeEventListener("cms-policies:switch-terms", onTerms);
      window.removeEventListener("cms-policies:switch-privacy", onPrivacy);
    };
  }, [switchPolicy]);

  return (
    <AdminShell>
      <PageContainer>
        {error ? (
          <div className="rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">{error}</div>
        ) : null}
        {banner ? (
          <div className="rounded-[16px] border border-[#c9ead9] bg-[var(--status-success-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-success-text)]">{banner}</div>
        ) : null}

        {loading ? (
          <CardShell>
            <p className="text-sm text-[var(--text-muted)]">Loading policies…</p>
          </CardShell>
        ) : null}

        {!loading && policies && active ? (
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <CardShell>
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-heading-2 text-[var(--text-primary)]">{active.title}</h2>
                  <p className="text-body-sm text-[var(--text-muted)]">Last updated · {active.updatedAt}</p>
                </div>
                <StatusBadge label="Draft workspace" variant="info" />
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-xs font-semibold text-[var(--text-secondary)]">Content</label>
                <textarea
                  className="soft-input min-h-[420px] w-full resize-y font-mono text-sm leading-relaxed"
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                />
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <PrimaryButton type="button" className="flex-1" onClick={() => commit("publish")}>
                  Publish
                </PrimaryButton>
                <SecondaryButton type="button" className="flex-1" onClick={() => commit("draft")}>
                  Save draft
                </SecondaryButton>
              </div>
            </CardShell>

            <div className="space-y-4">
              <CardShell>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Editorial checklist</h3>
                <ul className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                  <li>• Replace placeholder copy with counsel-approved language.</li>
                  <li>• Add version notes for each publish event.</li>
                  <li>• Link policy changes to in-app notices (later).</li>
                </ul>
              </CardShell>

              <CardShell>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">Preview</h3>
                <div className="mt-3 max-h-[360px] overflow-y-auto rounded-[16px] border border-[#e7ecff] bg-white p-4 text-sm leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap">
                  {draftBody}
                </div>
              </CardShell>
            </div>
          </div>
        ) : null}

        {!loading && !policies && !error ? (
          <CardShell>
            <p className="text-sm text-[var(--text-muted)]">No policy data available.</p>
          </CardShell>
        ) : null}
      </PageContainer>
    </AdminShell>
  );
}
