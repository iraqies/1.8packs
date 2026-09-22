export const RESOLUTIONS = ["8x", "16x", "32x", "64x", "128x"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export const FEATURES = [
  "short-swords",
  "low-fire",
  "custom-particles",
  "custom-sky",
  "fps-friendly",
  "animated-textures",
  "blue",
  "pink",
  "anime",
] as const;
export type Feature = (typeof FEATURES)[number];

export interface PackImage {
  src: string;
  label: string;
}

export interface Pack {
  slug: string;
  name: string;
  creator: string;
  description: string;
  version: "1.8.9";
  resolution: Resolution;
  features: Feature[];
  createdAt: string;
  updatedAt: string;
  downloadPath: string;
  downloadName: string;
  cover: string;
  gallery: PackImage[];
}
