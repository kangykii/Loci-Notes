use rusqlite::{params, Row, Transaction};

use crate::error::{AppError, AppResult};
use crate::models::{MediaAsset, Note, NoteBody, NoteMeta, NoteWrite};

use super::Database;

const PREVIEW_MAX: usize = 180;

pub fn extract_text_from_json(value: &serde_json::Value) -> String {
  let mut parts = Vec::new();
  collect_text(value, &mut parts);
  parts.join("")
}

fn collect_text(value: &serde_json::Value, parts: &mut Vec<String>) {
  match value {
    serde_json::Value::Object(map) => {
      if let Some(text) = map.get("text").and_then(|v| v.as_str()) {
        parts.push(text.to_string());
      }
      if let Some(content) = map.get("content") {
        if let Some(array) = content.as_array() {
          for child in array {
            collect_text(child, parts);
          }
        }
      }
    }
    serde_json::Value::Array(items) => {
      for item in items {
        collect_text(item, parts);
      }
    }
    _ => {}
  }
}

pub fn truncate_preview(text: &str) -> String {
  if text.chars().count() <= PREVIEW_MAX {
    return text.to_string();
  }
  let truncated: String = text.chars().take(PREVIEW_MAX.saturating_sub(3)).collect();
  format!("{truncated}...")
}

fn bool_from_row(value: i64) -> bool {
  value != 0
}

fn optional_bool(value: Option<bool>) -> i64 {
  if value.unwrap_or(false) { 1 } else { 0 }
}

fn row_to_note_meta(row: &Row<'_>) -> rusqlite::Result<NoteMeta> {
  let tags_json: String = row.get("tags_json")?;
  let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
  Ok(NoteMeta {
    id: row.get("id")?,
    title: row.get("title")?,
    project_id: row.get("project_id")?,
    template_id: row.get("template_id")?,
    tags,
    updated_at: row.get("updated_at")?,
    preview: row.get("preview")?,
    has_media: bool_from_row(row.get("has_media")?),
  })
}

fn row_to_note(row: &Row<'_>) -> rusqlite::Result<Note> {
  let tags_json: String = row.get("tags_json")?;
  let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
  let content_json: String = row.get("content_json")?;
  let template_data_json: String = row.get("template_data_json")?;
  let blocks_json: Option<String> = row.get("blocks_json")?;
  let source: Option<String> = row.get("source")?;
  let is_starter = bool_from_row(row.get::<_, i64>("is_starter")?).then_some(true);
  Ok(Note {
    id: row.get("id")?,
    title: row.get("title")?,
    project_id: row.get("project_id")?,
    template_id: row.get("template_id")?,
    template_data: serde_json::from_str(&template_data_json).unwrap_or(serde_json::json!({})),
    blocks: blocks_json.and_then(|json| serde_json::from_str(&json).ok()),
    author: row.get("author")?,
    tags,
    content: serde_json::from_str(&content_json).unwrap_or(serde_json::json!({"type":"doc","content":[]})),
    created_at: row.get("created_at")?,
    updated_at: row.get("updated_at")?,
    source,
    is_starter,
  })
}

pub fn collect_media_assets(note: &NoteWrite) -> Vec<MediaAsset> {
  let mut assets = Vec::new();
  collect_image_assets(&note.content, &note.id, &note.updated_at, &mut assets);
  assets
}

fn collect_image_assets(
  node: &serde_json::Value,
  note_id: &str,
  updated_at: &str,
  assets: &mut Vec<MediaAsset>,
) {
  if node.get("type").and_then(|v| v.as_str()) == Some("image") {
    let attrs = node.get("attrs").and_then(|v| v.as_object());
    let src = attrs
      .and_then(|map| map.get("src"))
      .and_then(|v| v.as_str())
      .unwrap_or("");
    if !src.is_empty() {
      let asset_id = attrs
        .and_then(|map| map.get("assetId"))
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .unwrap_or_else(|| format!("asset_{note_id}_{}", assets.len()));
      assets.push(MediaAsset {
        id: asset_id,
        note_id: note_id.to_string(),
        kind: "image".to_string(),
        thumb_src: src.to_string(),
        full_src: src.to_string(),
        width: attrs
          .and_then(|map| map.get("width"))
          .and_then(|v| v.as_i64()),
        height: attrs
          .and_then(|map| map.get("height"))
          .and_then(|v| v.as_i64()),
        updated_at: updated_at.to_string(),
      });
    }
  }
  if let Some(content) = node.get("content").and_then(|v| v.as_array()) {
    for child in content {
      collect_image_assets(child, note_id, updated_at, assets);
    }
  }
}

impl Database {
  pub fn list_note_metas(&self) -> AppResult<Vec<NoteMeta>> {
    let mut stmt = self.conn.prepare(
      "SELECT id, title, project_id, template_id, tags_json, updated_at, preview, has_media
       FROM note_metas ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], row_to_note_meta)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
  }

  pub fn list_notes(&self) -> AppResult<Vec<Note>> {
    let mut stmt = self.conn.prepare(
      "SELECT m.id, m.title, m.project_id, m.template_id, m.author, m.tags_json, m.created_at, m.updated_at,
              m.source, m.is_starter, b.content_json, b.template_data_json, b.blocks_json
       FROM note_metas m
       INNER JOIN note_bodies b ON b.note_id = m.id
       ORDER BY m.updated_at DESC",
    )?;
    let rows = stmt.query_map([], row_to_note)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
  }

  pub fn get_note(&self, note_id: &str) -> AppResult<Option<Note>> {
    let mut stmt = self.conn.prepare(
      "SELECT m.id, m.title, m.project_id, m.template_id, m.author, m.tags_json, m.created_at, m.updated_at,
              m.source, m.is_starter, b.content_json, b.template_data_json, b.blocks_json
       FROM note_metas m
       INNER JOIN note_bodies b ON b.note_id = m.id
       WHERE m.id = ?1",
    )?;
    let mut rows = stmt.query([note_id])?;
    if let Some(row) = rows.next()? {
      return Ok(Some(row_to_note(&row)?));
    }
    Ok(None)
  }

  pub fn get_note_body(&self, note_id: &str) -> AppResult<Option<NoteBody>> {
    let mut stmt = self.conn.prepare(
      "SELECT note_id, content_json, template_data_json, blocks_json, updated_at
       FROM note_bodies WHERE note_id = ?1",
    )?;
    let mut rows = stmt.query([note_id])?;
    if let Some(row) = rows.next()? {
      let blocks_json: Option<String> = row.get("blocks_json")?;
      return Ok(Some(NoteBody {
        note_id: row.get("note_id")?,
        content: serde_json::from_str(&row.get::<_, String>("content_json")?)
          .unwrap_or(serde_json::json!({"type":"doc","content":[]})),
        template_data: serde_json::from_str(&row.get::<_, String>("template_data_json")?)
          .unwrap_or(serde_json::json!({})),
        blocks: blocks_json.and_then(|json: String| serde_json::from_str(&json).ok()),
        updated_at: row.get("updated_at")?,
      }));
    }
    Ok(None)
  }

  pub fn save_notes_batch(&self, notes: &[NoteWrite]) -> AppResult<String> {
    if notes.is_empty() {
      return Ok(String::new());
    }
    let latest_updated_at = notes
      .iter()
      .map(|note| note.updated_at.as_str())
      .max()
      .unwrap_or("")
      .to_string();
    let tx = self.conn.unchecked_transaction()?;
    for note in notes {
      upsert_note_tx(&tx, note)?;
    }
    tx.commit()?;
    Ok(latest_updated_at)
  }

  pub fn delete_note(&self, note_id: &str) -> AppResult<()> {
    self.conn.execute("DELETE FROM note_metas WHERE id = ?1", [note_id])?;
    Ok(())
  }

  pub fn repair_split_note_storage(&self) -> AppResult<crate::models::LocalNoteStorageRepairResult> {
    Ok(crate::models::LocalNoteStorageRepairResult {
      notes_rebuilt: 0,
      metas_rebuilt: 0,
      bodies_rebuilt: 0,
      malformed_bodies: 0,
      errors: Vec::new(),
    })
  }
}

pub(crate) fn upsert_note_tx(tx: &Transaction<'_>, note: &NoteWrite) -> AppResult<()> {
  let search_text = extract_text_from_json(&note.content);
  let preview = truncate_preview(&search_text);
  let tags_json = serde_json::to_string(&note.tags)?;
  let content_json = serde_json::to_string(&note.content)?;
  let template_data_json = serde_json::to_string(&note.template_data)?;
  let blocks_json = note
    .blocks
    .as_ref()
    .map(serde_json::to_string)
    .transpose()?;
  let media_assets = collect_media_assets(note);
  let has_media = if media_assets.is_empty() { 0 } else { 1 };

  tx.execute(
    "INSERT INTO note_metas(
      id, title, project_id, template_id, author, tags_json, created_at, updated_at,
      preview, has_media, search_text, source, is_starter
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      project_id = excluded.project_id,
      template_id = excluded.template_id,
      author = excluded.author,
      tags_json = excluded.tags_json,
      updated_at = excluded.updated_at,
      preview = excluded.preview,
      has_media = excluded.has_media,
      search_text = excluded.search_text,
      source = excluded.source,
      is_starter = excluded.is_starter",
    params![
      note.id,
      note.title,
      note.project_id,
      note.template_id,
      note.author,
      tags_json,
      note.created_at,
      note.updated_at,
      preview,
      has_media,
      search_text,
      note.source,
      optional_bool(note.is_starter),
    ],
  )?;

  tx.execute(
    "INSERT INTO note_bodies(note_id, content_json, template_data_json, blocks_json, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(note_id) DO UPDATE SET
       content_json = excluded.content_json,
       template_data_json = excluded.template_data_json,
       blocks_json = excluded.blocks_json,
       updated_at = excluded.updated_at",
    params![note.id, content_json, template_data_json, blocks_json, note.updated_at],
  )?;

  tx.execute("DELETE FROM media_assets WHERE note_id = ?1", [note.id.as_str()])?;
  for asset in media_assets {
    tx.execute(
      "INSERT INTO media_assets(id, note_id, kind, thumb_src, full_src, width, height, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
      params![
        asset.id,
        asset.note_id,
        asset.kind,
        asset.thumb_src,
        asset.full_src,
        asset.width,
        asset.height,
        asset.updated_at,
      ],
    )?;
  }

  Ok(())
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::db::Database;

  #[test]
  fn note_round_trip() {
    let path = std::env::temp_dir().join(format!("loci-note-test-{}.sqlite", std::process::id()));
    let db = Database::open_at(path).expect("open");
    db.connection()
      .execute(
        "INSERT INTO projects(id, name, color, created_at) VALUES ('p1', 'Test', '#000', '2026-01-01')",
        [],
      )
      .expect("project");
    let note = NoteWrite {
      id: "note_1".to_string(),
      title: "Hello".to_string(),
      project_id: "p1".to_string(),
      template_id: "blank".to_string(),
      template_data: serde_json::json!({"kind":"blank","body":{"type":"doc","content":[]}}),
      blocks: None,
      author: "me".to_string(),
      tags: vec!["a".to_string()],
      content: serde_json::json!({"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"world"}]}]}),
      created_at: "2026-01-01".to_string(),
      updated_at: "2026-01-02".to_string(),
      source: None,
      is_starter: None,
    };
    db.save_notes_batch(&[note]).expect("save");
    let loaded = db.get_note("note_1").expect("get").expect("note");
    assert_eq!(loaded.title, "Hello");
    assert_eq!(extract_text_from_json(&loaded.content), "world");
  }
}
