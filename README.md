# Sourcyn - AI Procurement & Vendor Intelligence Platform

Sourcyn is a multi-agent procurement intelligence platform powered by LangGraph, FastAPI, and React.

## Key Capabilities
- **Requirement Analysis**: Natural-language specification extraction and clarification loops.
- **Quotation Ingestion & Provenance**: PDF parsing with coordinate-level evidence tracking.
- **Deterministic Scoring**: Mathematically rigorous, reproducible multi-criteria ranking.
- **What-If Scenario Simulation**: Side-by-side evaluation of cost spikes, delays, and risk variations against immutable baselines.
- **Human-in-the-Loop Governance**: Approval checkpoint gating before purchase order commitment.
- **Saved Intake Drafts**: Requirement intake fields are saved locally and restored after a page refresh.
- **Scenario Studio Presets & Simulation Export**: Quick-load stress-test simulation presets (inflation surge, mission-critical SLA, risk shield), reset-to-baseline controls, and downloadable differential report dossiers.

## Architecture & Implementation Roadmap
See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for complete engineering blueprints.

## Local Infrastructure
```bash
docker compose up -d
```
Starts:
- PostgreSQL 16 (port 5432) with `pgvector`
- Redis 7 (port 6379)
- MinIO (S3 API: port 9000, Web Console: port 9001)

## Backend Setup
```bash
cd backend
uv venv --python 3.12 .venv
source .venv/bin/activate
uv pip install -e ".[dev]"
pytest
uvicorn app.main:app --reload
```

## Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
