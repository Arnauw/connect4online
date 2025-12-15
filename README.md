# Connect4Online

A modern, hybrid Connect 4 implementation featuring offline play, a Minimax-based AI bot, and real-time multiplayer capabilities using Mercure.

## 🚀 The Tech Stack

**Frontend:**
*   **Framework:** React (via Vite)
*   **Language:** TypeScript
*   **Routing:** React Router (HashRouter)
*   **State:** React Context API + Hooks

**Backend:**
*   **Framework:** Symfony 8 (WebApp Pack)
*   **Real-time:** Mercure Hub
*   **Database:** MySQL / PostgreSQL
*   **ORM:** Doctrine

**Platforms (Planned):**
*   **Web:** VPS
*   **Mobile:** Capacitor
*   **Desktop:** Electron

---

## 📂 Project Structure

This project uses a monorepo-style structure:

*   `frontend/` - The React application (Vite).
*   `backend/` - The Symfony API and Game Server.

---

## 🛠 Setup & Installation

### Prerequisites
*   Node.js & pnpm
*   PHP 8.4+ & Composer
*   Symfony CLI

### 1. Frontend Setup
Navigate to the frontend directory to install dependencies and start the development server:

```bash
cd frontend
pnpm install
pnpm dev
```

*The frontend will typically run on `http://localhost:5173`.*

### 2. Backend Setup
Navigate to the backend directory to install PHP dependencies and start the Symfony server:

```bash
cd backend
composer install
symfony serve
```

*The backend API will typically run on `http://localhost:8000`.*

---

## 📅 Development Roadmap

**Phase 1: Setup (Current)**
- [x] Initialize Vite + React project
- [x] Initialize Symfony WebApp project
- [x] Configure Monorepo structure

**Phase 2: Core Game Logic (Offline)**
- [ ] Pure JS Game Logic (Connect4 class)
- [ ] UI Components & Animation
- [ ] Minimax Bot Implementation (Web Worker)

**Phase 3: Multiplayer & Infrastructure**
- [ ] Database Design (Game Entities)
- [ ] Mercure Hub Integration
- [ ] API Endpoints (Join/Move/Sync)
- [ ] Real-time React Hooks

**Phase 4: Wrappers & Polish**
- [ ] Capacitor (Mobile) Build
- [ ] Electron (Desktop) Build
- [ ] Deployment