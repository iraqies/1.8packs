import { useEffect } from "react";

interface MetaInput {
  title: string;
  description: string;
  path: string;
  image?: string;
}

function upsertMeta(selector: string, attributes: Record<string, string>) {
  let element = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!element) {
    const tag = selector.startsWith('link') ? "link" : "meta";
    element = document.createElement(tag);
    document.head.appendChild(element);
  }
  Object.entries(attributes).forEach(([key, value]) => {
    element?.setAttribute(key, value);
  });
}

export function useDocumentMeta({ title, description, path, image }: MetaInput) {
  useEffect(() => {
    const origin = window.location.origin;
    const url = `${origin}${path}`;
    document.title = title;

    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: url });
    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: image ? "summary_large_image" : "summary",
    });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    upsertMeta('link[rel="canonical"]', { rel: "canonical", href: url });

    if (image) {
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: `${origin}${image}` });
    }
  }, [title, description, path, image]);
}
