# FinPilot — Personal Finance Intelligence

<p align="center">
  <strong>AI-powered expense tracking and personal finance insights.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/AI-Groq-orange" alt="Groq AI">
  <img src="https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/Frontend-Vite-646CFF?logo=vite&logoColor=white" alt="Vite">
</p>

FinPilot is a personal finance application that uses AI to turn natural-language expense descriptions into structured transaction drafts. Users can review and edit the extracted details before confirming and saving them to their transaction ledger.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Configuration](#environment-configuration)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Security](#security)
- [Future Improvements](#future-improvements)

## Overview

Tracking everyday expenses manually can be time-consuming. FinPilot provides an AI-assisted workflow for capturing expenses, organizing transactions into categories, and viewing spending summaries.

For example, a user can enter:

> Spent ₹250 on lunch at Cafe Niloufer today.

The AI extracts transaction details and prepares a draft for the user to review. The transaction is saved only after the user confirms it.

## Features

### AI-Powered Expense Capture
- Accept expense descriptions in natural language.
- Extract amount, merchant, date, category, and note.
- Use Groq AI with the `openai/gpt-oss-20b` model.
- Flag missing information for user review.

### Review Before Saving
- Review extracted transaction details.
- Edit the amount, date, merchant, category, and note.
- Confirm the transaction before saving it.

### Transaction Ledger
- Store confirmed transactions in a database.
- View saved transactions and their details.
- Retrieve recent transactions through the API.

### Spending Summary
- Calculate total recorded spending.
- Count saved transactions.
- Group spending by category.
- Visualize category totals in the dashboard.

### Backend API
- FastAPI endpoints for extraction and transaction management.
- Pydantic request validation.
- CORS configuration for local frontend development.
- SQLite database support for local development.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React |
| Frontend tooling | Vite |
| UI icons | Lucide React |
| Backend | Python, FastAPI |
| AI provider | Groq API |
| AI model | `openai/gpt-oss-20b` |
| Database | SQLite |
| ORM | SQLAlchemy |
| Validation | Pydantic |
| Configuration | Python dotenv |

## Architecture

```text
User
  |
  v
React + Vite Frontend
  |
  | HTTP / JSON
  v
FastAPI Backend
  |
  +----------------------+
  |                      |
  v                      v
Groq AI API           SQLite Database
  |
  v
Structured Expense Draft
  |
  v
User Reviews and Confirms
  |
  v
FastAPI Saves Transaction
  |
  v
Updated Ledger and Summary
```

## Getting Started

### Prerequisites

Install the following:

- Python 3.10 or newer
- Node.js and npm
- Git
- A Groq API key

### 1. Clone the Repository

```bash
git clone https://github.com/Lakshith-P/FinPilot-Personal-Finance-Intelligence.git
cd FinPilot-Personal-Finance-Intelligence
```

### 2. Configure the Backend

```bash
cd backend
python -m venv .venv
```

On Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
python -m pip install -r requirements.txt
```

Create a `.env` file inside the `backend` folder.

### 3. Configure Environment Variables

Add the following to `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b
DATABASE_URL=sqlite:///./finpilot.db
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Get an API key from [Groq Console](https://console.groq.com/keys).

Do not commit your actual `.env` file or API key to GitHub.

### 4. Start the Backend

From the `backend` directory, run:

```bash
python -m uvicorn main:app --reload --port 8000
```

The API will be available at:

- API base: `http://localhost:8000`
- Interactive API documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

### 5. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### 6. Try an Expense

Enter an example such as:

```text
Spent ₹250 on lunch at Cafe Niloufer today
```

Then:

1. Click **Extract transaction**.
2. Review the AI-generated draft.
3. Correct any missing or inaccurate details.
4. Click **Confirm & save transaction**.
5. Check the transaction ledger and spending summary.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend status |
| POST | `/api/transactions/extract` | Extract an expense draft using AI |
| POST | `/api/transactions` | Save a confirmed transaction |
| GET | `/api/transactions` | Retrieve saved transactions |
| GET | `/api/summary` | Retrieve spending totals and category breakdown |

## Project Structure

```text
FinPilot-Personal-Finance-Intelligence/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   └── .env                 # Local only; not committed
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       └── style.css
├── .gitignore
└── README.md
```

## Security

- Keep API keys in environment variables.
- Never commit `.env` or credentials to a public repository.
- Validate AI-generated data before saving it.
- Require user confirmation before persisting extracted transactions.
- Use appropriate authentication and authorization before deploying for multiple users.

## Future Improvements

- Monthly budgets and budget alerts.
- Date-range filtering and monthly spending trends.
- Export transactions to CSV.
- Recurring expense detection.
- Search and filter the transaction ledger.
- User authentication and separate accounts.
- Deployment with a production database.

## Author

**Lakshith P**

GitHub: [@Lakshith-P](https://github.com/Lakshith-P)

Repository: [FinPilot-Personal-Finance-Intelligence](https://github.com/Lakshith-P/FinPilot-Personal-Finance-Intelligence)

---

*FinPilot is an AI-assisted personal finance project. Always review extracted transaction details for accuracy before saving.*
