import { ads, type AdSlotName } from "@/config";
import { cn } from "@/lib/utils";

/**
 * A labelled ad container that always occupies its configured height, whether
 * or not a tag is loaded. Reserving the space is what keeps an ad from feeling
 * intrusive: without it the unit shoves the page down as it loads.
 *
 * The tag runs in an iframe rather than in the page. That is required for
 * document.write-style banner tags, and it also keeps third-party ad script
 * out of the app's own origin.
 */
export function AdSlot({
  name,
  label = "Advertisement",
  className,
}: {
  name: AdSlotName;
  label?: string;
  className?: string;
}) {
  const slot = ads.slots[name];
  const live = ads.enabled && slot.tag.trim().length > 0;

  return (
    <aside aria-label={label} className={cn("mx-auto w-full", className)} style={{ maxWidth: slot.width }}>
      <p className="mb-1.5 text-center text-[10px] font-medium uppercase tracking-[0.18em] text-faint">{label}</p>
      <div
        className={cn(
          "relative mx-auto flex w-full items-center justify-center overflow-hidden rounded-[10px] bg-page-soft",
          live ? null : "border border-dashed border-stroke-strong",
        )}
        style={{ height: slot.height }}
      >
        {live ? (
          <iframe
            title={label}
            width={slot.width}
            height={slot.height}
            scrolling="no"
            // No allow-same-origin: the tag gets an opaque origin and cannot
            // reach into the site.
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            srcDoc={`<!doctype html><html><body style="margin:0;overflow:hidden">${slot.tag}</body></html>`}
            className="block border-0"
          />
        ) : (
          <div className="px-4 text-center">
            <p className="text-[13px] font-semibold text-mute">Ad slot</p>
            <p className="mt-0.5 text-[11px] text-faint">
              {slot.width}×{slot.height} · hooks up once the site is online
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
