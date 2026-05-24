import type { PaginatedResult, UserSummary } from "@incloser/shared-types";
import { getSupabaseAdminClient } from "../lib/supabase.js";

type ListUsersParams = {
  page: number;
  limit: number;
  search?: string;
  status?: "active" | "suspended" | "pending";
  sortBy?: "created_at" | "nickname" | "phone" | "status";
  sortDir?: "asc" | "desc";
};

type ProfileEmbed = { nickname: string | null; city: string | null; primary_language: string | null };
type WalletEmbed = { token_balance: number | string | null; rupee_balance?: number | string | null };

/** `users` + optional `profiles` + `wallets` (see `supabase/schema.sql`). */
type UserRecord = {
  id: string;
  phone: string;
  role: string;
  is_active: boolean;
  is_onboarding_completed?: boolean | null;
  created_at: string;
  profiles?: ProfileEmbed | ProfileEmbed[] | null;
  wallets?: WalletEmbed | WalletEmbed[] | null;
};

const USER_SELECT =
  "id,phone,role,is_active,is_onboarding_completed,created_at,profiles(nickname,city,primary_language),wallets(token_balance,rupee_balance)";

function firstEmbed<T>(row: T | T[] | null | undefined): T | null {
  if (!row) return null;
  return Array.isArray(row) ? (row[0] ?? null) : row;
}

function profileFromRow(row: UserRecord): ProfileEmbed | null {
  return firstEmbed(row.profiles);
}

function walletFromRow(row: UserRecord): WalletEmbed | null {
  return firstEmbed(row.wallets);
}

function mapListStatus(row: UserRecord): UserSummary["status"] {
  if (!row.is_active) return "suspended";
  if (row.is_onboarding_completed === false) return "pending";
  return "active";
}

function toSummary(row: UserRecord): UserSummary {
  const p = profileFromRow(row);
  const w = walletFromRow(row);
  const token = w?.token_balance != null ? Number(w.token_balance) : 0;
  const rupee = w?.rupee_balance != null ? Number(w.rupee_balance) : 0;
  const walletBalance = Number.isFinite(token) && token !== 0 ? token : rupee;
  return {
    id: row.id,
    phone: row.phone ?? "",
    nickname: p?.nickname ?? "Unknown",
    city: p?.city ?? null,
    language: p?.primary_language ?? null,
    status: mapListStatus(row),
    walletBalance: Number.isFinite(walletBalance) ? walletBalance : 0,
    createdAt: row.created_at ?? new Date(0).toISOString(),
  };
}

export const usersService = {
  async list(params: ListUsersParams): Promise<PaginatedResult<UserSummary>> {
    const supabase = getSupabaseAdminClient();
    const page = Math.max(1, params.page);
    const limit = Math.min(Math.max(1, params.limit), 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const sortBy = params.sortBy ?? "created_at";
    const ascending = (params.sortDir ?? "desc") === "asc";

    const query = supabase.from("users").select(USER_SELECT, { count: "exact" }).range(from, to);

    if (sortBy === "nickname") {
      query.order("nickname", { foreignTable: "profiles", ascending });
    } else if (sortBy === "phone") {
      query.order("phone", { ascending });
    } else if (sortBy === "status") {
      query.order("is_active", { ascending });
    } else {
      query.order("created_at", { ascending });
    }

    if (params.search?.trim()) {
      const term = `%${params.search.trim()}%`;
      query.or(`phone.ilike.${term},profiles.nickname.ilike.${term},profiles.city.ilike.${term}`);
    }
    if (params.status === "suspended") {
      query.eq("is_active", false);
    } else if (params.status === "pending") {
      query.eq("is_active", true).eq("is_onboarding_completed", false);
    } else if (params.status === "active") {
      query.eq("is_active", true);
    }

    const { data, count, error } = await query;
    if (error) throw new Error(`Users query failed: ${error.message}`);

    const items: UserSummary[] = ((data ?? []) as UserRecord[]).map(toSummary);
    const total = count ?? 0;
    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async getById(id: string): Promise<UserSummary | null> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.from("users").select(USER_SELECT).eq("id", id).maybeSingle<UserRecord>();
    if (error) throw new Error(`User detail query failed: ${error.message}`);
    if (!data) return null;
    return toSummary(data);
  },

  async updateStatus(id: string, status: UserSummary["status"]): Promise<UserSummary | null> {
    const supabase = getSupabaseAdminClient();
    const patch =
      status === "suspended"
        ? { is_active: false }
        : status === "pending"
          ? { is_active: true, is_onboarding_completed: false }
          : { is_active: true, is_onboarding_completed: true };

    const { data, error } = await supabase.from("users").update(patch).eq("id", id).select(USER_SELECT).maybeSingle<UserRecord>();
    if (error) throw new Error(`User status update failed: ${error.message}`);
    if (!data) return null;
    return toSummary(data);
  },
};
