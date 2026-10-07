# ModelOps AI

**From data to production — a complete machine learning lifecycle.**

An end-to-end MLOps platform around a customer-churn model: data validation, reproducible training,
experiment tracking, a model registry with promotion gates and rollback, a prediction API, drift
monitoring and a retraining trigger.

> **Status: Phase 1 of 16 (project foundation).**
> Implemented: serving backend skeleton (config, structured logs with request IDs, error format,
> `/health` and `/ready`), PostgreSQL connection, Alembic migrations, React health page, Docker.
> Everything else (dataset, validation, training, MLflow, registry, prediction, monitoring, drift,
> retraining, CI/CD) is **NOT IMPLEMENTED YET**. See [architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md).

Python 3.11.9, Node.js 24.x, Docker Desktop.

## Quick start (Windows PowerShell)

Run all of these from the **project root** (the folder containing `docker-compose.yml`):

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }   # then edit the password in .env (2 places)
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
docker compose up -d db
.venv\Scripts\python.exe -m alembic -c backend\alembic.ini upgrade head
.venv\Scripts\python.exe -m pytest tests -v
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --reload-dir backend --app-dir backend --host 127.0.0.1 --port 8000
```

Frontend, in a second terminal inside `frontend`:

```powershell
npm.cmd install
npm.cmd run dev
```

- API health: http://127.0.0.1:8000/health
- API docs: http://127.0.0.1:8000/docs
- UI: http://localhost:5173

Everything in Docker instead: `docker compose up --build` from the project root.
