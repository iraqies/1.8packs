import { site } from "@/config";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Link } from "react-router-dom";

export function TermsPage() {
  useDocumentMeta({
    title: `Terms | ${site.name}`,
    description: "How 1.8packs works if you browse or download a pack.",
    path: "/terms",
  });

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-faint">Last updated September 11, 2026</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Terms</h1>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">What this site is</h2>
        <p className="leading-7 text-mute">
          {site.name} is a small place for Minecraft 1.8.9 PvP resource packs I made. Look at the screenshots, and
          download the zip if you like it. Drop it into your resourcepacks folder like any other pack.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Minecraft</h2>
        <p className="leading-7 text-mute">
          Minecraft is made by Mojang / Microsoft. I&apos;m just a fan. This site is not official, and they did not
          ask me to put it up.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">The packs</h2>
        <p className="leading-7 text-mute">
          The packs here are ones I made. Please don&apos;t reupload them and say they&apos;re yours. The preview
          pictures are just the pack running in-game.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Ads</h2>
        <p className="leading-7 text-mute">
          A few pages have ads from Adsterra so the site can stay up. The download wait screen has one too. Sometimes
          a click opens another tab. This page and the privacy page don&apos;t do that.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Accounts</h2>
        <p className="leading-7 text-mute">
          There&apos;s nothing to sign in to, and you can&apos;t upload packs yet. If that changes, I&apos;ll update
          this page first.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">If something goes wrong</h2>
        <p className="leading-7 text-mute">
          I try to keep the files in good shape, but every setup is a little different. If a pack acts weird in your
          game, I&apos;m sorry. You can always take it back out of the folder.
        </p>
      </section>

      <p className="mt-10 text-sm text-faint">
        Also see the <Link to="/privacy" className="text-mute hover:text-ink">privacy page</Link>.
      </p>
    </article>
  );
}
