import type { AppSettings, BillingSettings } from "@incloser/shared-types";
import { billingSettingsService } from "./billingSettings.service.js";

const defaults: AppSettings = {
  tokenPricingInr: 1,
  defaultCallPricingTokens: 20,
  commissionPercentage: 20,
  minimumWithdrawalAmount: 500,
  languageMasterList: ["Hindi", "English", "Bengali"],
  featureToggles: {
    newDashboard: true,
    maintenanceMode: false,
    walletTopUps: true,
    modelSelfServe: true,
  },
  supportContactInfo: "support@incloser.app\n+91 80000 00000",
  billing: billingSettingsService.defaults(),
};

let state: AppSettings = structuredClone(defaults);
let billingHydrated = false;

async function hydrateBilling(): Promise<void> {
  if (billingHydrated) return;
  state.billing = await billingSettingsService.load();
  billingHydrated = true;
}

function mergeBilling(value: unknown): BillingSettings | null {
  if (!isPlainObject(value)) return null;
  const current = state.billing;
  const next: BillingSettings = { ...current };
  const keys: (keyof BillingSettings)[] = [
    "textRateInrPerMin",
    "voiceRateInrPerMin",
    "videoRateInrPerMin",
    "modelSharePercent",
    "reserveMinutes",
    "disconnectMinutes",
  ];
  for (const key of keys) {
    const v = value[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      next[key] = v;
    }
  }
  return next;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export const settingsService = {
  async get(): Promise<AppSettings> {
    await hydrateBilling();
    return structuredClone(state);
  },

  /** Shallow merge for top-level keys; `featureToggles` is deep-merged when provided as an object. */
  async patch(partial: Record<string, unknown>): Promise<AppSettings> {
    await hydrateBilling();
    const next: AppSettings = { ...state };
    for (const [key, value] of Object.entries(partial)) {
      if (key === "billing") {
        const merged = mergeBilling(value);
        if (merged) {
          next.billing = await billingSettingsService.save(merged);
        }
        continue;
      }
      if (key === "featureToggles" && isPlainObject(value)) {
        const merged = { ...next.featureToggles };
        for (const [tk, tv] of Object.entries(value)) {
          if (typeof tv === "boolean") merged[tk] = tv;
        }
        next.featureToggles = merged;
        continue;
      }
      if (key === "languageMasterList" && Array.isArray(value) && value.every((x) => typeof x === "string")) {
        next.languageMasterList = value as string[];
        continue;
      }
      if (key in next && key !== "featureToggles") {
        (next as Record<string, unknown>)[key] = value;
      }
    }
    state = next;
    return structuredClone(state);
  },
};
