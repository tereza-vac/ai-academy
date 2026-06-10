import { createBrowserRouter } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { ProtectedRoute } from "@/components/protected-route";
import { lazyWithReload } from "@/lib/lazyWithReload";

export const router = createBrowserRouter([
  // Public routes (auth-related)
  { path: "/login", lazy: lazyWithReload(() => import("@/pages/LoginPage")) },
  { path: "/auth/callback", lazy: lazyWithReload(() => import("@/pages/AuthCallbackPage")) },

  // App shell — every route here requires auth (no-op in mock mode)
  {
    path: "/",
    Component: ProtectedRoute,
    children: [
      {
        path: "/",
        Component: MainLayout,
        children: [
          { index: true, lazy: lazyWithReload(() => import("@/pages/HomePage")) },
          { path: "learn", lazy: lazyWithReload(() => import("@/pages/LearnPage")) },
          { path: "learn/:slug", lazy: lazyWithReload(() => import("@/pages/TopicDetailPage")) },
          { path: "radar", lazy: lazyWithReload(() => import("@/pages/RadarPage")) },
          { path: "spectrum", lazy: lazyWithReload(() => import("@/pages/SpectrumPage")) },
          { path: "spectrum/:slug", lazy: lazyWithReload(() => import("@/pages/ModelDetailPage")) },
          { path: "map", lazy: lazyWithReload(() => import("@/pages/MapPage")) },
          { path: "tutor", lazy: lazyWithReload(() => import("@/pages/TutorPage")) },
          { path: "flashcards", lazy: lazyWithReload(() => import("@/pages/FlashcardsPage")) },
          { path: "progress", lazy: lazyWithReload(() => import("@/pages/ProgressPage")) },
          { path: "plan", lazy: lazyWithReload(() => import("@/pages/StudyPlanPage")) },
          { path: "achievements", lazy: lazyWithReload(() => import("@/pages/AchievementsPage")) },
          { path: "settings", lazy: lazyWithReload(() => import("@/pages/SettingsPage")) },
          { path: "team", lazy: lazyWithReload(() => import("@/pages/TeamPage")) },
          { path: "library", lazy: lazyWithReload(() => import("@/pages/LibraryPage")) },
          { path: "library/search", lazy: lazyWithReload(() => import("@/pages/PaperSearchPage")) },
          { path: "papers", lazy: lazyWithReload(() => import("@/pages/PaperSearchPage")) },
          { path: "reader/:resourceId", lazy: lazyWithReload(() => import("@/pages/ReaderPage")) },
          { path: "practice", lazy: lazyWithReload(() => import("@/pages/PracticePage")) },
          { path: "practice/:slug", lazy: lazyWithReload(() => import("@/pages/QuizRunnerPage")) },
          { path: "build-lab", lazy: lazyWithReload(() => import("@/pages/BuildLabPage")) },
          { path: "*", lazy: lazyWithReload(() => import("@/pages/NotFoundPage")) },
        ],
      },
    ],
  },
]);
