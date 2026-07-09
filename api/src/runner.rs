use std::process::Stdio;
use tempfile::TempDir;
use tokio::process::Command;

const CARGO_TARGET_DIR: &str = "/app/cargo-target";

pub struct RunResult {
    pub success: bool,
    pub output: String,
}

pub async fn run_code(code: &str, requires_test: bool) -> Result<RunResult, String> {
    let temp_dir = TempDir::new().map_err(|e| e.to_string())?;
    let project_path = temp_dir.path();

    // All exercises use an identical Cargo.toml so cargo can reuse
    // the compiled artefacts from the shared target directory.
    let cargo_toml = r#"[package]
name = "rustlings_exercise"
version = "0.1.0"
edition = "2021"
"#;
    tokio::fs::write(project_path.join("Cargo.toml"), cargo_toml)
        .await
        .map_err(|e| e.to_string())?;

    tokio::fs::create_dir(project_path.join("src"))
        .await
        .map_err(|e| e.to_string())?;

    if requires_test {
        // Test exercises: write src/lib.rs and run `cargo test`.
        tokio::fs::write(project_path.join("src/lib.rs"), code)
            .await
            .map_err(|e| e.to_string())?;

        let output = Command::new("cargo")
            .arg("test")
            .current_dir(project_path)
            .env("CARGO_TARGET_DIR", CARGO_TARGET_DIR)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| e.to_string())?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        Ok(RunResult {
            success: output.status.success(),
            output: format!("{}{}", stdout, stderr),
        })
    } else {
        tokio::fs::write(project_path.join("src/main.rs"), code)
            .await
            .map_err(|e| e.to_string())?;

        let output = Command::new("cargo")
            .arg("run")
            .current_dir(project_path)
            .env("CARGO_TARGET_DIR", CARGO_TARGET_DIR)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| e.to_string())?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);

        Ok(RunResult {
            success: output.status.success(),
            output: format!("{}{}", stdout, stderr),
        })
    }
}
