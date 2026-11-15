---
status: accepted
date: 2026-11-14
---

# Screen sign-up passwords against known breaches

## Context and Problem Statement

Password length alone does not prevent users from choosing a password already
exposed in a breach. The registration flow should reject known compromised
passwords without sending them to another service. This assessment uses standard
Supabase Auth sign-up, whose public endpoint remains callable independently of
the application's Server Action.

## Decision Drivers

- Reject known compromised passwords in the application registration flow.
- Limit disclosure to the breach-checking service.
- Distinguish an unavailable check from a negative lookup.
- Keep privileged Supabase credentials out of the routine authentication path.
- Make automated tests independent of an external service's availability.

## Considered Options

- Application-level HIBP lookup that blocks registration when the check fails.
- Application-level HIBP lookup that permits registration when the check fails.
- Supabase's hosted leaked-password protection.
- Disable public sign-up and create accounts through a privileged server path
  after screening passwords.

## Decision Outcome

Chosen option: **application-level HIBP lookup that blocks registration when the
check fails**, because it screens the standard registration flow without adding
privileged account creation or depending on a hosted paid feature.

The sign-up Server Action checks the validated, NFC-normalized password using
[HIBP's Pwned Passwords range API](https://haveibeenpwned.com/API/v3#SearchingPwnedPasswordsByRange).
It computes SHA-1 on the server, sends only the first five hexadecimal characters
over HTTPS, and matches the remaining suffix locally. Neither the password nor
the full hash is sent to HIBP. SHA-1 is used for lookup, not password storage.
`Add-Padding: true` reduces response-size disclosure; zero-count padding entries
are ignored.

A positive match rejects the password. A three-second timeout, network failure,
non-200 response, or empty or malformed response encountered before a match
blocks registration with a retry message. An unavailable check is never treated
as a negative lookup. Login does not perform this check.

Permitting registration during an outage would undermine that behavior.
[Supabase's hosted protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
would enforce screening at the Auth boundary but requires Pro or above.
Privileged account creation would change the authentication flow and introduce
secret-key handling; that complexity is deferred for this assessment.

### Consequences

- Application sign-up rejects listed passwords while limiting disclosure to HIBP.
  A negative lookup does not prove a password is strong.
- Registration gains an external dependency and is unavailable when the check
  cannot complete. Existing users can still log in.
- **Accepted gap:** callers can bypass the Server Action and its HIBP check by
  signing up directly through Supabase with the publishable key. Fail-closed
  behavior applies to the application flow, not every account-creation path.
- Before production use, enforce compromised-password screening at the Auth
  boundary, for example with Supabase's hosted protection. Revisit this decision
  when that enforcement becomes available.

## Confirmation

Unit tests cover prefix-only requests, padding, matching, and failure handling.
Browser tests use a local HIBP stub to verify breached-password rejection and
outage handling. A manual opt-in live test checks compatibility with HIBP;
routine CI does not call the live service.
