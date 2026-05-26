use rusqlite::params;

use crate::error::AppResult;
use crate::models::{ImportLegacyResult, LegacyExport, NoteWrite};

use super::notes::upsert_note_tx;
use super::Database;

const COMMUNITY_TABLES: &[&str] = &[
  "authSessions",
  "accountProfiles",
  "friendships",
  "friendGroups",
  "remoteAssets",
  "sharedNoteExports",
  "sharedNoteSnapshots",
  "collaborationSessions",
  "collaborationParticipants",
  "collaborationEvents",
  "communityActivities",
  "communityWidgets",
  "communityReactions",
  "communityPresetReplies",
  "communitySyncQueue",
  "remoteContentItems",
  "surveyPromptStates",
  "remoteEntityMappings",
];

impl Database {
  pub fn import_legacy_dexie(&self, payload: LegacyExport) -> AppResult<ImportLegacyResult> {
    if self.meta_bool("legacy_import_done")? {
      return Ok(ImportLegacyResult {
        imported_notes: 0,
        imported_projects: 0,
        imported_atoms: 0,
        imported_json_entities: 0,
      });
    }

    let tx = self.conn.unchecked_transaction()?;

    for project in &payload.projects {
      tx.execute(
        "INSERT OR REPLACE INTO projects(id, name, description, color, pinned_at, created_at, source, is_starter)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
          project.id,
          project.name,
          project.description,
          project.color,
          project.pinned_at,
          project.created_at,
          project.source,
          if project.is_starter.unwrap_or(false) { 1 } else { 0 },
        ],
      )?;
    }

    let mut note_writes: Vec<NoteWrite> = payload.notes.iter().map(note_to_write).collect();
    if note_writes.is_empty() && (!payload.note_metas.is_empty() || !payload.note_bodies.is_empty()) {
      let bodies_by_id: std::collections::HashMap<_, _> = payload
        .note_bodies
        .iter()
        .map(|body| (body.note_id.clone(), body))
        .collect();
      for meta in &payload.note_metas {
        if let Some(body) = bodies_by_id.get(&meta.id) {
          note_writes.push(NoteWrite {
            id: meta.id.clone(),
            title: meta.title.clone(),
            project_id: meta.project_id.clone(),
            template_id: meta.template_id.clone(),
            template_data: body.template_data.clone(),
            blocks: body.blocks.clone(),
            author: String::new(),
            tags: meta.tags.clone(),
            content: body.content.clone(),
            created_at: body.updated_at.clone(),
            updated_at: meta.updated_at.clone(),
            source: None,
            is_starter: None,
          });
        }
      }
    }

    for note in &note_writes {
      upsert_note_tx(&tx, note)?;
    }

    for asset in &payload.media_assets {
      tx.execute(
        "INSERT OR REPLACE INTO media_assets(id, note_id, kind, thumb_src, full_src, width, height, updated_at)
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

    for atom in &payload.atoms {
      let tags_json = serde_json::to_string(&atom.tags)?;
      tx.execute(
        "INSERT OR REPLACE INTO atoms(
          id, project_id, phrase, definition, tags_json, created_at, updated_at,
          review_count, known_count, source, is_starter
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
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
          if atom.is_starter.unwrap_or(false) { 1 } else { 0 },
        ],
      )?;
    }

    for set in &payload.flashcard_sets {
      let atom_ids_json = serde_json::to_string(&set.atom_ids)?;
      let payload_json = set
        .payload
        .as_ref()
        .map(serde_json::to_string)
        .transpose()?;
      tx.execute(
        "INSERT OR REPLACE INTO flashcard_sets(id, name, description, atom_ids_json, payload_json, created_at, updated_at, last_studied_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
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

    for state in &payload.flashcard_review_states {
      tx.execute(
        "INSERT OR REPLACE INTO flashcard_review_states(
          id, set_id, atom_id, due_at, interval_days, ease_factor, review_count, lapse_count,
          last_rating, created_at, updated_at
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
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

    for snapshot in &payload.note_snapshots {
      let content_json = serde_json::to_string(&snapshot.content)?;
      tx.execute(
        "INSERT OR REPLACE INTO note_snapshots(id, note_id, saved_at, title, content_json, content_hash)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
          snapshot.id,
          snapshot.note_id,
          snapshot.saved_at,
          snapshot.title,
          content_json,
          snapshot.content_hash,
        ],
      )?;
    }

    for profile in &payload.user_profiles {
      tx.execute(
        "INSERT OR REPLACE INTO user_profiles(id, display_name, initials, avatar_color, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![
          profile.id,
          profile.display_name,
          profile.initials,
          profile.avatar_color,
          profile.created_at,
          profile.updated_at,
        ],
      )?;
    }

    for settings in &payload.user_settings {
      let payload_json = serde_json::to_string(settings)?;
      tx.execute(
        "INSERT OR REPLACE INTO user_settings(id, payload_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4)",
        params![settings.id, payload_json, settings.created_at, settings.updated_at],
      )?;
    }

    let mut imported_json_entities = 0usize;
    for entity in &payload.json_entities {
      let payload_json = serde_json::to_string(&entity.payload)?;
      tx.execute(
        "INSERT OR REPLACE INTO json_entities(table_name, id, payload_json, updated_at)
         VALUES (?1, ?2, ?3, ?4)",
        params![entity.table_name, entity.id, payload_json, entity.updated_at],
      )?;
      imported_json_entities += 1;
    }

    tx.commit()?;
    self.meta_set_bool("legacy_import_done", true)?;

    Ok(ImportLegacyResult {
      imported_notes: note_writes.len(),
      imported_projects: payload.projects.len(),
      imported_atoms: payload.atoms.len(),
      imported_json_entities,
    })
  }
}

fn note_to_write(note: &crate::models::Note) -> NoteWrite {
  NoteWrite {
    id: note.id.clone(),
    title: note.title.clone(),
    project_id: note.project_id.clone(),
    template_id: note.template_id.clone(),
    template_data: note.template_data.clone(),
    blocks: note.blocks.clone(),
    author: note.author.clone(),
    tags: note.tags.clone(),
    content: note.content.clone(),
    created_at: note.created_at.clone(),
    updated_at: note.updated_at.clone(),
    source: note.source.clone(),
    is_starter: note.is_starter,
  }
}

pub fn community_table_names() -> &'static [&'static str] {
  COMMUNITY_TABLES
}
