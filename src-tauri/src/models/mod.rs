mod atom;
mod legacy;
mod note;
mod project;
mod settings;

pub use atom::*;
pub use legacy::*;
pub use note::*;
pub use project::*;
pub use settings::*;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DbStatus {
  pub ok: bool,
  pub schema_version: i64,
  pub legacy_import_done: bool,
  pub note_count: i64,
  pub db_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPaths {
  pub app_data_dir: String,
  pub db_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveNotesBatchResult {
  pub saved_ids: Vec<String>,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportLegacyResult {
  pub imported_notes: usize,
  pub imported_projects: usize,
  pub imported_atoms: usize,
  pub imported_json_entities: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchNotesResult {
  pub note_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalNoteStorageRepairResult {
  pub notes_rebuilt: usize,
  pub metas_rebuilt: usize,
  pub bodies_rebuilt: usize,
  pub malformed_bodies: usize,
  pub errors: Vec<String>,
}
