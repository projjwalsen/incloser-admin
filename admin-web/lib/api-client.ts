type AdminApiEnvelope<T> = {
  ok: boolean;
  message: string;
  data: T;
};

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
  if (typeof window === "undefined") return;
  for (const key of ADMIN_AUTH_KEYS) {
    localStorage.removeItem(key);
  }
}

/**
 * When `NEXT_PUBLIC_ADMIN_API_BASE_URL` is unset, use the Next.js rewrite target
 * `/api/admin-backend` (see `next.config.ts` → `ADMIN_API_PROXY_TARGET`, default 127.0.0.1:5001).
 */
export function getAdminApiBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  return "/api/admin-backend";
}

function getBaseUrl(): string {
  return getAdminApiBaseUrl();
}

function mapFetchNetworkError(error: unknown): never {
  if (error instanceof TypeError) {
    throw new Error(
      "Could not reach the admin API. Start admin-backend (port 5001 by default), or set NEXT_PUBLIC_ADMIN_API_BASE_URL to your API URL.",
    );
  }
  throw error;
}

export type AdminLoginResult = {
  token: string;
  admin: {
    id: string;
    email: string;
    full_name: string;
    role: string;
  };
};

/** Public login — does not send Authorization. */
export async function adminLogin(payload: { email: string; password: string }): Promise<AdminLoginResult> {
  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch (e) {
    mapFetchNetworkError(e);
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
  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });
  } catch (e) {
    mapFetchNetworkError(e);
  }

  const json = (await response.json()) as Partial<AdminApiEnvelope<T>> & { message?: string };
  if (!response.ok) {
    throw new Error(json.message ?? `Request failed with status ${response.status}`);
  }
  if (!json.data) {
    throw new Error("Malformed API response: missing data");
  }
  return json.data;
}

/** Step-up: verify the signed-in admin's password before sensitive actions. */
export async function reconfirmAdminPassword(password: string): Promise<void> {
  const token = getAuthToken();
  if (!token) throw new Error("Not signed in");
  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}/auth/reconfirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
      cache: "no-store",
    });
  } catch (e) {
    mapFetchNetworkError(e);
  }

  const json = (await response.json()) as Partial<AdminApiEnvelope<unknown>> & { message?: string };
  if (!response.ok || json.ok === false) {
    throw new Error(json.message ?? "Password confirmation failed");
  }
}

export async function adminPatch<T>(path: string, body: unknown): Promise<T> {
  const token = getAuthToken();
  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (e) {
    mapFetchNetworkError(e);
  }

  const json = (await response.json()) as Partial<AdminApiEnvelope<T>> & { message?: string };
  if (!response.ok) {
    throw new Error(json.message ?? `Request failed with status ${response.status}`);
  }
  if (!json.data) {
    throw new Error("Malformed API response: missing data");
  }
  return json.data;
}
