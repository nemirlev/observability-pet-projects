import Image from "next/image";
import { ObservabilityDemo } from "@/components/observability-demo";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center gap-12 py-16 px-6 sm:px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
            priority
          />
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            Next.js + Faro + OpenTelemetry
          </h1>
          <p className="max-w-md text-zinc-600 dark:text-zinc-400">
            This page is server-rendered (backend trace). Use the block below to
            trigger client activity, API calls, and errors for observability.
          </p>
        </div>

        <ObservabilityDemo backendName={process.env.OTEL_SERVICE_NAME ?? ''} />

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 md:w-auto"
            href="https://vercel.com/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel"
              width={16}
              height={16}
            />
            Deploy
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-zinc-300 px-5 text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800 md:w-auto"
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
        </div>
      </main>
    </div>
  );
}
