use axum::{extract::State, http::HeaderMap, http::StatusCode, Json};
use sqlx::SqlitePool;

use crate::auth::extract_user_id;
use crate::models::{MeResponse, ProgressStats, User, UserResponse};

pub async fn me(
    State(pool): State<SqlitePool>,
    headers: HeaderMap,
) -> Result<Json<MeResponse>, (StatusCode, String)> {
    let user_id = extract_user_id(&headers)
        .map_err(|s| (s, "Unauthorized".to_string()))?;

    let user: User = sqlx::query_as("SELECT id, username, name, password_hash, avatar, github_username, provider FROM users WHERE id = ?")
        .bind(&user_id)
        .fetch_one(&pool)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;

    let total_exercises: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM exercises WHERE active = TRUE")
            .fetch_one(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let completed: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM user_progress up \
         JOIN exercises e ON up.exercise_id = e.id \
         WHERE up.user_id = ? AND up.completed = TRUE AND e.active = TRUE",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let total = total_exercises.0;
    let done = completed.0;
    let percentage = if total > 0 {
        (done * 100) / total
    } else {
        0
    };

    Ok(Json(MeResponse {
        user: UserResponse::from(&user),
        rustlings_progress: ProgressStats {
            total_exercises: total,
            completed: done,
            percentage,
        },
    }))
}
