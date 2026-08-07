import { randomBytes } from "node:crypto";
import type {
  AgencyCommissionRow,
  AgencyDetail,
  AgencyModelRow,
  AgencySummary,
  AgencyWithdrawalRequest,
  AgencyWithdrawalStatus,
} from "@incloser/shared-types";
import { assertServiceRoleAccess, missingAgencyTablesMessage } from "../lib/requireServiceRole.js";
import { hashPassword } from "../lib/password.js";
import { isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";
import { agencySettingsService } from "./agencySettings.service.js";

type AgencyRow = {
  id: string;
  name: string;
  code: string;
  commission_percent: number | string;
  available_balance_inr: number | string;
  lifetime_commission_inr: number | string;
  fy_paid_out_inr?: number | string;
  is_active: boolean;
  created_at: string;
};

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function mapAgencySummary(row: AgencyRow, modelCount = 0): AgencySummary {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    commissionPercent: num(row.commission_percent),
    availableBalanceInr: num(row.available_balance_inr),
    lifetimeCommissionInr: num(row.lifetime_commission_inr),
    modelCount,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
  };
}

function generateAgencyCode(): string {
  const bytes = randomBytes(6);
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

async function allocateUniqueCode(maxAttempts = 12): Promise<string> {
  const supabase = getSupabaseAdminClient();
  for (let i = 0; i < maxAttempts; i += 1) {
    const code = generateAgencyCode();
    const { data, error } = await supabase.from("agencies").select("id").eq("code", code).maybeSingle();
    if (error && !isMissingRelationError(error)) {
      throw new Error(`Agency code check failed: ${pgErrorText(error)}`);
    }
    if (!data) return code;
  }
  throw new Error("Could not allocate a unique agency code. Try again.");
}

async function modelCountsByAgency(agencyIds: string[]): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  for (const id of agencyIds) map.set(id, 0);
  if (agencyIds.length === 0) return map;

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("female_profiles")
    .select("agency_id")
    .in("agency_id", agencyIds);
  if (error) {
    if (!isMissingRelationError(error)) {
      console.warn("[agencies] model counts:", pgErrorText(error));
    }
    return map;
  }
  for (const row of (data ?? []) as Array<{ agency_id: string | null }>) {
    if (!row.agency_id) continue;
    map.set(row.agency_id, (map.get(row.agency_id) ?? 0) + 1);
  }
  return map;
}

function mapWithdrawal(
  row: Record<string, unknown>,
  agencyName: string,
  agencyCode: string
): AgencyWithdrawalRequest {
  return {
    id: String(row.id),
    agencyId: String(row.agency_id),
    agencyName,
    agencyCode,
    requestedAmountInr: num(row.requested_amount_inr),
    platformChargeInr: num(row.platform_charge_inr),
    tdsInr: num(row.tds_inr),
    netPayoutInr: num(row.net_payout_inr),
    status: (String(row.status ?? "pending") as AgencyWithdrawalStatus) || "pending",
    payoutMethod: typeof row.payout_method === "string" ? row.payout_method : null,
    bankMasked: typeof row.bank_masked === "string" ? row.bank_masked : null,
    upiId: typeof row.upi_id === "string" ? row.upi_id : null,
    financeNote: typeof row.finance_note === "string" ? row.finance_note : null,
    paidTxnId: typeof row.paid_txn_id === "string" ? row.paid_txn_id : null,
    paidVia: typeof row.paid_via === "string" ? row.paid_via : null,
    requestedAt: String(row.requested_at ?? row.created_at ?? new Date(0).toISOString()),
    processedAt: typeof row.processed_at === "string" ? row.processed_at : null,
  };
}

/** Compute TDS for an agency payout against FY paid-out tracker. */
export function computeAgencyPayoutBreakdown(input: {
  requestedAmountInr: number;
  platformChargePercent: number;
  tdsPercent: number;
  tdsThresholdInr: number;
  fyPaidOutInr: number;
}): {
  platformChargeInr: number;
  tdsInr: number;
  netPayoutInr: number;
} {
  const requested = Math.max(0, input.requestedAmountInr);
  const platformChargeInr =
    Math.round(((requested * input.platformChargePercent) / 100) * 100) / 100;
  const afterPlatform = Math.max(0, requested - platformChargeInr);

  const projectedFy = input.fyPaidOutInr + afterPlatform;
  let tdsInr = 0;
  if (projectedFy > input.tdsThresholdInr) {
    const taxable = Math.max(0, afterPlatform - Math.max(0, input.tdsThresholdInr - input.fyPaidOutInr));
    tdsInr = Math.round(((taxable * input.tdsPercent) / 100) * 100) / 100;
  }

  const netPayoutInr = Math.max(0, Math.round((afterPlatform - tdsInr) * 100) / 100);
  return { platformChargeInr, tdsInr, netPayoutInr };
}

export const agenciesService = {
  async list(): Promise<AgencySummary[]> {
    assertServiceRoleAccess("Agency list");
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("agencies")
      .select(
        "id,name,code,commission_percent,available_balance_inr,lifetime_commission_inr,is_active,created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingRelationError(error)) {
        throw new Error(missingAgencyTablesMessage());
      }
      throw new Error(`Agencies list failed: ${pgErrorText(error)}`);
    }

    const rows = (data ?? []) as AgencyRow[];
    const counts = await modelCountsByAgency(rows.map((r) => r.id));
    return rows.map((r) => mapAgencySummary(r, counts.get(r.id) ?? 0));
  },

  async create(input: {
    name: string;
    password: string;
    commissionPercent?: number;
  }): Promise<AgencySummary> {
    assertServiceRoleAccess("Agency create");
    const name = input.name.trim();
    if (!name) throw new Error("Agency name is required");
    if (!input.password || input.password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const settings = await agencySettingsService.load();
    const commissionPercent =
      input.commissionPercent != null && Number.isFinite(input.commissionPercent)
        ? Number(input.commissionPercent)
        : settings.defaultAgencyCommissionPercent;

    if (commissionPercent < 0 || commissionPercent > 100) {
      throw new Error("Commission percent must be between 0 and 100");
    }

    const code = await allocateUniqueCode();
    const passwordHash = await hashPassword(input.password);
    const supabase = getSupabaseAdminClient();

    const { data, error } = await supabase
      .from("agencies")
      .insert({
        name,
        code,
        password_hash: passwordHash,
        commission_percent: commissionPercent,
        is_active: true,
      })
      .select(
        "id,name,code,commission_percent,available_balance_inr,lifetime_commission_inr,is_active,created_at"
      )
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        throw new Error(missingAgencyTablesMessage());
      }
      if (error.code === "42501") {
        throw new Error(
          "Create agency blocked by Supabase RLS. Set SUPABASE_SERVICE_ROLE_KEY on the server (not the anon key).",
        );
      }
      throw new Error(`Create agency failed: ${pgErrorText(error)}`);
    }

    return mapAgencySummary(data as AgencyRow, 0);
  },

  async detail(id: string): Promise<AgencyDetail | null> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("agencies")
      .select(
        "id,name,code,commission_percent,available_balance_inr,lifetime_commission_inr,fy_paid_out_inr,is_active,created_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) return null;
      throw new Error(`Agency detail failed: ${pgErrorText(error)}`);
    }
    if (!data) return null;

    const agency = data as AgencyRow;
    const [models, commissions, withdrawals] = await Promise.all([
      this.listModels(id),
      this.listCommissions(id),
      this.listWithdrawalsForAgency(id, agency.name, agency.code),
    ]);

    return {
      ...mapAgencySummary(agency, models.length),
      models,
      recentCommissions: commissions,
      withdrawalRequests: withdrawals,
    };
  },

  async listModels(agencyId: string): Promise<AgencyModelRow[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("female_profiles")
      .select("id,user_id,nickname,verification_status,created_at,users(phone)")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false });

    if (error) {
      if (isMissingRelationError(error)) return [];
      throw new Error(`Agency models failed: ${pgErrorText(error)}`);
    }

    const profiles = (data ?? []) as Array<{
      id: string;
      user_id: string | null;
      nickname: string | null;
      verification_status: string | null;
      created_at: string;
      users?: { phone: string | null } | Array<{ phone: string | null }> | null;
    }>;

    const commissionByModel = await this.commissionTotalsByModel(agencyId);

    return profiles.map((p) => {
      const user = Array.isArray(p.users) ? p.users[0] : p.users;
      return {
        modelId: p.id,
        userId: p.user_id,
        nickname: p.nickname?.trim() || "Unknown",
        phone: user?.phone ?? null,
        verificationStatus: p.verification_status ?? "pending",
        lifetimeCommissionInr: commissionByModel.get(p.id) ?? 0,
        createdAt: p.created_at,
      };
    });
  },

  async commissionTotalsByModel(agencyId: string): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("agency_commission_ledger")
      .select("model_id,commission_inr")
      .eq("agency_id", agencyId)
      .limit(20_000);
    if (error) {
      if (!isMissingRelationError(error)) {
        console.warn("[agencies] commission totals:", pgErrorText(error));
      }
      return map;
    }
    for (const row of (data ?? []) as Array<{ model_id: string; commission_inr: number | string }>) {
      map.set(row.model_id, (map.get(row.model_id) ?? 0) + num(row.commission_inr));
    }
    return map;
  },

  async listCommissions(agencyId: string, limit = 50): Promise<AgencyCommissionRow[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("agency_commission_ledger")
      .select("id,model_id,gross_withdrawal_inr,commission_percent,commission_inr,note,created_at")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (isMissingRelationError(error)) return [];
      throw new Error(`Agency commissions failed: ${pgErrorText(error)}`);
    }

    const rows = (data ?? []) as Array<{
      id: string;
      model_id: string;
      gross_withdrawal_inr: number | string;
      commission_percent: number | string;
      commission_inr: number | string;
      note: string | null;
      created_at: string;
    }>;

    const modelIds = Array.from(new Set(rows.map((r) => r.model_id)));
    const nameMap = new Map<string, string>();
    if (modelIds.length > 0) {
      const { data: profiles } = await supabase
        .from("female_profiles")
        .select("id,nickname")
        .in("id", modelIds);
      for (const p of (profiles ?? []) as Array<{ id: string; nickname: string | null }>) {
        nameMap.set(p.id, p.nickname?.trim() || "Unknown");
      }
    }

    return rows.map((r) => ({
      id: r.id,
      modelId: r.model_id,
      modelName: nameMap.get(r.model_id) ?? "Unknown",
      grossWithdrawalInr: num(r.gross_withdrawal_inr),
      commissionPercent: num(r.commission_percent),
      commissionInr: num(r.commission_inr),
      note: r.note,
      createdAt: r.created_at,
    }));
  },

  async listWithdrawalsForAgency(
    agencyId: string,
    agencyName: string,
    agencyCode: string
  ): Promise<AgencyWithdrawalRequest[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("agency_withdrawal_requests")
      .select("*")
      .eq("agency_id", agencyId)
      .order("requested_at", { ascending: false });

    if (error) {
      if (isMissingRelationError(error)) return [];
      throw new Error(`Agency withdrawals failed: ${pgErrorText(error)}`);
    }

    return ((data ?? []) as Array<Record<string, unknown>>).map((r) =>
      mapWithdrawal(r, agencyName, agencyCode)
    );
  },

  async listAllWithdrawals(): Promise<AgencyWithdrawalRequest[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("agency_withdrawal_requests")
      .select("*")
      .order("requested_at", { ascending: false })
      .limit(500);

    if (error) {
      if (isMissingRelationError(error)) return [];
      throw new Error(`Agency withdrawals list failed: ${pgErrorText(error)}`);
    }

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const agencyIds = Array.from(new Set(rows.map((r) => String(r.agency_id))));
    const agencyMap = new Map<string, { name: string; code: string }>();
    if (agencyIds.length > 0) {
      const { data: agencies } = await supabase
        .from("agencies")
        .select("id,name,code")
        .in("id", agencyIds);
      for (const a of (agencies ?? []) as Array<{ id: string; name: string; code: string }>) {
        agencyMap.set(a.id, { name: a.name, code: a.code });
      }
    }

    return rows.map((r) => {
      const meta = agencyMap.get(String(r.agency_id)) ?? { name: "Unknown", code: "—" };
      return mapWithdrawal(r, meta.name, meta.code);
    });
  },

  async update(
    id: string,
    patch: {
      name?: string;
      password?: string;
      commissionPercent?: number;
      isActive?: boolean;
    }
  ): Promise<AgencySummary> {
    const supabase = getSupabaseAdminClient();
    const payload: Record<string, unknown> = {};
    if (patch.name != null) {
      const name = patch.name.trim();
      if (!name) throw new Error("Agency name is required");
      payload.name = name;
    }
    if (patch.commissionPercent != null) {
      if (patch.commissionPercent < 0 || patch.commissionPercent > 100) {
        throw new Error("Commission percent must be between 0 and 100");
      }
      payload.commission_percent = patch.commissionPercent;
    }
    if (patch.isActive != null) payload.is_active = patch.isActive;
    if (patch.password) {
      if (patch.password.length < 6) throw new Error("Password must be at least 6 characters");
      payload.password_hash = await hashPassword(patch.password);
    }
    if (Object.keys(payload).length === 0) throw new Error("No updates provided");

    const { data, error } = await supabase
      .from("agencies")
      .update(payload)
      .eq("id", id)
      .select(
        "id,name,code,commission_percent,available_balance_inr,lifetime_commission_inr,is_active,created_at"
      )
      .maybeSingle();

    if (error) throw new Error(`Update agency failed: ${pgErrorText(error)}`);
    if (!data) throw new Error("Agency not found");

    const counts = await modelCountsByAgency([id]);
    return mapAgencySummary(data as AgencyRow, counts.get(id) ?? 0);
  },

  async approveWithdrawal(id: string): Promise<AgencyWithdrawalRequest> {
    return this.setWithdrawalStatus(id, "approved");
  },

  async rejectWithdrawal(id: string, financeNote?: string): Promise<AgencyWithdrawalRequest> {
    return this.setWithdrawalStatus(id, "rejected", { finance_note: financeNote ?? null });
  },

  async markWithdrawalPaid(
    id: string,
    input: { txnId: string; paymentMethod: string }
  ): Promise<AgencyWithdrawalRequest> {
    const supabase = getSupabaseAdminClient();
    const { data: existing, error: loadErr } = await supabase
      .from("agency_withdrawal_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) throw new Error(pgErrorText(loadErr));
    if (!existing) throw new Error("Withdrawal request not found");
    if (existing.status === "paid") throw new Error("Already marked paid");
    if (existing.status === "rejected") throw new Error("Cannot pay a rejected request");

    const agencyId = String(existing.agency_id);
    const requested = num(existing.requested_amount_inr);
    const net = num(existing.net_payout_inr);

    const { data: agency, error: agencyErr } = await supabase
      .from("agencies")
      .select("id,name,code,available_balance_inr,fy_paid_out_inr")
      .eq("id", agencyId)
      .maybeSingle();
    if (agencyErr || !agency) throw new Error("Agency not found");

    const available = num(agency.available_balance_inr);
    if (requested > available + 0.001) {
      throw new Error("Insufficient agency balance to pay this request");
    }

    const { data: updated, error: updErr } = await supabase
      .from("agency_withdrawal_requests")
      .update({
        status: "paid",
        paid_txn_id: input.txnId.trim(),
        paid_via: input.paymentMethod.trim(),
        processed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (updErr) throw new Error(pgErrorText(updErr));

    const { error: balErr } = await supabase
      .from("agencies")
      .update({
        available_balance_inr: Math.max(0, Math.round((available - requested) * 100) / 100),
        fy_paid_out_inr: Math.round((num(agency.fy_paid_out_inr) + net) * 100) / 100,
      })
      .eq("id", agencyId);
    if (balErr) throw new Error(`Balance update failed: ${pgErrorText(balErr)}`);

    return mapWithdrawal(updated as Record<string, unknown>, agency.name, agency.code);
  },

  async setWithdrawalStatus(
    id: string,
    status: AgencyWithdrawalStatus,
    extra: Record<string, unknown> = {}
  ): Promise<AgencyWithdrawalRequest> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("agency_withdrawal_requests")
      .update({
        status,
        processed_at: status === "pending" ? null : new Date().toISOString(),
        ...extra,
      })
      .eq("id", id)
      .select("*")
      .maybeSingle();

    if (error) throw new Error(pgErrorText(error));
    if (!data) throw new Error("Withdrawal request not found");

    const { data: agency } = await supabase
      .from("agencies")
      .select("name,code")
      .eq("id", data.agency_id)
      .maybeSingle();

    return mapWithdrawal(
      data as Record<string, unknown>,
      agency?.name ?? "Unknown",
      agency?.code ?? "—"
    );
  },
};
