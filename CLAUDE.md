# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

AdLens web client (Next.js 16 on Vercel). Users upload a video ad of up to 60 s, pick platforms, placements and
markets, and get policy and best-practice findings from the AdLens API (`../adlens-api`). The API contract lives in
the `adlens-shared` npm package (`../adlens-shared`). See [README.md](README.md) for routes and structure.

## Commands

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build
npm run lint     # ESLint
npx tsc --noEmit # type-check
npm test         # Jest + React Testing Library
```

## Architecture

- [src/app/Providers.tsx](src/app/Providers.tsx) composes the client providers: `AntdRegistry` → antd-style SSR
  registry → `ThemeProvider` (light/dark from a cookie) → React Query → antd theme + `App` → `AuthProvider` →
  `AppShell`. The QueryClient opens the sign-in modal on any `UNAUTHENTICATED` API error.
- Auth is Better Auth with an httpOnly session cookie shared by `www.` and `api.useadlens.com`; every request goes
  with credentials ([src/api/client.ts](src/api/client.ts), [src/auth/authClient.ts](src/auth/authClient.ts)).
  `AuthContext` only exposes the session; the auth modal's view is Zustand state
  ([src/contexts/stores/authModalStore.ts](src/contexts/stores/authModalStore.ts)).
- API failures become `ApiRequestError` with a stable code; user-facing copy lives in
  [src/api/errors.ts](src/api/errors.ts). Never show raw server or axios messages.
- Query keys are scoped by user id, and sign-out clears the cache.
- Public env is parsed once in [src/config.ts](src/config.ts); don't read `process.env` elsewhere.
- Labels for shared enums live in [src/labels.ts](src/labels.ts); option lists come from the shared enums.

## Gotchas

- `NEXT_PUBLIC_*` values are inlined at build time.
- Until `adlens-shared@0.4.0` is published, `node_modules/adlens-shared` holds a locally packed 0.4.0 installed with
  `npm install --no-save ../adlens-shared/adlens-shared-0.4.0.tgz`; any `npm install`/`npm ci` reverts it to the
  pinned 0.2.0 and breaks the build.
- Vercel deploys the `init-setup` branch to production, so every push goes live.
- Formatting: 4-space indent, no semicolons, single quotes, 120 print width (see `.prettierrc`). Run Prettier on
  touched files only.
