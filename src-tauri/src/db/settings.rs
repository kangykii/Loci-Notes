use rusqlite::params;

use crate::error::AppResult;
use crate::models::{UserProfile, UserSettings};

use super::Database;

impl Database {
  pub fn get_user_settings(&self) -> AppResult<Option<UserSettings>> {
    let mut stmt = self.conn.prepare(
      "SELECT payload_json FROM user_settings WHERE id = 'local'",
    )?;
    let mut rows = stmt.query([])?;
    if let Some(row) = rows.next()? {
      let payload: String = row.get(0)?;
      return Ok(Some(serde_json::from_str(&payload)?));
    }
    Ok(None)
  }

  pub fn save_user_settings(&self, settings: &UserSettings) -> AppResult<()> {
    let payload = serde_json::to_string(settings)?;
    self.conn.execute(
      "INSERT INTO user_settings(id, payload_json, created_at, updated_at)
       VALUES ('local', ?1, ?2, ?3)
       ON CONFLICT(id) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at",
      params![payload, settings.created_at, settings.updated_at],
    )?;
    Ok(())
  }

  pub fn get_user_profile(&self) -> AppResult<Option<UserProfile>> {
    let mut stmt = self.conn.prepare(
      "SELECT id, display_name, initials, avatar_color, created_at, updated_at
       FROM user_profiles WHERE id = 'local'",
    )?;
    let mut rows = stmt.query([])?;
    if let Some(row) = rows.next()? {
      return Ok(Some(UserProfile {
        id: row.get(0)?,
        display_name: row.get(1)?,
        initials: row.get(2)?,
        avatar_color: row.get(3)?,
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
      }));
    }
    Ok(None)
  }

  pub fn save_user_profile(&self, profile: &UserProfile) -> AppResult<()> {
    self.conn.execute(
      "INSERT INTO user_profiles(id, display_name, initials, avatar_color, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(id) DO UPDATE SET
         display_name = excluded.display_name,
         initials = excluded.initials,
         avatar_color = excluded.avatar_color,
         updated_at = excluded.updated_at",
      params![
        profile.id,
        profile.display_name,
        profile.initials,
        profile.avatar_color,
        profile.created_at,
        profile.updated_at,
      ],
    )?;
    Ok(())
  }
}
