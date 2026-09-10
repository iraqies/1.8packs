import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";
import { packs } from "../src/data/packs";
import { site } from "../src/config";

/**
 * The app is a single-page router, so every route is served the same
 * index.html and the tags are set later by useDocumentMeta. Discord, Twitter,
 * Slack and most crawlers never run that JavaScript, so a shared pack link
 * used to preview as generic site text with no cover image.
 *
 * This emits a real HTML file per route with its own head, so link unfurls and
 * crawled titles are correct. Only the head is prerendered — the body still
 * renders client-side, which is fine because unfurlers read tags only and
 * Google executes JS for the rest.
 */

interface Route {
  /** URL path, no trailing slash. */
  path: string;
  title: string;
  description: string;
  /** Site-absolute image path. */
  image?: string;
  imageAlt?: string;
  lastmod?: string;
}

function origin() {
  const value = process.env.VITE_SITE_URL?.trim() || "https://1-8packs.pages.dev";
  return value.replace(/\/+$/, "");
}

function routes(): Route[] {
  return [
    {
      path: "/",
      title: `${site.name} | Minecraft 1.8.9 PvP resource packs`,
      description: site.description,
      image: packs[0]?.cover,
      imageAlt: packs[0] ? `${packs[0].name} pack cover` : undefined,
    },
    {
      path: "/explore",
      title: `Explore PvP packs | ${site.name}`,
      description: "Search 1.8.9 PvP resource packs by name, creator, resolution, or feature.",
    },
    ...packs.map((pack) => ({
      path: `/packs/${pack.slug}`,
      title: `${pack.name} | 1.8.9 PvP Resource Pack`,
      description: pack.description,
      image: pack.cover,
      imageAlt: `${pack.name} pack cover`,
      lastmod: pack.updatedAt,
    })),
    {
      path: "/terms",
      title: `Terms & Conditions | ${site.name}`,
      description: "Working draft of the 1.8packs terms for browsing and downloading resource packs.",
    },
    {
      path: "/privacy",
      title: `Privacy Policy | ${site.name}`,
      description: "Working draft of the 1.8packs privacy policy for the current public preview.",
    },
  ];
}

function escapeAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absolute(base: string, path: string) {
  return `${base}${path}`;
}

/** Covers are all composed at this size by scripts/make-pack-thumbs.py. */
const COVER_WIDTH = 1600;
const COVER_HEIGHT = 1000;

/**
 * Unfurlers truncate hard and Google shows roughly 160 characters, so trim on a
 * word boundary rather than letting a 350-character pack blurb run on.
 */
function summarise(text: string, limit = 200) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : limit).replace(/[,;:.]$/, "")}…`;
}

function headFor(route: Route, base: string) {
  const url = absolute(base, route.path);
  const image = route.image ? absolute(base, route.image) : undefined;
  const description = summarise(route.description);
  const tags = [
    `<title>${escapeAttr(route.title)}</title>`,
    `<meta name="description" content="${escapeAttr(description)}" />`,
    `<link rel="canonical" href="${escapeAttr(url)}" />`,
    `<meta property="og:site_name" content="${escapeAttr(site.name)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapeAttr(route.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(description)}" />`,
    `<meta property="og:url" content="${escapeAttr(url)}" />`,
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${escapeAttr(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
  ];
  if (image) {
    tags.push(`<meta property="og:image" content="${escapeAttr(image)}" />`);
    // Declaring the size lets Discord and Slack lay the card out on first
    // fetch instead of waiting to measure the image.
    tags.push(`<meta property="og:image:width" content="${COVER_WIDTH}" />`);
    tags.push(`<meta property="og:image:height" content="${COVER_HEIGHT}" />`);
    if (route.imageAlt) {
      tags.push(`<meta property="og:image:alt" content="${escapeAttr(route.imageAlt)}" />`);
    }
    tags.push(`<meta name="twitter:image" content="${escapeAttr(image)}" />`);
  }
  return tags.map((tag) => `    ${tag}`).join("\n");
}

/** Replaces the title and description baked into index.html by Vite. */
function renderHtml(template: string, route: Route, base: string) {
  return template
    .replace(/\n?\s*<title>[\s\S]*?<\/title>/, "")
    .replace(/\n?\s*<meta\s+name="description"[\s\S]*?\/>/, "")
    .replace("</head>", `${headFor(route, base)}\n  </head>`);
}

function sitemapXml(list: Route[], base: string) {
  const entries = list
    .map((route) => {
      const lastmod = route.lastmod ? `<lastmod>${route.lastmod}</lastmod>` : "";
      return `  <url><loc>${absolute(base, route.path)}</loc>${lastmod}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function robotsTxt(base: string) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`;
}

export function staticSeo(): Plugin {
  return {
    name: "static-seo",
    apply: "build",
    enforce: "post",
    closeBundle() {
      const base = origin();
      const outDir = "dist";
      const template = readFileSync(join(outDir, "index.html"), "utf8");
      const list = routes();

      for (const route of list) {
        // "/" is already index.html; the rest get <path>/index.html so Pages
        // serves them at the extensionless URL.
        const target =
          route.path === "/"
            ? join(outDir, "index.html")
            : join(outDir, route.path.replace(/^\//, ""), "index.html");
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, renderHtml(template, route, base));
      }

      writeFileSync(join(outDir, "sitemap.xml"), sitemapXml(list, base));
      writeFileSync(join(outDir, "robots.txt"), robotsTxt(base));

      this.info(`prerendered ${list.length} route heads and sitemap entries, base ${base}`);
    },
  };
}
