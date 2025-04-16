import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Simple service worker unregistration for development without auto-refresh
if (navigator.serviceWorker) {
  console.log("Checking for service workers...");
  
  // Only unregister service workers without forcing a reload
  navigator.serviceWorker.getRegistrations().then(registrations => {
    if (registrations.length > 0) {
      console.log(`Found ${registrations.length} service worker(s)`);
      registrations.forEach(registration => {
        console.log("Unregistering service worker:", registration);
        registration.unregister().then(success => {
          console.log("Service worker unregistered:", success);
        });
      });
    } else {
      console.log("No service workers found");
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
