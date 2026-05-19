import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/app-sidebar";

export default function MainLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar />
      <main className="flex-1 min-w-0 h-screen flex flex-col py-2 pr-2">
        <div className="flex-1 min-h-0 min-w-0 overflow-hidden rounded-2xl border border-border-subtle bg-card shadow-elevation-sm">
          <div className="h-full w-full overflow-y-auto scrollbar-thin">
            <div className="mx-auto w-full max-w-6xl px-6 py-8 animate-fade-in">
              <Outlet />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
