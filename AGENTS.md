<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

Guidance for coding agents working in this repository. Read [README.md](README.md) first: it covers the stack,
routes, environment and the design decisions behind them.

## Commands

```bash
npm run dev          # dev server (Turbopack), expects the API at NEXT_PUBLIC_API_BASE_URL
npm run build
npm run lint
npx tsc --noEmit
npm test             # Jest + React Testing Library
```

## Rules that must not break

- Every API call goes through `src/api/client.ts` with credentials; the session is an httpOnly cookie, so never store or
  send a token yourself.
- API failures become `ApiRequestError` with a stable code, and the user sees the copy from `src/api/errors.ts`. Never
  show raw server or axios messages. Better Auth calls go through `runAuthRequest` in `src/auth/errors.ts`, which also
  turns network failures into an error.
- Query keys include the user id, and sign-out clears the query cache, so one user's data never shows for another.
  It clears it only once Better Auth confirms the sign-out: `useAuth().signOut` rejects with an `AuthError`
  otherwise, and the UI signs out through `useSignOut`, which shows its `describeError` copy and resolves to
  whether the session ended.
- Request and response types, enums and limits come from `adlens-shared`; don't redeclare them. Display labels for its
  enums live in `src/labels.ts`. Never commit a `file:` dependency.
- The platform, placement and market options (`src/labels.ts`, over the adlens-shared enums) must match the ruleset.
  Check them **only when a new ruleset version is published**: the API's `npm run rules:publish` writes
  `rules_current_summary.md` next to the ruleset file, listing which option reaches each rule platform and every
  placement and region in use (see the API's AGENTS.md). Label an option so users can see which rules it brings.
- Public env is parsed once in `src/config.ts`; don't read `process.env` elsewhere.
- An anonymous session counts as signed in (`isSignedIn`), so its history, quota and live updates work. Gate
  account-only UI on `isEmailConfirmed`: an account whose email isn't confirmed yet is limited like an anonymous
  session and is offered Confirm email instead. Never show an anonymous user's email (`AuthContext` gives `null`); an
  unconfirmed account may see the address it typed.
- A Turnstile token is single-use: get one from `HumanCheck`'s `getToken()` for every job creation that needs it and
  for every contact message (it resets the widget each time); never reuse a token.

## Conventions

- Named exports only (`export function Header`, `export function useJob`). Default exports only where Next.js
  requires them: `page.tsx` and `layout.tsx` under `src/app/`, and the root config files.
- Client providers are composed in `src/app/Providers.tsx`; add new global providers there.
- UI state lives in Zustand stores under `src/contexts/stores/`; server state in TanStack Query hooks under
  `src/hooks/`.
- Styling uses antd theme tokens (`createStyles` in a sibling `styles.ts`, or `useTheme()`); avoid hard-coded colors.
- Formatting is Prettier (`.prettierrc`); linting is ESLint. Format only the files you touch.
- Comments explain why, not what.
- Commits follow Conventional Commits (`feat(scope): …`, `fix: …`, `docs: …`), one commit per distinct change.
- When a change affects a command, env variable, rule above or design decision, update README.md or this file in the
  same commit.

## Gotchas

- Every push to `init-setup` deploys to production on Vercel.
- `NEXT_PUBLIC_*` values are inlined at build time; changing them needs a rebuild.
- A production build (`VERCEL_ENV=production`) fails without `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: `src/config.ts` checks it
  while `next build` renders the pages. `VERCEL_ENV` isn't inlined, so the check never runs in the browser.
- Better Auth's client throws on network failure instead of returning `{ error }`.
- Jest transforms antd's ESM packages (see `jest.config.mjs`), and `jest.setup.ts` polyfills `matchMedia` for antd.
