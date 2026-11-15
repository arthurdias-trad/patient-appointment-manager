# Patient Appointment Manager

A web application for patients to schedule, view, and manage their own
appointments. Each authenticated user manages only their own appointments.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router), React 19, TypeScript
- Tailwind CSS 4
- [Supabase](https://supabase.com) for Postgres and authentication, via
  `@supabase/ssr` with cookie-based sessions

## Getting started

Prerequisites: Node.js 26, npm, and Docker (for the local Supabase stack).

```bash
npm ci
npx playwright install chromium   # browser for end-to-end tests
npx supabase start                # first run downloads the Docker images
cp .env.example .env.local        # then paste the publishable key (see below)
npm run dev
```

The app runs at [localhost:3000](http://localhost:3000). Installing
dependencies also sets up the Git hooks via Husky.

## Local Supabase

The Supabase CLI is a dev dependency, so run it through `npx`. Its
configuration lives in `supabase/config.toml`, and migrations go in
`supabase/migrations/`.

| Command | Purpose |
| --- | --- |
| `npx supabase start` / `npx supabase stop` | Start or stop the local stack |
| `npx supabase status` | Show local URLs and keys |
| `npx supabase db reset` | Recreate the local database from migrations |
| `npx supabase migration new <name>` | Create a new migration file |

`npx supabase status` prints the values for `.env.local`:

| Variable | Value from `status` |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (`http://127.0.0.1:54321`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`) |

Studio runs at [127.0.0.1:54323](http://127.0.0.1:54323).

`NEXT_PUBLIC_` variables are bundled into client code, so only the URL and
the publishable key belong there. Never expose the secret key to the browser.
`.env.local` is git-ignored.

Supabase clients live in `lib/supabase/`: `client.ts` for Client Components,
`server.ts` for server code. `proxy.ts` refreshes the auth session cookie on
each request.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` / `npm start` | Build and serve the production app |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate route types and check TypeScript |
| `npm test` | Run unit and integration tests |
| `npm run test:watch` | Run unit and integration tests in watch mode |
| `npm run test:e2e` | Run end-to-end browser tests |

## Testing

Start the local Supabase stack before running tests. The pre-push hook runs
`npm test` as well.

- **Unit** (Vitest): password rules, the breached-password check, and
  redirect rules.
- **Integration** (Vitest, local Supabase): Auth settings the app relies on,
  such as the password minimum and immediate sessions on sign-up.
- **End-to-end** (Playwright, Chromium): the auth flows in a browser, against
  a local Have I Been Pwned stub.

The check against the real Have I Been Pwned API is manual. Run it after
changing the checker:

```bash
HIBP_LIVE=1 npx vitest run --project integration tests/integration/hibp-live.test.ts
```

## Authentication

Auth forms submit to Server Actions in `app/(auth)/actions.ts`. Appointment
data will go through Route Handlers in `app/api/`.

`proxy.ts` refreshes the session and redirects signed-out visitors to
`/login`. Every page except `/`, `/login`, and `/signup` requires a session;
future `/api` routes will return 401 themselves. The proxy check is only
optimistic: pages verify the session with `getCurrentUser()` in `lib/auth/dal.ts`.

## Security

- Passwords follow [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html):
  at least 15 characters, no composition rules, and rejected if they appear in
  a known breach. Only a 5-character hash prefix is sent to Have I Been Pwned,
  and sign-up is refused if the check is unavailable.
- Sign-in and sign-up errors don't reveal whether an account exists.
- Return-to links only accept same-site paths.
- Names are display-only and never used for authorization.

## Known limitations

- Email confirmation is off, so email ownership isn't verified.
- There is no password reset.
- Calling the Supabase Auth API directly skips the breached-password check.
  Supabase's hosted leaked-password protection would close this.
- Auth rate limits apply per server IP, so all users share them.
- After sign-out, the current access token stays valid until it expires
  (up to an hour).
- The hosted Supabase project must match `supabase/config.toml`: minimum
  password length 15, email confirmations off.
