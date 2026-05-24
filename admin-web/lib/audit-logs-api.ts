import { adminGet } from "./api-client";

export type AuditLogRow = {
  id: string;
  admin: string;
  action: string;
  entity: string;
  entityId: string;
  timestampIso: string;
  note: string;
};

export function fetchAuditLogs() {
  return adminGet<AuditLogRow[]>("/audit-logs");
}
