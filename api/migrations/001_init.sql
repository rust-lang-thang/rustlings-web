CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT,
    avatar TEXT,
    github_username TEXT,
    provider TEXT NOT NULL DEFAULT 'email',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    readme TEXT NOT NULL,
    order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS exercises (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES categories(id),
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    starter_code TEXT NOT NULL,
    hint TEXT NOT NULL,
    solution TEXT NOT NULL,
    requires_test BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS user_progress (
    user_id TEXT NOT NULL REFERENCES users(id),
    exercise_id TEXT NOT NULL REFERENCES exercises(id),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    saved_code TEXT,
    completed_at TEXT,
    PRIMARY KEY (user_id, exercise_id)
);
