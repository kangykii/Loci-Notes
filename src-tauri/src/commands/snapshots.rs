use serde::Deserialize;
use serde_json::Value;
use tauri::State;

use crate::models::NoteSnapshot;
use crate::state::AppState;

use super::util::with_db;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppendNoteSnapshotInput {
  pub id: String,
  pub title: String,
  pub content: Value,
  pub saved_at: String,
}

#[tauri::command]
pub fn list_note_snapshots(state: State<'_, AppState>, note_id: String) -> Result<Vec<NoteSnapshot>, String> {
  with_db(&state, |db| db.list_note_snapshots(&note_id))
}

#[tauri::command]
pub fn append_note_snapshot(state: State<'_, AppState>, note: AppendNoteSnapshotInput) -> Result<(), String> {
  with_db(&state, |db| {
    db.append_note_snapshot(&note.id, &note.title, &note.content, &note.saved_at)
  })
}
