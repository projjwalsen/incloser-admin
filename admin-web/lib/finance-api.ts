import type { FinanceRevenuePayload, FinanceWalletRow } from "@incloser/shared-types";
import { adminGet } from "./api-client";

export function fetchFinanceWallets() {
  return adminGet<FinanceWalletRow[]>("/finance/wallets");
}

export function fetchFinanceRevenue() {
  return adminGet<FinanceRevenuePayload>("/finance/revenue");
}
