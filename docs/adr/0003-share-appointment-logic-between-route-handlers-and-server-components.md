---
status: accepted
date: 2026-11-15
---

# Share appointment logic between Route Handlers and Server Components

## Context and Problem Statement

The appointment pages need two kinds of access. The list and the booking form
should render on the server with the patient's appointments and the provider
directory already loaded. Creating, editing, cancelling, and deleting happen in
Client Components after the page has loaded. Both paths must apply the same
authentication, validation, and error rules, and Row Level Security must stay
the authority on who can see or change which row.

## Decision Drivers

- Server-rendered reads, without a loading state for data the server already
  has.
- One implementation of authentication, validation, data access, and error
  translation.
- Next.js guidance: Server Components fetch data from its source, not through
  the application's own Route Handlers.
- The smallest possible HTTP surface for private health data.
- The user-scoped Supabase client only; no secret key.

## Considered Options

- Route Handlers for every operation, with reads done from the client.
- Server Components that fetch their own Route Handlers.
- A shared server-only module, with Route Handlers for mutations only.

## Decision Outcome

Chosen option: **a shared server-only module, with Route Handlers for mutations
only**, because both entry points then run the same checks while each uses the
mechanism Next.js intends for it.

`lib/appointments/service.ts` imports `server-only`. Each of its functions
verifies the session, validates the id and body with Zod where applicable,
queries through the user-scoped client, maps rows to narrow camelCase DTOs, and
translates database errors into the API error contract. Server Components call
`listProviders()`, `listAppointments()`, and `getAppointment()` directly. Route
Handlers in `app/api/` wrap `createAppointment()`, `updateAppointment()`, and
`deleteAppointment()` with HTTP concerns only: the Origin check, JSON parsing,
status codes, and `Cache-Control: private, no-store`.

Client-side reads through Route Handlers were rejected: the list could not
render on the server, and the client would need more loading and error code.
Server Components fetching their own Route Handlers were rejected: Next.js
advises against it, it adds an HTTP hop inside the same server, and the
session cookies would have to be forwarded by hand.

### Consequences

- Both entry points share the same authentication, validation, and error
  mapping, and RLS remains the final check on every query.
- The Origin check and `no-store` header protect only the HTTP mutations.
  Server Component reads execute at request time through the authenticated
  service and are not placed in a shared application cache. Mutation
  response helpers do not govern page-response caching.
- There are no GET endpoints. Adding one requires a concrete client consumer,
  plus the same `no-store` and cross-user isolation tests as the mutations.

## Confirmation

Integration tests call the service against local Supabase with only the server
client factory mocked, so real RLS applies. They check that anonymous callers
are rejected by every function, that DTOs contain only the agreed fields, that
the scheduling rules map to the API error codes, and that another user's
appointment is indistinguishable from a missing one for reads, updates, and
deletes.
