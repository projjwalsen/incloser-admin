import { getSupabaseAdminClient } from "../lib/supabase.js";

export type FeatureSettings = {
  afterCallRatingEnabled: boolean;
};

const DEFAULT_FEATURES: FeatureSettings = {
  afterCallRatingEnabled: true,
};

export const featureSettingsService = {
  defaults(): FeatureSettings {
    return { ...DEFAULT_FEATURES };
  },

  async load(): Promise<FeatureSettings> {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from("app_feature_settings")
        .select("after_call_rating_enabled")
        .eq("id", 1)
        .maybeSingle();

      if (error || !data) {
        if (error) console.warn("[featureSettings] load:", error.message);
        return { ...DEFAULT_FEATURES };
      }

      return {
        afterCallRatingEnabled: Boolean(
          (data as { after_call_rating_enabled?: boolean }).after_call_rating_enabled ?? true
        ),
      };
    } catch (e) {
      console.warn("[featureSettings] load failed", e);
      return { ...DEFAULT_FEATURES };
    }
  },

  async save(features: FeatureSettings): Promise<FeatureSettings> {
    const supabase = getSupabaseAdminClient();
    const payload = {
      id: 1,
      after_call_rating_enabled: features.afterCallRatingEnabled,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("app_feature_settings")
      .upsert(payload)
      .select("after_call_rating_enabled")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      afterCallRatingEnabled: Boolean(
        (data as { after_call_rating_enabled?: boolean }).after_call_rating_enabled ?? true
      ),
    };
  },
};
