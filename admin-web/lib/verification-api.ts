import { adminGet, getAdminApiBaseUrl } from "@/lib/api-client";

export type ProfileQueueItem = {
  id: string;
  modelId: string;
  nickname: string;
  avatarImageUrl: string | null;
  city: string | null;
  submittedAt: string;
  flags: string[];
  verificationStatus: "pending" | "approved" | "rejected" | "review";
};

export type AudioQueueItem = {
  id: string;
  modelId: string;
  nickname: string;
  avatarImageUrl: string | null;
  submittedAt: string;
  duration: string;
  status: "pending" | "approved" | "rejected" | "review";
  note: string;
  audioUrl: string | null;
};

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token") ?? localStorage.getItem("adminToken") ?? localStorage.getItem("token");
}

async function postNoBody<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${getAdminApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = (await response.json()) as { message?: string; data?: T };
  if (!response.ok || !json.data) throw new Error(json.message ?? "Verification request failed");
  return json.data;
}

export function fetchProfileQueue() {
  return adminGet<ProfileQueueItem[]>("/verification/profile");
}

export function approveProfile(id: string) {
  return postNoBody(`/verification/profile/${id}/approve`);
}

export function rejectProfile(id: string) {
  return postNoBody(`/verification/profile/${id}/reject`);
}

export function fetchAudioQueue() {
  return adminGet<AudioQueueItem[]>("/verification/audio");
}

export function approveAudio(id: string) {
  return postNoBody(`/verification/audio/${id}/approve`);
}

export function rejectAudio(id: string) {
  return postNoBody(`/verification/audio/${id}/reject`);
}

export function resubmitAudio(id: string) {
  return postNoBody(`/verification/audio/${id}/resubmit`);
}
