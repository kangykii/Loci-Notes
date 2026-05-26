use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::{Atom, FlashcardReviewState, FlashcardSet, MediaAsset, Note, NoteSnapshot, Project, UserProfile, UserSettings};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyExport {
  #[serde(default)]
  pub notes: Vec<Note>,
  #[serde(default)]
  pub note_metas: Vec<super::NoteMeta>,
  #[serde(default)]
  pub note_bodies: Vec<super::NoteBody>,
  #[serde(default)]
  pub media_assets: Vec<MediaAsset>,
  #[serde(default)]
  pub projects: Vec<Project>,
  #[serde(default)]
  pub atoms: Vec<Atom>,
  #[serde(default)]
  pub flashcard_sets: Vec<FlashcardSet>,
  #[serde(default)]
  pub flashcard_review_states: Vec<FlashcardReviewState>,
  #[serde(default)]
  pub note_snapshots: Vec<NoteSnapshot>,
  #[serde(default)]
  pub user_profiles: Vec<UserProfile>,
  #[serde(default)]
  pub user_settings: Vec<UserSettings>,
  #[serde(default)]
  pub json_entities: Vec<LegacyJsonEntity>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LegacyJsonEntity {
  pub table_name: String,
  pub id: String,
  pub payload: Value,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub updated_at: Option<String>,
}
