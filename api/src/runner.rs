use std::process::Stdio;
use tempfile::TempDir;
use tokio::process::Command;

pub struct RunResult {
    pub success: bool,
    pub output: String,
}

pub async fn run_code(code: &str, requires_test: bool) -> Result<RunResult, String> {
    let temp_dir = TempDir::new().map_err(|e| e.to_string())?;
    let project_path = temp_dir.path();

    // Create Cargo.toml
    let cargo_toml = r#"[package]
name = "rustlings_exercise"
version = "0.1.0"
edition = "2021"
"#;
    tokio::fs::write(project_path.join("Cargo.toml"), cargo_toml)
        .await
        .map_err(|e| e.to_string())?;

    // Create src directory
    tokio::fs::create_dir(project_path.join("src"))
        .await
        .map_err(|e| e.to_string())?;

    if requires_test {
        // For test exercises, write to src/lib.rs
        tokio::fs::write(project_path.join("src/lib.rs"), code)
            .await
            .map_err(|e| e.to_string())?;

        // Run cargo test
        let output = Command::new("cargo")
            .arg("test")
            .current_dir(project_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| e.to_string())?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        let combined = format!("{}{}", stdout, stderr);

        Ok(RunResult {
            success: output.status.success(),
            output: combined,
        })
    } else {
        // For run exercises, write to src/main.rs
        tokio::fs::write(project_path.join("src/main.rs"), code)
            .await
            .map_err(|e| e.to_string())?;

        // First cargo check
        let check_output = Command::new("cargo")
            .arg("check")
            .current_dir(project_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| e.to_string())?;

        if !check_output.status.success() {
            let stderr = String::from_utf8_lossy(&check_output.stderr);
            return Ok(RunResult {
                success: false,
                output: stderr.to_string(),
            });
        }

        // Then cargo run
        let output = Command::new("cargo")
            .arg("run")
            .current_dir(project_path)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .await
            .map_err(|e| e.to_string())?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        let combined = format!("{}{}", stdout, stderr);

        Ok(RunResult {
            success: output.status.success(),
            output: combined,
        })
    }
}
