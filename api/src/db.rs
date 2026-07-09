use sqlx::sqlite::{SqlitePool, SqlitePoolOptions};
use std::path::Path;

pub async fn init_pool(database_url: &str) -> SqlitePool {
    // Create the database file if it doesn't exist
    let db_path = database_url.strip_prefix("sqlite:").unwrap_or(database_url);
    if !Path::new(db_path).exists() {
        std::fs::File::create(db_path).expect("Failed to create database file");
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(database_url)
        .await
        .expect("Failed to connect to SQLite");

    run_migrations(&pool).await;

    pool
}

async fn run_migrations(pool: &SqlitePool) {
    // Create migrations tracking table
    sqlx::raw_sql(
        "CREATE TABLE IF NOT EXISTS _migrations (
            name TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
    )
    .execute(pool)
    .await
    .expect("Failed to create migrations table");

    let migrations: &[(&str, &str)] = &[
        ("001_init", include_str!("../migrations/001_init.sql")),
        (
            "002_add_active_and_sync_log",
            include_str!("../migrations/002_add_active_and_sync_log.sql"),
        ),
    ];

    for (name, sql) in migrations {
        let applied: Option<(String,)> =
            sqlx::query_as("SELECT name FROM _migrations WHERE name = ?")
                .bind(name)
                .fetch_optional(pool)
                .await
                .expect("Failed to check migration status");

        if applied.is_none() {
            sqlx::raw_sql(sql)
                .execute(pool)
                .await
                .unwrap_or_else(|e| panic!("Failed to run migration {}: {}", name, e));

            sqlx::query("INSERT INTO _migrations (name) VALUES (?)")
                .bind(name)
                .execute(pool)
                .await
                .unwrap_or_else(|e| panic!("Failed to record migration {}: {}", name, e));

            println!("Applied migration: {}", name);
        }
    }

    println!("Migrations up to date");
}
