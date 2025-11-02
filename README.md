# ESCWA Chatbot — powered by Fanar and ABM (minimal)

This is a small demo chatbot that forwards chat messages to a Fanar LLM endpoint.

Files:
- `server.js` - minimal Node HTTP server + POST /api/chat
- `fanarAdapter.js` - single place to adapt calls to your Fanar API
- `public/` - static frontend (index.html + app.js)

Setup
1. Install Node 18+ (recommended for built-in fetch). For Node <18 install `node-fetch` and edit `fanarAdapter.js`.
2. Create a `.env` or set env vars. Example for PowerShell:

```powershell
# set env for current session
$env:FANAR_API_URL = 'https://your-fanar-endpoint.com/v1/generate'
$env:FANAR_API_KEY = 'your_api_key_optional'  # optional
$env:PORT = '3000'

# Quick local testing without a real Fanar endpoint: enable mock mode
$env:FANAR_MOCK = '1'
```

Notes on mock mode: if `FANAR_API_URL` is not provided and you set `FANAR_MOCK=1`, the adapter will return a simple mock response so you can test the frontend/server locally without calling a real LLM.

New interactive features
- Language selection: use the Language dropdown in the UI to pick English (`en`) or Arabic (`ar`). The selection is forwarded to the LLM adapter and to the ABM simulation.
- RAG toggle: enable `Use RAG` to indicate the adapter should perform Retrieval-Augmented Generation. The adapter will include `options.useRag` in the payload; update `fanarAdapter.js` to implement real RAG behavior when connected to your retrieval system.
- ABM simulation: after a policy is generated, click "Send to ABM" to run a mock agent-based simulation. The server exposes `/api/abm` which returns simple, deterministic narrative impacts per agent. Replace with a real ABM service or improve the simulation logic as needed.
  
- ABM target groups: the UI now includes an "Effects on" combobox next to the "Send to ABM" button. Options: `all`, `women`, `institutions`, `youths`, `unemployed`, `employed`. The selected value is sent to `/api/abm` as `targetGroup` and the mock simulation will filter and emphasize narratives for matching agents.

Run

```powershell
node server.js
```

Then open http://localhost:3000

Notes
- The adapter assumes a fairly generic JSON payload { messages } and tries to handle common response shapes. Edit `fanarAdapter.js` to match your Fanar provider's exact contract.
- This project purposely has no dependencies so it's easy to run. If your Node version lacks fetch, install `node-fetch` and uncomment the require in the adapter.
