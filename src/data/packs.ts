import type { Pack } from "@/types";

export const packs: Pack[] = [
  {
    slug: "konata",
    name: "Konata Izumi",
    creator: "1.8packs",
    description:
      "Made by iraqies @18packs.pages.dev",
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
  },
  {
    slug: "rosea",
    name: "Rosea",
    creator: "keno",
    description:
      "32x PvP pack by keno.",
    version: "1.8.9",
    resolution: "32x",
    features: ["custom-sky", "animated-textures", "short-swords", "pink"],
    createdAt: "2026-09-22",
    updatedAt: "2026-09-22",
    downloadPath: "/downloads/Rosea-32x.zip",
    downloadName: "Rosea-32x.zip",
    cover: "/previews/rosea/thumb.webp?v=layout4",
    gallery: [
      { src: "/previews/rosea/swords.webp?v=close1", label: "Swords" },
      { src: "/previews/rosea/foods.webp?v=close1", label: "Foods" },
      { src: "/previews/rosea/tools.webp?v=close1", label: "Tools" },
      { src: "/previews/rosea/blocks.webp?v=close1", label: "Blocks" },
      { src: "/previews/rosea/nether.webp?v=close1", label: "Nether" },
      { src: "/previews/rosea/sky.webp?v=close1", label: "Sky" },
      { src: "/previews/rosea/gui.webp?v=close1", label: "Menus" }
    ],
  },
  {
    slug: "haimiya",
    name: "Haimiya Mio",
    creator: "R0L1",
    description:
      "1.8.9 PvP pack by R0L1.",
    version: "1.8.9",
    resolution: "16x",
    features: ["custom-sky", "animated-textures", "short-swords", "anime"],
    createdAt: "2026-09-22",
    updatedAt: "2026-09-22",
    downloadPath: "/downloads/Haimiya-Mio-16x.zip",
    downloadName: "Haimiya-Mio-16x.zip",
    cover: "/previews/haimiya/thumb.webp?v=layout4",
    gallery: [
      { src: "/previews/haimiya/swords.webp?v=close1", label: "Swords" },
      { src: "/previews/haimiya/foods.webp?v=close1", label: "Foods" },
      { src: "/previews/haimiya/tools.webp?v=close1", label: "Tools" },
      { src: "/previews/haimiya/blocks.webp?v=close1", label: "Blocks" },
      { src: "/previews/haimiya/nether.webp?v=close1", label: "Nether" },
      { src: "/previews/haimiya/sky.webp?v=close1", label: "Sky" },
      { src: "/previews/haimiya/gui.webp?v=close1", label: "Menus" }
    ],
  },
  {
    slug: "glaze",
    name: "Glaze",
    creator: "ansoni",
    description:
      "16x PvP pack by ansoni.",
    version: "1.8.9",
    resolution: "16x",
    features: ["custom-sky", "animated-textures", "short-swords", "blue"],
    createdAt: "2026-09-22",
    updatedAt: "2026-09-22",
    downloadPath: "/downloads/Glaze-16x.zip",
    downloadName: "Glaze-16x.zip",
    cover: "/previews/glaze/thumb.webp?v=layout4",
    gallery: [
      { src: "/previews/glaze/swords.webp?v=close1", label: "Swords" },
      { src: "/previews/glaze/foods.webp?v=close1", label: "Foods" },
      { src: "/previews/glaze/tools.webp?v=close1", label: "Tools" },
      { src: "/previews/glaze/blocks.webp?v=close1", label: "Blocks" },
      { src: "/previews/glaze/nether.webp?v=close1", label: "Nether" },
      { src: "/previews/glaze/sky.webp?v=close1", label: "Sky" },
      { src: "/previews/glaze/gui.webp?v=close1", label: "Menus" }
    ],
  },
  {
    slug: "purp",
    name: "Purp",
    creator: "Rh568",
    description:
      "16x PvP pack by Rh568.",
    version: "1.8.9",
    resolution: "16x",
    features: ["custom-sky", "animated-textures", "short-swords"],
    createdAt: "2026-09-22",
    updatedAt: "2026-09-22",
    downloadPath: "/downloads/Purp-16x.zip",
    downloadName: "Purp-16x.zip",
    cover: "/previews/purp/thumb.webp?v=layout4",
    gallery: [
      { src: "/previews/purp/swords.webp?v=close1", label: "Swords" },
      { src: "/previews/purp/foods.webp?v=close1", label: "Foods" },
      { src: "/previews/purp/tools.webp?v=close1", label: "Tools" },
      { src: "/previews/purp/blocks.webp?v=close1", label: "Blocks" },
      { src: "/previews/purp/nether.webp?v=close1", label: "Nether" },
      { src: "/previews/purp/sky.webp?v=close1", label: "Sky" },
      { src: "/previews/purp/gui.webp?v=close1", label: "Menus" }
    ],
  }
];

export function getPack(slug: string) {
  return packs.find((pack) => pack.slug === slug);
}

export const featuredPacks = packs;
