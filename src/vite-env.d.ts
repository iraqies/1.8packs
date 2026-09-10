/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * GitHub Releases download origin, e.g.
   * https://github.com/iraqies/1.8packs/releases/download/packs
   * Empty in local dev so the files are read from public/downloads instead.
   */
  readonly VITE_CDN_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
