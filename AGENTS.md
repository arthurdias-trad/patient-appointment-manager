<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Context

Patient Appointment Manager: Next.js (App Router), TypeScript, Tailwind,
Supabase (Postgres + Auth), deployed on Vercel.

## Scope

- 1:1 model: an authenticated user manages their own appointments.
- Guardian-to-child access is documented only; do not implement.

## Security (non-negotiable)

- RLS enabled on every table; default grants revoked; minimal grants per role.
- One policy per operation; INSERT/UPDATE policies use WITH CHECK.
- Secret/service key is server-only; never import it into client code.
- All mutations go through route handlers in app/api/, validated with Zod.
- Never log PHI (appointment reasons, names) to the console or error output.

## Structure

- app/api/: route handlers (business rules + validation)
- lib/supabase/: server and browser clients (@supabase/ssr)
- supabase/migrations/: all schema changes; never edit applied migrations

## Testing

- Required: RLS isolation tests (Vitest against local Supabase),
  business-rule tests, Playwright for the main CRUD flow.
- No TDD for UI components or styling; no tests for trivial changes.

## Commands

- npm run dev / npm run lint / npm run typecheck / npm test / npm run test:e2e
- supabase start / supabase db reset / supabase migration new <name>

## Commits

- Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.
- Format commit subjects as `<type>(<optional-scope>): <imperative description>`.
- Keep commits atomic, focused, and logically self-contained.
- Use bullet points in the commit body when additional context is useful, particularly for changes involving multiple related modifications.
- Explain **what changed and why**, rather than merely listing files.
- Keep commit subjects concise and omit trailing periods.

## Pull Requests

- Follow `.github/pull_request_template.md` when creating pull requests.

## Done means

Lint, typecheck, and tests pass; README and any other documentation updated if behavior changed.
