use rusqlite::params;
use serde_json::Value;

use crate::error::{AppError, AppResult};

use super::Database;

impl Database {
  pub fn list_json_entities(&self, table_name: &str) -> AppResult<Vec<Value>> {
    let mut stmt = self.conn.prepare(
      "SELECT payload_json FROM json_entities WHERE table_name = ?1 ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([table_name], |row| {
      let payload: String = row.get(0)?;
      Ok(serde_json::from_str(&payload).unwrap_or(Value::Null))
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
  }

  pub fn put_json_entities(&self, table_name: &str, items: &[Value]) -> AppResult<()> {
    let tx = self.conn.unchecked_transaction()?;
    for item in items {
      let id = item
        .get("id")
        .or_else(|| item.get("accountId"))
        .and_then(|value| value.as_str())
        .unwrap_or("");
      if id.is_empty() {
        continue;
      }
      let payload = serde_json::to_string(item)?;
      let updated_at = item
        .get("updatedAt")
        .and_then(|value| value.as_str())
        .map(str::to_string);
      tx.execute(
        "INSERT INTO json_entities(table_name, id, payload_json, updated_at)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(table_name, id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at",
        params![table_name, id, payload, updated_at],
      )?;
    }
    tx.commit()?;
    Ok(())
  }

  pub fn delete_json_entity(&self, table_name: &str, id: &str) -> AppResult<()> {
    self.conn.execute(
      "DELETE FROM json_entities WHERE table_name = ?1 AND id = ?2",
      params![table_name, id],
    )?;
    Ok(())
  }
}
