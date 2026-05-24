import type { FemaleModelDetail, FemaleModelSummary, PaginatedResult } from "@incloser/shared-types";
import { resolveAudioPlaybackUrl } from "../lib/audioPlaybackUrl.js";
import { resolveFemaleAvatarImageUrl } from "../lib/femaleAvatarImageUrl.js";
import { isMissingRelationError } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";
import { syncModelUserAccountFromFemaleProfileId } from "./model-account-sync.service.js";

type ListModelsParams = {
  page: number;
  limit: number;
  search?: string;
  status?: "pending" | "approved" | "rejected" | "review";
  sortBy?: "created_at" | "nickname" | "city" | "verification_status";
  sortDir?: "asc" | "desc";
};

/** Matches `supabase/female_onboarding.sql` + embedded `users(phone)` */
type ModelRecord = {
  id: string;
  user_id: string | null;
  nickname: string | null;
  avatar_id: string | null;
  city: string | null;
  state: string | null;
  primary_language: string | null;
  secondary_languages: string[] | null;
  verification_status: "pending" | "approved" | "rejected" | "review" | null;
  audio_verification_url: string | null;
  audio_verification_duration_sec: number | null;
  created_at: string | null;
  updated_at: string | null;
  users?: { phone: string | null; is_active?: boolean | null; is_onboarding_completed?: boolean | null } | Array<{
    phone: string | null;
    is_active?: boolean | null;
    is_onboarding_completed?: boolean | null;
  }> | null;
};

const MODEL_COLUMNS =
  "id,user_id,nickname,avatar_id,city,state,primary_language,secondary_languages,verification_status,audio_verification_url,audio_verification_duration_sec,created_at,updated_at,users(phone,is_active,is_onboarding_completed)";

function userEmbedFromRow(row: ModelRecord): {
  phone: string;
  isActive: boolean;
  onboardingCompleted: boolean;
} {
  const u = row.users;
  const o = Array.isArray(u) ? u[0] : u;
  return {
    phone: o?.phone ?? "",
    isActive: Boolean(o?.is_active),
    onboardingCompleted: Boolean(o?.is_onboarding_completed),
  };
}

function userPhoneFromRow(row: ModelRecord): string {
  return userEmbedFromRow(row).phone;
}

function accountActivatedFromRow(row: ModelRecord): boolean {
  const { isActive, onboardingCompleted } = userEmbedFromRow(row);
  return isActive && onboardingCompleted;
}

function parseSecondaryLanguages(input: ModelRecord["secondary_languages"], primary: string | null): string[] {
  const all = Array.isArray(input) ? input.map((x) => String(x).trim()).filter(Boolean) : [];
  return all.filter((x) => x !== primary);
}

function normalizeVerification(status: string | null | undefined): FemaleModelSummary["verificationStatus"] {
  if (status === "approved" || status === "rejected" || status === "review") return status;
  return "pending";
}

function audioVerificationStatusFromLatest(
  latestDbStatus: string | null | undefined,
  hasAudioUrl: boolean,
): FemaleModelSummary["audioVerificationStatus"] {
  if (latestDbStatus === "approved") return "approved";
  if (latestDbStatus === "rejected") return "rejected";
  if (latestDbStatus === "pending") return "review";
  if (hasAudioUrl) return "review";
  return "pending";
}

async function latestAudioStatusByModelId(
  supabase: ReturnType<typeof getSupabaseAdminClient>,
  modelIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (modelIds.length === 0) return map;

  const { data, error } = await supabase
    .from("audio_verifications")
    .select("model_id,status,updated_at")
    .in("model_id", modelIds)
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (error) {
    if (isMissingRelationError(error)) return map;
    throw new Error(`Audio status lookup failed: ${error.message}`);
  }

  for (const row of data ?? []) {
    const modelId = String((row as { model_id: string }).model_id);
    if (map.has(modelId)) continue;
    const status = (row as { status?: string }).status;
    if (status) map.set(modelId, status);
  }
  return map;
}

function toSummary(row: ModelRecord, latestAudioByModelId?: Map<string, string>): FemaleModelSummary {
  const primaryLanguage = row.primary_language ?? null;
  const hasAudioUrl = Boolean(row.audio_verification_url?.trim());
  const latestAudio = latestAudioByModelId?.get(row.id);
  return {
    id: row.id,
    nickname: row.nickname ?? "Unknown",
    phone: userPhoneFromRow(row),
    city: row.city,
    state: row.state,
    primaryLanguage,
    secondaryLanguages: parseSecondaryLanguages(row.secondary_languages, primaryLanguage),
    verificationStatus: normalizeVerification(row.verification_status),
    audioVerificationStatus: audioVerificationStatusFromLatest(latestAudio, hasAudioUrl),
    createdAt: row.created_at ?? new Date(0).toISOString(),
    avatarImageUrl: resolveFemaleAvatarImageUrl(row.avatar_id),
    accountActivated: accountActivatedFromRow(row),
  };
}

function toDetail(
  row: ModelRecord,
  supabase?: ReturnType<typeof getSupabaseAdminClient>,
  latestAudioByModelId?: Map<string, string>,
): FemaleModelDetail {
  const summary = toSummary(row, latestAudioByModelId);
  const languages = [
    ...(summary.primaryLanguage ? [summary.primaryLanguage] : []),
    ...summary.secondaryLanguages,
  ];
  const rawAudio = row.audio_verification_url?.trim() || null;
  const audioVerificationPlaybackUrl =
    supabase && rawAudio ? resolveAudioPlaybackUrl(supabase, rawAudio) : rawAudio;
  return {
    ...summary,
    userId: row.user_id,
    bio: null,
    languages,
    onboardingDetails: {},
    internalNotes: null,
    audioVerificationPlaybackUrl,
    audioVerificationDurationSec: row.audio_verification_duration_sec ?? null,
  };
}

export const modelsService = {
  async list(params: ListModelsParams): Promise<PaginatedResult<FemaleModelSummary>> {
    const supabase = getSupabaseAdminClient();
    const page = Math.max(1, params.page);
    const limit = Math.min(Math.max(1, params.limit), 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const sortCol = params.sortBy ?? "created_at";
    const query = supabase
      .from("female_profiles")
      .select(MODEL_COLUMNS, { count: "exact" })
      .range(from, to)
      .order(sortCol, { ascending: (params.sortDir ?? "desc") === "asc" });

    if (params.search?.trim()) {
      const term = `%${params.search.trim()}%`;
      query.or(`nickname.ilike.${term},city.ilike.${term},users.phone.ilike.${term}`);
    }
    if (params.status) {
      // Postgres enum has no "review"; treat as in-queue pending.
      const dbStatus = params.status === "review" ? "pending" : params.status;
      query.eq("verification_status", dbStatus);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(`Models query failed: ${error.message}`);
    const rows = (data ?? []) as ModelRecord[];
    const audioByModelId = await latestAudioStatusByModelId(
      supabase,
      rows.map((r) => r.id),
    );
    const items = rows.map((r) => toSummary(r, audioByModelId));
    const total = count ?? 0;
    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async getById(id: string): Promise<FemaleModelDetail | null> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("female_profiles")
      .select(MODEL_COLUMNS)
      .eq("id", id)
      .maybeSingle<ModelRecord>();
    if (error) throw new Error(`Model detail query failed: ${error.message}`);
    if (!data) return null;
    const audioByModelId = await latestAudioStatusByModelId(supabase, [id]);
    return toDetail(data, supabase, audioByModelId);
  },

  async updateStatus(id: string, status: FemaleModelSummary["verificationStatus"]): Promise<FemaleModelDetail | null> {
    const supabase = getSupabaseAdminClient();
    const dbStatus = status === "review" ? "pending" : status;
    const { data, error } = await supabase
      .from("female_profiles")
      .update({ verification_status: dbStatus })
      .eq("id", id)
      .select(MODEL_COLUMNS)
      .maybeSingle<ModelRecord>();
    if (error) throw new Error(`Model status update failed: ${error.message}`);
    if (!data) return null;
    await syncModelUserAccountFromFemaleProfileId(id);
    const { data: refreshed, error: refreshError } = await supabase
      .from("female_profiles")
      .select(MODEL_COLUMNS)
      .eq("id", id)
      .maybeSingle<ModelRecord>();
    const audioByModelId = await latestAudioStatusByModelId(supabase, [id]);
    if (refreshError || !refreshed) return toDetail(data, supabase, audioByModelId);
    return toDetail(refreshed, supabase, audioByModelId);
  },
};
