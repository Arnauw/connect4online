# Connect4Online

A modern, hybrid Connect 4 implementation featuring offline play, a Minimax-based AI bot, real-time multiplayer capabilities using Mercure, and a Cyberpunk Neon UI.

## 🚀 The Tech Stack

**Frontend:**
*   **Framework:** React (via Vite)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS (Neon/Dark Theme)
*   **Routing:** React Router (HashRouter)
*   **State:** React Context API + Hooks + Web Workers (for AI)

**Backend:**
*   **Framework:** Symfony 8.0 (Latest WebApp Pack)
*   **Real-time:** Mercure Hub (Server-Sent Events)
*   **Database:** PostgreSQL
*   **Auth:** JWT (LexikJWTAuthenticationBundle v3.2+)
*   **ORM:** Doctrine

**Infrastructure (Docker):**
*   **DB:** PostgreSQL (Port 5432)
*   **Real-time:** Mercure (Public Port 9090 / Internal 80)
*   **Mail:** Mailpit (Port 8025 GUI / 1025 SMTP)
*   **DB GUI:** Adminer (Port 8080)

---

## 📂 Project Structure

This project uses a monorepo-style structure:

*   `frontend/` - The React application (Vite).
*   `backend/` - The Symfony API and Game Server.
*   `package.json` - Root scripts to manage both simultaneously.

---

## ⚡ Quick Start

### 1. Initial Setup (Run Once)

Before running the app for the first time, you need to set up the cryptographic keys for JWT authentication and the database schema.

```bash
# Install dependencies
pnpm install
cd backend && composer install

# Generate JWT Keys (Required for Login)
cd backend
symfony console lexik:jwt:generate-keypair

# Start Docker Containers
cd ..
pnpm docker

# Create Database & Schema
cd backend
symfony console doctrine:database:create
symfony console doctrine:migrations:migrate
```

### 2. Run the App

Use the unified command to start Docker, Symfony, and Vite all at once:

```bash
# Runs everything
pnpm all
```

*   **Frontend:** `http://localhost:5173`
*   **Backend API:** `http://127.0.0.1:8000`
*   **Adminer (DB GUI):** `http://localhost:8080` (Server: `database`, User: `my_app_user`, Pass: `MySuperSecretPassword123`)
*   **Mailpit:** `http://localhost:8025`
*   **Mercure Hub:** `http://localhost:9090/.well-known/mercure/ui/`

---

## 📜 Command Reference (`package.json`)

We have configured custom scripts in the root `package.json` to make development faster.

| Command | Description |
| :--- | :--- |
| **`pnpm all`** | **The "Start Button".** Starts Docker containers (detached) and then runs Frontend + Backend servers. |
| `pnpm docker` | Starts the Docker infrastructure (Postgres, Mercure, Adminer, Mailpit). |
| `pnpm dockerS` | Stops all Docker containers. |
| `pnpm dockerDel` | **NUCLEAR OPTION.** Stops containers and **deletes data volumes**. Use this if the DB password gets out of sync. |
| `pnpm both` | Runs Frontend and Backend servers concurrently (without starting Docker). |
| `pnpm front` | Runs only the React Dev Server. |
| `pnpm back` | Runs only the Symfony Server (`--no-tls`). |
| `pnpm messenger` | Consumes the async message queue (for background tasks). |

---

## ⚙️ Configuration (`.env`)

The backend configuration is organized by bundle. Ensure your variables are defined **before** they are used in connection strings (like `DATABASE_URL`) so Docker parses them correctly.

**Location:** `backend/.env`

### 1. Database (Doctrine)
We define the Postgres credentials here and use them immediately in the URL.

```dotenv
###> doctrine/doctrine-bundle ###
POSTGRES_DB="connect4online"
POSTGRES_USER="my_app_user"
POSTGRES_PASSWORD="MySuperSecretPassword123"
DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:5432/${POSTGRES_DB}?serverVersion=16&charset=utf8"
###< doctrine/doctrine-bundle ###
```

### 2. Real-Time (Mercure)
Configuration for both internal (Docker network) and public (Browser) access, plus the keys for the Hub.

```dotenv
###> symfony/mercure-bundle ###
# Internal URL (Docker Service Name)
MERCURE_URL="http://mercure/.well-known/mercure"
# Public URL (Localhost + Port 9090)
MERCURE_PUBLIC_URL="http://127.0.0.1:9090/.well-known/mercure"
# JWT Secrets
MERCURE_JWT_SECRET="!ChangeThisMercureHubJWTSecretKey!"
# Docker Variables for Publisher and Subscriber Keys
MERCURE_PUBLISHER_JWT_KEY="RealPublisherKey"
MERCURE_SUBSCRIBER_JWT_KEY="RealSubscriberKey"
###< symfony/mercure-bundle ###
```

### 3. Mailer (Mailpit)
Configured to use the local Docker Mailpit service on port 1025.

```dotenv
MAILER_DSN="smtp://localhost:1025"
```

### 4. Security & CORS
JWT passphrase and CORS rules to allow the frontend to communicate with the API.

```dotenv
JWT_PASSPHRASE="MySuperSecretPassphraseChangeMe!"
CORS_ALLOW_ORIGIN="^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$"
```

---

## 📅 Development Roadmap

**Phase 1: Setup**
- [x] Initialize Vite + React project
- [x] Initialize Symfony 8.0 WebApp
- [x] Configure Monorepo structure

**Phase 2: Core Game Logic (Offline)**
- [x] Pure JS Game Logic (Connect4 class)
- [x] Win Detection Algorithm (Horizontal, Vertical, Diagonal)
- [x] Draw Detection

**Phase 3: UI & UX**
- [x] Cyberpunk / Neon Theme Implementation
- [x] Responsive Game Board
- [x] React Router Navigation (Menu, 1P, 2P)
- [x] Asset Integration (Sounds, SVGs)

**Phase 4: The Bot**
- [x] Web Worker Architecture (Background Threads)
- [x] Random Bot Implementation (Proof of Concept)
- [ ] *Future: Minimax Algorithm*

**Phase 5: Backend & Infrastructure (Current)**
- [x] Docker Infrastructure (Postgres, Mercure, Adminer)
- [x] Database Configuration & User Entity
- [x] JWT Authentication Setup
- [ ] API Controllers (Auth, Game Creation)
- [ ] Real-time Game Sync