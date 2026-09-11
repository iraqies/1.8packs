import { ads, type AdSlotName } from "@/config";
import { cn } from "@/lib/utils";

const AD_PAGE: Record<AdSlotName, string> = {
  packPage: "/ads/728.html",
  exploreEnd: "/ads/728.html",
  exploreEmpty: "/ads/300.html",
  download: "/ads/300.html",
};

/**
 * Adsterra banners live in a real same-origin HTML file, not a srcDoc
 * sandbox. Their invoke.js returns an empty script when the request has no
 * Referer, which is what a unique-origin sandbox sends — a white box.
 */
export function AdSlot({
  name,
  label = "Ad",
  className,
}: {
  name: AdSlotName;
  label?: string;
  className?: string;
}) {
  const slot = ads.slots[name];
  const live = ads.enabled && Boolean(AD_PAGE[name]);

  return (
    <aside aria-label={label} className={cn("mx-auto w-full", className)} style={{ maxWidth: slot.width }}>
      <p className="mb-1.5 text-center text-xs text-faint">{label}</p>
      <div
        className={cn(
          "relative mx-auto overflow-hidden rounded-md",
          live ? "bg-page" : "flex items-center justify-center border border-dashed border-stroke bg-page-soft",
        )}
        style={{ height: slot.height, width: "100%", maxWidth: slot.width }}
      >
        {live ? (
          <iframe
            title={label}
            src={AD_PAGE[name]}
            width={slot.width}
            height={slot.height}
            scrolling="no"
            className="block border-0 bg-page"
          />
        ) : (
          <div className="px-4 text-center">
            <p className="text-sm text-mute">Ad</p>
            <p className="mt-0.5 text-xs text-faint">
              {slot.width}×{slot.height}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}