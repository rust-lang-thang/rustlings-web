use sqlx::SqlitePool;
use std::collections::HashSet;

use crate::github;

/// Sync exercises from the upstream rustlings repository into the local database.
/// - Upserts categories and exercises (insert new, update existing)
/// - Marks exercises no longer present upstream as inactive
/// - Preserves all user_progress data
pub async fn sync_from_github(pool: &SqlitePool) -> Result<SyncStats, String> {
    let data = github::fetch_rustlings().await?;

    let mut stats = SyncStats::default();

    // -- Upsert categories --
    for cat in &data.categories {
        let existing: Option<(String,)> =
            sqlx::query_as("SELECT id FROM categories WHERE slug = ?")
                .bind(&cat.dir)
                .fetch_optional(pool)
                .await
                .map_err(|e| e.to_string())?;

        if existing.is_some() {
            sqlx::query(
                "UPDATE categories SET name = ?, order_index = ?, active = TRUE WHERE slug = ?",
            )
            .bind(&cat.name)
            .bind(cat.order_index)
            .bind(&cat.dir)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
            stats.categories_updated += 1;
        } else {
            sqlx::query(
                "INSERT INTO categories (id, slug, name, readme, order_index, active) \
                 VALUES (?, ?, ?, ?, ?, TRUE)",
            )
            .bind(&cat.dir) // use dir as id
            .bind(&cat.dir)
            .bind(&cat.name)
            .bind(format!("Learn about {} in Rust.", cat.name.to_lowercase()))
            .bind(cat.order_index)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
            stats.categories_added += 1;
        }
    }

    // -- Upsert exercises --
    // Track which exercise names we've seen so we can deactivate the rest
    let mut seen_exercise_names: HashSet<String> = HashSet::new();
    let mut order_in_category: std::collections::HashMap<String, i64> = std::collections::HashMap::new();

    for ex in &data.exercises {
        seen_exercise_names.insert(ex.name.clone());

        let order_index = order_in_category
            .entry(ex.dir.clone())
            .or_insert(0);
        let current_order = *order_index;
        *order_index += 1;

        let existing: Option<(String,)> =
            sqlx::query_as("SELECT id FROM exercises WHERE id = ?")
                .bind(&ex.name)
                .fetch_optional(pool)
                .await
                .map_err(|e| e.to_string())?;

        if existing.is_some() {
            sqlx::query(
                "UPDATE exercises SET \
                 category_id = ?, name = ?, order_index = ?, \
                 starter_code = ?, hint = ?, solution = ?, requires_test = ?, active = TRUE \
                 WHERE id = ?",
            )
            .bind(&ex.dir)
            .bind(&ex.name)
            .bind(current_order)
            .bind(&ex.starter_code)
            .bind(&ex.hint)
            .bind(&ex.solution)
            .bind(ex.requires_test)
            .bind(&ex.name) // WHERE id
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
            stats.exercises_updated += 1;
        } else {
            sqlx::query(
                "INSERT INTO exercises (id, category_id, name, order_index, starter_code, hint, solution, requires_test, active) \
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)",
            )
            .bind(&ex.name) // use name as id
            .bind(&ex.dir)
            .bind(&ex.name)
            .bind(current_order)
            .bind(&ex.starter_code)
            .bind(&ex.hint)
            .bind(&ex.solution)
            .bind(ex.requires_test)
            .execute(pool)
            .await
            .map_err(|e| e.to_string())?;
            stats.exercises_added += 1;
        }
    }

    // -- Deactivate exercises no longer in upstream --
    let all_exercises: Vec<(String,)> =
        sqlx::query_as("SELECT id FROM exercises WHERE active = TRUE")
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?;

    for (id,) in &all_exercises {
        if !seen_exercise_names.contains(id) {
            sqlx::query("UPDATE exercises SET active = FALSE WHERE id = ?")
                .bind(id)
                .execute(pool)
                .await
                .map_err(|e| e.to_string())?;
            stats.exercises_deactivated += 1;
        }
    }

    // Deactivate categories with no active exercises
    let upstream_dirs: HashSet<&str> = data.categories.iter().map(|c| c.dir.as_str()).collect();
    let all_categories: Vec<(String,)> =
        sqlx::query_as("SELECT slug FROM categories WHERE active = TRUE")
            .fetch_all(pool)
            .await
            .map_err(|e| e.to_string())?;

    for (slug,) in &all_categories {
        if !upstream_dirs.contains(slug.as_str()) {
            sqlx::query("UPDATE categories SET active = FALSE WHERE slug = ?")
                .bind(slug)
                .execute(pool)
                .await
                .map_err(|e| e.to_string())?;
        }
    }

    // -- Log the sync --
    sqlx::query(
        "INSERT INTO sync_log (commit_sha, categories_added, categories_updated, exercises_added, exercises_updated, exercises_deactivated) \
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(&data.commit_sha)
    .bind(stats.categories_added)
    .bind(stats.categories_updated)
    .bind(stats.exercises_added)
    .bind(stats.exercises_updated)
    .bind(stats.exercises_deactivated)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;

    println!("Sync complete: {}", stats);

    Ok(stats)
}

#[derive(Debug, Default)]
pub struct SyncStats {
    pub categories_added: i64,
    pub categories_updated: i64,
    pub exercises_added: i64,
    pub exercises_updated: i64,
    pub exercises_deactivated: i64,
}

impl std::fmt::Display for SyncStats {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "categories +{}/~{}, exercises +{}/~{}/-{}",
            self.categories_added,
            self.categories_updated,
            self.exercises_added,
            self.exercises_updated,
            self.exercises_deactivated,
        )
    }
}
