use serde_json::Value;
use tauri::State;

use crate::state::AppState;

use super::util::with_db;

#[tauri::command]
pub fn list_json_entities(state: State<'_, AppState>, table_name: String) -> Result<Vec<Value>, String> {
  with_db(&state, |db| db.list_json_entities(&table_name))
}

#[tauri::command]
pub fn put_json_entities_batch(
  state: State<'_, AppState>,
  table_name: String,
  items: Vec<Value>,
) -> Result<(), String> {
  with_db(&state, |db| db.put_json_entities(&table_name, &items))
}

#[tauri::command]
pub fn delete_json_entity(state: State<'_, AppState>, table_name: String, id: String) -> Result<(), String> {
  with_db(&state, |db| db.delete_json_entity(&table_name, &id))
}
