# AdLens (web)

The AdLens web client: sign in, upload a short video ad, and watch it get analyzed against a
150-rule ad-policy set — findings, advisories, and a transcript stream in as the analysis runs. It
talks to the [AdLens API](https://github.com/haggifer/adlens-api) and shares its request/response
types through the [`adlens-shared`](https://www.npmjs.com/package/adlens-shared) package.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Ant Design 6** (`antd`, `antd-style`) with `@ant-design/nextjs-registry` for SSR; Bootstrap 5
  utility classes for layout
- **Better Auth** React client (bearer token in `localStorage`) for auth
- **TanStack Query** for server state, with a **Socket.IO** client that pushes realtime job updates
  into the query cache (replacing Firestore `onSnapshot`)
- **react-hook-form + zod** for forms
- **`adlens-shared`** for the API contract (Zod source of truth → generated types)
- Direct-to-GCS uploads via V4 signed URLs
- Deployed on **Vercel**

## Getting started

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_BASE_URL
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It expects the API at the URL in
`NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8080`).

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint
- `npm run format` — Prettier

## Environment

- `NEXT_PUBLIC_API_BASE_URL` — origin of the AdLens API (e.g. `http://localhost:8080` locally, the
  Cloud Run URL in production). Better Auth is served under `{API}/api/auth`; the app's own calls go
  to `{API}/v1/*`. Because it's a `NEXT_PUBLIC_` variable it is inlined at **build** time, so changing
  it requires a rebuild — set it per environment in the Vercel project settings.

## Structure

```
src/
  app/         # layout, page, providers (antd registry + ConfigProvider + React Query)
  auth/        # Better Auth client + AuthContext
  api/         # axios client (bearer) + typed jobs API
  hooks/       # useJob (query + socket), useQuota
  storage/     # signed-URL upload
  components/  # auth (forms), upload (settings, results), layout, utils (Field), ...
```

Imports use the `@/*` alias, which maps to `src/*` (e.g. `@/auth/authClient`).
