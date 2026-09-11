import { AdPopunder } from "@/components/ads/AdPopunder";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { Outlet } from "react-router-dom";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#content"
        className="sr-only left-4 top-4 z-50 rounded-md bg-accent px-3 py-2 text-sm text-white focus:not-sr-only focus:absolute"
      >
        Skip to content
      </a>
      <Header />
      <main id="content" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CommandPalette />
      <AdPopunder />
    </div>
  );
}
