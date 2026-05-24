import type { BillingSettings } from "@incloser/shared-types";
import { getSupabaseAdminClient } from "../lib/supabase.js";

const DEFAULT_BILLING: BillingSettings = {
  textRateInrPerMin: 2,
  voiceRateInrPerMin: 5,
  videoRateInrPerMin: 10,
  modelSharePercent: 85,
  reserveMinutes: 3,
  disconnectMinutes: 1,
};

function rowToBilling(row: Record<string, unknown>): BillingSettings {
  return {
    textRateInrPerMin: Number(row.text_rate_inr ?? DEFAULT_BILLING.textRateInrPerMin),
    voiceRateInrPerMin: Number(row.voice_rate_inr ?? DEFAULT_BILLING.voiceRateInrPerMin),
    videoRateInrPerMin: Number(row.video_rate_inr ?? DEFAULT_BILLING.videoRateInrPerMin),
    modelSharePercent: Number(row.model_share_percent ?? DEFAULT_BILLING.modelSharePercent),
    reserveMinutes: Number(row.reserve_minutes ?? DEFAULT_BILLING.reserveMinutes),
    disconnectMinutes: Number(row.disconnect_minutes ?? DEFAULT_BILLING.disconnectMinutes),
  };
}

export const billingSettingsService = {
  defaults(): BillingSettings {
    return { ...DEFAULT_BILLING };
  },

  async load(): Promise<BillingSettings> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("app_billing_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error || !data) {
        if (error) console.warn("[billingSettings] load:", error.message);
        return { ...DEFAULT_BILLING };
      }
      return rowToBilling(data as Record<string, unknown>);
    } catch (e) {
      console.warn("[billingSettings] load failed", e);
      return { ...DEFAULT_BILLING };
    }
  },

  async save(billing: BillingSettings): Promise<BillingSettings> {
    const supabase = getSupabaseAdminClient();
    const payload = {
      id: 1,
      text_rate_inr: billing.textRateInrPerMin,
      voice_rate_inr: billing.voiceRateInrPerMin,
      video_rate_inr: billing.videoRateInrPerMin,
      model_share_percent: billing.modelSharePercent,
      reserve_minutes: billing.reserveMinutes,
      disconnect_minutes: billing.disconnectMinutes,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("app_billing_settings")
      .upsert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }
    return rowToBilling(data as Record<string, unknown>);
  },
};
