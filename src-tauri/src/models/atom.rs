use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Atom {
  pub id: String,
  pub project_id: String,
  pub phrase: String,
  pub definition: String,
  pub tags: Vec<String>,
  pub created_at: String,
  pub updated_at: String,
  pub review_count: i64,
  pub known_count: i64,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub source: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub is_starter: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlashcardSet {
  pub id: String,
  pub name: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,
  pub atom_ids: Vec<String>,
  pub created_at: String,
  pub updated_at: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub last_studied_at: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub payload: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FlashcardReviewState {
  pub id: String,
  pub set_id: String,
  pub atom_id: String,
  pub due_at: String,
  pub interval_days: f64,
  pub ease_factor: f64,
  pub review_count: i64,
  pub lapse_count: i64,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub last_rating: Option<String>,
  pub created_at: String,
  pub updated_at: String,
}
