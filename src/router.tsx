import { createBrowserRouter } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { ProtectedRoute } from "@/components/protected-route";

export const router = createBrowserRouter([
  // Public routes (auth-related)
  { path: "/login", lazy: () => import("@/pages/LoginPage") },
  { path: "/auth/callback", lazy: () => import("@/pages/AuthCallbackPage") },

  // App shell — every route here requires auth (no-op in mock mode)
  {
    path: "/",
    Component: ProtectedRoute,
    children: [
      {
        path: "/",
        Component: MainLayout,
        children: [
          { index: true, lazy: () => import("@/pages/HomePage") },
          { path: "learn", lazy: () => import("@/pages/LearnPage") },
          { path: "learn/:slug", lazy: () => import("@/pages/TopicDetailPage") },
          { path: "radar", lazy: () => import("@/pages/RadarPage") },
          { path: "map", lazy: () => import("@/pages/MapPage") },
          { path: "tutor", lazy: () => import("@/pages/TutorPage") },
          { path: "flashcards", lazy: () => import("@/pages/FlashcardsPage") },
          { path: "progress", lazy: () => import("@/pages/ProgressPage") },
          { path: "plan", lazy: () => import("@/pages/StudyPlanPage") },
          { path: "achievements", lazy: () => import("@/pages/AchievementsPage") },
          { path: "settings", lazy: () => import("@/pages/SettingsPage") },
          { path: "team", lazy: () => import("@/pages/TeamPage") },
          { path: "library", lazy: () => import("@/pages/LibraryPage") },
          { path: "library/search", lazy: () => import("@/pages/PaperSearchPage") },
          { path: "reader/:resourceId", lazy: () => import("@/pages/ReaderPage") },
          { path: "practice", lazy: () => import("@/pages/PracticePage") },
          { path: "practice/:slug", lazy: () => import("@/pages/QuizRunnerPage") },
          { path: "build-lab", lazy: () => import("@/pages/BuildLabPage") },
          { path: "*", lazy: () => import("@/pages/NotFoundPage") },
        ],
      },
    ],
  },
]);
