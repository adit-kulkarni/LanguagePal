import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Service worker management for development
if (navigator.serviceWorker) {
  // Force update service worker and clear caches
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
      console.log("Unregistering service worker:", registration);
      registration.unregister();
    });
  });

  // Clear all caches to ensure fresh content
  if ('caches' in window) {
    caches.keys().then(cacheNames => {
      cacheNames.forEach(cacheName => {
        console.log("Deleting cache:", cacheName);
        caches.delete(cacheName);
      });
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
