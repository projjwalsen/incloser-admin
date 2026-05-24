import type { AvatarItem, AvatarGenderType } from "@incloser/shared-types";
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
    throw new Error(json.message ?? "Avatar API request failed");
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
    throw new Error(json.message ?? "Avatar delete failed");
  }
}

export function fetchAvatars() {
  return adminGet<AvatarItem[]>("/cms/avatars");
}

export function createAvatar(input: {
  image: File;
  title: string;
  genderType: AvatarGenderType;
  category: string;
  sortOrder: number;
  isActive: boolean;
}) {
  const form = new FormData();
  form.set("image", input.image);
  form.set("title", input.title);
  form.set("genderType", input.genderType);
  form.set("category", input.category);
  form.set("sortOrder", String(input.sortOrder));
  form.set("isActive", String(input.isActive));
  return requestWithForm<AvatarItem>("/cms/avatars", "POST", form);
}

export function updateAvatar(
  id: string,
  input: {
    image?: File;
    title?: string;
    genderType?: AvatarGenderType;
    category?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
) {
  const form = new FormData();
  if (input.image) form.set("image", input.image);
  if (input.title !== undefined) form.set("title", input.title);
  if (input.genderType !== undefined) form.set("genderType", input.genderType);
  if (input.category !== undefined) form.set("category", input.category);
  if (input.sortOrder !== undefined) form.set("sortOrder", String(input.sortOrder));
  if (input.isActive !== undefined) form.set("isActive", String(input.isActive));
  return requestWithForm<AvatarItem>(`/cms/avatars/${id}`, "PATCH", form);
}

export function deleteAvatar(id: string) {
  return requestDelete(`/cms/avatars/${id}`);
}
