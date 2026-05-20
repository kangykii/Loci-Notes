# Release Checklist

Use GitHub Releases as the canonical source for installers and updater files.

## Version Consistency

Before building a release, confirm the version matches in:

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- Landing page download labels and asset URLs in `src/Landing.tsx`
- Default remote download labels and asset URLs in `src/services/remoteContentService.ts`

## Build

Run:

```sh
npm run tauri -- info
npm run package
```

Confirm `tauri info` reports the expected app version, CSP, updater plugin, and updater endpoint.
`npm run package` runs `release:doctor` before compiling so missing updater signing credentials fail fast. Run the local verifier before uploading artifacts so version consistency, artifact names, manifest shape, and signature presence are checked by script.

## GitHub Release Assets

Upload the Tauri-generated release artifacts to the GitHub Release for the version. Do not rename signed artifacts after generation:

- `Loci Notes_<version>_x64-setup.exe`
- `Loci Notes_<version>_x64-setup.exe.sig`
- `latest.json`

The updater endpoint is:

```text
https://github.com/kangykii/Loci-Notes/releases/latest/download/latest.json
```

After uploading the release assets, run:

```sh
npm run release:verify
```

The remote verifier checks the latest GitHub Release assets and compares the release version against the previously published SemVer. If validating an already-published current release, the version may match the latest tag but all three updater assets must be present.

## Signing Key Custody

Keep `.tauri-signing-private-key`, `.tauri-signing-private-key.pub`, and `.tauri-signing-private-key.password` out of git. Store an encrypted backup of the private key and its password in separate password-manager or secret-store entries. If the private key is lost, publish a reinstall/migration notice because existing installs cannot trust updates signed by a replacement key without a deliberate recovery path.

## Local Data Migrations

Every IndexedDB schema change in `src/db.ts` must include a Dexie version bump, migration notes in the release body, and an upgrade test or fixture that starts from an older local database. Cover notes, projects, atoms, media, settings, snapshots, and sync/community tables when those areas are touched.

## Internet Readiness

Before adding private sync or broader cloud AI, review `docs/internet-readiness.md`. Keep CSP hosts narrow, split Tauri capabilities by feature purpose, and require backend ownership checks before private notes leave the local app.

## Pre-Push Check

Before committing, run:

```sh
git status --short
```

The commit should include source, config, lockfile, and docs changes only. Local installer binaries and generated build output should remain untracked/ignored.
