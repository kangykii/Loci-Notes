# PocketBase Backend Setup

Loci uses PocketBase for accounts, survey prompts, and survey responses. The Tauri app expects the backend at `VITE_POCKETBASE_URL`, which defaults locally to `http://127.0.0.1:8090`.

## Local Setup

1. Download the PocketBase executable for your OS from the official PocketBase releases page.
2. Put `pocketbase.exe` in the repo root or somewhere on your `PATH`.
3. Run the schema migrations:

```powershell
npm run pb:migrate
```

4. Start PocketBase:

```powershell
npm run pb:serve
```

5. Open the admin dashboard at `http://127.0.0.1:8090/_/` and create the first superuser when prompted.
6. Start the app in another terminal:

```powershell
npm run dev
```

## Collections Created By Migration

- `users`: auth collection used by the app sign-in and sign-up code.
- `survey_prompts`: admin-authored prompts. Normal users can only read active prompts within their date window.
- `survey_responses`: signed-in user responses. Normal users can create their own response but cannot list or read survey responses.

The first migration is intentionally loose. It avoids relation fields and unique response constraints for survey records so future workspace accounts, anonymous prompts, prompt versions, or richer survey payloads can be added without undoing the foundation.

## Creating A Survey Prompt

In the PocketBase admin dashboard, create a `survey_prompts` record:

- `title`: short prompt title.
- `body`: optional explanatory text.
- `kind`: `single-choice` or `free-text`.
- `options`: JSON array for single-choice prompts, for example `["Editor", "Study", "Sharing"]`.
- `placement`: `settings`.
- `status`: `active`.
- `startsAt`: optional start date.
- `endsAt`: optional end date.
- `updatedAt`: optional current date/time. PocketBase also keeps its own system `updated` field.
- `metadata`: optional JSON for later targeting or rollout metadata.

The app shows the newest active Settings prompt to signed-in users who have not dismissed or submitted it.

## Counting Users

Registered user count is intentionally admin-only. Use the PocketBase dashboard `users` collection count, or an authenticated superuser API request, rather than exposing totals in the Tauri client.

## Production Notes

- Commit `pb_migrations`; do not commit `pb_data`.
- Back up `pb_data` before upgrading PocketBase or deploying schema changes.
- Put PocketBase behind HTTPS for production.
- Keep survey response list/view rules locked so only superusers can analyze responses.
