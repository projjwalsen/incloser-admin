import type { CmsAudioVerificationScript } from "@incloser/shared-types";
import { isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";

const TABLE_SETUP =
  "Audio verification scripts table is missing: run `supabase/cms_audio_verification_scripts.sql` in the Supabase SQL editor, then reload.";

const ALLOWED_CODES = new Set([
  "bengali",
  "hindi",
  "gujarati",
  "kannada",
  "tamil",
  "malayalam",
]);

type ScriptRecord = {
  language_code: string;
  language_label: string;
  script_text: string;
  is_active: boolean;
  updated_at: string;
};

const SELECT_COLS = "language_code,language_label,script_text,is_active,updated_at";

function mapRow(row: ScriptRecord): CmsAudioVerificationScript {
  return {
    languageCode: row.language_code,
    languageLabel: row.language_label,
    scriptText: row.script_text,
    isActive: row.is_active,
    updatedAt: row.updated_at,
  };
}

export type UpdateScriptInput = {
  scriptText?: string;
  isActive?: boolean;
  languageLabel?: string;
};

export const audioVerificationScriptsService = {
  async list(): Promise<CmsAudioVerificationScript[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("audio_verification_scripts")
      .select(SELECT_COLS)
      .order("language_label", { ascending: true });
    if (error) {
      if (isMissingRelationError(error)) return [];
      throw new Error(`Audio verification scripts list failed: ${pgErrorText(error)}`);
    }
    return ((data ?? []) as ScriptRecord[]).map(mapRow);
  },

  async update(languageCode: string, input: UpdateScriptInput): Promise<CmsAudioVerificationScript> {
    const code = languageCode.trim().toLowerCase();
    if (!ALLOWED_CODES.has(code)) {
      throw new Error(`Unsupported language code: ${languageCode}`);
    }
    if (input.scriptText !== undefined && !input.scriptText.trim()) {
      throw new Error("scriptText cannot be empty");
    }

    const supabase = getSupabaseAdminClient();
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (input.scriptText !== undefined) patch.script_text = input.scriptText.trim();
    if (input.isActive !== undefined) patch.is_active = input.isActive;
    if (input.languageLabel !== undefined) patch.language_label = input.languageLabel.trim();

    const { data, error } = await supabase
      .from("audio_verification_scripts")
      .update(patch)
      .eq("language_code", code)
      .select(SELECT_COLS)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) throw new Error(TABLE_SETUP);
      throw new Error(`Audio verification script update failed: ${pgErrorText(error)}`);
    }
    if (!data) throw new Error(`No script found for language: ${code}`);
    return mapRow(data as ScriptRecord);
  },
};
