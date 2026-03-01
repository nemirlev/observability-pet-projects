This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Observability

The app is instrumented with:

- **Grafana Faro** (`@grafana/faro-react`, `@grafana/faro-web-tracing`) — RUM: errors, logs, and traces are sent to the Faro collector (e.g. Alloy on `http://localhost:12347/collect` when using the parent repo’s docker-compose).
- **Sentry** (`@sentry/nextjs`) — Error tracking, performance tracing, and optional session replay. Set `NEXT_PUBLIC_SENTRY_DSN` to enable.

Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_FARO_COLLECTOR_URL` and optionally `NEXT_PUBLIC_SENTRY_DSN`. With the default Faro URL, run the [observability stack](../../) (Alloy, Loki, Tempo, etc.) to receive RUM data.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
