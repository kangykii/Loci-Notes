use tauri::State;

use crate::models::{Atom, FlashcardSet};
use crate::state::AppState;

use super::util::with_db;

#[tauri::command]
pub fn list_atoms(state: State<'_, AppState>) -> Result<Vec<Atom>, String> {
  with_db(&state, |db| db.list_atoms())
}

#[tauri::command]
pub fn save_atoms_batch(state: State<'_, AppState>, atoms: Vec<Atom>) -> Result<(), String> {
  with_db(&state, |db| db.save_atoms_batch(&atoms))
}

#[tauri::command]
pub fn delete_flashcard_set(state: State<'_, AppState>, set_id: String) -> Result<(), String> {
  with_db(&state, |db| db.delete_flashcard_set(&set_id))
}

#[tauri::command]
pub fn delete_flashcard_review_states(
  state: State<'_, AppState>,
  set_id: String,
  atom_ids: Vec<String>,
) -> Result<(), String> {
  with_db(&state, |db| db.delete_flashcard_review_states(&set_id, &atom_ids))
}

#[tauri::command]
pub fn delete_flashcard_review_states_for_set(state: State<'_, AppState>, set_id: String) -> Result<(), String> {
  with_db(&state, |db| db.delete_flashcard_review_states_for_set(&set_id))
}

#[tauri::command]
pub fn list_flashcard_review_states(state: State<'_, AppState>) -> Result<Vec<crate::models::FlashcardReviewState>, String> {
  with_db(&state, |db| db.list_flashcard_review_states())
}

#[tauri::command]
pub fn save_flashcard_review_states_batch(
  state: State<'_, AppState>,
  states: Vec<crate::models::FlashcardReviewState>,
) -> Result<(), String> {
  with_db(&state, |db| db.save_flashcard_review_states_batch(&states))
}

#[tauri::command]
pub fn list_flashcard_sets(state: State<'_, AppState>) -> Result<Vec<FlashcardSet>, String> {
  with_db(&state, |db| db.list_flashcard_sets())
}

#[tauri::command]
pub fn save_flashcard_sets_batch(state: State<'_, AppState>, sets: Vec<FlashcardSet>) -> Result<(), String> {
  with_db(&state, |db| db.save_flashcard_sets_batch(&sets))
}
