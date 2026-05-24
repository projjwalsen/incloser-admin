/** Roles assignable to admin users and JWT `role` claim */
export type AdminRole =
  | "super_admin"
  | "moderator"
  | "verification_admin"
  | "finance_admin"
  | "support_admin";

/** Standard API envelope for admin JSON responses */
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

/**
 * Admin identity. Profile fields may be absent on JWT-derived requests
 * (`id`, `email`, `role` always present from the token).
 */
export type AdminUser = {
  id: string;
  email: string;
  role: AdminRole;
  fullName?: string;
  isActive?: boolean;
  lastLoginAt?: string | null;
};

export type DashboardSummary = {
  totalUsers: number;
  totalModels: number;
  newRegistrationsToday: number;
  pendingProfileVerifications: number;
  pendingAudioVerifications: number;
  pendingWithdrawals: number;
  totalTokenRevenue: number;
  platformEarnings: number;
};

export type DashboardTrendPoint = {
  label: string;
  value: number;
};

export type DashboardCharts = {
  registrationsTrend: DashboardTrendPoint[];
  revenueTrend: DashboardTrendPoint[];
  verificationTrend: DashboardTrendPoint[];
};

export type UserSummary = {
  id: string;
  phone: string;
  nickname: string;
  city: string | null;
  language: string | null;
  status: "active" | "suspended" | "pending";
  walletBalance: number;
  createdAt: string;
};

export type FemaleModelSummary = {
  id: string;
  nickname: string;
  phone: string;
  city: string | null;
  state: string | null;
  primaryLanguage: string | null;
  secondaryLanguages: string[];
  verificationStatus: "pending" | "approved" | "rejected" | "review";
  audioVerificationStatus: "pending" | "approved" | "rejected" | "review";
  createdAt: string;
  /** Resolved public Storage (or absolute) URL for onboarding avatar; null if unknown / unset. */
  avatarImageUrl: string | null;
  /** True when linked `users` row is active and onboarding completed (profile + audio both approved per admin rules). */
  accountActivated: boolean;
};

export type FemaleModelDetail = FemaleModelSummary & {
  userId: string | null;
  bio: string | null;
  languages: string[];
  onboardingDetails: Record<string, unknown>;
  internalNotes: string | null;
  /** Browser-playable URL for onboarding audio sample; null if none uploaded. */
  audioVerificationPlaybackUrl: string | null;
  audioVerificationDurationSec: number | null;
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AudioVerificationItem = {
  id: string;
  modelId: string;
  modelName: string;
  audioUrl: string;
  status: "pending" | "approved" | "rejected" | "resubmit_required";
  note: string | null;
  submittedAt: string;
};

export type WithdrawalItem = {
  id: string;
  modelId: string;
  modelName: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid";
  requestedAt: string;
  financeNote: string | null;
};

export type TransactionItem = {
  id: string;
  userId: string;
  type: "credit" | "debit";
  amount: number;
  source: string;
  createdAt: string;
};

export type CmsBanner = {
  id: string;
  title: string;
  imageUrl: string;
  isActive: boolean;
  priority: number;
};

/** Selectable onboarding avatar shown during user onboarding */
export type AvatarGenderType = "male" | "female";

/** Maps to DB-style columns: image_url, gender_type, sort_order, is_active, created_at, updated_at */
export type AvatarItem = {
  id: string;
  imageUrl: string;
  genderType: AvatarGenderType;
  title: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  isActive: boolean;
};

/** CMS legal editor — matches GET /api/admin/cms/policies */
export type CmsPolicySection = {
  title: string;
  body: string;
  updatedAt: string;
};

export type CmsPoliciesResponse = {
  terms: CmsPolicySection;
  privacy: CmsPolicySection;
};

/** Finance wallets table — matches GET /api/admin/finance/wallets */
export type FinanceWalletRow = {
  id: string;
  userId: string;
  nickname: string;
  /** Public avatar URL when known (e.g. female onboarding storage); null uses initials in UI. */
  avatarImageUrl: string | null;
  phone: string;
  balance: number;
  txnCount: number;
  lastActivity: string;
  status: "active" | "limited" | "frozen";
};

/** Finance revenue dashboard — matches GET /api/admin/finance/revenue */
export type FinanceRevenuePayload = {
  gross30d: number;
  net30d: number;
  tokenSales30d: number;
  takeRatePercent: number;
  revenueTrend: number[];
  tokenSalesTrend: number[];
  pendingPayoutsInr: number;
  paidOut30dInr: number;
  avgPayoutHours: number;
  reversalRatePercent: number;
};

/**
 * Admin settings document returned by GET/PATCH `/api/admin/settings`.
 * Field names align with the admin-backend settings service.
 */
/** Per-minute INR rates and model payout share (admin + mobile billing). */
export type BillingSettings = {
  textRateInrPerMin: number;
  voiceRateInrPerMin: number;
  videoRateInrPerMin: number;
  modelSharePercent: number;
  reserveMinutes: number;
  disconnectMinutes: number;
};

export type WalletTopupPackage = {
  id: string;
  title: string;
  amountInr: number;
  bonusInr: number;
};

export type AppSettings = {
  tokenPricingInr: number;
  defaultCallPricingTokens: number;
  commissionPercentage: number;
  minimumWithdrawalAmount: number;
  languageMasterList: string[];
  featureToggles: Record<string, boolean>;
  /** Free-form; admin-web maps to support email + phone lines */
  supportContactInfo: string;
  billing: BillingSettings;
};

export type AuditLogItem = {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  entity: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};
