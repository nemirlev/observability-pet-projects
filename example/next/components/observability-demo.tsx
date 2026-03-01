'use client';

import { faro } from '@grafana/faro-web-sdk';
import { useEffect, useState } from 'react';

type ObservabilityDemoProps = {
  backendName: string;
};

export function ObservabilityDemo({ backendName }: ObservabilityDemoProps) {
  const [apiResult, setApiResult] = useState<string | null>(null);
  const [rejectionFeedback, setRejectionFeedback] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const faroActive = mounted && !!faro.api;
  const faroUrl = process.env.NEXT_PUBLIC_FARO_URL;
  const frontendName =
    process.env.NEXT_PUBLIC_FARO_APP_NAME || 'next-frontend';

  const callApi = async () => {
    setLoading(true);
    setApiResult(null);
    try {
      const res = await fetch('/api/hello');
      const data = await res.json();
      setApiResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setApiResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const throwClientError = () => {
    throw new Error('Observability demo: intentional client error for Faro');
  };

  const triggerUnhandledRejection = () => {
    setRejectionFeedback(null);
    const err = new Error(
      'Observability demo: unhandled promise rejection'
    );
    if (faro.api) {
      faro.api.pushError(err);
      setRejectionFeedback('Error sent to Faro. Check Frontend Observability.');
    } else {
      Promise.reject(err);
      setRejectionFeedback(
        'Unhandled rejection triggered (Faro not active — check console).'
      );
    }
  };

  return (
    <section className="w-full max-w-2xl rounded-xl border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        Observability check
      </h2>

      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span
          className={`rounded-full px-2.5 py-0.5 font-medium ${
            !mounted
              ? 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400'
              : faroActive
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
          }`}
        >
          Faro: {!mounted ? '—' : faroActive ? 'active' : faroUrl ? 'not connected' : 'not configured'}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-500 dark:text-zinc-400">
            Frontend Name:
          </span>
          <code className="rounded bg-zinc-200 px-2 py-0.5 font-mono text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
            {frontendName}
          </code>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-zinc-500 dark:text-zinc-400">
            Backend Name:
          </span>
          <code className="rounded bg-zinc-200 px-2 py-0.5 font-mono text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200">
            {backendName}
          </code>
        </div>
      </div>

      <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Use the actions below to generate frontend and backend telemetry and
        errors, then check Grafana (Tempo traces, Frontend Observability).
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={callApi}
          disabled={loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {loading ? 'Calling…' : 'Call API (backend + frontend trace)'}
        </button>
        <button
          type="button"
          onClick={throwClientError}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 dark:bg-red-700 dark:hover:bg-red-600"
        >
          Throw client error
        </button>
        <button
          type="button"
          onClick={triggerUnhandledRejection}
          className="rounded-lg border border-red-400 bg-transparent px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          Unhandled rejection
        </button>
      </div>

      {apiResult && (
        <pre className="mt-4 overflow-auto rounded-lg border border-zinc-200 bg-white p-3 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {apiResult}
        </pre>
      )}

      {rejectionFeedback && (
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          {rejectionFeedback}
        </p>
      )}
    </section>
  );
}
