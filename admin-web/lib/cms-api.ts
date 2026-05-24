import type { CmsBanner, CmsPoliciesResponse, FaqItem } from "@incloser/shared-types";
import { adminGet } from "./api-client";

export function fetchCmsBanners() {
  return adminGet<CmsBanner[]>("/cms/banners");
}

export function fetchCmsFaq() {
  return adminGet<FaqItem[]>("/cms/faq");
}

export function fetchCmsPolicies() {
  return adminGet<CmsPoliciesResponse>("/cms/policies");
}
