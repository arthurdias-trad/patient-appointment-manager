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

Studio runs at [127.0.0.1:54323](http://127.0.0.1:54323), and Mailpit, which
catches auth emails locally, at [127.0.0.1:54324](http://127.0.0.1:54324).

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
| `npm test` | Run unit and component tests |
| `npm run test:watch` | Run unit and component tests in watch mode |
| `npm run test:e2e` | Run end-to-end browser tests |

## Testing

Unit and component tests use Vitest and React Testing Library. End-to-end tests
use Playwright with Chromium.
