CREATE TABLE IF NOT EXISTS app_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL,
  pinned_at TEXT,
  created_at TEXT NOT NULL,
  source TEXT,
  is_starter INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS note_metas (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  project_id TEXT NOT NULL,
  template_id TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  preview TEXT NOT NULL DEFAULT '',
  has_media INTEGER NOT NULL DEFAULT 0,
  search_text TEXT NOT NULL DEFAULT '',
  source TEXT,
  is_starter INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS note_bodies (
  note_id TEXT PRIMARY KEY NOT NULL,
  content_json TEXT NOT NULL,
  template_data_json TEXT NOT NULL,
  blocks_json TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES note_metas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY NOT NULL,
  note_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  thumb_src TEXT NOT NULL,
  full_src TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES note_metas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS atoms (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL,
  phrase TEXT NOT NULL,
  definition TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  review_count INTEGER NOT NULL DEFAULT 0,
  known_count INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  is_starter INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS flashcard_sets (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  atom_ids_json TEXT NOT NULL DEFAULT '[]',
  payload_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_studied_at TEXT
);

CREATE TABLE IF NOT EXISTS flashcard_review_states (
  id TEXT PRIMARY KEY NOT NULL,
  set_id TEXT NOT NULL,
  atom_id TEXT NOT NULL,
  due_at TEXT NOT NULL,
  interval_days REAL NOT NULL DEFAULT 0,
  ease_factor REAL NOT NULL DEFAULT 2.5,
  review_count INTEGER NOT NULL DEFAULT 0,
  lapse_count INTEGER NOT NULL DEFAULT 0,
  last_rating TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (set_id) REFERENCES flashcard_sets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS note_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  note_id TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  title TEXT NOT NULL,
  content_json TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES note_metas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  display_name TEXT NOT NULL,
  initials TEXT NOT NULL,
  avatar_color TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS json_entities (
  table_name TEXT NOT NULL,
  id TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT,
  PRIMARY KEY (table_name, id)
);

CREATE INDEX IF NOT EXISTS idx_note_metas_updated_at ON note_metas(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_atoms_updated_at ON atoms(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

INSERT OR IGNORE INTO app_meta(key, value) VALUES ('schema_version', '1');
INSERT OR IGNORE INTO app_meta(key, value) VALUES ('legacy_import_done', 'false');
