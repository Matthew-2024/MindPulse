# Encrypted Continuity Threat Model

## Scope

Encrypted cross-device continuity is disabled by default. The client contract in `src/domain/encrypted-continuity.ts` prepares opaque AES-GCM snapshots and conditional revisions, but this local product does not operate a sync server or claim a production sync service.

## Assets and Boundaries

- The device vault remains the local IndexedDB authority until a person explicitly enables a reviewed transport.
- Remote storage may receive only the bounded `EncryptedVaultSnapshot` envelope. It cannot receive records, notes, safety state, resource data, recovery codes, or a raw data key.
- A random `vaultLocator` is an opaque discovery handle, not a user identifier. The current client does not expose a searchable vault directory.
- When a local continuity lifecycle needs to survive a refresh, `mindpulse:continuityManifest` may retain only a strict metadata allowlist: schema version, opaque vault locator, device identifier, revision, enabled/updated timestamps, and wrapper kinds. It never retains a data key, recovery code, wrapper ciphertext, vault snapshot, records, notes, safety state, or receipt.
- Recovery-code wrappers use PBKDF2-SHA-256 with 310,000 iterations and a fresh 16-byte salt. The raw AES-256-GCM data key is only held in memory during setup/recovery.
- Passkey wrappers require user-verifying WebAuthn PRF output. The core accepts that secret as an input but does not pretend that a browser-local key is a cross-device passkey.

## Threat Responses

| Threat | Required response | Current contract |
|---|---|---|
| Device theft | Local device protections and explicit logout; no raw key in the manifest | Session state can be logged out or revoked; production device controls remain deployment work |
| XSS or malicious extension | No web client can make a compromised active browser fully safe | CSP, trusted-code delivery, extension guidance, and an independent security review are release prerequisites |
| Lost recovery code | Recovery is intentionally not bypassable | User must keep a recovery code or a supported passkey wrapper; otherwise encrypted remote data cannot be recovered |
| Duplicate devices | Optimistic conditional revision writes | A stale write returns a conflict with the encrypted remote version; it never overwrites silently |
| Deletion request | Conditional remote hard delete plus a receipt | `hardDelete` returns an opaque receipt; local and remote deletion must both be confirmed before a production claim |

## Local Metadata Lifecycle

- Metadata is not enough to recover or synchronize a vault. It is a local discovery and state marker only; the raw data key remains memory-only in this prototype.
- Unknown metadata fields, malformed timestamps, unknown wrappers, and non-opaque locators are rejected on read. This prevents accidental expansion into a local copy of private vault content.
- A local-device revocation clears the marker. A confirmed remote hard delete clears it only after the transport returns a delete receipt. The existing local-data deletion flow clears it as well.

## Deployment Requirements

Any real transport must enforce an authenticated, non-enumerable vault endpoint, strict allowlisted CORS origins, credential-bound rate limiting for OTP/recovery attempts, bounded request bodies, server-side ciphertext schema validation, audit logging without plaintext, session revocation, and a tested recovery-failure support path. These controls cannot be truthfully claimed from this offline Vite application alone.

## Server Template Guardrails

- The checked-in Supabase Function templates now return credentialed CORS headers only when the request `Origin` exactly matches a configured `ALLOWED_ORIGINS` value. They return no allow-origin value for a missing, unconfigured, wildcard, or prefix-matched origin.
- Email-code functions may return a code only when the explicit `DEV_RETURN_CODE=true` flag is set. When no mail provider is configured in any other environment, they return a 503 response and do not write a code to logs.
- `tests/supabase-security-contract.js` guards these source rules in the regular preflight. It is static source evidence because Deno and a configured Supabase project are absent from this workspace; it does not prove deployed CORS, mail, rate-limit, or session behavior.
- Shared and combined server session validation now confirms that the session's `(device_id, account_id)` row exists and has no `revoked_at` value before updating either last-seen timestamp. The checked-in `revoke-device` Edge Function accepts only a UUID target device, binds it to the authenticated account, writes its `revoked_at`, revokes every active session for that account/device pair, and clears the caller cookie when it revokes the caller's device. Its platform JWT gate is explicitly disabled because it performs this Cookie-session authorization itself. `tests/supabase-device-revocation-contract.js` protects the source and deployment-config rules; `handler.test.ts` exercises four mocked request paths. An ephemeral Deno type check resolves all eight Function entries, but neither that test nor the mock executes against a configured project. Live Deno execution, deployment, and a real session exercise are still required before a production claim.

## Recovery Failure

There is no master key and no recovery bypass. Losing every recovery factor means the encrypted remote copy cannot be decrypted. The safe outcome is to create a new empty local vault after explaining that old encrypted ciphertext cannot be restored.
