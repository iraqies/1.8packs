import { site } from "@/config";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Link } from "react-router-dom";

export function PrivacyPage() {
  useDocumentMeta({
    title: `Privacy Policy | ${site.name}`,
    description: "Working draft of the 1.8packs privacy policy for the current public preview.",
    path: "/privacy",
  });

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-faint">Last updated September 11, 2026</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-4 leading-7 text-mute">
        This draft covers the current preview of {site.name}. It will be replaced if accounts or first-party download
        tracking are added.
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-medium">What this site is</h2>
        <p className="leading-7 text-mute">
          {site.name} is a resource-pack catalog. This build has no sign-in, no profiles, and no creator dashboards.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Data we do not collect yet</h2>
        <p className="leading-7 text-mute">
          We do not currently create user accounts, store favorites, or keep a personal download history on the site.
          Pack download totals shown on the site are GitHub&apos;s public release-asset counts. We read that number; we
          do not add our own tracker.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Hosting and logs</h2>
        <p className="leading-7 text-mute">
          The site is intended to run on Cloudflare Pages. Pack zip files are hosted as GitHub Release assets. Those
          hosts typically keep short-lived technical logs such as IP address, browser type, and requested URL. Those
          logs are controlled by their own policies.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Cookies</h2>
        <p className="leading-7 text-mute">
          Pack pages, Explore, and the download dialog show ads from Adsterra. Those tags may set third-party cookies
          and open a popunder on click. Adsterra&apos;s own policy covers what they collect. You can block this with
          an ad blocker. Legal pages do not load the popunder.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">What comes later</h2>
        <p className="leading-7 text-mute">
          Planned features include accounts and pack uploads. Those features will need extra personal data. They will
          not silently appear under this draft.
        </p>
      </section>

      <p className="mt-10 text-sm text-faint">
        Related:{" "}
        <Link to="/terms" className="text-mute transition-colors hover:text-ink">
          Terms &amp; Conditions
        </Link>
      </p>
    </article>
  );
}
