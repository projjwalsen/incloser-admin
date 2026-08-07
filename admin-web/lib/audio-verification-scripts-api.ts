import type { CmsAudioVerificationScript } from "@incloser/shared-types";
import { adminGet, adminPatch } from "@/lib/api-client";

export function fetchAudioVerificationScripts() {
  return adminGet<CmsAudioVerificationScript[]>("/cms/audio-verification-scripts");
}

export function updateAudioVerificationScript(
  languageCode: string,
  input: { scriptText?: string; isActive?: boolean; languageLabel?: string },
) {
  return adminPatch<CmsAudioVerificationScript>(
    `/cms/audio-verification-scripts/${encodeURIComponent(languageCode)}`,
    input,
  );
}
