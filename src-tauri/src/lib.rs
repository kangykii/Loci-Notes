mod commands;
mod db;
mod error;
mod models;
mod search;
mod state;

use tauri::Manager;

use db::Database;
use state::AppState;

fn agent_debug_log(run_id: &str, hypothesis_id: &str, location: &str, message: &str, data: &str) {
  fn escape_json(value: &str) -> String {
    value
      .replace('\\', "\\\\")
      .replace('"', "\\\"")
      .replace('\n', "\\n")
      .replace('\r', "\\r")
  }

  let line = format!(
    "{{\"sessionId\":\"9bd32d\",\"runId\":\"{}\",\"hypothesisId\":\"{}\",\"location\":\"{}\",\"message\":\"{}\",\"data\":{},\"timestamp\":{}}}\n",
    escape_json(run_id),
    escape_json(hypothesis_id),
    escape_json(location),
    escape_json(message),
    data,
    std::time::SystemTime::now()
      .duration_since(std::time::UNIX_EPOCH)
      .map(|duration| duration.as_millis())
      .unwrap_or(0)
  );
  let _ = std::fs::OpenOptions::new()
    .create(true)
    .append(true)
    .open(concat!(env!("CARGO_MANIFEST_DIR"), "/../debug-9bd32d.log"))
    .and_then(|mut file| std::io::Write::write_all(&mut file, line.as_bytes()));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // #region agent log
  agent_debug_log("initial", "H1,H4", "src-tauri/src/lib.rs:39", "Tauri builder run entered", "{}");
  // #endregion
  tauri::Builder::default()
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .setup(|app| {
      // #region agent log
      agent_debug_log("initial", "H1", "src-tauri/src/lib.rs:45", "Tauri setup entered", "{}");
      // #endregion
      #[cfg(desktop)]
      app
        .handle()
        .plugin(tauri_plugin_updater::Builder::new().build())?;

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // #region agent log
      agent_debug_log("initial", "H1", "src-tauri/src/lib.rs:61", "Opening app database", "{}");
      // #endregion
      let database = Database::open(app.handle())?;
      // #region agent log
      agent_debug_log(
        "initial",
        "H1",
        "src-tauri/src/lib.rs:67",
        "App database opened",
        &format!("{{\"schemaVersion\":{}}}", database.schema_version().unwrap_or(-1)),
      );
      // #endregion
      app.manage(AppState::new(database));
      // #region agent log
      agent_debug_log("initial", "H1,H4", "src-tauri/src/lib.rs:76", "Tauri setup completed", "{}");
      // #endregion
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::db_status,
      commands::app_paths,
      commands::list_note_metas,
      commands::list_notes,
      commands::get_note,
      commands::get_note_body,
      commands::save_notes_batch,
      commands::delete_note,
      commands::repair_split_note_storage,
      commands::list_projects,
      commands::save_projects_batch,
      commands::list_atoms,
      commands::save_atoms_batch,
      commands::list_flashcard_sets,
      commands::save_flashcard_sets_batch,
      commands::get_user_settings,
      commands::save_user_settings,
      commands::get_user_profile,
      commands::save_user_profile,
      commands::delete_flashcard_set,
      commands::delete_flashcard_review_states,
      commands::delete_flashcard_review_states_for_set,
      commands::list_flashcard_review_states,
      commands::save_flashcard_review_states_batch,
      commands::search_notes,
      commands::rebuild_notes_fts,
      commands::import_legacy_dexie,
      commands::list_note_snapshots,
      commands::append_note_snapshot,
      commands::list_json_entities,
      commands::put_json_entities_batch,
      commands::delete_json_entity,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
