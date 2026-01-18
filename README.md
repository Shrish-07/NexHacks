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
