use tauri::State;

use crate::models::{UserProfile, UserSettings};
use crate::state::AppState;

use super::util::with_db;

#[tauri::command]
pub fn get_user_settings(state: State<'_, AppState>) -> Result<Option<UserSettings>, String> {
  with_db(&state, |db| db.get_user_settings())
}

#[tauri::command]
pub fn save_user_settings(state: State<'_, AppState>, settings: UserSettings) -> Result<(), String> {
  with_db(&state, |db| db.save_user_settings(&settings))
}

#[tauri::command]
pub fn get_user_profile(state: State<'_, AppState>) -> Result<Option<UserProfile>, String> {
  with_db(&state, |db| db.get_user_profile())
}

#[tauri::command]
pub fn save_user_profile(state: State<'_, AppState>, profile: UserProfile) -> Result<(), String> {
  with_db(&state, |db| db.save_user_profile(&profile))
}
