use flate2::read::GzDecoder;
use serde::Deserialize;
use std::collections::HashMap;
use std::io::Read;
use tar::Archive;

/// Raw exercise entry from info.toml
#[derive(Debug, Deserialize)]
struct InfoToml {
    exercises: Vec<ExerciseEntry>,
}

#[derive(Debug, Deserialize)]
struct ExerciseEntry {
    name: String,
    dir: String,
    #[serde(default)]
    test: bool,
    #[serde(default)]
    hint: String,
}

/// Parsed exercise data ready for DB insertion
#[derive(Debug, Clone)]
pub struct ParsedExercise {
    pub name: String,
    pub dir: String,
    pub requires_test: bool,
    pub hint: String,
    pub starter_code: String,
    pub solution: String,
}

/// Parsed category derived from exercise dirs
#[derive(Debug, Clone)]
pub struct ParsedCategory {
    pub dir: String,
    pub name: String,
    pub order_index: i64,
}

/// Result of fetching and parsing the rustlings repo
pub struct FetchResult {
    pub categories: Vec<ParsedCategory>,
    pub exercises: Vec<ParsedExercise>,
    pub commit_sha: Option<String>,
}

/// Fetch the latest rustlings tarball from GitHub and parse all exercise data.
pub async fn fetch_rustlings() -> Result<FetchResult, String> {
    println!("Fetching rustlings tarball from GitHub...");

    let client = reqwest::Client::builder()
        .user_agent("rustlings-api-sync")
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|e| format!("Failed to build HTTP client: {}", e))?;

    // Download tarball - GitHub redirects to a URL containing the commit SHA
    let response = client
        .get("https://api.github.com/repos/rust-lang/rustlings/tarball/main")
        .send()
        .await
        .map_err(|e| format!("Failed to fetch tarball: {}", e))?;

    if !response.status().is_success() {
        return Err(format!(
            "GitHub API returned status {}",
            response.status()
        ));
    }

    // Extract commit SHA from the final redirect URL
    let commit_sha = response
        .url()
        .path_segments()
        .and_then(|segments| segments.last())
        .and_then(|s| s.strip_suffix(".tar.gz"))
        .map(|s| {
            // URL looks like /rust-lang-rustlings-{sha}/...
            s.rsplit('-').next().unwrap_or(s).to_string()
        });

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to download tarball: {}", e))?;

    println!(
        "Downloaded {} bytes, extracting...",
        bytes.len()
    );

    // Decompress and parse
    let decoder = GzDecoder::new(&bytes[..]);
    let mut archive = Archive::new(decoder);

    let mut info_toml_content: Option<String> = None;
    let mut exercise_files: HashMap<String, String> = HashMap::new(); // "dir/name.rs" -> content
    let mut solution_files: HashMap<String, String> = HashMap::new(); // "dir/name.rs" -> content

    for entry in archive
        .entries()
        .map_err(|e| format!("Failed to read tar entries: {}", e))?
    {
        let mut entry = entry.map_err(|e| format!("Failed to read tar entry: {}", e))?;
        let path = entry
            .path()
            .map_err(|e| format!("Failed to read entry path: {}", e))?
            .to_string_lossy()
            .to_string();

        // The tarball has a top-level dir like "rust-lang-rustlings-abc1234/"
        // We need:
        //   rustlings-macros/info.toml
        //   exercises/{dir}/{name}.rs
        //   solutions/{dir}/{name}.rs
        if path.ends_with("rustlings-macros/info.toml") {
            let mut content = String::new();
            entry
                .read_to_string(&mut content)
                .map_err(|e| format!("Failed to read info.toml: {}", e))?;
            info_toml_content = Some(content);
        } else if let Some(exercises_path) = path
            .find("/exercises/")
            .map(|i| &path[i + "/exercises/".len()..])
        {
            if exercises_path.ends_with(".rs") {
                let mut content = String::new();
                entry
                    .read_to_string(&mut content)
                    .map_err(|e| format!("Failed to read exercise file: {}", e))?;
                exercise_files.insert(exercises_path.to_string(), content);
            }
        } else if let Some(solutions_path) = path
            .find("/solutions/")
            .map(|i| &path[i + "/solutions/".len()..])
        {
            if solutions_path.ends_with(".rs") {
                let mut content = String::new();
                entry
                    .read_to_string(&mut content)
                    .map_err(|e| format!("Failed to read solution file: {}", e))?;
                solution_files.insert(solutions_path.to_string(), content);
            }
        }
    }

    let info_toml = info_toml_content.ok_or("info.toml not found in tarball")?;

    println!(
        "Found info.toml, {} exercise files, {} solution files",
        exercise_files.len(),
        solution_files.len()
    );

    // Parse info.toml
    let info: InfoToml =
        toml::from_str(&info_toml).map_err(|e| format!("Failed to parse info.toml: {}", e))?;

    // Build categories from unique dirs
    let mut seen_dirs: HashMap<String, ParsedCategory> = HashMap::new();
    for ex in &info.exercises {
        if !seen_dirs.contains_key(&ex.dir) {
            let order_index = ex
                .dir
                .split('_')
                .next()
                .and_then(|s| s.parse::<i64>().ok())
                .unwrap_or(99);

            let name = ex
                .dir
                .split('_')
                .skip(1)
                .collect::<Vec<_>>()
                .join(" ");

            // Title case
            let name = name
                .split_whitespace()
                .map(|w| {
                    let mut chars = w.chars();
                    match chars.next() {
                        None => String::new(),
                        Some(c) => {
                            c.to_uppercase().to_string() + &chars.as_str().to_lowercase()
                        }
                    }
                })
                .collect::<Vec<_>>()
                .join(" ");

            let name = if name.is_empty() {
                ex.dir.clone()
            } else {
                name
            };

            seen_dirs.insert(
                ex.dir.clone(),
                ParsedCategory {
                    dir: ex.dir.clone(),
                    name,
                    order_index,
                },
            );
        }
    }

    let mut categories: Vec<ParsedCategory> = seen_dirs.into_values().collect();
    categories.sort_by_key(|c| c.order_index);

    // Build exercises with starter code and solutions
    let mut exercises: Vec<ParsedExercise> = Vec::new();
    for ex in &info.exercises {
        let file_key = format!("{}/{}.rs", ex.dir, ex.name);
        let starter_code = exercise_files
            .get(&file_key)
            .cloned()
            .unwrap_or_default();
        let solution = solution_files
            .get(&file_key)
            .cloned()
            .unwrap_or_default();

        if starter_code.is_empty() {
            eprintln!("Warning: no source file found for {}", file_key);
        }
        if solution.is_empty() {
            eprintln!("Warning: no solution file found for {}", file_key);
        }

        exercises.push(ParsedExercise {
            name: ex.name.clone(),
            dir: ex.dir.clone(),
            requires_test: ex.test,
            hint: ex.hint.clone(),
            starter_code,
            solution,
        });
    }

    println!(
        "Parsed {} categories, {} exercises",
        categories.len(),
        exercises.len()
    );

    Ok(FetchResult {
        categories,
        exercises,
        commit_sha,
    })
}
