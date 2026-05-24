import type { AppSettings } from "@incloser/shared-types";
import { adminGet, adminPatch } from "./api-client";

export function fetchSettings() {
  return adminGet<AppSettings>("/settings");
}

export function patchSettings(payload: Partial<AppSettings>) {
  return adminPatch<AppSettings>("/settings", payload);
}
