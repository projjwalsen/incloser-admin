"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { AdminShell } from "@/components/layout/admin-shell";
import { PageContainer } from "@/components/layout/page-container";
import { CardShell } from "@/components/ui/card-shell";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableShell } from "@/components/ui/table-shell";
import {
  approveWithdrawal,
  fetchWithdrawalById,
  fetchWithdrawals,
  markWithdrawalPaid,
  rejectWithdrawal,
  type WithdrawalRowApi,
} from "@/lib/withdrawals-api";

type WithdrawalTab = "pending" | "approved" | "rejected" | "paid";
type WithdrawalStatus = WithdrawalTab;

type WithdrawalRow = {
  id: string;
  modelId: string;
  modelName: string;
  amount: string;
  requestDate: string;
  payoutMethod: string;
  status: WithdrawalStatus;
  risk: "low" | "medium" | "high";
  bankMasked?: string;
  upiId?: string;
  financeNote?: string;
  /** Set when status becomes `paid`. */
  paidTxnId?: string;
  paidVia?: string;
};

function formatInr(value: number): string {
  return `₹ ${Math.round(value).toLocaleString("en-IN")}`;
}

function formatRequested(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-IN", { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function toUi(row: WithdrawalRowApi): WithdrawalRow {
  return {
    id: row.id,
    modelId: row.modelId,
    modelName: row.modelName,
    amount: formatInr(row.amount),
    requestDate: formatRequested(row.requestedAt),
    payoutMethod: row.payoutMethod,
    status: row.status,
    risk: row.risk,
    bankMasked: row.bankMasked,
    upiId: row.upiId,
    financeNote: row.financeNote,
    paidTxnId: row.paidTxnId,
    paidVia: row.paidVia,
  };
}

function statusVariant(status: WithdrawalStatus) {
  if (status === "pending") return "warning" as const;
  if (status === "approved") return "info" as const;
  if (status === "rejected") return "danger" as const;
  return "success" as const;
}

function riskVariant(risk: WithdrawalRow["risk"]) {
  if (risk === "low") return "success" as const;
  if (risk === "medium") return "warning" as const;
  return "danger" as const;
}

const tabs: { key: WithdrawalTab; label: string; hint: string }[] = [
  { key: "pending", label: "Pending", hint: "Needs finance decision" },
  { key: "approved", label: "Approved", hint: "Ready for payout batch" },
  { key: "rejected", label: "Rejected", hint: "Closed with reason" },
  { key: "paid", label: "Paid", hint: "Completed transfers" },
];

export default function WithdrawalsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<WithdrawalTab>("pending");
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [payModalForId, setPayModalForId] = useState<string | null>(null);
  const [payTxnId, setPayTxnId] = useState("");
  const [payMethod, setPayMethod] = useState("Bank transfer");
  const [payError, setPayError] = useState<string | null>(null);

  const filtered = useMemo(() => rows.filter((r) => r.status === tab), [rows, tab]);

  const selected = selectedId ? rows.find((r) => r.id === selectedId) ?? null : null;

  const openPanel = (id: string) => {
    setSelectedId(id);
    setPanelOpen(true);
    setBanner(null);
  };

  const closePanel = () => {
    setPanelOpen(false);
  };

  const refreshList = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithdrawals();
      setRows(data.map(toUi));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load withdrawals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshList();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const openPayModal = (id: string) => {
    const row = rows.find((r) => r.id === id);
    setPayModalForId(id);
    setPayTxnId("");
    setPayMethod(row?.payoutMethod ?? "Bank transfer");
    setPayError(null);
  };

  const closePayModal = () => {
    setPayModalForId(null);
    setPayError(null);
  };

  const confirmMarkPaid = () => {
    if (!payModalForId) return;
    const trimmed = payTxnId.trim();
    if (!trimmed) {
      setPayError("Enter a transaction ID.");
      return;
    }
    void (async () => {
      try {
        const updated = await markWithdrawalPaid(payModalForId, { txnId: trimmed, paymentMethod: payMethod });
        setRows((prev) => prev.map((r) => (r.id === updated.id ? toUi(updated) : r)));
        if (selectedId === updated.id) {
          const detail = await fetchWithdrawalById(updated.id);
          setRows((prev) => prev.map((r) => (r.id === detail.id ? toUi(detail) : r)));
        }
        setBanner(`${payModalForId} marked paid · ${payMethod} · ${trimmed}.`);
        closePayModal();
      } catch (e) {
        setPayError(e instanceof Error ? e.message : "Failed to mark paid");
      }
    })();
  };

  const runAction = async (id: string, action: "approve" | "reject") => {
    try {
      const updated = action === "approve" ? await approveWithdrawal(id) : await rejectWithdrawal(id);
      setRows((prev) => prev.map((r) => (r.id === updated.id ? toUi(updated) : r)));
      setBanner(`${id} ${action === "approve" ? "approved" : "rejected"}.`);
      if (selectedId === id) {
        const detail = await fetchWithdrawalById(id);
        setRows((prev) => prev.map((r) => (r.id === id ? toUi(detail) : r)));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${action} withdrawal`);
    }
  };

  const counts = useMemo(() => {
    return {
      pending: rows.filter((r) => r.status === "pending").length,
      approved: rows.filter((r) => r.status === "approved").length,
      rejected: rows.filter((r) => r.status === "rejected").length,
      paid: rows.filter((r) => r.status === "paid").length,
    };
  }, [rows]);

  return (
    <AdminShell>
      <PageContainer>
        {banner ? (
          <div className="rounded-[16px] border border-[#c9d8ff] bg-[var(--status-info-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-info-text)]">
            {banner}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-[16px] border border-[#f1c2c9] bg-[var(--status-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--status-danger-text)]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 rounded-[18px] border border-[#e7ecff] bg-white p-2 shadow-[var(--shadow-soft)]">
          {tabs.map((t) => {
            const active = tab === t.key;
            const count =
              t.key === "pending"
                ? counts.pending
                : t.key === "approved"
                  ? counts.approved
                  : t.key === "rejected"
                    ? counts.rejected
                    : counts.paid;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setTab(t.key);
                  setBanner(null);
                }}
                className={`flex min-w-[200px] flex-1 items-center justify-between gap-3 rounded-[14px] px-4 py-3 text-left transition-colors ${
                  active ? "bg-[var(--primary-soft)] text-[var(--primary)]" : "hover:bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                }`}
              >
                <span>
                  <span className="block text-sm font-bold">{t.label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--text-muted)]">{t.hint}</span>
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[var(--text-primary)] shadow-[var(--shadow-soft)]">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <CardShell className="lg:col-span-1">
            <p className="text-body-sm text-[var(--text-muted)]">Total in view</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{filtered.length}</p>
            <div className="mt-3">
              <StatusBadge label={`Tab: ${tab}`} variant="info" />
            </div>
          </CardShell>
          <CardShell className="lg:col-span-1">
            <p className="text-body-sm text-[var(--text-muted)]">High risk items</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{rows.filter((r) => r.risk === "high").length}</p>
            <div className="mt-3">
              <StatusBadge label="Monitor queue" variant="warning" />
            </div>
          </CardShell>
          <CardShell className="lg:col-span-1">
            <p className="text-body-sm text-[var(--text-muted)]">Paid</p>
            <p className="mt-2 text-3xl font-bold text-[var(--text-primary)]">{counts.paid}</p>
            <div className="mt-3">
              <StatusBadge label="Finance healthy" variant="success" />
            </div>
          </CardShell>
        </div>

        <TableShell title="Withdrawal requests" subtitle="Tap a row to open the detail drawer">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[980px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[11%]" />
                <col className="w-[17%]" />
                <col className="w-[17%]" />
                <col className="w-[11%]" />
                <col className="min-w-[220px]" />
              </colgroup>
              <thead className="bg-[var(--surface-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Model</th>
                  <th className="px-5 py-4 font-semibold">Amount</th>
                  <th className="px-5 py-4 font-semibold">Request date</th>
                  <th className="px-5 py-4 font-semibold">Payout method</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filtered.map((row) => (
                  <tr key={row.id} className="cursor-pointer border-t border-[#eef2ff] hover:bg-[#f7f9ff]" onClick={() => openPanel(row.id)}>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <p className="text-base font-semibold text-[var(--text-primary)]">{row.modelName}</p>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge label={`ID ${row.modelId}`} variant="info" />
                          <StatusBadge label={`Risk: ${row.risk}`} variant={riskVariant(row.risk)} />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-base font-bold text-[var(--text-primary)]">{row.amount}</td>
                    <td className="px-5 py-4 text-[var(--text-secondary)]">{row.requestDate}</td>
                    <td className="px-5 py-4 text-[var(--text-secondary)]">{row.payoutMethod}</td>
                    <td className="px-5 py-4">
                      <StatusBadge label={row.status} variant={statusVariant(row.status)} />
                    </td>
                    <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex w-full min-w-0 flex-wrap justify-end gap-2">
                        <SecondaryButton type="button" className="px-3 py-2 text-xs font-semibold" onClick={() => openPanel(row.id)}>
                          Details
                        </SecondaryButton>
                        {row.status === "pending" ? (
                          <>
                            <PrimaryButton
                              type="button"
                              className="px-3 py-2 text-xs"
                              onClick={() => void runAction(row.id, "approve")}
                            >
                              Approve
                            </PrimaryButton>
                            <SecondaryButton
                              type="button"
                              className="px-3 py-2 text-xs"
                              onClick={() => void runAction(row.id, "reject")}
                            >
                              Reject
                            </SecondaryButton>
                          </>
                        ) : null}
                        {row.status === "approved" ? (
                          <PrimaryButton type="button" className="px-3 py-2 text-xs" onClick={() => openPayModal(row.id)}>
                            Mark paid
                          </PrimaryButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {loading ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={6}>
                      Loading withdrawals...
                    </td>
                  </tr>
                ) : null}
                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-[var(--text-muted)]" colSpan={6}>
                      No withdrawals in this tab.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </TableShell>
      </PageContainer>

      {panelOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" aria-label="Close panel backdrop" onClick={closePanel} />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-[#e7ecff] bg-white shadow-[var(--shadow-shell)]">
            <div className="flex items-start justify-between gap-3 border-b border-[#eef2ff] p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Withdrawal detail</p>
                <h2 className="text-heading-2 text-[var(--text-primary)]">{selected?.id ?? "—"}</h2>
                <p className="text-body-sm text-[var(--text-secondary)]">{selected ? `${selected.modelName} · ${selected.amount}` : ""}</p>
              </div>
              <SecondaryButton type="button" className="h-10 w-10 rounded-full p-0" onClick={closePanel} aria-label="Close">
                <X className="size-4" />
              </SecondaryButton>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {selected ? (
                <>
                  <div className="rounded-[16px] border border-[#e7ecff] bg-[var(--surface-muted)] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={selected.status} variant={statusVariant(selected.status)} />
                      <StatusBadge label={`Risk: ${selected.risk}`} variant={riskVariant(selected.risk)} />
                    </div>
                    <dl className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-[var(--text-muted)]">Model</dt>
                        <dd className="text-right font-semibold text-[var(--text-primary)]">{selected.modelName}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[var(--text-muted)]">Model ID</dt>
                        <dd className="text-right font-semibold text-[var(--text-primary)]">{selected.modelId}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[var(--text-muted)]">Requested</dt>
                        <dd className="text-right text-[var(--text-secondary)]">{selected.requestDate}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-[var(--text-muted)]">Payout method</dt>
                        <dd className="text-right text-[var(--text-secondary)]">{selected.payoutMethod}</dd>
                      </div>
                      {selected.bankMasked ? (
                        <div className="flex justify-between gap-4">
                          <dt className="text-[var(--text-muted)]">Destination</dt>
                          <dd className="text-right text-[var(--text-secondary)]">{selected.bankMasked}</dd>
                        </div>
                      ) : null}
                      {selected.upiId ? (
                        <div className="flex justify-between gap-4">
                          <dt className="text-[var(--text-muted)]">UPI</dt>
                          <dd className="text-right text-[var(--text-secondary)]">{selected.upiId}</dd>
                        </div>
                      ) : null}
                      {selected.status === "paid" ? (
                        <>
                          <div className="flex justify-between gap-4">
                            <dt className="text-[var(--text-muted)]">Txn ID</dt>
                            <dd className="text-right font-mono text-xs text-[var(--text-primary)]">{selected.paidTxnId ?? "—"}</dd>
                          </div>
                          <div className="flex justify-between gap-4">
                            <dt className="text-[var(--text-muted)]">Paid via</dt>
                            <dd className="text-right text-[var(--text-secondary)]">{selected.paidVia ?? "—"}</dd>
                          </div>
                        </>
                      ) : null}
                    </dl>
                  </div>

                  <CardShell>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">Finance notes</h3>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      {selected.financeNote ?? "No additional notes for this withdrawal."}
                    </p>
                  </CardShell>

                  <div className="rounded-[16px] border border-dashed border-[#c9d8ff] bg-gradient-to-br from-white to-[#f4f7ff] p-4 text-sm text-[var(--text-secondary)]">
                    Receipt / payout proof upload will live here in the next phase.
                  </div>
                </>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No row selected.</p>
              )}
            </div>

            <div className="border-t border-[#eef2ff] bg-white p-5">
              {selected ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <SecondaryButton type="button" className="flex-1" onClick={() => router.push(`/models/${selected.modelId}`)}>
                    Open model
                  </SecondaryButton>
                  {selected.status === "pending" ? (
                    <>
                      <PrimaryButton
                        type="button"
                        className="flex-1"
                        onClick={() => void runAction(selected.id, "approve")}
                      >
                        Approve
                      </PrimaryButton>
                      <SecondaryButton
                        type="button"
                        className="flex-1"
                        onClick={() => void runAction(selected.id, "reject")}
                      >
                        Reject
                      </SecondaryButton>
                    </>
                  ) : null}
                  {selected.status === "approved" ? (
                    <PrimaryButton type="button" className="flex-1" onClick={() => openPayModal(selected.id)}>
                      Mark paid
                    </PrimaryButton>
                  ) : null}
                  {selected.status === "paid" || selected.status === "rejected" ? (
                    <SecondaryButton type="button" className="flex-1" onClick={() => setBanner("No further actions.")}>
                      Archive
                    </SecondaryButton>
                  ) : null}
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {payModalForId ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 backdrop-blur-sm sm:items-center"
          onClick={closePayModal}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-[20px] border border-white/80 bg-white p-6 shadow-[var(--shadow-shell)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pay-modal-title"
          >
            <h2 id="pay-modal-title" className="text-heading-2 text-[var(--text-primary)]">
              Record payment
            </h2>
            <p className="mt-1 text-body-sm text-[var(--text-muted)]">Enter how this payout was completed. This is stored with the withdrawal record.</p>
            <div className="mt-5 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Transaction ID</label>
                <input
                  className="soft-input"
                  value={payTxnId}
                  onChange={(e) => {
                    setPayTxnId(e.target.value);
                    setPayError(null);
                  }}
                  placeholder="e.g. NEFT12345678901234, UPI ref, gateway id"
                  autoComplete="off"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Payment method</label>
                <select className="soft-input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="Bank transfer">Bank transfer</option>
                  <option value="UPI">UPI</option>
                  <option value="IMPS">IMPS</option>
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="Razorpay">Razorpay</option>
                  <option value="Manual / other">Manual / other</option>
                </select>
              </div>
              {payError ? <p className="text-xs font-semibold text-[var(--status-danger-text)]">{payError}</p> : null}
            </div>
            <div className="mt-6 flex gap-2">
              <SecondaryButton type="button" className="flex-1" onClick={closePayModal}>
                Cancel
              </SecondaryButton>
              <PrimaryButton type="button" className="flex-1" onClick={confirmMarkPaid}>
                Confirm paid
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </AdminShell>
  );
}
