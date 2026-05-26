use tauri::State;

use crate::models::{ImportLegacyResult, LegacyExport};
use crate::state::AppState;

use super::util::with_db;

#[tauri::command]
pub fn import_legacy_dexie(
  state: State<'_, AppState>,
  payload: LegacyExport,
) -> Result<ImportLegacyResult, String> {
  with_db(&state, |db| db.import_legacy_dexie(payload))
}
