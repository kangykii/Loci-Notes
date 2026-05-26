CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  note_id UNINDEXED,
  title,
  search_text,
  content='',
  contentless_delete=1
);

CREATE TRIGGER IF NOT EXISTS note_metas_ai AFTER INSERT ON note_metas BEGIN
  INSERT INTO notes_fts(rowid, note_id, title, search_text)
  VALUES (new.rowid, new.id, new.title, new.search_text);
END;

CREATE TRIGGER IF NOT EXISTS note_metas_ad AFTER DELETE ON note_metas BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, note_id, title, search_text)
  VALUES ('delete', old.rowid, old.id, old.title, old.search_text);
END;

CREATE TRIGGER IF NOT EXISTS note_metas_au AFTER UPDATE ON note_metas BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, note_id, title, search_text)
  VALUES ('delete', old.rowid, old.id, old.title, old.search_text);
  INSERT INTO notes_fts(rowid, note_id, title, search_text)
  VALUES (new.rowid, new.id, new.title, new.search_text);
END;
