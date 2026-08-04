import type { AgencyPortalDashboard, AgencyWithdrawalRequest } from "@incloser/shared-types";
import { isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";
import {
  agenciesService,
  computeAgencyPayoutBreakdown,
} from "./agencies.service.js";
import { agencySettingsService } from "./agencySettings.service.js";

function num(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export const agencyPortalService = {
  async dashboard(agencyId: string): Promise<AgencyPortalDashboard> {
    const detail = await agenciesService.detail(agencyId);
    if (!detail) throw new Error("Agency not found");
    const settings = await agencySettingsService.load();
    return {
      agency: {
        id: detail.id,
        name: detail.name,
        code: detail.code,
        commissionPercent: detail.commissionPercent,
        availableBalanceInr: detail.availableBalanceInr,
        lifetimeCommissionInr: detail.lifetimeCommissionInr,
        modelCount: detail.modelCount,
        isActive: detail.isActive,
        createdAt: detail.createdAt,
      },
      models: detail.models,
      recentCommissions: detail.recentCommissions,
      withdrawalRequests: detail.withdrawalRequests,
      settings,
    };
  },

  async requestWithdrawal(
    agencyId: string,
    input: {
      amountInr: number;
      payoutMethod?: string;
      bankMasked?: string;
      upiId?: string;
    }
  ): Promise<AgencyWithdrawalRequest> {
    const amount = Number(input.amountInr);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const supabase = getSupabaseAdminClient();
    const { data: agency, error } = await supabase
      .from("agencies")
      .select("id,name,code,available_balance_inr,fy_paid_out_inr,is_active")
      .eq("id", agencyId)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) throw new Error("Agency module not configured");
      throw new Error(pgErrorText(error));
    }
    if (!agency) throw new Error("Agency not found");
    if (!agency.is_active) throw new Error("Agency is deactivated");

    const available = num(agency.available_balance_inr);
    if (amount > available) {
      throw new Error(`Insufficient balance. Available: ₹${available.toFixed(2)}`);
    }

    // Prevent multiple pending requests stacking beyond balance
    const { data: pending } = await supabase
      .from("agency_withdrawal_requests")
      .select("requested_amount_inr")
      .eq("agency_id", agencyId)
      .in("status", ["pending", "approved"]);

    const pendingTotal = ((pending ?? []) as Array<{ requested_amount_inr: number | string }>).reduce(
      (s, r) => s + num(r.requested_amount_inr),
      0
    );
    if (pendingTotal + amount > available + 0.001) {
      throw new Error("Pending requests already cover available balance");
    }

    const settings = await agencySettingsService.load();
    const breakdown = computeAgencyPayoutBreakdown({
      requestedAmountInr: amount,
      platformChargePercent: settings.platformWithdrawalChargePercent,
      tdsPercent: settings.tdsPercent,
      tdsThresholdInr: settings.tdsThresholdInr,
      fyPaidOutInr: num(agency.fy_paid_out_inr),
    });

    const { data: created, error: createErr } = await supabase
      .from("agency_withdrawal_requests")
      .insert({
        agency_id: agencyId,
        requested_amount_inr: amount,
        agency_commission_deduction_inr: 0,
        platform_charge_inr: breakdown.platformChargeInr,
        tds_inr: breakdown.tdsInr,
        net_payout_inr: breakdown.netPayoutInr,
        status: "pending",
        payout_method: input.payoutMethod?.trim() || "Bank transfer",
        bank_masked: input.bankMasked?.trim() || null,
        upi_id: input.upiId?.trim() || null,
      })
      .select("*")
      .single();

    if (createErr) throw new Error(pgErrorText(createErr));

    return {
      id: String(created.id),
      agencyId,
      agencyName: agency.name,
      agencyCode: agency.code,
      requestedAmountInr: amount,
      platformChargeInr: breakdown.platformChargeInr,
      tdsInr: breakdown.tdsInr,
      netPayoutInr: breakdown.netPayoutInr,
      status: "pending",
      payoutMethod: created.payout_method ?? null,
      bankMasked: created.bank_masked ?? null,
      upiId: created.upi_id ?? null,
      financeNote: null,
      paidTxnId: null,
      paidVia: null,
      requestedAt: created.requested_at ?? created.created_at,
      processedAt: null,
    };
  },
};
