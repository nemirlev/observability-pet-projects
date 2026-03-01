'use client';

import {
  faro,
  getWebInstrumentations,
  initializeFaro,
} from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

export default function FrontendObservability() {
  // skip if already initialized or no URL (e.g. Alloy not running)
  if (faro.api || !process.env.NEXT_PUBLIC_FARO_URL) {
    return null;
  }

  try {
    const appName =
      process.env.NEXT_PUBLIC_FARO_APP_NAME || 'next-frontend';

    initializeFaro({
      url: process.env.NEXT_PUBLIC_FARO_URL,
      app: {
        name: appName,
        namespace:
          process.env.NEXT_PUBLIC_FARO_APP_NAMESPACE || undefined,
        version:
          process.env.VERCEL_DEPLOYMENT_ID || '1.0.0',
        environment:
          process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',
      },

      instrumentations: [
        ...getWebInstrumentations(),
        new TracingInstrumentation(),
      ],
    });

    // So Grafana Frontend Observability shows the correct service name (service.name)
    faro.api.setSession(undefined, { overrides: { serviceName: appName } });
  } catch {
    return null;
  }
  return null;
}
