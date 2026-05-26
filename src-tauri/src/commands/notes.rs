use tauri::State;

use crate::models::{LocalNoteStorageRepairResult, Note, NoteBody, NoteMeta, NoteWrite, SaveNotesBatchResult};
use crate::state::AppState;

use super::util::with_db;

#[tauri::command]
pub fn list_note_metas(state: State<'_, AppState>) -> Result<Vec<NoteMeta>, String> {
  with_db(&state, |db| db.list_note_metas())
}

#[tauri::command]
pub fn list_notes(state: State<'_, AppState>) -> Result<Vec<Note>, String> {
  with_db(&state, |db| db.list_notes())
}

#[tauri::command]
pub fn get_note(state: State<'_, AppState>, note_id: String) -> Result<Option<Note>, String> {
  with_db(&state, |db| db.get_note(&note_id))
}

#[tauri::command]
pub fn get_note_body(state: State<'_, AppState>, note_id: String) -> Result<Option<NoteBody>, String> {
  with_db(&state, |db| db.get_note_body(&note_id))
}

#[tauri::command]
pub fn save_notes_batch(state: State<'_, AppState>, notes: Vec<NoteWrite>) -> Result<SaveNotesBatchResult, String> {
  with_db(&state, |db| {
    let saved_ids = notes.iter().map(|note| note.id.clone()).collect::<Vec<_>>();
    let updated_at = db.save_notes_batch(&notes)?;
    Ok(SaveNotesBatchResult { saved_ids, updated_at })
  })
}

#[tauri::command]
pub fn delete_note(state: State<'_, AppState>, note_id: String) -> Result<(), String> {
  with_db(&state, |db| db.delete_note(&note_id))
}

#[tauri::command]
pub fn repair_split_note_storage(state: State<'_, AppState>) -> Result<LocalNoteStorageRepairResult, String> {
  with_db(&state, |db| db.repair_split_note_storage())
}
