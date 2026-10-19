# Design decisions: AdLens web

Why the web app is built the way it is. Back to the [README](../README.md).

Decisions shared with the API (cookie sessions on one domain, the contract package) are recorded in the
[API README](https://github.com/haggifer/adlens-api#design-decisions).

- **Every analysis has its own page** (`/analyses/[id]`), so a result survives a reload and can be linked. While a
  running job's live connection is down or its last read failed, the progress panel says so, so a step that can't
  move isn't taken for a slow one. An abandoned job never changes again, and the API expires it only when its
  owner reads their jobs, so the page also reads a running job every 10 seconds: whatever went wrong shows within 10
  seconds of the API knowing it.
- **Live updates are signals, not data** (`src/hooks/useLiveUpdates.ts`, mounted once in `Providers.tsx`). While
  someone is signed in (anonymous sessions included), the tab subscribes to its user's Ably channel with a token from
  `GET /v1/live/token`, and each `presets` or `job` message reads the matching queries again through the API (a `job`
  message also the quota and admission, since a run is charged when queued and refunded when it fails), which stays
  the one place that decides what a user may see. Only updates are announced: a job created, deleted or moved to the
  account at sign-in shows on the next read. Ably holds the connection, so an open tab keeps no API
  instance running, and presets stay current across tabs and devices too. After a drop long enough that Ably can't
  replay what was sent meanwhile, everything is read again. Ably asks for every token itself and retries one the API
  can't give right now; when the API has no Ably key (or no token route) the connection stops for good and the tab
  relies on its reads.
- **A picked video is copied into memory once, right after the pick** (`src/storage/file-snapshot.ts`), and the
  metadata check, the preview and the upload all use the copy. Chrome checks a picked file's modification time on every
  later read and upload and fails them once it has moved (`net::ERR_UPLOAD_FILE_CHANGED`), which on Android happens to
  a video another app is still finishing, such as a fresh Telegram download. The type and size are checked first, so a
  file that can't be used is never copied; the copy costs the video's size in memory while it stays selected,
  and is released once it is replaced or removed or the page is left (a run's client-side navigation included). The
  copy and the check take seconds on a phone, so meanwhile the upload panel says it's reading the video and takes no
  other pick, and Run waits; a pick that finishes once a run has started is dropped, and one whose copy or check
  hasn't finished in 30 seconds is given up with an error.
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
  settings, without the preset applied before it, and those settings, as the panel last showed them, carry over to
  the file that replaces it.
- **Presets save analysis settings under a name** (up to 20 per user, names unique ignoring case, Unicode form and
  runs of spaces: the API's rule, which `preset-name.ts` repeats). A preset counts as used when an analysis starts with
  its settings unchanged; the API does the counting. `/presets` needs no `PrivateRoute`: without a session it shows the
  empty state, and saving the first preset starts an anonymous session, as a first analysis does.
- **Save as preset never changes the analysis settings.** Its dialog starts from a copy of the panel's settings. A
  preset saved with them unchanged is applied (marked, and counted when the run starts); one whose settings were edited
  in the dialog is only saved, and the panel keeps its settings and applied preset.
- **Leaving the home page with an uploaded video asks first** (`useLeaveGuard`; a sample doesn't, it is one click
  away). A reload, a closed tab or a typed address gets the browser's own `beforeunload` dialog. In-app links go
  through `AppLink`, which cancels Next's navigation in `onNavigate` (Next's documented way to block a link) unless
  `window.confirm` says yes, and menu items that navigate in code ask the same way (`isLeaveConfirmed`). The browser's
  Back button within the app isn't asked about: Next handles it without an event that can be cancelled.
- **A button's tooltip shows only where a pointer can hover** (`ButtonTooltip`). On a touch screen a tap would open it
  over the action it just took, so it is held shut there; the button keeps its `aria-label`. Tooltips that are the
  content (Requirements, the quota date) or that sit on text and tags (the applied preset's name) show everywhere.
- **The theme follows the system until the user picks one.** The root layout renders the scheme from the user's choice
  (a cookie) or, on Chromium, from the `Sec-CH-Prefers-Color-Scheme` client hint, so the first paint is usually right;
  other browsers are corrected from `prefers-color-scheme` after hydration. The cost is that every route renders
  dynamically.
- **Phones and tablets get the same pages, restacked.** Below 992px the header's navigation, account menu and theme
  switch move into a menu drawer, and the video and its panel stack. Stacked players take the video's own
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
  2 seconds later), and with the quota just after the quota's `nextFreeAt`, when an analysis frees up on the rolling
  7-day window (one timer, set by the header, which asks again up to three times, further apart, while the answer
  still names the same moment; the header and phone menu name that moment). An answer overrides what the cached quota implies. A refusal disables Run and says why above it. A
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
  first and then sends the same token again. When another account has already confirmed the same mailbox (an alias
  such as `ann+x@` included), the API refuses with the sign-up's `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`, and the page
  says so in its own words (`describeConfirmError`) and offers no new link. A confirmation also tells the browser's other tabs, through Better Auth's
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
