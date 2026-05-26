use rusqlite::params;

use crate::error::{AppError, AppResult};
use crate::models::NoteSnapshot;

use super::Database;

const NOTE_SNAPSHOT_MAX_PER_NOTE: i64 = 25;

fn snapshot_content_hash(title: &str, content_json: &str) -> String {
  format!("{}:{}", title.len(), content_json)
}

impl Database {
  pub fn list_note_snapshots(&self, note_id: &str) -> AppResult<Vec<NoteSnapshot>> {
    let mut stmt = self.conn.prepare(
      "SELECT id, note_id, saved_at, title, content_json, content_hash
       FROM note_snapshots WHERE note_id = ?1 ORDER BY saved_at DESC",
    )?;
    let rows = stmt.query_map([note_id], |row| {
      let content_json: String = row.get(4)?;
      Ok(NoteSnapshot {
        id: row.get(0)?,
        note_id: row.get(1)?,
        saved_at: row.get(2)?,
        title: row.get(3)?,
        content: serde_json::from_str(&content_json).unwrap_or(serde_json::json!({"type":"doc","content":[]})),
        content_hash: row.get(5)?,
      })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
  }

  pub fn append_note_snapshot(
    &self,
    note_id: &str,
    title: &str,
    content: &serde_json::Value,
    saved_at: &str,
  ) -> AppResult<()> {
    let content_json = serde_json::to_string(content)?;
    let content_hash = snapshot_content_hash(title, &content_json);

    let latest_hash: Option<String> = self.conn.query_row(
      "SELECT content_hash FROM note_snapshots WHERE note_id = ?1 ORDER BY saved_at DESC LIMIT 1",
      [note_id],
      |row| row.get(0),
    ).ok();
    if latest_hash.as_deref() == Some(content_hash.as_str()) {
      return Ok(());
    }

    let id = format!("snap_{}", uuid_simple());
    self.conn.execute(
      "INSERT INTO note_snapshots(id, note_id, saved_at, title, content_json, content_hash)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
      params![id, note_id, saved_at, title, content_json, content_hash],
    )?;

    let count: i64 = self.conn.query_row(
      "SELECT COUNT(*) FROM note_snapshots WHERE note_id = ?1",
      [note_id],
      |row| row.get(0),
    )?;
    let surplus = count - NOTE_SNAPSHOT_MAX_PER_NOTE;
    if surplus > 0 {
      self.conn.execute(
        "DELETE FROM note_snapshots WHERE id IN (
          SELECT id FROM note_snapshots WHERE note_id = ?1 ORDER BY saved_at ASC LIMIT ?2
        )",
        params![note_id, surplus],
      )?;
    }
    Ok(())
  }
}

fn uuid_simple() -> String {
  use std::time::{SystemTime, UNIX_EPOCH};
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_nanos().to_string())
    .unwrap_or_else(|_| "0".into())
}

#[cfg(test)]
mod tests {
  use crate::db::Database;

  #[test]
  fn snapshot_cap_enforced() {
    let path = std::env::temp_dir().join(format!("loci-snap-test-{}.sqlite", std::process::id()));
    let db = Database::open_at(path).expect("open");
    db.connection()
      .execute(
        "INSERT INTO projects(id, name, color, created_at) VALUES ('p1', 'Test', '#000', '2026-01-01')",
        [],
      )
      .expect("project");
    db.connection()
      .execute(
        "INSERT INTO note_metas(id, title, project_id, template_id, author, tags_json, created_at, updated_at, preview, has_media, search_text)
         VALUES ('n1', 'T', 'p1', 'blank', '', '[]', '2026-01-01', '2026-01-01', '', 0, '')",
        [],
      )
      .expect("meta");
    for index in 0..30 {
      db.append_note_snapshot(
        "n1",
        "Title",
        &serde_json::json!({"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":format!("v{index}")}]}]}),
        &format!("2026-01-{index:02}T00:00:00.000Z"),
      )
      .expect("append");
    }
    let rows = db.list_note_snapshots("n1").expect("list");
    assert!(rows.len() <= 25);
  }
}
