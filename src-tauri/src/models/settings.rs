use serde::{Deserialize, Serialize};
use serde_json::Value;

fn default_theme() -> String {
  "loci".to_string()
}

fn default_ai_provider() -> String {
  "openai".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProfile {
  pub id: String,
  pub display_name: String,
  pub initials: String,
  pub avatar_color: String,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserSettings {
  pub id: String,
  #[serde(default = "default_theme")]
  pub theme: String,
  #[serde(alias = "defaultAIProvider", default = "default_ai_provider")]
  pub default_ai_provider: String,
  pub ai_providers: Value,
  pub ai_temperature: f64,
  pub ai_max_tokens: i64,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub ai_timeout_ms: Option<i64>,
  pub ai_include_note_title: bool,
  pub ai_include_selected_text: bool,
  pub ai_include_note_excerpt: bool,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub ai_last_status: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub ai_last_provider: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub ai_last_error: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub ai_last_usage: Option<Value>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub ai_last_request_at: Option<String>,
  pub highlighter_color: String,
  pub reduce_motion: bool,
  pub compact_mode: bool,
  pub editor_animated_typing: bool,
  pub editor_atom_underlines_default: bool,
  pub editor_focus_mode_default: bool,
  pub editor_focus_mode_total_ms: i64,
  pub editor_authentic_writer_default: bool,
  pub editor_show_marginalia: bool,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub preferred_atom_sub_view: Option<String>,
  pub study_default_direction: String,
  pub study_shuffle_default: bool,
  pub community_enabled: bool,
  pub pinned_community_recipient_ids: Vec<String>,
  pub created_at: String,
  pub updated_at: String,
}
