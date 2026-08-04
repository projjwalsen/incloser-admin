import type { FinanceRevenuePayload, FinanceWalletRow } from "@incloser/shared-types";
import { resolveFemaleAvatarImageUrl } from "../lib/femaleAvatarImageUrl.js";
import { isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";
import { billingSettingsService } from "./billingSettings.service.js";

type ProfileEmbed = { nickname: string | null };
type UserEmbed = {
  id: string;
  phone: string | null;
  is_active: boolean | null;
  profiles?: ProfileEmbed | ProfileEmbed[] | null;
};

type WalletRecord = {
  id: string;
  user_id: string;
  rupee_balance: number | string | null;
  token_balance: number | string | null;
  updated_at: string | null;
  created_at: string | null;
  users?: UserEmbed | UserEmbed[] | null;
};

type TxnRow = {
  wallet_id: string;
  amount_rupees: number | string | null;
  source: string | null;
  transaction_type: string | null;
  created_at: string;
};

const SESSION_CHARGE_SOURCES = new Set([
  "text_charge",
  "voice_charge",
  "video_charge",
  "call_charge",
]);
const TOPUP_SOURCES = new Set(["topup", "token_purchase"]);
const MODEL_PAYOUT_SOURCES = new Set(["model_earning", "host_payout"]);

function firstEmbed<T>(row: T | T[] | null | undefined): T | null {
  if (!row) return null;
  return Array.isArray(row) ? (row[0] ?? null) : row;
}

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const diffMs = Date.now() - t;
  if (diffMs < 0) return "just now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function mapWalletStatus(isActive: boolean | null | undefined): FinanceWalletRow["status"] {
  if (isActive === false) return "frozen";
  return "active";
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function lastNDayKeys(n: number): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

async function loadTxnStats(
  walletIds: string[]
): Promise<Map<string, { count: number; lastAt: string | null }>> {
  const map = new Map<string, { count: number; lastAt: string | null }>();
  for (const id of walletIds) {
    map.set(id, { count: 0, lastAt: null });
  }
  if (walletIds.length === 0) return map;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("wallet_id,created_at")
    .in("wallet_id", walletIds)
    .order("created_at", { ascending: false })
    .limit(10_000);

  if (error) {
    if (!isMissingRelationError(error)) {
      console.warn("[finance] wallet txn stats:", pgErrorText(error));
    }
    return map;
  }

  for (const row of (data ?? []) as Array<{ wallet_id: string; created_at: string }>) {
    const cur = map.get(row.wallet_id) ?? { count: 0, lastAt: null };
    cur.count += 1;
    if (!cur.lastAt || row.created_at > cur.lastAt) cur.lastAt = row.created_at;
    map.set(row.wallet_id, cur);
  }
  return map;
}

async function loadFemaleProfileExtras(
  userIds: string[]
): Promise<Map<string, { avatarUrl: string | null; nickname: string | null }>> {
  const out = new Map<string, { avatarUrl: string | null; nickname: string | null }>();
  if (userIds.length === 0) return out;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("female_profiles")
    .select("user_id,avatar_id,nickname")
    .in("user_id", userIds);
  if (error) {
    if (!isMissingRelationError(error)) {
      console.warn("[finance] female profiles:", pgErrorText(error));
    }
    return out;
  }
  for (const row of (data ?? []) as Array<{
    user_id: string;
    avatar_id: string | null;
    nickname: string | null;
  }>) {
    out.set(row.user_id, {
      avatarUrl: resolveFemaleAvatarImageUrl(row.avatar_id),
      nickname: row.nickname,
    });
  }
  return out;
}

async function loadWithdrawalPayoutMetrics(sinceIso: string): Promise<{
  pendingPayoutsInr: number;
  paidOut30dInr: number;
  avgPayoutHours: number;
}> {
  const empty = { pendingPayoutsInr: 0, paidOut30dInr: 0, avgPayoutHours: 0 };
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("withdrawals")
    .select("amount,status,requested_at,created_at,updated_at,paid_at");

  if (error) {
    if (!isMissingRelationError(error)) {
      console.warn("[finance] withdrawals payout metrics:", pgErrorText(error));
    }
    return empty;
  }

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  let pendingPayoutsInr = 0;
  let paidOut30dInr = 0;
  const payoutHours: number[] = [];

  for (const row of rows) {
    const amount = num(row.amount);
    const status = String(row.status ?? "").toLowerCase();
    if (status === "pending" || status === "approved") {
      pendingPayoutsInr += amount;
    }
    if (status === "paid" || status === "completed") {
      const paidAtRaw =
        (typeof row.paid_at === "string" && row.paid_at) ||
        (typeof row.updated_at === "string" && row.updated_at) ||
        null;
      if (paidAtRaw && paidAtRaw >= sinceIso) {
        paidOut30dInr += amount;
      }
      const requested =
        (typeof row.requested_at === "string" && row.requested_at) ||
        (typeof row.created_at === "string" && row.created_at) ||
        null;
      if (requested && paidAtRaw) {
        const hours = (new Date(paidAtRaw).getTime() - new Date(requested).getTime()) / 3_600_000;
        if (Number.isFinite(hours) && hours >= 0) payoutHours.push(hours);
      }
    }
  }

  const avgPayoutHours =
    payoutHours.length > 0
      ? Math.round((payoutHours.reduce((a, b) => a + b, 0) / payoutHours.length) * 10) / 10
      : 0;

  return { pendingPayoutsInr, paidOut30dInr, avgPayoutHours };
}

export const financeService = {
  async wallets(): Promise<FinanceWalletRow[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("wallets")
      .select(
        "id,user_id,rupee_balance,token_balance,updated_at,created_at,users(id,phone,is_active,profiles(nickname))"
      )
      .order("rupee_balance", { ascending: false })
      .limit(500);

    if (error) {
      throw new Error(`Failed to load wallets: ${pgErrorText(error)}`);
    }

    const walletRows = (data ?? []) as WalletRecord[];
    const walletIds = walletRows.map((w) => w.id);
    const userIds = walletRows.map((w) => w.user_id);
    const [txnStats, femaleExtras] = await Promise.all([
      loadTxnStats(walletIds),
      loadFemaleProfileExtras(userIds),
    ]);

    return walletRows.map((row) => {
      const user = firstEmbed(row.users);
      const profile = firstEmbed(user?.profiles ?? null);
      const female = femaleExtras.get(row.user_id);
      const rupee = num(row.rupee_balance);
      const token = num(row.token_balance);
      // Prefer INR ledger balance; fall back to legacy token_balance when unused.
      const balance = rupee !== 0 || token === 0 ? rupee : token;
      const stats = txnStats.get(row.id) ?? { count: 0, lastAt: null };
      const lastAt = stats.lastAt ?? row.updated_at ?? row.created_at;

      return {
        id: row.id,
        userId: row.user_id,
        nickname: profile?.nickname?.trim() || female?.nickname?.trim() || "Unknown",
        avatarImageUrl: female?.avatarUrl ?? null,
        phone: user?.phone ?? "",
        balance,
        txnCount: stats.count,
        lastActivity: formatRelative(lastAt),
        status: mapWalletStatus(user?.is_active),
      };
    });
  },

  async revenue(): Promise<FinanceRevenuePayload> {
    const supabase = getSupabaseAdminClient();
    const since30 = isoDaysAgo(29);
    const since12 = isoDaysAgo(11);
    const dayKeys12 = lastNDayKeys(12);

    const [txRes, billing, payoutMetrics] = await Promise.all([
      supabase
        .from("wallet_transactions")
        .select("wallet_id,amount_rupees,source,transaction_type,created_at")
        .gte("created_at", since30)
        .order("created_at", { ascending: true })
        .limit(20_000),
      billingSettingsService.load(),
      loadWithdrawalPayoutMetrics(since30),
    ]);

    if (txRes.error && !isMissingRelationError(txRes.error)) {
      throw new Error(`Failed to load revenue: ${pgErrorText(txRes.error)}`);
    }

    const rows = (isMissingRelationError(txRes.error) ? [] : (txRes.data ?? [])) as TxnRow[];

    let gross30d = 0;
    let modelPaid30d = 0;
    let tokenSales30d = 0;
    let adjustmentDebit = 0;
    let totalDebitAbs = 0;

    const revenueByDay = new Map<string, number>();
    const topupByDay = new Map<string, number>();
    for (const key of dayKeys12) {
      revenueByDay.set(key, 0);
      topupByDay.set(key, 0);
    }

    for (const row of rows) {
      const amount = Math.abs(num(row.amount_rupees));
      const source = String(row.source ?? "");
      const type = String(row.transaction_type ?? "").toLowerCase();
      const key = dayKey(row.created_at);

      if (SESSION_CHARGE_SOURCES.has(source) && type === "debit") {
        gross30d += amount;
        if (key >= since12.slice(0, 10) && revenueByDay.has(key)) {
          revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + amount);
        }
      }

      if (TOPUP_SOURCES.has(source) && type === "credit") {
        tokenSales30d += amount;
        if (key >= since12.slice(0, 10) && topupByDay.has(key)) {
          topupByDay.set(key, (topupByDay.get(key) ?? 0) + amount);
        }
      }

      if (MODEL_PAYOUT_SOURCES.has(source) && type === "credit") {
        modelPaid30d += amount;
      }

      if (type === "debit") {
        totalDebitAbs += amount;
        if (source === "adjustment") adjustmentDebit += amount;
      }
    }

    // Platform net kept from session GMV after model credits (falls back to configured commission).
    let net30d = Math.max(0, gross30d - modelPaid30d);
    if (gross30d === 0 && tokenSales30d > 0) {
      net30d = (tokenSales30d * billing.platformCommissionPercent) / 100;
    }

    const takeRatePercent =
      gross30d > 0
        ? Math.round((net30d / gross30d) * 1000) / 10
        : Math.round(billing.platformCommissionPercent * 10) / 10;

    const revenueTrend = dayKeys12.map((k) => Math.round(revenueByDay.get(k) ?? 0));
    const tokenSalesTrend = dayKeys12.map((k) => Math.round(topupByDay.get(k) ?? 0));

    // If ledger has model earnings but no withdrawals table payouts, surface ledger credits as paid out.
    const paidOut30dInr =
      payoutMetrics.paidOut30dInr > 0 ? payoutMetrics.paidOut30dInr : modelPaid30d;

    const reversalRatePercent =
      totalDebitAbs > 0
        ? Math.round((adjustmentDebit / totalDebitAbs) * 1000) / 10
        : 0;

    return {
      gross30d: Math.round(gross30d),
      net30d: Math.round(net30d),
      tokenSales30d: Math.round(tokenSales30d),
      takeRatePercent,
      revenueTrend,
      tokenSalesTrend,
      pendingPayoutsInr: Math.round(payoutMetrics.pendingPayoutsInr),
      paidOut30dInr: Math.round(paidOut30dInr),
      avgPayoutHours: payoutMetrics.avgPayoutHours,
      reversalRatePercent,
    };
  },
};
