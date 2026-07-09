use serde::{Deserialize, Serialize};

// -- Database row types --

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct User {
    pub id: String,
    pub username: String,
    pub name: Option<String>,
    pub password_hash: Option<String>,
    pub avatar: Option<String>,
    pub github_username: Option<String>,
    pub provider: String,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct Category {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub readme: String,
    pub order_index: i64,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize)]
pub struct Exercise {
    pub id: String,
    pub category_id: String,
    pub name: String,
    pub order_index: i64,
    pub starter_code: String,
    pub hint: String,
    pub solution: String,
    pub requires_test: bool,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct UserProgress {
    pub completed: bool,
    pub saved_code: Option<String>,
}

// -- Request types --

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub username: String,
    pub password: String,
    pub name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

#[derive(Debug, Deserialize)]
pub struct RunRequest {
    pub exercise_id: String,
    pub code: String, // base64 encoded
}

// -- Response types --

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub name: Option<String>,
    pub username: String,
    pub avatar: Option<String>,
    pub github_username: Option<String>,
    pub provider: String,
}

impl From<&User> for UserResponse {
    fn from(user: &User) -> Self {
        Self {
            id: user.id.clone(),
            name: user.name.clone(),
            username: user.username.clone(),
            avatar: user.avatar.clone(),
            github_username: user.github_username.clone(),
            provider: user.provider.clone(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct StreakStats {
    pub current_streak: i64,
    pub longest_streak: i64,
    pub total_active_days: i64,
    pub start_date: Option<String>,
    /// All dates ("YYYY-MM-DD") on which the user completed at least one exercise.
    /// Used by the frontend to render the activity grid.
    pub active_days: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct MeResponse {
    pub user: UserResponse,
    pub rustlings_progress: ProgressStats,
    pub streak: StreakStats,
}

#[derive(Debug, Serialize)]
pub struct ProgressStats {
    pub total_exercises: i64,
    pub completed: i64,
    pub percentage: i64,
}

#[derive(Debug, Serialize)]
pub struct CategoryListItem {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub order_index: i64,
    pub total_exercises: i64,
    pub completed_exercises: i64,
}

#[derive(Debug, Serialize)]
pub struct CategoryDetailResponse {
    pub id: String,
    pub slug: String,
    pub name: String,
    pub readme: String,
    pub order_index: i64,
    pub exercises: Vec<ExerciseWithProgress>,
}

#[derive(Debug, Serialize)]
pub struct ExerciseWithProgress {
    pub id: String,
    pub name: String,
    pub order_index: i64,
    pub starter_code: String,
    pub hint: String,
    pub solution: String,
    pub requires_test: bool,
    pub completed: bool,
    pub saved_code: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct RunResponse {
    pub success: bool,
    pub output: String,
    pub completed: bool,
}
