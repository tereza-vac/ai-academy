import { createBrowserRouter } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      { index: true, lazy: () => import("@/pages/HomePage") },
      { path: "learn", lazy: () => import("@/pages/LearnPage") },
      { path: "learn/:slug", lazy: () => import("@/pages/TopicDetailPage") },
      { path: "radar", lazy: () => import("@/pages/RadarPage") },
      { path: "library", lazy: () => import("@/pages/LibraryPage") },
      { path: "practice", lazy: () => import("@/pages/PracticePage") },
      { path: "practice/:slug", lazy: () => import("@/pages/QuizRunnerPage") },
      { path: "build-lab", lazy: () => import("@/pages/BuildLabPage") },
      { path: "*", lazy: () => import("@/pages/NotFoundPage") },
    ],
  },
]);
