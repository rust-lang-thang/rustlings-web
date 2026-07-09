mod auth;
mod db;
mod github;
mod handlers;
mod models;
mod runner;
mod sync;

use axum::{
    middleware,
    routing::{get, post},
    Router,
};
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() {
    let args: Vec<String> = std::env::args().collect();
    let command = args.get(1).map(|s| s.as_str());

    let pool = db::init_pool("sqlite:rustlings.db").await;

    match command {
        Some("sync") => {
            println!("Starting exercise sync from GitHub...");
            match sync::sync_from_github(&pool).await {
                Ok(stats) => println!("Sync successful: {}", stats),
                Err(e) => {
                    eprintln!("Sync failed: {}", e);
                    std::process::exit(1);
                }
            }
        }
        Some("serve") | None => {
            let app = Router::new()
                // Auth routes (no auth required)
                .route("/auth/register", post(handlers::auth::register))
                .route("/auth/login", post(handlers::auth::login))
                // Protected routes
                .route("/user/me", get(handlers::user::me))
                .route("/user/change-password", post(handlers::auth::change_password))
                .route(
                    "/rustlings/categories",
                    get(handlers::rustlings::list_categories),
                )
                .route(
                    "/rustlings/categories/{slug}",
                    get(handlers::rustlings::get_category),
                )
                .route("/rustlings/run", post(handlers::rustlings::run_code))
                .layer(middleware::from_fn(auth::auth_middleware))
                .layer(CorsLayer::permissive())
                .with_state(pool);

            let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
                .await
                .expect("Failed to bind to port 3000");

            println!("Server running on http://localhost:3000");

            axum::serve(listener, app)
                .await
                .expect("Server failed");
        }
        Some(other) => {
            eprintln!("Unknown command: {}", other);
            eprintln!("Usage: rustlings_api [serve|sync]");
            std::process::exit(1);
        }
    }
}
