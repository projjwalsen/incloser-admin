import type { CmsNoticeBoardItem } from "@incloser/shared-types";
import { adminGet, getAdminApiBaseUrl } from "@/lib/api-client";

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token") ?? localStorage.getItem("adminToken") ?? localStorage.getItem("token");
}

async function requestWithForm<T>(path: string, method: "POST" | "PATCH", body: FormData): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });
  const json = (await response.json()) as { message?: string; data?: T };
  if (!response.ok || !json.data) {
    throw new Error(json.message ?? "Notice board API request failed");
  }
  return json.data;
}

async function requestDelete(path: string): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = (await response.json()) as { message?: string };
  if (!response.ok) {
    throw new Error(json.message ?? "Notice delete failed");
  }
}

export function fetchNoticeBoardItems() {
  return adminGet<CmsNoticeBoardItem[]>("/cms/notice-board");
}

export function createNoticeBoardItem(input: {
  image?: File;
  title: string;
  subtitle?: string;
  accent: string;
  actionKey?: string;
  sortOrder: number;
  isActive: boolean;
}) {
  const form = new FormData();
  if (input.image) form.set("image", input.image);
  form.set("title", input.title);
  if (input.subtitle) form.set("subtitle", input.subtitle);
  form.set("accent", input.accent);
  if (input.actionKey) form.set("actionKey", input.actionKey);
  form.set("sortOrder", String(input.sortOrder));
  form.set("isActive", String(input.isActive));
  return requestWithForm<CmsNoticeBoardItem>("/cms/notice-board", "POST", form);
}

export function updateNoticeBoardItem(
  id: string,
  input: {
    image?: File;
    title?: string;
    subtitle?: string | null;
    accent?: string;
    actionKey?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  const form = new FormData();
  if (input.image) form.set("image", input.image);
  if (input.title !== undefined) form.set("title", input.title);
  if (input.subtitle !== undefined) form.set("subtitle", input.subtitle ?? "");
  if (input.accent !== undefined) form.set("accent", input.accent);
  if (input.actionKey !== undefined) form.set("actionKey", input.actionKey ?? "");
  if (input.sortOrder !== undefined) form.set("sortOrder", String(input.sortOrder));
  if (input.isActive !== undefined) form.set("isActive", String(input.isActive));
  return requestWithForm<CmsNoticeBoardItem>(`/cms/notice-board/${id}`, "PATCH", form);
}

export function deleteNoticeBoardItem(id: string) {
  return requestDelete(`/cms/notice-board/${id}`);
}
