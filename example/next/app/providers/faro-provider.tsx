"use client";

import {
  getWebInstrumentations,
  initializeFaro,
} from "@grafana/faro-react";
import { TracingInstrumentation } from "@grafana/faro-web-tracing";
import { useEffect, type ReactNode } from "react";

const FARO_URL = process.env.NEXT_PUBLIC_FARO_COLLECTOR_URL;
const FARO_APP_NAME = process.env.NEXT_PUBLIC_FARO_APP_NAME ?? "next-app";

let faroInitialized = false;

function initFaro() {
  if (typeof window === "undefined" || faroInitialized || !FARO_URL) return;
  faroInitialized = true;

  const faro = initializeFaro({
    url: FARO_URL,
    app: {
      name: FARO_APP_NAME,
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0",
    },
    instrumentations: [
      ...getWebInstrumentations(),
      new TracingInstrumentation({
        instrumentationOptions: {
          propagateTraceHeaderCorsUrls: [
            /^https?:\/\/localhost(:\d+)?/,
            /^https?:\/\/127\.0\.0\.1(:\d+)?/,
          ],
        },
      }),
    ],
  });

  faro.api.setSession(undefined, { overrides: { serviceName: FARO_APP_NAME } });
}

export function FaroProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initFaro();
  }, []);
  return <>{children}</>;
}
