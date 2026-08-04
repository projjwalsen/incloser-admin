import type { AgencySettings } from "@incloser/shared-types";
import { getSupabaseAdminClient } from "../lib/supabase.js";

const DEFAULTS: AgencySettings = {
  defaultAgencyCommissionPercent: 12,
  platformWithdrawalChargePercent: 1,
  tdsThresholdInr: 30000,
  tdsPercent: 1,
};

function rowToSettings(row: Record<string, unknown>): AgencySettings {
  return {
    defaultAgencyCommissionPercent: Number(
      row.default_agency_commission_percent ?? DEFAULTS.defaultAgencyCommissionPercent
    ),
    platformWithdrawalChargePercent: Number(
      row.platform_withdrawal_charge_percent ?? DEFAULTS.platformWithdrawalChargePercent
    ),
    tdsThresholdInr: Number(row.tds_threshold_inr ?? DEFAULTS.tdsThresholdInr),
    tdsPercent: Number(row.tds_percent ?? DEFAULTS.tdsPercent),
  };
}

export const agencySettingsService = {
  defaults(): AgencySettings {
    return { ...DEFAULTS };
  },

  async load(): Promise<AgencySettings> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("app_agency_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error || !data) {
        if (error) console.warn("[agencySettings] load:", error.message);
        return { ...DEFAULTS };
      }
      return rowToSettings(data as Record<string, unknown>);
    } catch (e) {
      console.warn("[agencySettings] load failed", e);
      return { ...DEFAULTS };
    }
  },

  async save(patch: Partial<AgencySettings>): Promise<AgencySettings> {
    const current = await this.load();
    const next: AgencySettings = {
      defaultAgencyCommissionPercent:
        patch.defaultAgencyCommissionPercent ?? current.defaultAgencyCommissionPercent,
      platformWithdrawalChargePercent:
        patch.platformWithdrawalChargePercent ?? current.platformWithdrawalChargePercent,
      tdsThresholdInr: patch.tdsThresholdInr ?? current.tdsThresholdInr,
      tdsPercent: patch.tdsPercent ?? current.tdsPercent,
    };

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("app_agency_settings")
      .upsert({
        id: 1,
        default_agency_commission_percent: next.defaultAgencyCommissionPercent,
        platform_withdrawal_charge_percent: next.platformWithdrawalChargePercent,
        tds_threshold_inr: next.tdsThresholdInr,
        tds_percent: next.tdsPercent,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return rowToSettings(data as Record<string, unknown>);
  },
};
