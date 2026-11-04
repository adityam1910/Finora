# Finora: AI-Driven Recurring Payment and Subscription Management

Finora centralises every recurring payment (OTT plans, gym fees, EMIs, insurance premiums), **predicts renewal dates**, sends reminders, and uses machine learning to **flag subscriptions that are wasted spend** and estimate how much you could save.

B.Tech project, Department of Computer and Communication Engineering, School of Computing and Intelligent Systems, Manipal University Jaipur.

Live at https://finora-xi-ten.vercel.app

## Features
- Register / login with JWT authentication (PBKDF2 password hashing)
- Subscription CRUD, "mark as paid" (advances due date, logs transaction history), cancel tracking, shared-cost splitting
- **ML 1: Subscription detection.** TF-IDF + Logistic Regression classifies pasted emails/SMS; NLP extraction pulls service, amount, cycle and due date
- **ML 2: Renewal prediction.** Linear regression on inter-payment gaps, shrunk toward the nominal cycle, with a confidence score and calendar-aware date maths
- **ML 3: Cost-reduction model.** Gradient Boosting classifier scores waste probability from usage, cost per use, idle days, tenure, price rises, category and cost sharing; returns plain-language reasons, cheaper alternatives and estimated savings
- Rule-based overlap detection (e.g. two music services), 6-month spend forecast with and without suggested cuts
- Reminders at 3 days / 1 day / today (in-app bell and `scripts/send_reminders.py` for email)
- Privacy by design: manual entry always works, nothing is cancelled or paid automatically

## Stack
| Layer | Tech |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, Recharts |
| Backend | FastAPI, SQLAlchemy 2, Pydantic 2, PyJWT |
| ML | scikit-learn, NumPy, pandas |
| Database | SQLite by default; MySQL or PostgreSQL via `DATABASE_URL` |

## Architecture
```
Browser (Next.js)  --JWT/REST-->  FastAPI  -->  SQLAlchemy DB (users, subscriptions, payments)
                                     |-->  ML engine (detector, renewal regression, cost model)
                                     '-->  Reminder script (SMTP)
```

## Run locally (VS Code)
**Backend** (Python 3.10+)
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows   |   source .venv/bin/activate  (macOS/Linux)
pip install -r requirements.txt
copy .env.example .env          # cp on macOS/Linux
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs

**Frontend** (Node 20+), in a second terminal
```bash
cd frontend
npm install
copy .env.example .env.local    # cp on macOS/Linux
npm run dev
```
Open http://localhost:3000, create an account, then click **Load demo data** on the Overview.

**Tests and model metrics**
```bash
cd backend
pytest -q
python scripts/train_report.py   # prints measured accuracy/precision/recall for your report
```

## Deploy
1. **Backend on Render:** push to GitHub, then New > Blueprint, pick this repo (it reads `render.yaml`). Set `CORS_ORIGINS` to your Vercel URL. For data that survives redeploys, create a free Postgres database (Neon or Supabase), add `psycopg2-binary` to `requirements.txt`, and set `DATABASE_URL`.
2. **Frontend on Vercel:** import the repo, set Root Directory to `frontend`, add env var `NEXT_PUBLIC_API_URL` = your Render URL, deploy.
3. The first request after idle on Render's free tier takes about 30 seconds to wake. Open the API URL once before presenting.

## Honest notes on the ML
The models train at start-up on **synthetic data** (see `app/ml/detector.py` and `app/ml/cost_model.py`) because no labelled personal-finance dataset is public. The metrics reported are real measurements on a held-out split of that synthetic data, not real-world accuracy. To improve: collect anonymised real messages, replace `build_corpus()` / `build_dataset()`, and retrain.

## Project structure
```
backend/app/{main,models,schemas,auth,insights,seed}.py
backend/app/ml/{detector,renewal,cost_model,catalog}.py
backend/app/routers/{auth,subscriptions,ai}.py
backend/tests  backend/scripts
frontend/app/...  frontend/components  frontend/lib
```
