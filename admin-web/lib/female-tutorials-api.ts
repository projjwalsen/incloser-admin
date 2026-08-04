import type { CmsTutorialVideo } from "@incloser/shared-types";
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
    throw new Error(json.message ?? "Tutorial API request failed");
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
    throw new Error(json.message ?? "Tutorial delete failed");
  }
}

export function fetchFemaleTutorials() {
  return adminGet<CmsTutorialVideo[]>("/cms/female-tutorials");
}

export function createFemaleTutorial(input: {
  thumbnail: File;
  video?: File;
  title: string;
  videoUrl?: string;
  sortOrder?: number;
}) {
  const form = new FormData();
  form.set("thumbnail", input.thumbnail);
  if (input.video) form.set("video", input.video);
  form.set("title", input.title);
  if (input.videoUrl) form.set("videoUrl", input.videoUrl);
  form.set("sortOrder", String(input.sortOrder ?? 1));
  form.set("isActive", "true");
  return requestWithForm<CmsTutorialVideo>("/cms/female-tutorials", "POST", form);
}

export function updateFemaleTutorial(
  id: string,
  input: {
    thumbnail?: File;
    video?: File;
    title?: string;
    videoUrl?: string | null;
    sortOrder?: number;
  },
) {
  const form = new FormData();
  if (input.thumbnail) form.set("thumbnail", input.thumbnail);
  if (input.video) form.set("video", input.video);
  if (input.title !== undefined) form.set("title", input.title);
  if (input.videoUrl !== undefined) form.set("videoUrl", input.videoUrl ?? "");
  if (input.sortOrder !== undefined) form.set("sortOrder", String(input.sortOrder));
  form.set("isActive", "true");
  return requestWithForm<CmsTutorialVideo>(`/cms/female-tutorials/${id}`, "PATCH", form);
}

export function deleteFemaleTutorial(id: string) {
  return requestDelete(`/cms/female-tutorials/${id}`);
}
