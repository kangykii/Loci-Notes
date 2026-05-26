use rusqlite::params;

use crate::error::{AppError, AppResult};
use crate::models::Project;

use super::Database;

fn bool_from_row(value: i64) -> bool {
  value != 0
}

fn optional_bool(value: Option<bool>) -> i64 {
  if value.unwrap_or(false) { 1 } else { 0 }
}

impl Database {
  pub fn list_projects(&self) -> AppResult<Vec<Project>> {
    let mut stmt = self.conn.prepare(
      "SELECT id, name, description, color, pinned_at, created_at, source, is_starter
       FROM projects ORDER BY name ASC",
    )?;
    let rows = stmt.query_map([], |row| {
      let source: Option<String> = row.get("source")?;
      let is_starter = bool_from_row(row.get::<_, i64>("is_starter")?).then_some(true);
      Ok(Project {
        id: row.get("id")?,
        name: row.get("name")?,
        description: row.get("description")?,
        color: row.get("color")?,
        pinned_at: row.get("pinned_at")?,
        created_at: row.get("created_at")?,
        source,
        is_starter,
      })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
  }

  pub fn save_projects_batch(&self, projects: &[Project]) -> AppResult<()> {
    let tx = self.conn.unchecked_transaction()?;
    for project in projects {
      tx.execute(
        "INSERT INTO projects(id, name, description, color, pinned_at, created_at, source, is_starter)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           description = excluded.description,
           color = excluded.color,
           pinned_at = excluded.pinned_at,
           source = excluded.source,
           is_starter = excluded.is_starter",
        params![
          project.id,
          project.name,
          project.description,
          project.color,
          project.pinned_at,
          project.created_at,
          project.source,
          optional_bool(project.is_starter),
        ],
      )?;
    }
    tx.commit()?;
    Ok(())
  }
}
