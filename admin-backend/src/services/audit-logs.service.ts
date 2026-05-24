import { isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";

/** Reserved: pass `adminEmail` inside metadata to populate the `admin_email` column (stripped before JSON metadata is stored). */
export type CreateAuditLogInput = {
  adminId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export type AuditLogListRow = {
  id: string;
  admin: string;
  action: string;
  entity: string;
  entityId: string;
  timestampIso: string;
  note: string;
};

function splitAdminEmail(metadata: Record<string, unknown> | undefined): { adminEmail: string; rest: Record<string, unknown> } {
  if (!metadata) return { adminEmail: "", rest: {} };
  const rest = { ...metadata };
  let adminEmail = "";
  if (typeof rest.adminEmail === "string") {
    adminEmail = rest.adminEmail;
    delete rest.adminEmail;
  }
  return { adminEmail, rest };
}

/**
 * Central audit writer — persists to `audit_logs`.
 * Pass actor email as `metadata.adminEmail` (removed from stored JSON metadata).
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
  const { adminEmail, rest } = splitAdminEmail(input.metadata);
  const supabase = getSupabaseAdminClient();
  const note = `${input.action} · ${input.entityType} · ${input.entityId}`;
  const { error } = await supabase.from("audit_logs").insert({
    admin_id: input.adminId,
    admin_email: adminEmail,
    action: input.action,
    entity: input.entityType,
    entity_id: input.entityId,
    note,
    metadata: Object.keys(rest).length ? rest : {},
    created_at: new Date().toISOString(),
  });
  if (error) {
    if (isMissingRelationError(error)) {
      console.warn("[audit_logs] insert skipped (table missing):", pgErrorText(error));
      return;
    }
    throw new Error(`Failed to write audit log: ${pgErrorText(error)}`);
  }
}

export const auditLogsService = {
  async list(): Promise<AuditLogListRow[]> {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id,admin_email,action,entity,entity_id,note,created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      if (isMissingRelationError(error)) {
        console.warn("[audit_logs] list skipped (table missing):", pgErrorText(error));
        return [];
      }
      throw new Error(`Failed to load audit logs: ${pgErrorText(error)}`);
    }
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: String(row.id ?? ""),
      admin: String(row.admin_email ?? ""),
      action: String(row.action ?? ""),
      entity: String(row.entity ?? ""),
      entityId: String(row.entity_id ?? ""),
      timestampIso: String(row.created_at ?? new Date().toISOString()),
      note: String(row.note ?? ""),
    }));
  },
};
