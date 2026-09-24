# AdLens (web)

The AdLens web client. Upload a video ad of up to 60 seconds, say where it will run (platforms, placements,
markets), and AdLens checks it against the platforms' ad policies and creative best practices. Every finding is
timestamped, links to the policy or guide it comes from, and seeks the replayed video when clicked.

It talks to the [AdLens API](https://github.com/haggifer/adlens-api) and shares the API contract through the
[`adlens-shared`](https://www.npmjs.com/package/adlens-shared) package.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Ant Design 6** (`antd`, `antd-style`) with `@ant-design/nextjs-registry` for SSR; Bootstrap 5 utility classes
  for layout
- **Better Auth** React client: email and password with email verification and password reset. The session is an
  httpOnly, `SameSite=Lax` cookie shared by `www.useadlens.com` and `api.useadlens.com`
- **TanStack Query** for server state, with a **Socket.IO** client that pushes realtime job updates into the query
  cache
- **Zustand** for UI state (the auth modal)
- **react-hook-form + zod**; the analysis settings form validates with the shared `analysisSettingsSchema`
- Direct-to-GCS uploads via V4 signed URLs, with progress
- **Vidstack** player for the uploaded and replayed video
- **Jest + React Testing Library** for tests
- Deployed on **Vercel**

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). It expects the API at `NEXT_PUBLIC_API_BASE_URL` (default
`http://localhost:8080`). Locally, cookies work because `localhost:3000` and `localhost:8080` are the same site.

## Scripts

- `npm run dev` — dev server (Turbopack)
- `npm run build` / `npm run start` — production build and server
- `npm run lint` — ESLint
- `npm test` — Jest
- `npm run format` — Prettier
- `npm run check:deps` — fails if a dependency points at a local path

## Environment

Both variables are `NEXT_PUBLIC_`, so they're inlined at **build** time; set them per environment in Vercel.

- `NEXT_PUBLIC_API_BASE_URL` — origin of the AdLens API (`https://api.useadlens.com` in production).
- `NEXT_PUBLIC_SITE_URL` — origin of this app (`https://www.useadlens.com` in production). Used for metadata and as
  the return address of the verification and password-reset emails.

## Routes

| Route             | What it does                                                             |
| ----------------- | ------------------------------------------------------------------------ |
| `/`               | Upload a video and choose the analysis settings                          |
| `/analyses/[id]`  | Live status of one analysis, then its results next to the replayed video |
| `/history`        | Every analysis, newest first                                             |
| `/account`        | Change password, sign out other devices, delete the account              |
| `/auth/verified`  | Landing page of the email confirmation link                              |
| `/reset-password` | Landing page of the password-reset link                                  |
| `/terms`          | Terms of Use                                                             |
| `/privacy`        | Privacy Policy                                                           |

## Structure

```
src/
  app/          # routes, root layout and client providers
  api/          # API client, typed endpoints, error codes → user-facing copy
  auth/         # Better Auth client and session context
  components/   # UI by feature
  content/      # long-form MDX content (legal documents)
  contexts/     # Zustand stores
  hooks/        # server-state hooks (TanStack Query, realtime)
  storage/      # signed-URL upload
```

Imports use the `@/*` alias, which maps to `src/*`.

## Deployment

Vercel builds and deploys every push to `init-setup` to production at `https://www.useadlens.com` (the apex redirects
to `www`). CI runs lint, types, tests and the build on every push and pull request.

## Design decisions

Decisions shared with the API (cookie sessions on one domain, the contract package) are recorded in the
[API README](https://github.com/haggifer/adlens-api#design-decisions).

- **Every analysis has its own page** (`/analyses/[id]`), so a result survives a reload and can be linked. The job is
  loaded once, then kept live by Socket.IO pushes written into the query cache; every (re)connect refetches, because
  updates sent while disconnected are lost.
- **The replay URL is fetched on demand**, not embedded in the job: signed URLs expire and would go stale in the
  cache.
- **The client owns user-facing copy.** The API returns stable error codes and the client maps them to messages, so
  server internals never reach the screen and wording can change without an API release.
- **The settings form validates with the shared schema** that the API enforces, so the two can't disagree about what
  a valid request is.
- **The theme follows the system until the user picks one.** The root layout renders the scheme from the user's choice
  (a cookie) or, on Chromium, from the `Sec-CH-Prefers-Color-Scheme` client hint, so the first paint is usually right;
  other browsers are corrected from `prefers-color-scheme` after hydration. The cost is that every route renders
  dynamically.
- **Legal documents are MDX in the repo**, rendered in the app's layout and theme, not Termly's embed script. They
  are generated with Termly, then edited as plain text, so they load no third-party script and each change is a
  reviewable diff. `src/mdx-components.tsx` gives headings ids for in-document links.
