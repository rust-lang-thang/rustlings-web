use axum::{extract::State, http::HeaderMap, http::StatusCode, Json};
use chrono::{Duration, Local, NaiveDate};
use sqlx::SqlitePool;

use crate::auth::extract_user_id;
use crate::models::{MeResponse, ProgressStats, StreakStats, User, UserResponse};

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

    // Fetch all distinct dates (ASC) on which the user completed at least one exercise.
    let raw_dates: Vec<(String,)> = sqlx::query_as(
        "SELECT DISTINCT date(completed_at) AS d \
         FROM user_progress \
         WHERE user_id = ? AND completed = TRUE AND completed_at IS NOT NULL \
         ORDER BY d ASC",
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let active_days: Vec<String> = raw_dates.into_iter().map(|(d,)| d).collect();

    let streak = compute_streak(&active_days);

    Ok(Json(MeResponse {
        user: UserResponse::from(&user),
        rustlings_progress: ProgressStats {
            total_exercises: total,
            completed: done,
            percentage,
        },
        streak,
    }))
}

/// Derives streak statistics from a sorted (ASC) list of "YYYY-MM-DD" active date strings.
fn compute_streak(active_days: &[String]) -> StreakStats {
    let today = Local::now().date_naive();

    // Parse to NaiveDate, silently drop any malformed entries.
    let dates: Vec<NaiveDate> = active_days
        .iter()
        .filter_map(|s| NaiveDate::parse_from_str(s, "%Y-%m-%d").ok())
        .collect();

    let total_active_days = dates.len() as i64;
    let start_date = dates.first().map(|d| d.format("%Y-%m-%d").to_string());

    // --- longest streak ---
    let mut longest_streak = 0i64;
    let mut run = 0i64;
    let mut prev: Option<NaiveDate> = None;
    for &d in &dates {
        run = match prev {
            Some(p) if d == p + Duration::days(1) => run + 1,
            _ => 1,
        };
        if run > longest_streak {
            longest_streak = run;
        }
        prev = Some(d);
    }

    // --- current streak ---
    // A streak is still live if the user was active today *or* yesterday
    // (they haven't had a chance to miss today yet).
    let date_set: std::collections::HashSet<NaiveDate> = dates.iter().cloned().collect();
    let current_streak = {
        // Find the most recent anchor: today if active, else yesterday if active, else 0.
        let anchor = if date_set.contains(&today) {
            Some(today)
        } else if date_set.contains(&(today - Duration::days(1))) {
            Some(today - Duration::days(1))
        } else {
            None
        };

        match anchor {
            None => 0,
            Some(mut cursor) => {
                let mut count = 1i64;
                loop {
                    cursor -= Duration::days(1);
                    if date_set.contains(&cursor) {
                        count += 1;
                    } else {
                        break;
                    }
                }
                count
            }
        }
    };

    StreakStats {
        current_streak,
        longest_streak,
        total_active_days,
        start_date,
        active_days: active_days.to_vec(),
    }
}
