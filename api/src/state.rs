use std::sync::Arc;

use axum::extract::FromRef;
use sqlx::SqlitePool;
use tokio::sync::Semaphore;

/// Maximum number of concurrent `cargo` child processes.
pub const MAX_CONCURRENT_RUNS: usize = 2;

#[derive(Clone)]
pub struct AppState {
    pub pool: SqlitePool,
    /// Semaphore that limits concurrent code-execution requests.
    pub run_semaphore: Arc<Semaphore>,
}

impl AppState {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            run_semaphore: Arc::new(Semaphore::new(MAX_CONCURRENT_RUNS)),
        }
    }
}

impl FromRef<AppState> for SqlitePool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}
