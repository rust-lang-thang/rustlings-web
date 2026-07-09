# rustlings-web

A full-stack web app for [rustlings](https://github.com/rust-lang/rustlings) exercises.
It lets users browse exercise categories, write Rust code in the browser, run it, and track their progress.

## Structure

```
rustlings-web/
├── api/     # Rust backend (Axum, SQLite, JWT auth)
└── ui/      # Next.js frontend (React 19, Monaco editor, Tailwind CSS)
```

## Getting started

### Prerequisites

- [Rust](https://rustup.rs) (stable toolchain)
- [Node.js](https://nodejs.org) 18 or later and npm

### 1. Clone the repo

```bash
git clone https://github.com/rust-lang-thang/rustlings-web.git
cd rustlings-web
```

### 2. First-time setup

This installs npm dependencies and syncs exercise data from the upstream rustlings repository into a local SQLite database.
It will take a minute on the first run as it compiles the API and downloads exercise content from GitHub.

```bash
make setup
```

### 3. Start the app

```bash
make dev
```

This starts both services in parallel:

| Service | URL |
|---------|-----|
| UI | http://localhost:3001 |
| API | http://localhost:3000 |

Open http://localhost:3001, register an account, and start solving exercises.

---

### Individual commands

```bash
make api     # start just the API
make ui      # start just the UI
make sync    # re-sync exercises from GitHub
make clean   # remove build artifacts and the local database
```

Run `make help` for the full list.
