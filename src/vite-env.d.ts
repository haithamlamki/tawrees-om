/// <reference types="vite/client" />

interface Window {
  gtag?: (
    command: 'event',
    eventName: string,
    eventParams?: Record<string, any>
  ) => void;
}
