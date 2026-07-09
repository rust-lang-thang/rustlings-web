# Rustlings API

Local API server for rustlings exercises.
Syncs content from [rust-lang/rustlings](https://github.com/rust-lang/rustlings), stores progress per user in SQLite.

## Quick Start

```bash
# Build
cargo build

# Sync exercises from GitHub
cargo run -- sync

# Start server on port 3000
cargo run -- serve
```

### Register and log in

```bash
# Create account
curl -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username": "huy", "password": "pass123"}'

# Returns { "token": "...", "user": { ... } }
# Use the token for all other requests:
TOKEN="<paste token here>"
```

### Use the API

```bash
# Your profile + progress
curl http://localhost:3000/user/me -H "Authorization: Bearer $TOKEN"

# List categories
curl http://localhost:3000/rustlings/categories -H "Authorization: Bearer $TOKEN"

# Get exercises in a category
curl http://localhost:3000/rustlings/categories/01_variables -H "Authorization: Bearer $TOKEN"

# Run code (base64-encoded)
curl -X POST http://localhost:3000/rustlings/run \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"exercise_id": "variables1", "code": "'$(echo -n 'fn main() { let x = 5; println!("{x}"); }' | base64)'"}'
```
