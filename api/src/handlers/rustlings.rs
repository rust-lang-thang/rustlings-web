use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    Json,
};
use sqlx::SqlitePool;

use crate::auth::extract_user_id;
use crate::models::{
    Category, CategoryDetailResponse, CategoryListItem, Exercise, ExerciseWithProgress,
    RunRequest, RunResponse, UserProgress,
};
use crate::runner;

pub async fn list_categories(
    State(pool): State<SqlitePool>,
    headers: HeaderMap,
) -> Result<Json<Vec<CategoryListItem>>, (StatusCode, String)> {
    let user_id = extract_user_id(&headers)
        .map_err(|s| (s, "Unauthorized".to_string()))?;

    let categories: Vec<Category> =
        sqlx::query_as("SELECT id, slug, name, readme, order_index FROM categories WHERE active = TRUE ORDER BY order_index")
            .fetch_all(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut result = Vec::new();
    for cat in &categories {
        let total: (i64,) =
            sqlx::query_as("SELECT COUNT(*) FROM exercises WHERE category_id = ? AND active = TRUE")
                .bind(&cat.id)
                .fetch_one(&pool)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let completed: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM user_progress up \
             JOIN exercises e ON up.exercise_id = e.id \
             WHERE e.category_id = ? AND up.user_id = ? AND up.completed = TRUE",
        )
        .bind(&cat.id)
        .bind(&user_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        result.push(CategoryListItem {
            id: cat.id.clone(),
            slug: cat.slug.clone(),
            name: cat.name.clone(),
            order_index: cat.order_index,
            total_exercises: total.0,
            completed_exercises: completed.0,
        });
    }

    Ok(Json(result))
}

pub async fn get_category(
    State(pool): State<SqlitePool>,
    headers: HeaderMap,
    Path(slug): Path<String>,
) -> Result<Json<CategoryDetailResponse>, (StatusCode, String)> {
    let user_id = extract_user_id(&headers)
        .map_err(|s| (s, "Unauthorized".to_string()))?;

    let category: Category =
        sqlx::query_as("SELECT id, slug, name, readme, order_index FROM categories WHERE slug = ? AND active = TRUE")
            .bind(&slug)
            .fetch_optional(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or((StatusCode::NOT_FOUND, "Category not found".to_string()))?;

    let exercises: Vec<Exercise> = sqlx::query_as(
        "SELECT id, category_id, name, order_index, starter_code, hint, solution, requires_test \
         FROM exercises WHERE category_id = ? AND active = TRUE ORDER BY order_index",
    )
    .bind(&category.id)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let mut exercises_with_progress = Vec::new();
    for ex in &exercises {
        let progress: Option<UserProgress> = sqlx::query_as(
            "SELECT completed, saved_code FROM user_progress WHERE user_id = ? AND exercise_id = ?",
        )
        .bind(&user_id)
        .bind(&ex.id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        exercises_with_progress.push(ExerciseWithProgress {
            id: ex.id.clone(),
            name: ex.name.clone(),
            order_index: ex.order_index,
            starter_code: ex.starter_code.clone(),
            hint: ex.hint.clone(),
            solution: ex.solution.clone(),
            requires_test: ex.requires_test,
            completed: progress.as_ref().is_some_and(|p| p.completed),
            saved_code: progress.and_then(|p| p.saved_code),
        });
    }

    Ok(Json(CategoryDetailResponse {
        id: category.id,
        slug: category.slug,
        name: category.name,
        readme: category.readme,
        order_index: category.order_index,
        exercises: exercises_with_progress,
    }))
}

pub async fn run_code(
    State(pool): State<SqlitePool>,
    headers: HeaderMap,
    Json(body): Json<RunRequest>,
) -> Result<Json<RunResponse>, (StatusCode, String)> {
    let user_id = extract_user_id(&headers)
        .map_err(|s| (s, "Unauthorized".to_string()))?;

    // Get the exercise to check requires_test
    let exercise: Exercise = sqlx::query_as(
        "SELECT id, category_id, name, order_index, starter_code, hint, solution, requires_test \
         FROM exercises WHERE id = ?",
    )
        .bind(&body.exercise_id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .ok_or((StatusCode::NOT_FOUND, "Exercise not found".to_string()))?;

    // Decode base64 code
    let decoded_code = base64::Engine::decode(
        &base64::engine::general_purpose::STANDARD,
        &body.code,
    )
    .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid base64: {}", e)))?;

    let code = String::from_utf8(decoded_code)
        .map_err(|e| (StatusCode::BAD_REQUEST, format!("Invalid UTF-8: {}", e)))?;

    // Run the code
    let result = runner::run_code(&code, exercise.requires_test)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    // If successful, mark as completed and save code
    if result.success {
        sqlx::query(
            "INSERT INTO user_progress (user_id, exercise_id, completed, saved_code, completed_at) \
             VALUES (?, ?, TRUE, ?, datetime('now')) \
             ON CONFLICT(user_id, exercise_id) DO UPDATE SET \
             completed = TRUE, saved_code = excluded.saved_code, completed_at = excluded.completed_at",
        )
        .bind(&user_id)
        .bind(&body.exercise_id)
        .bind(&code)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    } else {
        // Save code even on failure (but don't mark completed)
        sqlx::query(
            "INSERT INTO user_progress (user_id, exercise_id, completed, saved_code) \
             VALUES (?, ?, FALSE, ?) \
             ON CONFLICT(user_id, exercise_id) DO UPDATE SET \
             saved_code = excluded.saved_code",
        )
        .bind(&user_id)
        .bind(&body.exercise_id)
        .bind(&code)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    }

    Ok(Json(RunResponse {
        success: result.success,
        output: result.output,
        completed: result.success,
    }))
}
