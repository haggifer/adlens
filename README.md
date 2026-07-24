# AdLens

AI-powered video ad diagnostic tool. Upload a short video ad, get a transcript and
structural analysis (Gemini), and — later — grounded explanations of likely
performance issues.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Ant Design 6** (`antd`, `antd-style`) with `@ant-design/nextjs-registry` for SSR
- **Firebase** — Auth, Firestore, Storage, Analytics (client SDK)
- **React Query** (`@tanstack/react-query`) for server state
- **Firebase App Hosting** for deployment (`apphosting.yaml`)

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Firebase config (already populated locally)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — start the dev server (Turbopack)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint
- `npm run format` — Prettier

## Environment

Client config lives in `.env.local` as `NEXT_PUBLIC_FIREBASE_*` (see `.env.example`).
The Firebase web `apiKey` is a public identifier, not a secret. Server-only secrets
(Gemini key, Meta/TikTok app secrets) will go in Secret Manager, not `.env`.

## Structure

```
app/
  layout.tsx      # root layout, wraps app in Providers
  page.tsx        # home page
  providers.tsx   # antd registry + ConfigProvider + React Query (client)
lib/
  firebase/
    config.ts     # Firebase client init (auth, db, storage, analytics)
```

Imports use the `@/*` alias, which maps to the project root (e.g. `@/lib/firebase/config`).
