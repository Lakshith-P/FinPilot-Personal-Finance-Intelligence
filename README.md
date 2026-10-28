<<<<<<< HEAD
# FinPilot — Personal Finance Intelligence

FinPilot demonstrates the required flow:

**User input → AI extraction → schema-guided output → validation → backend API → database create → frontend confirmation**

## Features included
- Natural-language expense capture with Mistral AI.
- Pydantic schema validation and explicit missing-field flags.
- Editable draft preview; user confirmation is required before database writes.
- FastAPI endpoints for extraction, create, ledger, summary, and health.
- SQLAlchemy database layer: SQLite locally, PostgreSQL supported for deployment.
- Frontend dashboard, category totals, recent transactions, ledger, and request/error states.
- Basic validation/error handling for blank input, missing required values, malformed AI output, unavailable API key, failed requests, and database/API failures.

## Requirements
- Python 3.10+
- Node.js 18+
- Mistral API key

## Run locally

### 1. Start the backend
```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\\Scripts\\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env
```
Edit `backend/.env` and set `MISTRAL_API_KEY`. Keep this secret in the backend only; never add it to frontend environment variables or commit it to Git.

```bash
uvicorn main:app --reload --port 8000
```
Backend API docs: http://localhost:8000/docs

### 2. Start the frontend in a second terminal
```bash
cd frontend
npm install
npm run dev
```
Open the local URL printed by Vite, usually http://localhost:5173.

## API endpoints
- `GET /api/health` — health check
- `POST /api/transactions/extract` — AI extraction into a validated draft; does not save
- `POST /api/transactions` — validates and saves a confirmed transaction
- `GET /api/transactions` — list ledger records
- `GET /api/summary` — database-derived spending totals

Example extract request:
```json
{"text":"Spent ₹250 on lunch at Cafe Niloufer today"}
```

A missing amount/date/merchant is not silently invented. The draft is shown for correction. The backend's save endpoint validates the required values again.

## Deployment (compulsory requirement)
Deploy the backend and frontend separately, then connect the frontend to the backend. The deployment URLs must be configured with your actual provider URLs; no live deployment can be created without access to your hosting accounts.

### Backend
A simple option is Render or Railway:
- Root directory: `backend`
- Build/install: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Environment variables: `MISTRAL_API_KEY`, `MISTRAL_MODEL`, `DATABASE_URL`, `CORS_ORIGINS`
- Use a managed PostgreSQL database for persistent production data. Do not rely on an ephemeral local SQLite filesystem for production.
- Set `CORS_ORIGINS` to your deployed frontend origin.

### Frontend
A simple option is Vercel or Netlify:
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_URL=https://YOUR-BACKEND-DOMAIN`
- Redeploy after setting the environment variable.

After deployment:
1. Open `https://YOUR-BACKEND-DOMAIN/api/health`.
2. Confirm the deployed frontend shows “API connected”.
3. Add a test expense, review the draft, and confirm it.
4. Confirm the saved row and totals appear after refresh.
5. Test blank input and an incomplete expense such as “I bought something” to demonstrate validation/missing-field handling.

## Important limitations / next steps
- This is a prototype, not a banking application. It does not connect to bank accounts or execute payments.
- Add authentication and per-user data isolation before storing real personal financial data.
- For receipt uploads, implement OCR/document parsing and treat the extracted result as a draft requiring review.
- For savings goals and monthly recommendations, add separate schemas and endpoints. Never execute consequential changes based only on an AI summary.
=======
# FinPilot-Personal-Finance-Intelligence
>>>>>>> dbe106140910960fcc1f41e0a3ed2ec0351ff9cc
