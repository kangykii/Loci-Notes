use tauri::{AppHandle, Manager, State};

use crate::models::{AppPaths, DbStatus};
use crate::state::AppState;

use super::util::with_db;

#[tauri::command]
pub fn db_status(state: State<'_, AppState>) -> Result<DbStatus, String> {
  with_db(&state, |db| {
    Ok(DbStatus {
      ok: true,
      schema_version: db.schema_version()?,
      legacy_import_done: db.meta_bool("legacy_import_done")?,
      note_count: db.note_count()?,
      db_path: db.path().display().to_string(),
    })
  })
}

#[tauri::command]
pub fn app_paths(app: AppHandle) -> Result<AppPaths, String> {
  let app_data_dir = app
    .path()
    .app_data_dir()
    .map_err(|error| error.to_string())?;
  let db_path = app_data_dir.join("loci.sqlite");
  Ok(AppPaths {
    app_data_dir: app_data_dir.display().to_string(),
    db_path: db_path.display().to_string(),
  })
}
