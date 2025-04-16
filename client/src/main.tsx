import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Application version timestamp to force page refresh
const APP_VERSION = "v1.0.1-" + new Date().toISOString();
console.log(`App starting. Version: ${APP_VERSION}`);

// Check if we need to force a page reload
const lastVersion = localStorage.getItem('app-version');
if (lastVersion && lastVersion !== APP_VERSION) {
  console.log(`Version changed from ${lastVersion} to ${APP_VERSION}. Reloading page...`);
  localStorage.setItem('app-version', APP_VERSION);
  window.location.reload();
} else {
  localStorage.setItem('app-version', APP_VERSION);
}

// Aggressive service worker management
if (navigator.serviceWorker) {
  console.log("Checking for service workers to unregister...");
  
  // Force update service worker and clear caches
  navigator.serviceWorker.getRegistrations().then(registrations => {
    if (registrations.length > 0) {
      console.log(`Found ${registrations.length} service worker(s) to unregister`);
      registrations.forEach(registration => {
        console.log("Unregistering service worker:", registration);
        registration.unregister().then(success => {
          console.log("Service worker unregistered successfully:", success);
          if (success) {
            console.log("Reloading page to apply service worker changes");
            window.location.reload();
          }
        });
      });
    } else {
      console.log("No service workers found to unregister");
    }
  });

  // Clear all caches to ensure fresh content
  if ('caches' in window) {
    console.log("Clearing browser caches...");
    caches.keys().then(cacheNames => {
      if (cacheNames.length > 0) {
        console.log(`Found ${cacheNames.length} cache(s) to delete`);
        const deletionPromises = cacheNames.map(cacheName => {
          console.log("Deleting cache:", cacheName);
          return caches.delete(cacheName);
        });
        
        Promise.all(deletionPromises).then(results => {
          const deletedCount = results.filter(Boolean).length;
          console.log(`Successfully deleted ${deletedCount} of ${results.length} caches`);
        });
      } else {
        console.log("No caches found to delete");
      }
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
