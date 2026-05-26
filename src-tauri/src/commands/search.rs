use tauri::State;

use crate::state::AppState;

use super::util::with_db;

#[tauri::command]
pub fn search_notes(state: State<'_, AppState>, query: String) -> Result<crate::models::SearchNotesResult, String> {
  with_db(&state, |db| db.search_notes(&query))
}

#[tauri::command]
pub fn rebuild_notes_fts(state: State<'_, AppState>) -> Result<(), String> {
  with_db(&state, |db| db.rebuild_notes_fts())
}
