import { site } from "@/config";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Link } from "react-router-dom";

export function PrivacyPage() {
  useDocumentMeta({
    title: `Privacy | ${site.name}`,
    description: "What 1.8packs does and does not collect.",
    path: "/privacy",
  });

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-faint">Last updated September 11, 2026</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Privacy</h1>
      <p className="mt-4 leading-7 text-mute">
        You don&apos;t need an account here, and I never ask for your name or email. This page is just about how the
        site works today.
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-medium">What I don&apos;t keep</h2>
        <p className="leading-7 text-mute">
          There&apos;s no profile, no favorites list, and no download history attached to you.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Download numbers</h2>
        <p className="leading-7 text-mute">
          The number next to a pack is the count GitHub already shows for that file. I just display it. I don&apos;t
          run my own tracker.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Hosting</h2>
        <p className="leading-7 text-mute">
          The site lives on Cloudflare Pages, and the zips sit on GitHub Releases. Those hosts keep the usual server
          logs, like an IP and which page was requested. That stays on their side, under their rules.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Ads</h2>
        <p className="leading-7 text-mute">
          Pack pages, Explore, and the download dialog load ads from Adsterra. Their scripts can set cookies, and a
          click may open another tab. I don&apos;t see that data. This page and the terms page skip that extra tab. An
          ad blocker will stop all of this if you&apos;d rather not see it.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">If I add accounts later</h2>
        <p className="leading-7 text-mute">
          If I ever add sign-in, I&apos;ll change this page first so you can see what&apos;s new.
        </p>
      </section>

      <p className="mt-10 text-sm text-faint">
        Also see the <Link to="/terms" className="text-mute hover:text-ink">terms page</Link>.
      </p>
    </article>
  );
}
