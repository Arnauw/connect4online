# Connect4Online

A modern, hybrid Connect 4 implementation featuring offline play, a Web Worker-based AI bot, real-time online multiplayer via Mercure SSE, user accounts with email verification, and a Cyberpunk Neon UI.

---

## 🚀 Tech Stack

**Frontend:**
| | |
|---|---|
| Framework | React 19 (via Vite 7) |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 4 (Neon/Dark Theme) |
| Routing | React Router 7 (HashRouter) |
| State | React Context API + Hooks |
| HTTP | Axios (with JWT interceptor + auto-refresh) |
| Real-time | Mercure SSE (EventSource) |
| AI | Web Worker (background thread, no UI blocking) |

**Backend:**
| | |
|---|---|
| Framework | Symfony 8.0 |
| Language | PHP >= 8.4 |
| Real-time | Mercure Hub (Server-Sent Events) |
| Database | PostgreSQL 16 + Doctrine ORM |
| Auth | JWT (LexikJWTAuthenticationBundle) + Refresh Tokens (GesdinetJWTRefreshTokenBundle) |
| Email Verification | SymfonyCasts VerifyEmailBundle |
| Password Reset | SymfonyCasts ResetPasswordBundle |
| File Uploads | VichUploaderBundle (avatar images) |
| Mailer | Symfony Mailer + Mailpit (dev) |

**Infrastructure (Docker):**
| Service | Host Port |
|---|---|
| PostgreSQL | 5433 |
| Mercure Hub | 9090 |
| Mailpit GUI | 8025 |
| Mailpit SMTP | 1025 |
| Adminer (DB GUI) | 8080 |

---

## ✨ Features

- **Offline Play** — Local 2-player and vs Bot modes, game state survives page refresh
- **AI Bot** — Web Worker-based bot running in a background thread
- **User Accounts** — Registration, email verification, login, password reset
- **Avatar Upload** — Upload/delete custom avatar images (JPEG, PNG, WEBP, max 10MB, auto-resized to 500px)
- **User Settings** — Theme, music, SFX, volume — saved per account or guest (localStorage)
- **Online Multiplayer** — Create/join rooms via 6-character code, real-time via Mercure SSE
- **Game Features** — Move validation server-side, win/draw detection, score tracking, rematch system, forfeit handling
- **Auto-cleanup** — Rooms inactive for 1h or older than 48h are auto-deleted via console command
- **Security** — Server-side input validation, avatar deep MIME validation, JWT with 1h TTL + refresh tokens

---

## 📂 Project Structure

```
connect4online/
├── frontend/        # React + Vite application
├── backend/         # Symfony 8 API
└── package.json     # Root scripts to manage both simultaneously
```

---

## ⚡ Quick Start

### 1. Prerequisites

- Node.js + pnpm
- PHP >= 8.4 + Composer
- Docker + Docker Compose
- Symfony CLI

### 2. Install Dependencies

```bash
pnpm installAll
```

### 3. Environment Setup (Run Once)

```bash
# Generate JWT keypair (required for authentication)
cd backend
symfony console lexik:jwt:generate-keypair
cd ..
```

### 4. Start Docker Infrastructure

```bash
pnpm docker
```

### 5. Create Database & Run Migrations

```bash
cd backend
symfony console doctrine:database:create
symfony console doctrine:migrations:migrate
cd ..
```

### 6. Run the App

```bash
pnpm all
```

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend API | `http://127.0.0.1:8000` |
| Adminer (DB GUI) | `http://localhost:8080` — Server: `database`, User: `my_app_user`, Pass: `MySuperSecretPassword123` |
| Mailpit (Email) | `http://localhost:8025` |
| Mercure Hub UI | `http://localhost:9090/.well-known/mercure/ui/` |

---

## 📜 Command Reference

| Command | Description |
|:---|:---|
| **`pnpm all`** | **Start everything.** Starts Docker + Frontend + Backend simultaneously. |
| `pnpm both` | Runs Frontend and Backend servers only (no Docker). |
| `pnpm front` | Runs only the React dev server. |
| `pnpm back` | Runs only the Symfony server (`--no-tls`). |
| `pnpm docker` | Starts Docker infrastructure (Postgres, Mercure, Adminer, Mailpit). |
| `pnpm dockerStop` | Stops all Docker containers. |
| `pnpm dockerDel` | **NUCLEAR.** Stops containers and deletes all data volumes. |
| `pnpm installAll` | Installs all frontend (pnpm) and backend (composer) dependencies. |
| `pnpm clear` | Clears the Symfony cache. |
| `pnpm messenger` | Consumes the async Messenger queue. |
| `pnpm clean-rooms` | Deletes stale game rooms (inactive >1h or created >48h ago). |
| `pnpm back-test` | Runs the PHP test suite (PHPUnit). |

---

## ⚙️ Configuration

All backend configuration lives in `backend/.env`. Override locally with `backend/.env.local` (not committed).

### Database

```dotenv
POSTGRES_DB="connect4online"
POSTGRES_USER="my_app_user"
POSTGRES_PASSWORD="MySuperSecretPassword123"
POSTGRES_PORT=5433
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${POSTGRES_PORT}/${POSTGRES_DB}?serverVersion=16&charset=utf8"
```

### Mercure (Real-time)

```dotenv
MERCURE_URL="http://127.0.0.1:9090/.well-known/mercure"
MERCURE_PUBLIC_URL="http://127.0.0.1:9090/.well-known/mercure"
MERCURE_JWT_SECRET="!ChangeThisMercureHubJWTSecretKey!"
MERCURE_PUBLISHER_JWT_KEY="${MERCURE_JWT_SECRET}"
MERCURE_SUBSCRIBER_JWT_KEY="${MERCURE_JWT_SECRET}"
```

### Mailer

```dotenv
MAILER_DSN="smtp://localhost:1025"
MAILER_FROM_EMAIL="no-reply@gmail.com"
MAILER_FROM_NAME="Connect 4 Online"
MAILER_REG_FROM_EMAIL="registration@gmail.com"
MAILER_REG_FROM_NAME="Connect 4 Online Registration"
```


### JWT & Security

```dotenv
JWT_SECRET_KEY="%kernel.project_dir%/config/jwt/private.pem"
JWT_PUBLIC_KEY="%kernel.project_dir%/config/jwt/public.pem"
JWT_PASSPHRASE="MySuperSecretPassphraseChangeMe!"
CORS_ALLOW_ORIGIN="^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$"
```

### Frontend (`frontend/.env`)

```dotenv
VITE_API_URL=http://127.0.0.1:8000
VITE_MERCURE_URL=http://127.0.0.1:9090
```

---

## 🔄 Stale Room Cleanup

Game rooms are automatically cleaned up by the console command:

```bash
pnpm clean-rooms
```

Deletion rules:
- **Inactive > 1 hour** — no move, join, or rematch activity
- **Created > 48 hours ago** — regardless of activity

Set up a cron to run automatically every 15 minutes:

```
*/15 * * * * cd /path/to/backend && php bin/console app:cleanup-stale-games >> /var/log/cleanup-games.log 2>&1
```

---

## 📅 Development Roadmap

**Phase 1: Setup**
- [x] Vite + React + TypeScript project
- [x] Symfony 8.0 backend
- [x] Monorepo structure with unified pnpm scripts
- [x] Docker infrastructure (Postgres, Mercure, Adminer, Mailpit)

**Phase 2: Core Game Logic**
- [x] Connect4 game class (pure TypeScript)
- [x] Win detection (horizontal, vertical, diagonal)
- [x] Draw detection

**Phase 3: UI & UX**
- [x] Cyberpunk / Neon theme
- [x] Responsive game board
- [x] React Router navigation
- [x] Sound effects (drop, win, loss, draw)
- [x] Settings (theme, music, SFX, volume)

**Phase 4: AI Bot**
- [x] Web Worker architecture (non-blocking background thread)
- [x] Bot implementation
- [ ] *Future: Minimax with alpha-beta pruning*

**Phase 5: Backend & Auth**
- [x] User entity + registration
- [x] Email verification (SymfonyCasts)
- [x] JWT authentication + refresh tokens
- [x] Password reset flow
- [x] User settings persistence
- [x] Avatar upload with validation + auto-resize

**Phase 6: Online Multiplayer**
- [x] Game entity + room code generation
- [x] Create / join room endpoints
- [x] Server-side move validation
- [x] Win / draw / forfeit detection
- [x] Real-time sync via Mercure SSE
- [x] Rematch system (both players must accept)
- [x] Score tracking across rematches
- [x] Auto-redirect when opponent leaves (10s countdown)
- [x] Stale room cleanup command
