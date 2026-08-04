"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminRole, AdminUserAccount } from "@incloser/shared-types";
import { Plus, RefreshCw, UserCog } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableShell } from "@/components/ui/table-shell";
import {
  createAdminUser,
  fetchAdminProfile,
  fetchAdminUsers,
  updateAdminUser,
} from "@/lib/admin-users-api";
import { getAuthToken } from "@/lib/api-client";
import { getAdminRole, setAdminSession } from "@/lib/admin-session";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super admin",
  operations_admin: "Agencies + verification",
  verification_admin: "Verification only",
};

function roleLabel(role: AdminRole): string {
  return ROLE_LABELS[role] ?? role;
}

function validateCreateInput(input: {
  username: string;
  fullName: string;
  password: string;
}): string | null {
  const username = input.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return "Username must be 3–32 characters (letters, numbers, . _ - only).";
  }
  if (!input.fullName.trim()) {
    return "Full name is required.";
  }
  if (input.password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  return null;
}

export default function TeamSettingsPage() {
  const [rows, setRows] = useState<AdminUserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"operations_admin" | "verification_admin">("operations_admin");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setRows(await fetchAdminUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const token = getAuthToken();
      if (!token) return;

      let role = getAdminRole();
      if (!role) {
        try {
          const profile = await fetchAdminProfile();
          setAdminSession({
            token,
            role: profile.role,
            username: profile.username,
            fullName: profile.fullName,
            email: profile.email,
          });
          role = profile.role;
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not verify admin session");
          setLoading(false);
          return;
        }
      }

      if (role !== "super_admin") {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      await load();
    })();
  }, [load]);

  const staffRows = useMemo(
    () => rows.filter((r) => r.role !== "super_admin"),
    [rows],
  );

  const onCreate = async () => {
    const validationError = validateCreateInput({ username, fullName, password });
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await createAdminUser({
        username: username.trim().toLowerCase(),
        password,
        fullName: fullName.trim(),
        role,
      });
      setModalOpen(false);
      setUsername("");
      setFullName("");
      setPassword("");
      setRole("operations_admin");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create user");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: AdminUserAccount) => {
    try {
      setError(null);
      await updateAdminUser(row.id, { isActive: !row.isActive });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update user");
    }
  };

  return (
    <AdminShell>
      <PageContainer>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-heading-1 text-[var(--text-primary)]">Team accounts</h1>
            <p className="mt-1 text-body-sm text-[var(--text-muted)]">
              Create staff logins for agency management and model verification.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => void load()} disabled={loading}>
              <RefreshCw className="size-4" />
              Refresh
            </SecondaryButton>
            <PrimaryButton onClick={() => setModalOpen(true)}>
              <Plus className="size-4" />
              Add team member
            </PrimaryButton>
          </div>
        </div>

        {accessDenied ? (
          <div className="mb-4 rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            Only super admins can manage team accounts. Sign out and sign in with a super admin account.
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {error}
          </div>
        ) : null}

        <CardShell className="mb-6">
          <div className="flex items-start gap-3">
            <UserCog className="mt-0.5 size-5 text-[var(--primary)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Staff roles</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                <strong>Agencies + verification</strong> — manage agencies and approve model accounts.
                <br />
                <strong>Verification only</strong> — profile and audio verification queues only.
              </p>
            </div>
          </div>
        </CardShell>

        <TableShell title="CMS team members" subtitle={loading ? "Loading…" : `${staffRows.length} staff account(s)`}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#e7ecff] text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-semibold">Username</th>
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#f0f3ff]">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{row.username}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{row.fullName || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusBadge label={roleLabel(row.role)} variant="info" />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        label={row.isActive ? "Active" : "Disabled"}
                        variant={row.isActive ? "success" : "danger"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <SecondaryButton onClick={() => void toggleActive(row)}>
                        {row.isActive ? "Disable" : "Enable"}
                      </SecondaryButton>
                    </td>
                  </tr>
                ))}
                {!loading && staffRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                      No staff accounts yet. Add a team member to get started.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </TableShell>

        {modalOpen ? (
          <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-[24px] border border-white/80 bg-white p-6 shadow-xl">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Add team member</h3>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                They will sign in with username and password.
              </p>
              <div className="mt-4 space-y-3">
                <input
                  className="soft-input w-full"
                  placeholder="Username (e.g. ops.riya)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <input
                  className="soft-input w-full"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <input
                  className="soft-input w-full"
                  type="password"
                  placeholder="Password (min 8 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <select
                  className="soft-input w-full"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "operations_admin" | "verification_admin")}
                >
                  <option value="operations_admin">Agencies + verification</option>
                  <option value="verification_admin">Verification only</option>
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <SecondaryButton onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </SecondaryButton>
                <PrimaryButton onClick={() => void onCreate()} disabled={saving}>
                  {saving ? "Creating…" : "Create account"}
                </PrimaryButton>
              </div>
            </div>
          </div>
        ) : null}
      </PageContainer>
    </AdminShell>
  );
}
