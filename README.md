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
- **Better Auth** React client: email and password with email verification and password reset, plus Google and GitHub
  sign-in (`signIn.social`; a failed sign-in comes back with `?error=`, shown once by `useSignInErrorNotice`), and
  anonymous sessions (Better Auth's anonymous plugin): a visitor is signed in anonymously right before their first
  analysis. The session is an httpOnly, `SameSite=Lax` cookie shared by `www.useadlens.com` and `api.useadlens.com`
- **Cloudflare Turnstile** (`@marsidev/react-turnstile`, Managed mode), run when an analysis starts and invisible
  unless Cloudflare asks for a click
- **TanStack Query** for server state, with a **Socket.IO** client that pushes realtime job updates into the query
  cache
- **Zustand** for UI state (the auth and contact modals, in-app navigation for the Back button)
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

## Environment

All three variables are `NEXT_PUBLIC_`, so they're inlined at **build** time; set them per environment in Vercel.

- `NEXT_PUBLIC_API_BASE_URL` — origin of the AdLens API (`https://api.useadlens.com` in production).
- `NEXT_PUBLIC_SITE_URL` — origin of this app (`https://www.useadlens.com` in production). Used for page metadata;
  the links in emails are built by the API from its `WEB_ORIGIN`.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: the Turnstile widget's site key. Unset, it is Cloudflare's always-pass test key
  `1x00000000000000000000AA`, which works only with the API's test secret; `2x00000000000000000000AB` always fails.
  A production build (`VERCEL_ENV=production`) fails without it rather than ship the test key.

## Routes

| Route             | What it does                                                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`               | Upload a video and choose the analysis settings                                                                                                                           |
| `/analyses/[id]`  | Live status of one analysis, then its results next to the replayed video                                                                                                  |
| `/history`        | Every analysis, newest first                                                                                                                                              |
| `/account`        | Sign-in methods, change or set a password, sign out other devices, delete the account (anonymous visitors get a sign-up prompt, unconfirmed accounts a Confirm email one) |
| `/confirm-email`  | Landing page of the email confirmation link; confirms, then goes home                                                                                                     |
| `/reset-password` | Landing page of the password-reset link                                                                                                                                   |
| `/terms`          | Terms of Use                                                                                                                                                              |
| `/privacy`        | Privacy Policy                                                                                                                                                            |

## Structure

```
src/
  app/          # routes, root layout and client providers
  api/          # API client, typed endpoints, error codes → user-facing copy
  auth/         # Better Auth client and session context
  components/   # UI by feature
  content/      # long-form MDX content (legal documents)
  contexts/     # Zustand stores
  design/       # antd theme, light/dark scheme and its cookie
  hooks/        # server-state hooks (TanStack Query, realtime)
  storage/      # signed-URL upload
  test/         # shared test helpers: render with providers, auth states, fixtures
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
  updates sent while disconnected are lost. The socket is open only while the job is verifying, queued or analyzing:
  Cloud Run bills an API instance for as long as any socket to it is open.
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
- **Phones and tablets get the same pages, restacked.** Below 768px the header's navigation, account menu and theme
  switch move into a menu drawer; below 992px the video and its panel stack. Stacked players take the video's own
  aspect ratio (measured by the API, or read from the file before upload) rather than a fixed box, and touch screens
  get 44px tap targets and 16px form fields, so iOS doesn't zoom into a focused field. Below 768px, controls are also a
  step larger than antd's defaults (36px, via antd's CSS variables in `globals.css`) to avoid mis-taps; desktop keeps
  antd's sizes.
- **Legal documents are MDX in the repo**, rendered in the app's layout and theme, not Termly's embed script. They
  are generated with Termly, then edited as plain text, so they load no third-party script and each change is a
  reviewable diff. `src/mdx-components.tsx` gives headings ids for in-document links.
- **The first analysis needs no account.** A visitor gets an anonymous session only when they start an analysis, so
  crawlers create no users, and their history, quota and live updates work as for anyone. The header offers only Sign
  In (its dialog links to sign-up): signing in, or signing up and confirming the email in the same browser, moves the
  analyses and runs to the account and deletes the anonymous user. The anonymous placeholder email never reaches the UI (`AuthContext` gives `null`). "Forget this browser"
  (account menu and phone menu, after a confirmation) signs the anonymous session out for a shared computer; its
  analyses stay in the database but can no longer be reached.
- **Turnstile runs on Run, and only shows itself when it needs a click.** The widget is set to `execution: 'execute'`
  and `appearance: 'interaction-only'`, so nothing is shown and nothing runs until an analysis starts. Visitors
  without an account get a token first (the API always checks theirs), before any anonymous user is created.
  Members skip it; if the API answers `CHALLENGE_REQUIRED` (a busy network), the page runs the check and starts
  over with a new job, since the token is only read at job creation. A check that doesn't finish within 30 s,
  unless the visitor is answering a challenge, fails the run with the recovery hint.
