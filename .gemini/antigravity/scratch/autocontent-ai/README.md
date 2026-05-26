# AutoContent AI — Lightweight Agentic AI Content Automation System

AutoContent AI is a lightweight, full-stack, autonomous content posting platform designed to run on a student laptop. It automatically gathers trending tech headlines from RSS feeds, scrapes the source text, processes it using Gemini's free tier, and publishes SEO-optimized blogs to a database, visualizable on a modern React administration dashboard.

The system implements a custom, framework-free **Agentic AI Architecture** where multiple specialized agents run sequentially to complete tasks.

---

## 🚀 Key Features

* **Sequential Agentic Workflow**:
  1. **Topic Fetch Agent**: Retrieves links and details from standard RSS feeds.
  2. **Research Agent**: Scrapes and cleans article text, falling back to RSS descriptions on blocks.
  3. **Content Generator Agent**: Invokes the **Gemini 1.5/2.5 Flash** model with a structured output schema.
  4. **Publishing Agent**: Checks database for duplicate URLs, validates structure, and stores as a draft in MongoDB.
* **Modern SaaS Admin Dashboard**: Visualizes agent pipeline progression in real-time.
* **AI Article Rewrite**: Dynamic button triggers Gemini to rewrite and improve articles.
* **Resilient Mock Fallback**: The backend runs out-of-the-box using simulated blog outputs even if Gemini API keys are omitted.

---

## 🛠️ Technology Stack

* **Frontend**: React.js, Tailwind CSS, Axios, Lucide Icons, React Router DOM
* **Backend**: FastAPI (Python), Motor (async MongoDB driver), Pydantic v2
* **Database**: MongoDB Atlas Free Tier / Local MongoDB Community Server
* **AI/LLM**: Gemini 1.5/2.5 Flash (Google Generative AI SDK)
* **Utilities**: Beautiful Soup 4, Feedparser, HTTPX

---

## 📁 Folder Structure

```text
autocontent-ai/
│
├── backend/
│   ├── app/
│   │   ├── main.py                     # Entry point & API routers
│   │   ├── config.py                   # Configuration Settings Loader
│   │   ├── database/
│   │   │   ├── connection.py           # Async Motor MongoDB connection
│   │   │   └── models.py               # Pydantic schemas (Post, PostUpdate)
│   │   ├── routes/
│   │   │   ├── posts.py                # CRUD Endpoints & AI Rewrite route
│   │   │   └── agents.py               # Pipeline trigger route
│   │   ├── services/
│   │   │   ├── news_service.py         # RSS parsing service
│   │   │   └── ai_service.py           # Gemini API client wrapper
│   │   └── agents/
│   │       ├── topic_fetch_agent.py    # Agent 1: Sourcing topics
│   │       ├── research_agent.py       # Agent 2: Scraping URLs
│   │       ├── content_generator_agent.py # Agent 3: Writing content via Gemini
│   │       ├── publishing_agent.py     # Agent 4: Storing in Database
│   │       └── pipeline.py             # Sequential pipeline coordinator
│   ├── requirements.txt                # Python dependencies
│   └── .env                            # API keys & DB configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx             # Left navigation layout
│   │   │   ├── Navbar.jsx              # Global header layout
│   │   │   ├── PostCard.jsx            # Dynamic post item display
│   │   │   └── AnalyticsCard.jsx       # Quick statistics metrics widget
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx           # Dashboard containing console logs
│   │   │   ├── SocialFeed.jsx          # Premium Articles Feed (landing page)
│   │   │   └── PostDetails.jsx         # Reader view, edits & AI Rewrite actions
│   │   ├── services/
│   │   │   └── api.js                  # Axios configuration
│   │   ├── App.jsx                     # Route mappings
│   │   └── main.jsx                    # React bootstrap entry
│   ├── package.json                    # Node dependencies
│   ├── tailwind.config.js              # Tailwind styles
│   └── vite.config.js                  # Vite compiler config
└── README.md                           # Documentation
```

---

## ⚙️ Environment Setup

### 1. MongoDB Database Setup
* **MongoDB Atlas (Free)**: Sign up at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas/signup). Create a free shared cluster, add a database user with read/write access, and whitelist `0.0.0.0/0` under Network Access. Copy the connection string.
* **Local MongoDB**: Ensure you have MongoDB running locally (`mongodb://localhost:27017/autocontent`).

### 2. Gemini API Setup
* Visit [Google AI Studio](https://aistudio.google.com/) and create a free API Key.

### 3. Backend Configuration
Create a `.env` file under the `/backend` directory. Fill in your keys:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/autocontent
GEMINI_API_KEY=AIzaSy...YourActualGeminiKey...
RSS_FEEDS=https://techcrunch.com/feed/,https://news.ycombinator.com/rss
PORT=8000
```
*Note: If `GEMINI_API_KEY` is not set or left as placeholder, the system runs in resilient Mock Mode to generate simulated blog posts automatically.*

---

## 🏃 Running the Application Locally

### Step 1: Start the Backend API
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python requirements:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   *Verify backend is active at [http://localhost:8000](http://localhost:8000) or check the Swagger docs at [http://localhost:8000/docs](http://localhost:8000/docs).*

### Step 2: Start the Frontend Client
1. Open a new terminal tab, navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch Vite dev server:
   ```bash
   npm run dev
   ```
    *Open http://localhost:5173 in your web browser to access the Articles Feed directly, and navigate to /dashboard for the agentic Control Panel.*

---

## ☁️ Deployment Instructions

### Frontend (Vercel - Free Tier)
1. Sign up on [Vercel](https://vercel.com).
2. Connect your Git repository.
3. Configure the Root Directory to `frontend`.
4. Ensure Build Command is `npm run build` and Output Directory is `dist`.
5. Deploy!

### Backend (Render - Free Instance)
1. Sign up on [Render](https://render.com).
2. Create a new **Web Service**.
3. Select your repository, and set Root Directory to `backend`.
4. Run commands:
   * **Build Command**: `pip install -r requirements.txt`
   * **Start Command**: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment variables**, set `MONGODB_URI` and `GEMINI_API_KEY`. Set `PORT` to `8000`.

### Database (MongoDB Atlas)
Your Atlas instance stays in the cloud. Remember to change the backend `.env` production variables to reference the Atlas connection string.
