
import * as Sentry from '@sentry/react';

export const init = () => {
  // Initialize Sentry - real configuration should use environment variables
  // for the DSN, but this is a placeholder implementation
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || '',
    integrations: [
      new Sentry.BrowserTracing(),
      new Sentry.Replay(),
    ],
    // Adjust this value in production, it's recommended to set to 1.0 for production
    tracesSampleRate: 0.5,
    // Capture 10% of all sessions
    replaysSessionSampleRate: 0.1,
    // Capture 100% of sessions with errors
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  });
};

// Export additional Sentry utilities if needed
export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
export const setUser = Sentry.setUser;
