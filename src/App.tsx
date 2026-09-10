import { Layout } from "@/components/layout/Layout";
import { DownloadStatsProvider } from "@/data/DownloadStats";
import { ExplorePage } from "@/pages/ExplorePage";
import { HomePage } from "@/pages/HomePage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PackPage } from "@/pages/PackPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { TermsPage } from "@/pages/TermsPage";
import { createBrowserRouter, RouterProvider, ScrollRestoration } from "react-router-dom";

function RootLayout() {
  return (
    <DownloadStatsProvider>
      <ScrollRestoration />
      <Layout />
    </DownloadStatsProvider>
  );
}

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "explore", element: <ExplorePage /> },
      { path: "packs/:slug", element: <PackPage /> },
      { path: "terms", element: <TermsPage /> },
      { path: "privacy", element: <PrivacyPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
