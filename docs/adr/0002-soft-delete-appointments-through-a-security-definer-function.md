---
status: accepted
date: 2026-11-14
---

# Soft-delete appointments through a security definer function

## Context and Problem Statement

Patients must be able to delete their appointments, but application and Data
API access never hard-deletes appointment rows. A deleted appointment must
disappear from every read through the Data API, not only from the routes that
remember to filter it out. Row-level security can hide deleted rows from SELECT
and UPDATE, but PostgreSQL then rejects the soft-delete UPDATE itself: the
updated row would no longer be visible, so it fails with "new row violates
row-level security policy". This happens even without `RETURNING`.

## Decision Drivers

- No Data API role (`anon`, `authenticated`, `service_role`) may hard-delete
  appointments.
- Deleted appointments stay out of Data API reads at the database layer, for
  every caller.
- Only the owner can delete an appointment, and only by setting `deleted_at`.
- Deleting another user's appointment must be indistinguishable from deleting
  one that does not exist.
- Keep the secret key out of the application.

## Considered Options

- RLS that checks ownership only, with Route Handlers filtering `deleted_at`.
- RLS that hides deleted rows, plus a narrow `SECURITY DEFINER` function that
  performs the soft delete.
- Granting `DELETE` to `authenticated`.

## Decision Outcome

Chosen option: **RLS that hides deleted rows, plus a narrow `SECURITY DEFINER`
function**, because it keeps deleted rows out of every Data API read at the
database layer while exposing exactly one way to delete.

`public.delete_appointment(appointment_id uuid) returns boolean` sets
`deleted_at = now()` only when the row belongs to `auth.uid()` and is not
already deleted, and returns whether a row changed. Its privilege boundary:

- `deleted_at` has no column grant, so the function is the only way to set it.
- `EXECUTE` is granted to `authenticated` only; `anon` and `service_role` have
  none.
- Ownership is checked explicitly against `auth.uid()`, because the function
  runs as its owner and bypasses RLS.
- `search_path` is empty and every object is schema-qualified.
- A missing, foreign, or already-deleted id returns `false` without an error,
  so the result reveals nothing about other users' rows.

Filtering `deleted_at` only in Route Handlers was rejected: every route would
have to remember the filter, and direct Data API callers would still see
deleted rows. Granting `DELETE` is excluded by the soft-deletion requirement.

### Consequences

- The function is a second write path beside the Route Handlers. Its rules
  live in SQL and are covered by database tests.
- Soft deletion only sets `deleted_at`, which the appointment time-rules
  trigger does not watch. Started and cancelled appointments can still be
  deleted. The `updated_at` trigger still refreshes the timestamp.
- Soft deletion is not an audit trail: it records when a row was deleted, not
  who changed what before that.
- The guarantee covers Data API access only. Privileged database access can
  still read or hard-delete rows, and deleting an Auth user cascades through
  `profiles` and hard-deletes that user's appointments.
- Deleted rows accumulate. Production needs a retention and purge policy, and
  purging needs a privileged path outside the Data API.
- The function relies on its owner, `postgres`, bypassing RLS. This is
  confirmed locally; the hosted role must be verified during deployment. If it
  does not hold, the function tests fail.

## Confirmation

pgTAP asserts that the function is `SECURITY DEFINER`, pins an empty
`search_path`, and grants `EXECUTE` to `authenticated` only. It also asserts
that a started appointment can be soft-deleted and that soft deletion refreshes
`updated_at`. Integration tests check, through the Data API:

- an owner's delete hides the row and a repeated delete returns `false`;
- deleted rows cannot be edited or restored;
- deleting another user's appointment returns `false`, like a missing id;
- anonymous calls are denied;
- deleted slots can be rebooked, and cancelled appointments can be deleted.
