import type { FinanceRevenuePayload, FinanceWalletRow } from "@incloser/shared-types";

export const financeService = {
  wallets(): FinanceWalletRow[] {
    return [
      { id: "w_u1", userId: "u_1", nickname: "Riya", avatarImageUrl: null, phone: "+91 98765 43210", balance: 1250, txnCount: 38, lastActivity: "2h ago", status: "active" },
      { id: "w_u2", userId: "u_2", nickname: "Arjun", avatarImageUrl: null, phone: "+91 91234 56789", balance: 0, txnCount: 6, lastActivity: "1d ago", status: "limited" },
      { id: "w_u3", userId: "u_3", nickname: "Sneha", avatarImageUrl: null, phone: "+91 99887 77665", balance: 4890, txnCount: 112, lastActivity: "30m ago", status: "active" },
      { id: "w_u4", userId: "u_4", nickname: "Vikram", avatarImageUrl: null, phone: "+91 90011 22334", balance: 320, txnCount: 21, lastActivity: "5h ago", status: "frozen" },
      { id: "w_u5", userId: "u_5", nickname: "Neha", avatarImageUrl: null, phone: "+91 98100 44556", balance: 18440, txnCount: 204, lastActivity: "12m ago", status: "active" },
    ];
  },

  revenue(): FinanceRevenuePayload {
    return {
      gross30d: 4_820_000,
      net30d: 3_610_000,
      tokenSales30d: 2_240_000,
      takeRatePercent: 22.4,
      revenueTrend: [42, 48, 46, 55, 62, 58, 70, 74, 69, 81, 78, 86],
      tokenSalesTrend: [120, 132, 118, 140, 156, 148, 162, 170, 165, 182, 176, 190],
      pendingPayoutsInr: 985_000,
      paidOut30dInr: 3_120_000,
      avgPayoutHours: 14,
      reversalRatePercent: 0.6,
    };
  },
};
