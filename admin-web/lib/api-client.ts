type AdminApiEnvelope<T> = {
  ok: boolean;
  message: string;
  data: T;
};

import { clearAdminSession } from "./admin-session";

const ADMIN_AUTH_KEYS = ["admin_token", "adminToken", "token"] as const;

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem(ADMIN_AUTH_KEYS[0]) ??
    localStorage.getItem(ADMIN_AUTH_KEYS[1]) ??
    localStorage.getItem(ADMIN_AUTH_KEYS[2])
  );
}

/** Clears stored JWT / session keys used across admin API modules. */
export function clearAdminAuth(): void {
  clearAdminSession();
  if (typeof window === "undefined") return;
  for (const key of ADMIN_AUTH_KEYS) {
    localStorage.removeItem(key);
  }
}

/**
 * Admin API base URL for browser `fetch` calls.
 *
 * Default: same-origin `/api/admin-backend` (embedded Express on Vercel, or rewrite via
 * `ADMIN_API_PROXY_TARGET`). Only use `NEXT_PUBLIC_ADMIN_API_BASE_URL` when the browser
 * must call an external origin directly (requires CORS on the backend).
 */
export function getAdminApiBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL?.trim();
  if (!explicit) return "/api/admin-backend";

  const normalized = explicit.replace(/\/$/, "");

  if (typeof window !== "undefined") {
    const isLocalTarget = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(normalized);
    const onLocalDev =
      /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(window.location.origin) ||
      window.location.hostname === "localhost";
    // Common misconfig: NEXT_PUBLIC=http://127.0.0.1:8080 baked into a Vercel production build.
    if (isLocalTarget && !onLocalDev) return "/api/admin-backend";
  }

  return normalized;
}

function getBaseUrl(): string {
  return getAdminApiBaseUrl();
}

function mapFetchNetworkError(error: unknown, url: string): never {
  if (error instanceof TypeError) {
    const hint =
      url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")
        ? "The app is calling a local backend URL. Remove NEXT_PUBLIC_ADMIN_API_BASE_URL from Vercel, or start the backend on that port."
        : url.startsWith("http")
          ? "The browser cannot reach the configured backend URL. Remove NEXT_PUBLIC_ADMIN_API_BASE_URL to use /api/admin-backend on this site, or fix ADMIN_API_PROXY_TARGET / AWS incloser-node."
          : "Could not reach /api/admin-backend on this site. If using AWS, set ADMIN_API_PROXY_TARGET on Vercel to your incloser-node URL and redeploy. Otherwise set JWT_SECRET, SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY on Vercel for the embedded backend.";
    throw new Error(`${hint} (tried: ${url})`);
  }
  throw error;
}

export type AdminLoginResult = {
  token: string;
  admin: {
    id: string;
    username: string;
    email: string;
    full_name: string;
    role: string;
  };
};

/** Public login — does not send Authorization. */
export async function adminLogin(payload: {
  username?: string;
  email?: string;
  password: string;
}): Promise<AdminLoginResult> {
  const url = `${getBaseUrl()}/auth/login`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (e) {
    mapFetchNetworkError(e, url);
  }

  let json: Partial<AdminApiEnvelope<AdminLoginResult>> & { ok?: boolean; message?: string };
  try {
    json = (await response.json()) as typeof json;
  } catch {
    throw new Error("Invalid response from server.");
  }

  if (!response.ok || json.ok === false) {
    throw new Error(json.message ?? `Login failed (${response.status})`);
  }
  if (!json.data?.token) {
    throw new Error(json.message ?? "Malformed API response: missing token");
  }
  return json.data;
}

export async function adminGet<T>(path: string): Promise<T> {
  const token = getAuthToken();
  const url = `${getBaseUrl()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
  } catch (e) {
    mapFetchNetworkError(e, url);
  }

  const json = (await response.json()) as Partial<AdminApiEnvelope<T>> & { message?: string; ok?: boolean };
  if (!response.ok || json.ok === false) {
    throw new Error(json.message ?? `Request failed with status ${response.status}`);
  }
  if (!json.data) {
    throw new Error(json.message ?? "Malformed API response: missing data");
  }
  return json.data;
}

/** Step-up: verify the signed-in admin's password before sensitive actions. */
export async function reconfirmAdminPassword(password: string): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error("Not signed in");
  const url = `${getBaseUrl()}/auth/reconfirm`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
      cache: "no-store",
    });
  } catch (e) {
    mapFetchNetworkError(e, url);
  }

  const json = (await response.json()) as Partial<AdminApiEnvelope<unknown>> & { message?: string };
  if (!response.ok || json.ok === false) {
    throw new Error(json.message ?? "Password confirmation failed");
  }
}

export async function adminPost<T>(path: string, body: unknown = {}): Promise<T> {
  const token = getAuthToken();
  const url = `${getBaseUrl()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    mapFetchNetworkError(e, url);
  }

  const json = (await response.json()) as Partial<AdminApiEnvelope<T>> & { message?: string; ok?: boolean };
  if (!response.ok || json.ok === false) {
    throw new Error(json.message ?? `Request failed with status ${response.status}`);
  }
  if (!json.data) {
    throw new Error(json.message ?? "Malformed API response: missing data");
  }
  return json.data;
}

export async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  const token = getAuthToken();
  const url = `${getBaseUrl()}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    mapFetchNetworkError(e, url);
  }

  const json = (await response.json()) as Partial<AdminApiEnvelope<T>> & { message?: string; ok?: boolean };
  if (!response.ok || json.ok === false) {
    throw new Error(json.message ?? `Request failed with status ${response.status}`);
  }
  if (!json.data) {
    throw new Error(json.message ?? "Malformed API response: missing data");
  }
  return json.data;
}
