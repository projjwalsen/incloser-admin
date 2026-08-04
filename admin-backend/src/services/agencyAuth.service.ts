import jwt from "jsonwebtoken";
import type { AgencyLoginPayload } from "@incloser/shared-types";
import { getEnv } from "../config/env.js";
import { verifyPassword } from "../lib/password.js";
import { isMissingRelationError, pgErrorText } from "../lib/supabase-errors.js";
import { getSupabaseAdminClient } from "../lib/supabase.js";

export class AgencyAuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export type AgencyJwtPayload = {
  sub: string;
  code: string;
  typ: "agency";
};

export const agencyAuthService = {
  async login(code: string, password: string): Promise<AgencyLoginPayload> {
    const normalized = String(code ?? "")
      .trim()
      .toUpperCase();
    if (!normalized || normalized.length !== 6) {
      throw new AgencyAuthError("Invalid agency code or password", 401);
    }
    if (!password) {
      throw new AgencyAuthError("Invalid agency code or password", 401);
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("agencies")
      .select("id,name,code,password_hash,is_active")
      .eq("code", normalized)
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        throw new AgencyAuthError("Agency module not configured", 503);
      }
      console.error("[agencyAuth] query", pgErrorText(error));
      throw new AgencyAuthError("Could not verify credentials. Try again later.", 503);
    }

    if (!data) throw new AgencyAuthError("Invalid agency code or password", 401);
    if (!data.is_active) throw new AgencyAuthError("This agency has been deactivated.", 403);

    const ok = await verifyPassword(password, String(data.password_hash));
    if (!ok) throw new AgencyAuthError("Invalid agency code or password", 401);

    const token = jwt.sign(
      { sub: data.id, code: data.code, typ: "agency" } satisfies AgencyJwtPayload,
      getEnv().JWT_SECRET,
      { expiresIn: "12h" }
    );

    return {
      token,
      agency: {
        id: data.id,
        name: data.name,
        code: data.code,
      },
    };
  },
};
