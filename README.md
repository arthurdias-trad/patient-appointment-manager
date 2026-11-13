# Patient Appointment Manager

A web application for patients to schedule, view, and manage their own
appointments. Each authenticated user manages only their own appointments.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router), React 19, TypeScript
- Tailwind CSS 4
- [Supabase](https://supabase.com) for Postgres and authentication (planned; the
  Supabase CLI is installed as a development dependency)

## Getting started

Prerequisites: Node.js 26 and npm.

```bash
npm ci
npx playwright install chromium   # browser for end-to-end tests
npm run dev
```

The app runs at [localhost:3000](http://localhost:3000). Installing
dependencies also sets up the Git hooks via Husky.

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
