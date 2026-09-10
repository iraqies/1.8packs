import type { Pack } from "@/types";

export const packs: Pack[] = [
  {
    slug: "konata",
    name: "Konata Izumi",
    creator: "1.8packs",
    description: "Made by iraqies @18packs.pages.dev",
    version: "1.8.9",
    resolution: "16x",
    features: ["custom-sky", "animated-textures", "short-swords", "anime", "blue"],
    createdAt: "2026-09-05",
    updatedAt: "2026-09-05",
    downloadPath: "/downloads/Konata-Izumi-16x.zip",
    downloadName: "Konata-Izumi-16x.zip",
    cover: "/previews/konata/thumb.webp?v=layout4",
    gallery: [
      { src: "/previews/konata/swords.webp?v=close1", label: "Swords" },
      { src: "/previews/konata/foods.webp?v=close1", label: "Foods" },
      { src: "/previews/konata/tools.webp?v=close1", label: "Tools" },
      { src: "/previews/konata/blocks.webp?v=close1", label: "Blocks" },
      { src: "/previews/konata/nether.webp?v=close1", label: "Nether" },
      { src: "/previews/konata/sky.webp?v=close1", label: "Sky" },
      { src: "/previews/konata/gui.webp?v=close1", label: "Menus" }
    ],
  }
];

export function getPack(slug: string) {
  return packs.find((pack) => pack.slug === slug);
}

export const featuredPacks = packs;
