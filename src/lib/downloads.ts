import { cdnBase } from "@/config";
import type { Pack } from "@/types";

/** GitHub release asset in production, or public/downloads in local dev. */
export function downloadUrl(pack: Pack) {
  return cdnBase ? `${cdnBase}/${pack.downloadName}` : pack.downloadPath;
}

export function isRemoteDownload(url: string) {
  return /^https?:\/\//i.test(url);
}
