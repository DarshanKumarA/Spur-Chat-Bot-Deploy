# Spur Bot 🤖

A full-stack AI Customer Support Chatbot built for the "Founding Engineer" test.
It features a React frontend, Node.js/Express backend, SQLite persistence, and Redis caching.

## Features
- **AI-Powered:** Uses Google Gemini 2.5 Flash for intelligent, context-aware responses.
- **Persistent History:** Saves chats to SQLite (via Prisma) so context isn't lost on reload.
- **High Performance:** Implements the **Cache-Aside pattern** using Redis for instant history loading.
- **Robustness:** Gracefully handles network failures, API errors, and offline states.
- **Quick Actions:** Suggested questions for new sessions to improve UX.

---

## 🛠️ Prerequisites

Before running the project, make sure you have:
1. **Node.js** (v16 or higher)
2. **Redis** (Running on port 6379)
   - **Windows:** Use [Memurai](https://www.memurai.com/) (Developer Edition), while installing choose "Install as a WINDOWS SERVICE"
   - **Mac/Linux:** `brew install redis`
   - **Docker:** `docker run --name spur-redis -p 6379:6379 -d redis`
3. **Google Gemini API Key** (Get one from Google AI Studio).
4. **venv** (Virtual Environment) (Recommended for isolation)
---

## 📦 Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/DarshanKumarA/Spur-Bot.git     
```

### 2. Backend Setup
```bash
cd backend
npm install
```

**Create Environment Variables:** Create a `.env` file inside the `backend/` folder with the following:
```env
# Server Port
PORT=3000

# Database (SQLite)
DATABASE_URL="file:./dev.db"

# AI Provider (Google Gemini)
GEMINI_API_KEY=your_actual_api_key_here

# Redis Cache (Localhost)
REDIS_HOST=localhost
REDIS_PORT=6379
```

**Initialize Database:**
```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

---

## How to Run

You need to keep two terminals open to run the full stack.

**Terminal 1: Start Backend**
```bash
cd backend
npx tsx watch src/index.ts
```

Expected Output: `✅ Connected to Memurai (Redis)`

**Terminal 2: Start Frontend**
```bash
cd frontend
npm run dev
```

Then open http://localhost:5173 in your browser.

---

## 🗄️ How to View the Database

You can view and edit the SQLite database using **Prisma Studio**, a built-in graphical interface.

1.  Open a new terminal in the `backend` folder.
2.  Run the following command:
    ```bash
    npx prisma studio
    ```
3.  A new tab will open in your browser at [http://localhost:5555](http://localhost:5555).
    - Click **"Message"** to see all chat history.
    - Click **"Conversation"** to see session based conversations.

## 🧪 Tech Stack

**Frontend:**
- React (Vite)
- TypeScript
- Axios (API Calls)
- React Markdown (Rich text rendering)

**Backend:**
- Node.js & Express
- TypeScript
- Database: SQLite + Prisma ORM
- Caching: Redis + ioredis
- AI: Google Generative AI SDK (@google/generative-ai)

---

## Architecture Highlights

### 1. Cache Strategy
- Fetches history from Redis first (Cache Hit)
- If empty, fetches from DB and populates Redis (Cache Miss)
- Invalidates cache on every new message to ensure consistency

### 2. Error Handling
- Frontend detects offline status and server crashes
- Backend catches LLM failures and returns graceful fallback messages

---

## 🏗️ Architecture & Design Decisions

### 1. Backend Structure (Layered Architecture)
The backend follows a modular **Service-Oriented Architecture** to ensure separation of concerns:

- **📂 Routes (`src/routes/`)**: Handles HTTP requests and validation. It acts as the entry point (Controller layer).
- **🛠️ Services (`src/services/`)**: Contains core business logic isolated from routes.
    - `redis.ts`: Manages the caching connection.
    - `llm.ts`: Handles interactions with Google Gemini.
- **💾 Data Layer (`prisma/`)**: Uses **Prisma ORM** for type-safe database interactions with SQLite.

**Data Flow:**
`Request` → `Route` → `Redis Service` (Check Cache) → `Prisma` (Fetch DB) → `Response`

### 2. Key Design Decisions

#### ⚡ Redis Cache-Aside Pattern
**Problem:** Fetching chat history from the disk (SQLite) on every message/reload is slow and unscalable.
**Solution:** Implemented the **Cache-Aside** pattern.
- **Read:** Try Redis first. If missing, read DB and write to Redis.
- **Write:** Write to DB, then **Invalidate (Delete)** the Redis cache key.
- **Why?** This ensures data consistency (no stale caches) while providing <5ms read times for frequent access.

#### 🔄 Optimistic UI Updates (Frontend)
**Problem:** Waiting for the server/AI to reply makes the app feel sluggish.
**Solution:** The UI immediately adds the user's message to the chat window *before* the network request finishes.
- **Benefit:** Makes the app feel "instant" to the user, even on slower networks.

#### Robust Error Handling
**Problem:** Silent failures (e.g., user is offline, server crashes) lead to bad UX.
**Solution:**
- **Frontend:** Explicit checks for `navigator.onLine` and HTTP 500 errors.
- **Backend:** `try/catch` blocks wrap all external calls (LLM, Redis, DB). If the AI service fails, a fallback "System Delay" message is returned instead of crashing the server.

## 📝 Testing the Bot

To ensure the bot works correctly during assessment, test these scenarios:

### Basic Policy Questions
- "What is your shipping policy?"
- "How much does shipping cost?"
- "What countries do you ship to?"
- "How do I return an item?"
- "When will I get my refund?"

### Edge Cases
- "Do you ship to Australia?" (Should say no)
- "Can I return after 40 days?" (Should redirect to support)
- "Where is my order?" (Should say can't access order info)
- "Is this product in stock?" (Should redirect to website/support)

### Frustrated Customer
- "This is ridiculous! I need help NOW!" (Should acknowledge frustration and help)

### Unclear Questions
- "What about shipping?" (Should ask clarifying questions)

---

## 📧 Contact

For questions about this project, contact **support@spur.com** (fictional).

---

## 📄 License

This project is for assessment purposes only.