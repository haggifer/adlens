# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

AdLens — AI-powered video ad diagnostic tool. Upload a short video ad, get a transcript and structural
analysis (Gemini), and eventually grounded explanations of likely performance issues. Currently an early
scaffold: the only route is the home page placeholder in [app/page.tsx](app/page.tsx).

## Commands

```bash
npm run dev      # start dev server (Turbopack)
npm run build    # production build
npm run start    # serve production build
npm run lint     # ESLint (eslint-config-next core-web-vitals + typescript)
npm run format   # Prettier --write
```

There is no test setup in this repo yet.

## Architecture

- **Next.js 16 App Router**, single top-level layout. [app/layout.tsx](app/layout.tsx) wraps everything in
  [app/providers.tsx](app/providers.tsx), which is the one place client-side providers are composed:
  `AntdRegistry` (SSR style extraction) → antd `ConfigProvider`/`App` → React Query's `QueryClientProvider`.
  New global providers belong here, in that nesting order.
- **Firebase** client SDK is initialized once in [lib/firebase/config.ts](lib/firebase/config.ts), guarded
  against double-init via `getApps().length`. It exports ready-to-use `auth`, `db`, `storage` singletons.
  Analytics is special-cased: it's browser-only and feature-detected (`isSupported()`), so it's fetched
  lazily through `getFirebaseAnalytics()` (called from a `useEffect` in `providers.tsx`) rather than
  exported as a singleton like the others.
- **Config split**: client Firebase config (`NEXT_PUBLIC_FIREBASE_*`) lives in `.env.local` for local dev
  and is duplicated in [apphosting.yaml](apphosting.yaml) for Firebase App Hosting builds/runtime (App
  Hosting does not read `.env.local`). These are public client identifiers, not secrets. Server-only
  secrets (Gemini key, Meta/TikTok app secrets) are intended to go in Secret Manager, referenced from
  `apphosting.yaml` via `secret:` rather than `value:` — none exist yet.
- Deployment target is **Firebase App Hosting** (`apphosting.yaml`), currently configured for
  `minInstances: 0`, `maxInstances: 1`.
- Path alias `@/*` maps to the project root (e.g. `@/lib/firebase/config`).
- Formatting: 4-space indent, no semicolons, single quotes, 120 print width, trailing commas (see
  `.prettierrc`) — run `npm run format` rather than hand-matching style.
