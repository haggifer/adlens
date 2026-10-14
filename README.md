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
  sign-in (`signIn.social` in a popup that reports back from `/auth/done`; when the popup is blocked, in the tab
  itself, where a failed sign-in comes back with `?error=`, shown once by `useSignInErrorNotice`, and only in a
  tab that left for that sign-in), and
  anonymous sessions (Better Auth's anonymous plugin): a visitor is signed in anonymously right before their first
  analysis or first saved preset. The session is an httpOnly, `SameSite=Lax` cookie shared by `www.useadlens.com`
  and `api.useadlens.com`
- **Cloudflare Turnstile** (`@marsidev/react-turnstile`, Managed mode), run when an analysis starts or a contact
  message is sent, and invisible unless Cloudflare asks for a click
- **TanStack Query** for server state, with a **Socket.IO** client that pushes realtime job updates into the query
  cache
- **Zustand** for UI state (the auth and contact modals, in-app navigation for the Back button)
- **react-hook-form + zod**; the analysis settings form validates with the shared `analysisSettingsSchema`
- Direct-to-GCS uploads via V4 signed URLs, with progress
- **Vidstack** player for the uploaded and replayed video
- **react-swipeable** to open the phone menu with a swipe left anywhere on the page and close it with a swipe right
  (`useMenuSwipe`)
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
- `npm run knip` — unused files, exports and dependencies, which ESLint can't see across files (`knip.json`; CI runs it)
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

| Route            | What it does                                                                                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`              | Upload a video and choose the analysis settings; the password-reset link lands here with `?reset-password-token=`, which opens the reset form in the auth modal and then leaves the address                                                                           |
| `/demo`          | Example reports: a tab per demo analysis (`GET /v1/demos`), each with a summary of what it found, the video and the full report; linked from What you’ll get and, as Examples, from the navigation, which shows it to every visitor (History needs a session)         |
| `/analyses/[id]` | Live status of one analysis, then its results next to the replayed video                                                                                                                                                                                              |
| `/history`       | Every analysis, newest first                                                                                                                                                                                                                                          |
| `/presets`       | The user's presets (saved analysis settings), by name, with how often each was used: create, edit, delete and pick the default; linked from the navigation for everyone: a visitor without a session sees the empty state, since creating a preset starts the session |
| `/account`       | Sign-in methods, change or set a password, sign out other devices, delete the account (anonymous visitors get a sign-up prompt, unconfirmed accounts a Confirm email one)                                                                                             |
| `/confirm-email` | Landing page of the email confirmation link; confirms for the signed-in account and stays to say so (the tab the user came from updates on its own)                                                                                                                   |
| `/auth/done`     | Landing page of the Google / GitHub sign-in popup; reports the outcome to the tab that opened it, then closes                                                                                                                                                         |
| `/terms`         | Terms of Use                                                                                                                                                                                                                                                          |
| `/privacy`       | Privacy Policy                                                                                                                                                                                                                                                        |
| `/sitemap.xml`   | The public pages (`/`, `/demo`, `/terms`, `/privacy`), each also declaring itself canonical, so the http and non-www copies point at www                                                                                                                              |
| `/robots.txt`    | Allows every page and names the sitemap; the private pages stay out of the index through their noindex tag, which a crawler must fetch the page to read                                                                                                               |

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
  hooks/        # server-state hooks (TanStack Query, realtime), sign-out and other shared UI hooks
  storage/      # signed-URL upload
  test/         # shared test helpers: render with providers, auth states, fixtures
```

Imports use the `@/*` alias, which maps to `src/*`.

## Deployment

Vercel builds and deploys every push to `init-setup` to production at `https://www.useadlens.com` (the apex redirects
to `www`). CI runs lint, types, tests and the build on every push to `init-setup` or `main` and on every pull request.

## Design decisions

Decisions shared with the API (cookie sessions on one domain, the contract package) are recorded in the
[API README](https://github.com/haggifer/adlens-api#design-decisions).

- **Every analysis has its own page** (`/analyses/[id]`), so a result survives a reload and can be linked. The job is
  loaded once, then kept live by Socket.IO pushes written into the query cache; every (re)connect refetches, because
  updates sent while disconnected are lost. The socket is open only while the job is verifying, queued or analyzing:
  Cloud Run bills an API instance for as long as any socket to it is open. While that socket can't reach the API, the
  progress panel says so, so a step that can't move isn't taken for a slow one. An abandoned job never changes again,
  and the API expires it only when its owner reads their jobs, so the page also reads a running job every 10 seconds:
  whatever went wrong shows within 10 seconds of the API knowing it.
- **A picked video is copied into memory once, right after the pick** (`src/storage/file-snapshot.ts`), and the
  metadata check, the preview and the upload all use the copy. Chrome checks a picked file's modification time on every
  later read and upload and fails them once it has moved (`net::ERR_UPLOAD_FILE_CHANGED`), which on Android happens to
  a video another app is still finishing, such as a fresh Telegram download. The type and size are checked first, so a
  file that can't be used is never copied; the copy costs the video's size in memory while it stays selected,
  and is released once it is replaced or removed or the page is left (a run's client-side navigation included).
- **The replay URL is fetched on demand**, not embedded in the job: signed URLs expire and would go stale in the
  cache. A failed analysis never shows a player: its video backs no results and is deleted about a day after the
  failure, so its page shows why it failed and offers to analyze another video. No other analysis without a video to
  play shows one either: a job never verified has no `media`, and a deleted video's replay request answers 404, so
  the page shows only its status.
- **The client owns user-facing copy.** The API returns stable error codes and the client maps them to messages, so
  server internals never reach the screen and wording can change without an API release.
- **The settings form validates with the shared schema** that the API enforces, so the two can't disagree about what
  a valid request is.
- **Only `/`, `/demo`, `/terms` and `/privacy` are for search engines.** They're in the sitemap and name themselves
  canonical; every other page is noindex. The home page also carries JSON-LD (WebSite, Organization, WebApplication).
  Each names its own `og:url`, since an address set in the root layout would be inherited by every page; the others get
  it from `buildPublicPageMetadata`, along with their own link-preview title and description.
  `src/app/site-metadata.ts` holds the shared title, description and Open Graph tags. The share image
  (`opengraph-image.tsx`) is drawn at build time with the brand fonts fetched from Google Fonts, so a build needs to
  reach them, as `next/font` already does.
- **The settings and the applied preset carry over to a replaced video**, held by the page, not the address: presets
  are how settings are kept, and a reload starts from the default preset (or none). A sample still brings its own
  settings.
- **Presets save analysis settings under a name** (up to 20 per user, names unique ignoring case). A preset counts
  as used when an analysis starts with its settings unchanged; the API does the counting. `/presets` needs no
  `PrivateRoute`: without a session it shows the empty state, and saving the first preset starts an anonymous session,
  as a first analysis does.
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
- **Platforms and placements select each other** (`src/components/upload/platform-placements.ts`): choosing a platform
  selects all of its placements, and removing a platform's last placement removes the platform, so a platform is
  never checked without the specs of where it runs. A sample's saved platforms get all their placements the same way.
  In the report a failed placement spec carries its placement as a tag in its own colour and says the video won't work
  there, and why ("This video won't work for YouTube · Bumper (6 s). It's 30.4 seconds long, …"), so selecting every
  placement of a platform shows exactly which formats the video doesn't fit.
- **The first analysis needs no account.** A visitor gets an anonymous session only when they start an analysis or save a
  preset, so crawlers create no users, and their history, quota and live updates work as for anyone. An anonymous session gets one
  analysis; then the settings panel asks the visitor to sign up instead of naming a date. The header offers only Sign In
  (its dialog links to sign-up) and no count, which only accounts show: signing in or signing up moves the analyses and
  runs to the account at once and deletes the anonymous user. The anonymous placeholder email never reaches the UI
  (`AuthContext` gives `null`). There is no separate way to end an anonymous session: it holds at most one analysis,
  which History can delete, and the API deletes the anonymous user a week after its last use.
- **Run is disabled before a refusal, not after.** `useAdmission` asks the API's `GET /v1/admission` whether a new
  analysis would be admitted (for a visitor without a session too, judged as the anonymous user a first run creates)
  and keeps the answer in the query cache per user, refreshed after every run, refusal, sign-in and sign-out, and when
  a watched analysis fails (a failed run isn't counted; the API refunds it just after the failure, so it's asked again
  2 seconds later). An answer overrides what the cached quota implies. A refusal disables Run and says why above it. A
  refusal from creating the job is the fallback: it disables Run the same way until a newer answer replaces it. The
  home page asks on load, and when the API can't answer at all (unreachable or failing, after the usual retries) it
  shows "AdLens is briefly unavailable" with Try again in place of the upload and settings: no analysis could start, so
  none is offered. While a failed first ask is retried, it shows a spinner there rather than an upload that might
  vanish.
- **Google and GitHub sign in in a popup**, so the page keeps the visitor's selected video (a file held only in memory)
  and analysis settings. The click opens a blank named window at once (blockers allow it only inside the click), then
  points it at the provider's URL, which Better Auth returns without redirecting (`disableRedirect`). The popup comes
  back to `/auth/done`, which reports the outcome over a same-origin `BroadcastChannel`, not `window.opener`: the
  providers' pages set Cross-Origin-Opener-Policy, which severs the opener. For the same reason the popup's `closed`
  flag can't tell a cancelled sign-in, so the buttons stay clickable, a new click starts over, and a button's spinner
  stops once the tab has focus again. When the browser
  blocks the popup (some in-app browsers), the sign-in runs in the tab itself as a full-page redirect: the settings
  come back with the address, but the video is lost.
- **Sign-up signs in straight away; confirming the email lifts the limits.** Until its email is confirmed, an account
  is limited like an anonymous session (no account page, no linked Google or GitHub login) but is never deleted for
  inactivity. Before confirmation a user gets one analysis in total, shared with the anonymous session it signed up
  from and kept for good; the API enforces it. From sign-up the header shows the account's weekly allowance
  ("4/5 analyses left" after that one analysis) while Run asks to confirm the email. The header and phone menu offer Confirm email, which opens "Check your inbox" and can
  resend the link. A duplicate sign-up says the address is already in use. The confirmation link never signs anyone
  in: it confirms only for a session signed in as its own account, so `/confirm-email` asks a visitor to sign in
  first and then sends the same token again. A confirmation also tells the browser's other tabs, through Better Auth's
  own cross-tab channel, to fetch the session again, and whenever the session's user or its confirmation changes, the
  quota (and, for a new user, the history) is fetched again. An open "Check your inbox" then closes and says the email
  is confirmed.
- **The header remembers the kind of account, not the account, in a cookie the server reads.** Each loaded session
  stores only its kind (anonymous, unconfirmed, member or admin, the last from the API's `isAdmin` user field) in the
  `adlens_account_kind` cookie (host-only, `samesite=lax`, `secure` over HTTPS, one year), and clears it on sign-out or
  when the session loads as none; a failed session request keeps it. The root layout reads it like the scheme cookie,
  so the server's HTML and the first paint already have the header's final shape: Sign In for a signed-out visitor
  (the usual case) or the remembered kind's buttons, with no placeholder and no blink. Until the session loads those
  controls look exactly as they will but do nothing (`aria-disabled`, clicks ignored, no menu from the avatar), and
  the same elements come alive once it has; `disabled` would restyle them and blink. The cookie holds no email, name
  or id, only shapes the first paint, and never decides access or feeds per-user data, which still waits for the real
  session.
- **Turnstile runs on Run, and only shows itself when it needs a click.** The widget is set to `execution: 'execute'`
  and `appearance: 'interaction-only'`, so nothing is shown and nothing runs until an analysis starts. Visitors without
  an account, and accounts whose email isn't confirmed, get a token first (the API always checks theirs), before any
  anonymous user is created. Members skip it; if the API answers `CHALLENGE_REQUIRED` (a busy network), the page runs
  the check and starts over with a new job, since the token is only read at job creation. A check that doesn't finish
  within 30 s, unless the visitor is answering a challenge, fails the run with the recovery hint, and so does a
  challenge Cloudflare times out or expires; once a challenge is answered, the 30 s start again. The contact form runs
  the same check for every message, signed in or not, since the contact endpoints are public.
- **Contact screenshots upload to a draft when the message is sent.** The form checks the images against the shared
  limits as they're chosen; on send it runs the human check, asks the API for a draft with one signed upload per image
  (`POST /v1/contact/uploads`), uploads them straight to storage and sends the message with the draft id in place of a
  token. The API spends a draft on any send, even a refused one, so a retry starts over with a new check, draft and
  uploads.

## License

[PolyForm Noncommercial 1.0.0](LICENSE.md): free to read, run and learn from, not for commercial use. The analysis
lab ([adlens-lab](https://github.com/haggifer/adlens-lab)) and the contract package
([adlens-shared](https://github.com/haggifer/adlens-shared)) are MIT.
