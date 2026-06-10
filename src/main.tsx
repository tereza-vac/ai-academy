import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { reloadForStaleChunk } from "@/lib/lazyWithReload";

// Vite fires this when a module preload fails (typically a stale chunk after a
// new deployment). Recover with a guarded one-time reload instead of crashing.
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  try {
    void reloadForStaleChunk(event.payload);
  } catch {
    // Reload guard exhausted — leave it to the route-level handler/boundary.
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
