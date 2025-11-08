import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>,
);

// Only register service worker in production
if ('serviceWorker' in navigator) {
  if (import.meta.env.DEV) {
    // Aggressively unregister service workers in development
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().then(() => {
          console.log('Service worker unregistered');
        });
      });
    });
    // Also try to unregister by scope
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration) {
        registration.unregister().then(() => {
          console.log('Service worker unregistered by scope');
        });
      }
    });
  } else if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    });
  }
}
