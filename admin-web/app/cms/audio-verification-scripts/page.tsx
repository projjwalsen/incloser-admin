"use client";

import { useCallback, useEffect, useState } from "react";
import type { CmsAudioVerificationScript } from "@incloser/shared-types";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PrimaryButton } from "@/components/ui/primary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  fetchAudioVerificationScripts,
  updateAudioVerificationScript,
} from "@/lib/audio-verification-scripts-api";

type DraftRow = {
  languageCode: string;
  languageLabel: string;
  scriptText: string;
  isActive: boolean;
  dirty: boolean;
  saving: boolean;
};

export default function AudioVerificationScriptsPage() {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAudioVerificationScripts();
      setRows(
        data.map((r: CmsAudioVerificationScript) => ({
          languageCode: r.languageCode,
          languageLabel: r.languageLabel,
          scriptText: r.scriptText,
          isActive: r.isActive,
          dirty: false,
          saving: false,
        })),
      );
      setBanner(null);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Failed to load scripts");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const updateLocal = (languageCode: string, patch: Partial<DraftRow>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.languageCode === languageCode ? { ...r, ...patch, dirty: true } : r,
      ),
    );
  };

  const saveRow = async (languageCode: string) => {
    const row = rows.find((r) => r.languageCode === languageCode);
    if (!row) return;
    if (!row.scriptText.trim()) {
      setBanner("Script text cannot be empty.");
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.languageCode === languageCode ? { ...r, saving: true } : r)),
    );
    try {
      const saved = await updateAudioVerificationScript(languageCode, {
        scriptText: row.scriptText,
        isActive: row.isActive,
      });
      setRows((prev) =>
        prev.map((r) =>
          r.languageCode === languageCode
            ? {
                languageCode: saved.languageCode,
                languageLabel: saved.languageLabel,
                scriptText: saved.scriptText,
                isActive: saved.isActive,
                dirty: false,
                saving: false,
              }
            : r,
        ),
      );
      setBanner(`Saved ${saved.languageLabel} script.`);
    } catch (e) {
      setBanner(e instanceof Error ? e.message : "Failed to save script");
      setRows((prev) =>
        prev.map((r) => (r.languageCode === languageCode ? { ...r, saving: false } : r)),
      );
    }
  };

  return (
    <AdminShell>
      <PageContainer>
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-heading-1 text-[var(--text-primary)]">Voice verification scripts</h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Text models read aloud during audio verification, one script per language.
            </p>
          </div>
        </div>

        {banner ? (
          <div className="mb-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 py-3 text-sm text-[var(--text-primary)]">
            {banner}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">Loading scripts…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No scripts found. Run <code>supabase/cms_audio_verification_scripts.sql</code> then reload.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {rows.map((row) => (
              <section
                key={row.languageCode}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[var(--text-primary)]">
                      {row.languageLabel}
                    </h2>
                    <p className="text-xs text-[var(--text-secondary)]">code: {row.languageCode}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge
                      variant={row.isActive ? "success" : "danger"}
                      label={row.isActive ? "Active" : "Inactive"}
                    />
                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={row.isActive}
                        onChange={(e) =>
                          updateLocal(row.languageCode, { isActive: e.target.checked })
                        }
                      />
                      Show in app
                    </label>
                  </div>
                </div>
                <textarea
                  value={row.scriptText}
                  onChange={(e) => updateLocal(row.languageCode, { scriptText: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-primary)]"
                  placeholder="Lines the model should speak…"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-[var(--text-secondary)]">
                    {row.dirty ? "Unsaved changes" : "Synced"}
                  </p>
                  <PrimaryButton
                    type="button"
                    disabled={!row.dirty || row.saving}
                    onClick={() => void saveRow(row.languageCode)}
                  >
                    {row.saving ? "Saving…" : "Save"}
                  </PrimaryButton>
                </div>
              </section>
            ))}
          </div>
        )}
      </PageContainer>
    </AdminShell>
  );
}
