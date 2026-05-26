use std::path::{Path, PathBuf};

use rusqlite::{Connection, OpenFlags};
use tauri::{AppHandle, Manager};

use crate::error::{AppError, AppResult};

const MIGRATION_001: &str = include_str!("migrations/001_init.sql");
const MIGRATION_002: &str = include_str!("migrations/002_fts.sql");

pub struct Database {
  pub(crate) conn: Connection,
  path: PathBuf,
}

impl Database {
  pub fn open(app: &AppHandle) -> AppResult<Self> {
    let app_data_dir = app
      .path()
      .app_data_dir()
      .map_err(|error| AppError::Message(error.to_string()))?;
    std::fs::create_dir_all(&app_data_dir)?;
    let path = app_data_dir.join("loci.sqlite");
    Self::open_at(path)
  }

  pub fn open_at(path: PathBuf) -> AppResult<Self> {
    let conn = Connection::open_with_flags(
      &path,
      OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE | OpenFlags::SQLITE_OPEN_FULL_MUTEX,
    )?;
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    let db = Self { conn, path };
    db.run_migrations()?;
    Ok(db)
  }

  pub fn path(&self) -> &Path {
    &self.path
  }

  pub fn connection(&self) -> &Connection {
    &self.conn
  }

  fn run_migrations(&self) -> AppResult<()> {
    let user_version: i64 = self
      .conn
      .pragma_query_value(None, "user_version", |row| row.get(0))
      .unwrap_or(0);
    if user_version < 1 {
      self.conn.execute_batch(MIGRATION_001)?;
      self.conn.pragma_update(None, "user_version", 1)?;
    }
    if user_version < 2 {
      self.conn.execute_batch(MIGRATION_002)?;
      self.conn.pragma_update(None, "user_version", 2)?;
    }
    Ok(())
  }

  pub fn meta_get(&self, key: &str) -> AppResult<Option<String>> {
    let mut stmt = self.conn.prepare("SELECT value FROM app_meta WHERE key = ?1")?;
    let value = stmt
      .query_row([key], |row| row.get::<_, String>(0))
      .ok();
    Ok(value)
  }

  pub fn meta_set(&self, key: &str, value: &str) -> AppResult<()> {
    self.conn.execute(
      "INSERT INTO app_meta(key, value) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      (key, value),
    )?;
    Ok(())
  }

  pub fn meta_bool(&self, key: &str) -> AppResult<bool> {
    Ok(self.meta_get(key)?.as_deref() == Some("true"))
  }

  pub fn meta_set_bool(&self, key: &str, value: bool) -> AppResult<()> {
    self.meta_set(key, if value { "true" } else { "false" })
  }

  pub fn schema_version(&self) -> AppResult<i64> {
    Ok(self
      .conn
      .pragma_query_value(None, "user_version", |row| row.get(0))
      .unwrap_or(0))
  }

  pub fn note_count(&self) -> AppResult<i64> {
    let count: i64 = self
      .conn
      .query_row("SELECT COUNT(*) FROM note_metas", [], |row| row.get(0))?;
    Ok(count)
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn opens_in_memory_and_migrates() {
    let path = std::env::temp_dir().join(format!("loci-test-{}.sqlite", uuid_like()));
    let db = Database::open_at(path).expect("open db");
    assert_eq!(db.schema_version().expect("schema"), 2);
    assert_eq!(db.note_count().expect("count"), 0);
  }

  fn uuid_like() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap()
      .as_nanos()
      .to_string()
  }
}
