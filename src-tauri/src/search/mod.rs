use crate::error::{AppError, AppResult};
use crate::models::SearchNotesResult;

use crate::db::Database;

impl Database {
  pub fn search_notes(&self, query: &str) -> AppResult<SearchNotesResult> {
    let trimmed = query.trim();
    if trimmed.is_empty() {
      return Ok(SearchNotesResult { note_ids: Vec::new() });
    }

    let fts_query = trimmed
      .split_whitespace()
      .map(|part| format!("\"{}\"*", part.replace('"', "")))
      .collect::<Vec<_>>()
      .join(" AND ");

    let mut stmt = self
      .conn
      .prepare("SELECT note_id FROM notes_fts WHERE notes_fts MATCH ?1 ORDER BY rank")?;
    let rows = stmt.query_map([&fts_query], |row| row.get::<_, String>(0))?;
    let note_ids = rows
      .collect::<Result<Vec<_>, _>>()
      .map_err(AppError::from)?;
    Ok(SearchNotesResult { note_ids })
  }

  pub fn rebuild_notes_fts(&self) -> AppResult<()> {
    self.conn.execute("INSERT INTO notes_fts(notes_fts) VALUES ('rebuild')", [])?;
    Ok(())
  }
}
