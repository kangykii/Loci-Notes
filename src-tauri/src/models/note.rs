use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteMeta {
  pub id: String,
  pub title: String,
  pub project_id: String,
  pub template_id: String,
  pub tags: Vec<String>,
  pub updated_at: String,
  pub preview: String,
  pub has_media: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteBody {
  pub note_id: String,
  pub content: Value,
  pub template_data: Value,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub blocks: Option<Value>,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaAsset {
  pub id: String,
  pub note_id: String,
  pub kind: String,
  pub thumb_src: String,
  pub full_src: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub width: Option<i64>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub height: Option<i64>,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Note {
  pub id: String,
  pub title: String,
  pub project_id: String,
  pub template_id: String,
  pub template_data: Value,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub blocks: Option<Value>,
  pub author: String,
  pub tags: Vec<String>,
  pub content: Value,
  pub created_at: String,
  pub updated_at: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub source: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub is_starter: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteSnapshot {
  pub id: String,
  pub note_id: String,
  pub saved_at: String,
  pub title: String,
  pub content: Value,
  pub content_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NoteWrite {
  pub id: String,
  pub title: String,
  pub project_id: String,
  pub template_id: String,
  pub template_data: Value,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub blocks: Option<Value>,
  pub author: String,
  pub tags: Vec<String>,
  pub content: Value,
  pub created_at: String,
  pub updated_at: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub source: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub is_starter: Option<bool>,
}

impl From<NoteWrite> for Note {
  fn from(value: NoteWrite) -> Self {
    Self {
      id: value.id,
      title: value.title,
      project_id: value.project_id,
      template_id: value.template_id,
      template_data: value.template_data,
      blocks: value.blocks,
      author: value.author,
      tags: value.tags,
      content: value.content,
      created_at: value.created_at,
      updated_at: value.updated_at,
      source: value.source,
      is_starter: value.is_starter,
    }
  }
}
