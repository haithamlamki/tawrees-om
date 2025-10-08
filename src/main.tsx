import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { I18nextProvider } from "react-i18next";
import App from "./App.tsx";
import "./index.css";
import i18n from "./i18n/config";

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <App />
      </ThemeProvider>
    </I18nextProvider>
  </StrictMode>
);
