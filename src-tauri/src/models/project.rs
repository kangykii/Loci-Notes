use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
  pub id: String,
  pub name: String,
  #[serde(default)]
  pub description: String,
  pub color: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub pinned_at: Option<String>,
  pub created_at: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub source: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub is_starter: Option<bool>,
}
