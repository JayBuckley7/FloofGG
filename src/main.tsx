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
    const unregisterAll = async () => {
      try {
        // Get all registrations and unregister them
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
        
        // Also try to unregister by scope
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.unregister();
        }
        
        console.log('Service workers unregistered for development');
      } catch (error) {
        console.warn('Error unregistering service workers:', error);
      }
    };
    
    // Unregister immediately and on page load
    unregisterAll();
    window.addEventListener('load', unregisterAll);
    
    // Also unregister on focus (in case user switches tabs)
    window.addEventListener('focus', unregisterAll);
  } else if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.error('Service worker registration failed:', err);
      });
    });
  }
}
