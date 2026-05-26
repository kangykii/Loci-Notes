use tauri::State;

use crate::models::Project;
use crate::state::AppState;

use super::util::with_db;

#[tauri::command]
pub fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
  with_db(&state, |db| db.list_projects())
}

#[tauri::command]
pub fn save_projects_batch(state: State<'_, AppState>, projects: Vec<Project>) -> Result<(), String> {
  with_db(&state, |db| db.save_projects_batch(&projects))
}
