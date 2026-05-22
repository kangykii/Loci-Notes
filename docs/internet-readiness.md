# Internet Readiness Gates

Loci can use the network today for updater checks, local PocketBase development, and direct AI providers. Before shipping private sync or broad cloud AI, keep these gates explicit.

Run the automated gate before release work. This script proves local guardrails and known source patterns only; it does not replace backend security review or signed release artifact generation.

```bash
npm run readiness:verify
```

## Automated Gates

- No duplicate path/casing artifacts for core entry files. TypeScript must keep `forceConsistentCasingInFileNames` enabled.
- Extracted editor format styles must live in `src/components/editor/formatBlocks.css`, not duplicated in `src/App.css`.
- Release installer links must be tag-specific. Moving `/latest/download/` installer links are not allowed in manifests or default download cards.
- Remote download content must pass an allowlist before rendering.
- Local-only community sync must not alias a remote PocketBase adapter.
- Sync must require an authenticated PocketBase session before subscriptions or queue flushes.
- Remote records must pass client validation before being written into Dexie. Server validation and access rules are still mandatory.
- Shared note exports must use immutable shared snapshots instead of exposing private note rows as the recipient-visible content.
- Collaboration events must have idempotency metadata, and server-backed collaboration must assign authoritative sequence numbers.
- AI requests must pass through the orchestrator, enforce context settings, carry a context manifest, and respect configured generation limits.
- Tauri CSP and capabilities must match the current feature set. Do not add filesystem, shell, broad network, or extra window powers without a feature-specific review.

## Manual And Backend Blockers

- Release updater signatures must be generated from the exact installer filename published in `latest.json`; renamed signed artifacts must be rejected by release verification.
- Private sync remains disabled for production until normal share, community, and collaboration writes enqueue outbox rows consistently and the backend enforces ownership on every remote write.
- Collaboration `serverSequence` is currently client-side placeholder metadata. Treat it as non-authoritative until the backend assigns sequence numbers.
- Remote record validation in the client is a corruption guard, not a trust boundary. PocketBase collection rules and server-side validation remain required.

## CSP

Only add production hosts as features become real. Remote scripts and frames should remain blocked; image and connect hosts should stay owned or intentionally trusted. When AI calls move behind the Loci backend, remove direct provider hosts from `connect-src`.

## Tauri Capabilities

The default capability is for the current main window only. Split future permissions by purpose before adding broader powers:

- `updates`: updater and relaunch permissions.
- `local-preferences`: store access for settings and auth cache.
- `sync`: network/backend access once private sync is production-ready.
- `ai`: backend AI gateway access after local provider keys are no longer the default shipping path.

Do not add filesystem, shell, or extra window permissions to the default capability without a feature-specific capability and review.

## Private Sync Backend

Private notes must not sync until the backend enforces:

- Auth token validation and refresh behavior.
- Server-side ownership checks for every note, project, atom, media asset, share, and collaboration event.
- Schema validation at API boundaries.
- Rate limits on auth, sync, sharing, and AI endpoints.
- Audit logs for sign-in, sync writes, sharing, permission changes, and destructive actions.
- Per-user or per-workspace isolation for all object reads and writes.

## Cloud AI Gateway

Direct provider keys stored locally are convenience-level security. Before cloud AI is a production feature, route requests through a backend gateway that keeps provider secrets server-side, validates payload sizes, applies per-user limits, and logs provider/error metadata without storing private note text unnecessarily.
