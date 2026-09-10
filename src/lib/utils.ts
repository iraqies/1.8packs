export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatDownloads(count: number) {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return new Intl.NumberFormat("en-US").format(count);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function labelPvpType(type: string) {
  const labels: Record<string, string> = {
    bedwars: "Bedwars",
    skywars: "Skywars",
    boxing: "Boxing",
    uhc: "UHC",
    pot: "Pot",
    crystal: "Crystal",
    general: "General PvP",
  };
  return labels[type] ?? type;
}

export function labelFeature(feature: string) {
  const labels: Record<string, string> = {
    "short-swords": "Short swords",
    "low-fire": "Low fire",
    "custom-particles": "Custom particles",
    "custom-sky": "Custom sky",
    "fps-friendly": "FPS friendly",
    "animated-textures": "Animated textures",
    blue: "Blue",
    anime: "Anime",
  };
  return labels[feature] ?? feature;
}

export function toggleValue<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
