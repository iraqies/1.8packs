import { AdSlot } from "@/components/ads/AdSlot";
import { Button } from "@/components/ui/Button";
import { site } from "@/config";
import { downloadUrl, isRemoteDownload } from "@/lib/downloads";
import type { Pack } from "@/types";
import { Check, Download, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Phase = "idle" | "preparing" | "ready";

function triggerDownload(path: string, filename: string) {
  const link = document.createElement("a");
  link.href = path;
  // Cross-origin (GitHub Releases) ignores the download attribute and may
  // navigate if we stay on this tab. Same-origin zips can save in place.
  if (isRemoteDownload(path)) {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  } else {
    link.download = filename;
  }
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function DownloadButton({ pack }: { pack: Pack }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => () => window.cancelAnimationFrame(frameRef.current), []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (phase === "preparing") return;
      event.preventDefault();
      close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, phase]);

  function close() {
    if (phase === "preparing") return;
    window.cancelAnimationFrame(frameRef.current);
    setOpen(false);
    setPhase("idle");
    setProgress(0);
  }

  function prepare() {
    if (phase === "preparing") return;
    setOpen(true);
    setPhase("preparing");
    setProgress(0);

    const start = performance.now();

    function step(now: number) {
      const ratio = Math.min(1, (now - start) / site.downloadPrepMs);
      setProgress(ratio);
      if (ratio < 1) {
        frameRef.current = window.requestAnimationFrame(step);
        return;
      }
      setPhase("ready");
      triggerDownload(downloadUrl(pack), pack.downloadName);
    }

    frameRef.current = window.requestAnimationFrame(step);
  }

  const percent = Math.round(progress * 100);

  return (
    <>
      <Button className="w-full min-w-[220px]" onClick={prepare} disabled={phase === "preparing"}>
        <Download className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-y-0.5" />
        Download pack
      </Button>

      {open
        ? createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center px-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="download-gate-title"
              aria-describedby="download-gate-copy"
            >
              <div className="absolute inset-0 animate-fade bg-page/80 backdrop-blur-sm" />
              <div className="animate-pop relative w-full max-w-md overflow-hidden rounded-[14px] border border-stroke-strong bg-raised p-6 shadow-[0_30px_80px_rgb(0_0_0_/_0.6)]">
                {phase === "ready" ? (
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-[8px] text-faint transition-colors hover:bg-page-soft hover:text-ink"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}

                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-faint">Download</p>
                <h2 id="download-gate-title" className="mt-1 text-xl font-semibold tracking-tight">
                  {phase === "ready" ? "Your pack is ready" : "Getting your pack ready…"}
                </h2>
                <p id="download-gate-copy" className="mt-2 text-sm leading-6 text-mute">
                  {phase === "ready"
                    ? "If the file did not start, use the button below."
                    : "Please wait a moment. The zip is being prepared."}
                </p>

                <AdSlot name="download" label="A message from our sponsors" className="mt-5" />

                <div className="mt-5">
                  <div
                    className="h-1 overflow-hidden rounded-full bg-panel"
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Download preparation"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-accent-2"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[12px] tabular-nums text-faint" aria-live="polite">
                    {phase === "ready" ? "Done" : `${percent}%`}
                  </p>
                </div>

                {phase === "ready" ? (
                  <Button
                    className="mt-4 w-full"
                    onClick={() => triggerDownload(downloadUrl(pack), pack.downloadName)}
                  >
                    <Check className="animate-pop h-4 w-4" />
                    Download again
                  </Button>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
