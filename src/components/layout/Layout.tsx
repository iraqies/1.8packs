import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { ScrollProgress } from "@/components/motion/ScrollProgress";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { Outlet, useLocation } from "react-router-dom";

export function Layout() {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#content"
        className="sr-only left-4 top-4 z-50 rounded-[6px] bg-accent px-3 py-2 text-sm text-white focus:not-sr-only focus:absolute"
      >
        Skip to content
      </a>
      <ScrollProgress />
      <Header />
      <main id="content" className="flex-1">
        <div key={pathname} className="animate-page">
          <Outlet />
        </div>
      </main>
      <Footer />
      <CommandPalette />
    </div>
  );
}
