import type { CmsBanner, CmsPoliciesResponse, FaqItem } from "@incloser/shared-types";

export const cmsService = {
  banners(): CmsBanner[] {
    return [
      {
        id: "b_1",
        title: "Welcome",
        imageUrl: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop",
        isActive: true,
        priority: 1,
      },
    ];
  },

  faq(): FaqItem[] {
    return [
      {
        id: "faq_1",
        question: "How do I withdraw?",
        answer: "Open Wallet → Withdrawals and submit a request. Processing times depend on your payout method.",
        isActive: true,
      },
    ];
  },

  policies(): CmsPoliciesResponse {
    return {
      terms: {
        title: "Terms & Conditions",
        body:
          "These Terms govern your use of InCloser services.\n\n1) Accounts must be accurate.\n2) Prohibited conduct includes harassment, fraud, and attempts to bypass payments.\n3) We may update these Terms with reasonable notice.\n\n(Replace with counsel-approved text.)",
        updatedAt: "Apr 02, 2026",
      },
      privacy: {
        title: "Privacy Policy",
        body:
          "InCloser collects data to operate the product safely and improve quality.\n\n- Data categories: account, usage, payments, support.\n- Retention: as required for compliance and dispute resolution.\n- Rights: access and deletion requests can be handled via support.\n\n(Replace with counsel-approved text.)",
        updatedAt: "Mar 28, 2026",
      },
    };
  },
};
