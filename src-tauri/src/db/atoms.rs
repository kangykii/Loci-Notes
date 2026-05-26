use rusqlite::params;

use crate::error::{AppError, AppResult};
use crate::models::{Atom, FlashcardReviewState, FlashcardSet};

use super::Database;

fn optional_bool(value: Option<bool>) -> i64 {
  if value.unwrap_or(false) { 1 } else { 0 }
}

impl Database {
  pub fn list_atoms(&self) -> AppResult<Vec<Atom>> {
    let mut stmt = self.conn.prepare(
      "SELECT id, project_id, phrase, definition, tags_json, created_at, updated_at,
              review_count, known_count, source, is_starter
       FROM atoms ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
      let tags_json: String = row.get("tags_json")?;
      let tags: Vec<String> = serde_json::from_str(&tags_json).unwrap_or_default();
      let source: Option<String> = row.get("source")?;
      let is_starter = (row.get::<_, i64>("is_starter")? != 0).then_some(true);
      Ok(Atom {
        id: row.get("id")?,
        project_id: row.get("project_id")?,
        phrase: row.get("phrase")?,
        definition: row.get("definition")?,
        tags,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        review_count: row.get("review_count")?,
        known_count: row.get("known_count")?,
        source,
        is_starter,
      })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
  }

  pub fn save_atoms_batch(&self, atoms: &[Atom]) -> AppResult<()> {
    let tx = self.conn.unchecked_transaction()?;
    for atom in atoms {
      let tags_json = serde_json::to_string(&atom.tags)?;
      tx.execute(
        "INSERT INTO atoms(
          id, project_id, phrase, definition, tags_json, created_at, updated_at,
          review_count, known_count, source, is_starter
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        ON CONFLICT(id) DO UPDATE SET
          project_id = excluded.project_id,
          phrase = excluded.phrase,
          definition = excluded.definition,
          tags_json = excluded.tags_json,
          updated_at = excluded.updated_at,
          review_count = excluded.review_count,
          known_count = excluded.known_count,
          source = excluded.source,
          is_starter = excluded.is_starter",
        params![
          atom.id,
          atom.project_id,
          atom.phrase,
          atom.definition,
          tags_json,
          atom.created_at,
          atom.updated_at,
          atom.review_count,
          atom.known_count,
          atom.source,
          optional_bool(atom.is_starter),
        ],
      )?;
    }
    tx.commit()?;
    Ok(())
  }

  pub fn list_flashcard_sets(&self) -> AppResult<Vec<FlashcardSet>> {
    let mut stmt = self.conn.prepare(
      "SELECT id, name, description, atom_ids_json, payload_json, created_at, updated_at, last_studied_at
       FROM flashcard_sets ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
      let atom_ids_json: String = row.get("atom_ids_json")?;
      let atom_ids: Vec<String> = serde_json::from_str(&atom_ids_json).unwrap_or_default();
      let payload_json: Option<String> = row.get("payload_json")?;
      Ok(FlashcardSet {
        id: row.get("id")?,
        name: row.get("name")?,
        description: row.get("description")?,
        atom_ids,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
        last_studied_at: row.get("last_studied_at")?,
        payload: payload_json.and_then(|json: String| serde_json::from_str(&json).ok()),
      })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
  }

  pub fn save_flashcard_sets_batch(&self, sets: &[FlashcardSet]) -> AppResult<()> {
    let tx = self.conn.unchecked_transaction()?;
    for set in sets {
      let atom_ids_json = serde_json::to_string(&set.atom_ids)?;
      let payload_json = set
        .payload
        .as_ref()
        .map(serde_json::to_string)
        .transpose()?;
      tx.execute(
        "INSERT INTO flashcard_sets(id, name, description, atom_ids_json, payload_json, created_at, updated_at, last_studied_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           description = excluded.description,
           atom_ids_json = excluded.atom_ids_json,
           payload_json = excluded.payload_json,
           updated_at = excluded.updated_at,
           last_studied_at = excluded.last_studied_at",
        params![
          set.id,
          set.name,
          set.description,
          atom_ids_json,
          payload_json,
          set.created_at,
          set.updated_at,
          set.last_studied_at,
        ],
      )?;
    }
    tx.commit()?;
    Ok(())
  }

  pub fn list_flashcard_review_states(&self) -> AppResult<Vec<FlashcardReviewState>> {
    let mut stmt = self.conn.prepare(
      "SELECT id, set_id, atom_id, due_at, interval_days, ease_factor, review_count, lapse_count,
              last_rating, created_at, updated_at
       FROM flashcard_review_states ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
      Ok(FlashcardReviewState {
        id: row.get(0)?,
        set_id: row.get(1)?,
        atom_id: row.get(2)?,
        due_at: row.get(3)?,
        interval_days: row.get(4)?,
        ease_factor: row.get(5)?,
        review_count: row.get(6)?,
        lapse_count: row.get(7)?,
        last_rating: row.get(8)?,
        created_at: row.get(9)?,
        updated_at: row.get(10)?,
      })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(AppError::from)
  }

  pub fn save_flashcard_review_states_batch(&self, states: &[FlashcardReviewState]) -> AppResult<()> {
    let tx = self.conn.unchecked_transaction()?;
    for state in states {
      tx.execute(
        "INSERT INTO flashcard_review_states(
          id, set_id, atom_id, due_at, interval_days, ease_factor, review_count, lapse_count,
          last_rating, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
        ON CONFLICT(id) DO UPDATE SET
          set_id = excluded.set_id,
          atom_id = excluded.atom_id,
          due_at = excluded.due_at,
          interval_days = excluded.interval_days,
          ease_factor = excluded.ease_factor,
          review_count = excluded.review_count,
          lapse_count = excluded.lapse_count,
          last_rating = excluded.last_rating,
          updated_at = excluded.updated_at",
        params![
          state.id,
          state.set_id,
          state.atom_id,
          state.due_at,
          state.interval_days,
          state.ease_factor,
          state.review_count,
          state.lapse_count,
          state.last_rating,
          state.created_at,
          state.updated_at,
        ],
      )?;
    }
    tx.commit()?;
    Ok(())
  }

  pub fn delete_flashcard_set(&self, set_id: &str) -> AppResult<()> {
    self.conn.execute("DELETE FROM flashcard_sets WHERE id = ?1", [set_id])?;
    Ok(())
  }

  pub fn delete_flashcard_review_states(&self, set_id: &str, atom_ids: &[String]) -> AppResult<()> {
    for atom_id in atom_ids {
      self.conn.execute(
        "DELETE FROM flashcard_review_states WHERE set_id = ?1 AND atom_id = ?2",
        params![set_id, atom_id],
      )?;
    }
    Ok(())
  }

  pub fn delete_flashcard_review_states_for_set(&self, set_id: &str) -> AppResult<()> {
    self.conn.execute("DELETE FROM flashcard_review_states WHERE set_id = ?1", [set_id])?;
    Ok(())
  }
}
