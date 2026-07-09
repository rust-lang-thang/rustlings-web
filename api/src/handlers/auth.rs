use axum::{extract::State, http::{HeaderMap, StatusCode}, Json};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::auth::{create_token, extract_user_id, hash_password, verify_password};
use crate::models::{AuthResponse, ChangePasswordRequest, LoginRequest, RegisterRequest, UserResponse};

pub async fn register(
    State(pool): State<SqlitePool>,
    Json(body): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    // Check if username already exists
    let existing: Option<(String,)> =
        sqlx::query_as("SELECT id FROM users WHERE username = ?")
            .bind(&body.username)
            .fetch_optional(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if existing.is_some() {
        return Err((
            StatusCode::CONFLICT,
            "Username already taken".to_string(),
        ));
    }

    let id = Uuid::new_v4().to_string();
    let password_hash = hash_password(&body.password)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    sqlx::query(
        "INSERT INTO users (id, username, name, password_hash, provider) VALUES (?, ?, ?, ?, 'email')",
    )
    .bind(&id)
    .bind(&body.username)
    .bind(&body.name)
    .bind(&password_hash)
    .execute(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let token = create_token(&id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthResponse {
        token,
        user: UserResponse {
            id,
            name: body.name,
            username: body.username,
            avatar: None,
            github_username: None,
            provider: "email".to_string(),
        },
    }))
}

pub async fn login(
    State(pool): State<SqlitePool>,
    Json(body): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, String)> {
    let user: crate::models::User =
        sqlx::query_as("SELECT id, username, name, password_hash, avatar, github_username, provider FROM users WHERE username = ?")
            .bind(&body.username)
            .fetch_optional(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or((StatusCode::UNAUTHORIZED, "Invalid credentials".to_string()))?;

    let password_hash = user
        .password_hash
        .as_ref()
        .ok_or((StatusCode::UNAUTHORIZED, "Invalid credentials".to_string()))?;

    let valid = verify_password(&body.password, password_hash)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !valid {
        return Err((StatusCode::UNAUTHORIZED, "Invalid credentials".to_string()));
    }

    let token = create_token(&user.id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(AuthResponse {
        token,
        user: UserResponse::from(&user),
    }))
}

pub async fn change_password(
    State(pool): State<SqlitePool>,
    headers: HeaderMap,
    Json(body): Json<ChangePasswordRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    let user_id = extract_user_id(&headers).map_err(|s| (s, "Unauthorized".to_string()))?;

    let user: crate::models::User =
        sqlx::query_as("SELECT id, username, name, password_hash, avatar, github_username, provider FROM users WHERE id = ?")
            .bind(&user_id)
            .fetch_optional(&pool)
            .await
            .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
            .ok_or((StatusCode::NOT_FOUND, "User not found".to_string()))?;

    let password_hash = user
        .password_hash
        .as_ref()
        .ok_or((StatusCode::BAD_REQUEST, "Account does not use password authentication".to_string()))?;

    let valid = verify_password(&body.current_password, password_hash)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    if !valid {
        return Err((StatusCode::UNAUTHORIZED, "Current password is incorrect".to_string()));
    }

    let new_hash = hash_password(&body.new_password)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    sqlx::query("UPDATE users SET password_hash = ? WHERE id = ?")
        .bind(&new_hash)
        .bind(&user_id)
        .execute(&pool)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}
