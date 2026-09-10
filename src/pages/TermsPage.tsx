import { site } from "@/config";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { Link } from "react-router-dom";

export function TermsPage() {
  useDocumentMeta({
    title: `Terms & Conditions | ${site.name}`,
    description: "Working draft of the 1.8packs terms for browsing and downloading resource packs.",
    path: "/terms",
  });

  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-sm text-faint">Last updated September 10, 2026</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Terms & Conditions</h1>
      <p className="mt-4 leading-7 text-mute">
        This is a working draft for {site.name}. It describes how the site is intended to work. It is not a substitute
        for a lawyer-reviewed agreement.
      </p>

      <section className="mt-10 space-y-3">
        <h2 className="text-lg font-medium">The service</h2>
        <p className="leading-7 text-mute">
          {site.name} is a website for previewing and downloading Minecraft Java Edition 1.8.9 resource packs that we
          made. Install them at your own risk.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Downloads</h2>
        <p className="leading-7 text-mute">
          Resource packs are files you install at your own risk. Minecraft, your launcher, and your hardware can behave
          differently from pack to pack. We do not warrant that a pack is safe, complete, or compatible with your setup.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Accounts and uploads</h2>
        <p className="leading-7 text-mute">
          Accounts, creator uploads, ratings, and favorites are not available in this build. When those features ship,
          these terms will be updated before they apply.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Acceptable use</h2>
        <p className="leading-7 text-mute">
          Do not use the site to distribute malware, steal content, harass people, or break the law. Do not attempt to
          disrupt the service or other users.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Intellectual property</h2>
        <p className="leading-7 text-mute">
          Minecraft is a trademark of Mojang Studios. {site.name} is not affiliated with Mojang or Microsoft. Packs
          published here are ours. Preview images are in-game screenshots of those packs.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-lg font-medium">Liability</h2>
        <p className="leading-7 text-mute">
          The site is provided as is. To the extent the law allows, {site.name} is not liable for lost data, lost time,
          or other damages that come from using the site or a downloaded pack.
        </p>
      </section>

      <p className="mt-10 text-sm text-faint">
        Related:{" "}
        <Link to="/privacy" className="text-mute transition-colors hover:text-ink">
          Privacy Policy
        </Link>
      </p>
    </article>
  );
}
