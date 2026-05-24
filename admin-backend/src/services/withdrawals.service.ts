import { isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";

type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";

type WithdrawalRecord = {
  id: string;
  model_id: string;
  amount: number | null;
  status: WithdrawalStatus | null;
  requested_at: string | null;
  payout_method: string | null;
  risk: "low" | "medium" | "high" | null;
  bank_masked: string | null;
  upi_id: string | null;
  finance_note: string | null;
  paid_txn_id: string | null;
  paid_via: string | null;
  created_at: string | null;
};

type ProfileLite = { id: string; nickname: string | null };

export type WithdrawalView = {
  id: string;
  modelId: string;
  modelName: string;
  amount: number;
  status: WithdrawalStatus;
  requestedAt: string;
  payoutMethod: string;
  risk: "low" | "medium" | "high";
  bankMasked?: string;
  upiId?: string;
  financeNote?: string;
  paidTxnId?: string;
  paidVia?: string;
};

function mapRow(row: WithdrawalRecord, nicknameByModelId: Map<string, string>): WithdrawalView {
  return {
    id: row.id,
    modelId: row.model_id,
    modelName: nicknameByModelId.get(row.model_id) ?? "Unknown",
    amount: Number(row.amount ?? 0),
    status: (row.status ?? "pending") as WithdrawalStatus,
    requestedAt: row.requested_at ?? row.created_at ?? new Date(0).toISOString(),
    payoutMethod: row.payout_method ?? "Bank transfer",
    risk: row.risk ?? "low",
    bankMasked: row.bank_masked ?? undefined,
    upiId: row.upi_id ?? undefined,
    financeNote: row.finance_note ?? undefined,
    paidTxnId: row.paid_txn_id ?? undefined,
    paidVia: row.paid_via ?? undefined,
  };
}

async function fetchNicknameMap(modelIds: string[]): Promise<Map<string, string>> {
  if (modelIds.length === 0) return new Map();
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from("female_profiles").select("id,nickname").in("id", modelIds);
  if (error) throw new Error(`Withdrawals profile lookup failed: ${error.message}`);
  return new Map(((data ?? []) as ProfileLite[]).map((row) => [row.id, row.nickname ?? "Unknown"]));
}

export const withdrawalsService = {
  async list(): Promise<WithdrawalView[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("withdrawals")
      .select("id,model_id,amount,status,requested_at,payout_method,risk,bank_masked,upi_id,finance_note,paid_txn_id,paid_via,created_at")
      .order("requested_at", { ascending: false, nullsFirst: false });
    if (error) {
      if (isMissingRelationError(error)) {
        console.warn("[withdrawals] list: table not deployed:", pgErrorText(error));
        return [];
      }
      throw new Error(`Withdrawals list query failed: ${pgErrorText(error)}`);
    }
    const rows = (data ?? []) as WithdrawalRecord[];
    const nicknameByModelId = await fetchNicknameMap(Array.from(new Set(rows.map((r) => r.model_id).filter(Boolean))));
    return rows.map((row) => mapRow(row, nicknameByModelId));
  },

  async detail(id: string): Promise<WithdrawalView | null> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("withdrawals")
      .select("id,model_id,amount,status,requested_at,payout_method,risk,bank_masked,upi_id,finance_note,paid_txn_id,paid_via,created_at")
      .eq("id", id)
      .maybeSingle();
    if (error) {
      if (isMissingRelationError(error)) return null;
      throw new Error(`Withdrawal detail query failed: ${pgErrorText(error)}`);
    }
    if (!data) return null;
    const nicknameByModelId = await fetchNicknameMap([data.model_id]);
    return mapRow(data, nicknameByModelId);
  },

  async approve(id: string): Promise<WithdrawalView | null> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("withdrawals")
      .update({ status: "approved" })
      .eq("id", id)
      .select("id,model_id,amount,status,requested_at,payout_method,risk,bank_masked,upi_id,finance_note,paid_txn_id,paid_via,created_at")
      .maybeSingle();
    if (error) {
      if (isMissingRelationError(error)) throw new Error(`Withdrawals are not available in this database (${pgErrorText(error)}).`);
      throw new Error(`Withdrawal approve failed: ${pgErrorText(error)}`);
    }
    if (!data) return null;
    const nicknameByModelId = await fetchNicknameMap([data.model_id]);
    return mapRow(data, nicknameByModelId);
  },

  async reject(id: string): Promise<WithdrawalView | null> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("withdrawals")
      .update({ status: "rejected" })
      .eq("id", id)
      .select("id,model_id,amount,status,requested_at,payout_method,risk,bank_masked,upi_id,finance_note,paid_txn_id,paid_via,created_at")
      .maybeSingle();
    if (error) {
      if (isMissingRelationError(error)) throw new Error(`Withdrawals are not available in this database (${pgErrorText(error)}).`);
      throw new Error(`Withdrawal reject failed: ${pgErrorText(error)}`);
    }
    if (!data) return null;
    const nicknameByModelId = await fetchNicknameMap([data.model_id]);
    return mapRow(data, nicknameByModelId);
  },

  async markPaid(id: string, txnId: string, paymentMethod: string): Promise<WithdrawalView | null> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("withdrawals")
      .update({ status: "paid", paid_txn_id: txnId, paid_via: paymentMethod })
      .eq("id", id)
      .select("id,model_id,amount,status,requested_at,payout_method,risk,bank_masked,upi_id,finance_note,paid_txn_id,paid_via,created_at")
      .maybeSingle();
    if (error) {
      if (isMissingRelationError(error)) throw new Error(`Withdrawals are not available in this database (${pgErrorText(error)}).`);
      throw new Error(`Withdrawal mark-paid failed: ${pgErrorText(error)}`);
    }
    if (!data) return null;
    const nicknameByModelId = await fetchNicknameMap([data.model_id]);
    return mapRow(data, nicknameByModelId);
  },
};
