use tauri::State;

use crate::error::{invoke_result, AppResult};
use crate::state::AppState;

pub fn with_db<T, F>(state: &State<'_, AppState>, action: F) -> Result<T, String>
where
  F: FnOnce(&crate::db::Database) -> AppResult<T>,
{
  let db = state
    .db
    .lock()
    .map_err(|_| "database lock poisoned".to_string())?;
  invoke_result(action(&db))
}
