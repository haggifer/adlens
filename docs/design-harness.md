# Design harness (temporary)

The app uses the **Neon** direction with **Sora** headings and a **Michroma** logo (chosen). The brand seed
is now **locked in code** (`PRIMARY_COLOR = #7c3aed`, `BORDER_RADIUS = 10` in `lib/design/theme.ts`); a
neutral dev panel on the **left** only tunes the remaining dev-time knobs. **Color scheme (light/dark) is a
real product feature** now — a switcher in the header — not a harness knob.

On screens ≤992px the panel collapses to a horizontal bar on top.

## Production vs. harness (kept physically separate)

**Production theme (permanent):**

- `lib/design/theme.ts` — `PRIMARY_COLOR` / `BORDER_RADIUS` constants + `buildAntdTheme(scheme, primaryColor?)`
  (primary defaults to the locked constant; the harness passes an override).
- `lib/design/theme-context.tsx` — `ThemeProvider` / `useTheme` holds the color **scheme** and persists it to
  the `adlens_scheme` cookie via `lib/design/scheme-cookie.ts`.
- `components/layout/ThemeSwitch.tsx` — the header sun/moon switch that drives `setScheme`.

**Harness (temporary — delete to ship):**

- `lib/design/harness/` — `HarnessProvider` / `useHarness` holds the **primary-color override** and persists
  it to the `adlens_harness` cookie (`harness-cookie.ts`). `useHarness()` falls back to `PRIMARY_COLOR` when
  no provider is mounted, so removing the provider degrades cleanly to the real brand.
- `components/dev-bar/` — the dev panel UI.

The root layout reads **both** cookies on the server so the first paint already has the right scheme and
accent — no flash. (Reading cookies makes the routes server-rendered — expected.)

## Dev panel knobs

- **Primary** — a HEX color picker (antd `ColorPicker`, default `#7c3aed`). Every app color is an antd token
  derived from this seed + the light/dark algorithm, so the whole app recolors live.
- **Signed in** — simulates auth state to preview the header's signed-in control (no real auth yet).

(Scheme moved out of the panel to the header theme switcher.)

**Colors are token-driven.** `buildAntdTheme` seeds `colorPrimary`/`colorInfo`/`colorLink`. All styling reads
antd tokens **directly** via `antd-style` `createStyles` (which consumes our `ConfigProvider` theme through
`theme.useToken()`), so there's no CSS-var indirection. The only remaining CSS custom property is
`--header-h` (a layout constant set in the shell's `createStyles`).

## Layout

- **Header** — flat, **not divided** from the body. Left: logo (→ `/`) + nav links **Analyze** (→ `/`) and
  **History** (→ `/history`). Right: the account control (**Sign In** button signed out, **avatar dropdown**
  signed in), then a vertical `Divider`, then the **theme switch**. `/history` is a stub.
- **Page hero** — a persistent headline + subtitle above the workspace (value prop), shown in both the
  pre- and post-upload states.
- **Workspace** (`components/upload/`) — a **two-column** flex with **progressive disclosure**:
    - Left = the upload panel: a square drop zone (drag highlights it; requirements in a bottom tooltip on the
      ⓘ icon) that, after a file is chosen, becomes an inline `<video>` player adapting to the clip's aspect
      ratio, with Replace/Remove overlay controls (hover / always-on for touch).
    - Right = **before upload** the "what you'll get" panel; **after upload** the **analysis settings**
      (platform, objective, audience, brand context, focus, language — all UI stubs) + the **Run Analysis**
      button (⚡, non-functional yet).

## Styling convention

Bootstrap **utility classes** (utilities-only bundle, imported in `app/layout.tsx`) for simple layout →
inline `style` for 1–2 token one-offs → `antd-style` `createStyles` in a sibling `styles.ts` for anything
reusable/nested (colors as `${token.x}`). `app/globals.css` is **just the base reset** (antd v6 ships no
global reset, and the utilities-only Bootstrap bundle excludes Reboot, so the raw HTML elements still need
it) — every component group owns its `styles.ts`: `components/layout/`, `components/brand/`,
`components/dev-bar/`, `components/auth/`, `components/upload/`. See the `styling-conventions` memory.

## Auth (UI shells only)

Sign in / sign up / forgot-password share one view-switching `Modal` (`components/auth/AuthModal.tsx`).
Submitting only validates + shows a toast. When wiring real auth, Firebase's password-reset email link needs
a **real route** (e.g. `/reset-password`), not a modal. Gating plan: anonymous 1st run, auth from the 2nd,
3 analyses/week (see the `auth-gating-approach` / `auth-firebase-guide` memories).

## Finalizing (later)

The primary color is already locked in `theme.ts`. To strip the harness: delete `lib/design/harness/` and
`components/dev-bar/`, remove `<HarnessProvider>` from `app/providers.tsx` and `<DevBar/>` from `AppShell`,
drop the `adlens_harness` cookie read in `app/layout.tsx`, remove the `Signed in` simulation, and delete this
file. The header theme switcher and the production theme setup stay.
