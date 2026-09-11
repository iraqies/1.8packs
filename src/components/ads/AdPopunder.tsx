import { ads } from "@/config";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SKIP = new Set(["/privacy", "/terms"]);

/**
 * Adsterra popunder must run in the real page, not an iframe — it listens
 * for clicks on this document. Skip localhost so local testing does not
 * poison the zone with invalid traffic.
 */
export function AdPopunder() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!ads.enabled || !ads.popunderSrc) return;
    if (SKIP.has(pathname)) return;
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return;
    if (document.querySelector(`script[src="${ads.popunderSrc}"]`)) return;

    const script = document.createElement("script");
    script.src = ads.popunderSrc;
    script.async = true;
    document.body.appendChild(script);
  }, [pathname]);

  return null;
}