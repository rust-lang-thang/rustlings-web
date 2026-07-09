-- Add active flag to categories and exercises for soft-delete during sync
ALTER TABLE categories ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE exercises ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;

-- Track when content was last synced from GitHub
CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    synced_at TEXT NOT NULL DEFAULT (datetime('now')),
    commit_sha TEXT,
    categories_added INTEGER NOT NULL DEFAULT 0,
    categories_updated INTEGER NOT NULL DEFAULT 0,
    exercises_added INTEGER NOT NULL DEFAULT 0,
    exercises_updated INTEGER NOT NULL DEFAULT 0,
    exercises_deactivated INTEGER NOT NULL DEFAULT 0
);
