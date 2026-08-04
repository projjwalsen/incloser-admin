/** Roles assignable to admin users and JWT `role` claim */
export type AdminRole =
  | "super_admin"
  | "operations_admin"
  | "moderator"
  | "verification_admin"
  | "finance_admin"
  | "support_admin";

/** CMS admin account (no password in API responses). */
export type AdminUserAccount = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

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

/** Female home tutorial carousel — admin CMS + mobile RPC */
export type CmsTutorialVideo = {
  id: string;
  title: string;
  thumbnailUrl: string;
  videoUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Female home notice board carousel — admin CMS + mobile RPC */
export type CmsNoticeBoardItem = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  accent: string;
  actionKey: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Language-wise speak-out text for model audio verification */
export type CmsAudioVerificationScript = {
  languageCode: string;
  languageLabel: string;
  scriptText: string;
  isActive: boolean;
  updatedAt: string;
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
/** Per-minute INR rates and model payout settings (admin + mobile billing). */
export type BillingSettings = {
  textRateInrPerMin: number;
  voiceRateInrPerMin: number;
  videoRateInrPerMin: number;
  /** @deprecated Use platformCommissionPercent — kept for backward compatibility */
  modelSharePercent: number;
  platformCommissionPercent: number;
  fixedChargeInr: number;
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

/** Agency payout / model withdrawal deduction settings (admin). */
export type AgencySettings = {
  defaultAgencyCommissionPercent: number;
  platformWithdrawalChargePercent: number;
  tdsThresholdInr: number;
  tdsPercent: number;
};

export type AgencySummary = {
  id: string;
  name: string;
  code: string;
  commissionPercent: number;
  availableBalanceInr: number;
  lifetimeCommissionInr: number;
  modelCount: number;
  isActive: boolean;
  createdAt: string;
};

export type AgencyModelRow = {
  modelId: string;
  userId: string | null;
  nickname: string;
  phone: string | null;
  verificationStatus: string;
  lifetimeCommissionInr: number;
  createdAt: string;
};

export type AgencyCommissionRow = {
  id: string;
  modelId: string;
  modelName: string;
  grossWithdrawalInr: number;
  commissionPercent: number;
  commissionInr: number;
  note: string | null;
  createdAt: string;
};

export type AgencyWithdrawalStatus = "pending" | "approved" | "rejected" | "paid";

export type AgencyWithdrawalRequest = {
  id: string;
  agencyId: string;
  agencyName: string;
  agencyCode: string;
  requestedAmountInr: number;
  platformChargeInr: number;
  tdsInr: number;
  netPayoutInr: number;
  status: AgencyWithdrawalStatus;
  payoutMethod: string | null;
  bankMasked: string | null;
  upiId: string | null;
  financeNote: string | null;
  paidTxnId: string | null;
  paidVia: string | null;
  requestedAt: string;
  processedAt: string | null;
};

export type AgencyDetail = AgencySummary & {
  models: AgencyModelRow[];
  recentCommissions: AgencyCommissionRow[];
  withdrawalRequests: AgencyWithdrawalRequest[];
};

export type AgencyLoginPayload = {
  token: string;
  agency: {
    id: string;
    name: string;
    code: string;
  };
};

export type AgencyPortalDashboard = {
  agency: AgencySummary;
  models: AgencyModelRow[];
  recentCommissions: AgencyCommissionRow[];
  withdrawalRequests: AgencyWithdrawalRequest[];
  settings: AgencySettings;
};
