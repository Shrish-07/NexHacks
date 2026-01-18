# IntelliCare AI 🧠🏥

AI-powered nursing monitoring dashboard with real-time event prioritization, compressed reasoning, and voice interaction.

## Tracks
- Healthcare
- Dev Tools
- LiveKit Sponsor
- The Token Company Sponsor

## What it does
IntelliCare reduces nurse cognitive overload by:
- Monitoring multiple rooms simultaneously
- Auto-promoting critical events
- Generating human-readable explanations
- Allowing hands-free voice interaction
- Using compression-first AI pipelines for efficiency

## Token Company Integration
All event reasoning is passed through bear-1 compression before LLM calls.
Result:
- ~50–60% fewer tokens
- Faster response time
- Lower inference cost

Compression is core to the system, not cosmetic.

## LiveKit Integration
LiveKit powers the voice-first interface:
- Nurses can ask: “What’s happening in Room 2?”
- Agent responds verbally
- Designed for hands-free clinical environments

## Demo
- Streamlit dashboard auto-generates events
- Feed promotion + explanations
- LiveKit agent responds to voice queries

## Why it matters
Nurses are overwhelmed. IntelliCare acts as an AI attention filter so humans only focus where care is needed most.

## Backend quickstart
- Create a virtualenv and install the dependencies: `pip install -r requirements.txt`.
- For terminal-only monitoring, run `python -m backend.app.cli` (uses your default webcam). Alerts stream in the console.
- To expose the REST API, start `uvicorn backend.app.main:app --reload`. Use `POST /monitor/start` to begin monitoring and `GET /alerts` to fetch the in-memory alert buffer.
- Configure thresholds via environment variables (prefix `INTELLICARE_`, e.g., `INTELLICARE_SEIZURE_MOTION_THRESHOLD`). Set `INTELLICARE_AUTO_START_MONITOR=true` to automatically begin monitoring when the API boots.

## Frontend deployment (Vercel-ready)
1. Host the backend on a long-running Node service (Render/Fly/Railway/Droplet) and set `ALLOWED_ORIGINS` to the eventual frontend domain (comma-separated).
2. Copy `frontend/.env.example` to `frontend/.env` and set:
   - `VITE_BACKEND_URL=https://your-backend-host`
   - (Optional) `VITE_BACKEND_WS_URL=wss://custom-websocket-host` if WebSockets live elsewhere.
3. From `frontend/`, run `npm install && npm run build`. Deploy the folder to Vercel (build = `npm run build`, output = `dist`).
4. Configure the same `VITE_BACKEND_*` values in the Vercel project settings so production builds point at the live backend.

## Patient monitor configuration
`monitor.html` now looks for the backend/WebSocket origin in several places (first match wins):
- `?backend=` query parameter.
- Global `window.MONITOR_CONFIG = { backendUrl, websocketUrl }` or the legacy `window.MONITOR_BACKEND_URL` / `window.MONITOR_WEBSOCKET_URL`.
- `<body data-backend-url="https://...">` or matching `<meta name="monitor-backend-url">`.

If nothing is provided it falls back to `http://localhost:3000`, so set one of the above when serving the monitor page in production.
