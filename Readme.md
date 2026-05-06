# Remdex

**MiFIR Trade Rejection Remediation Platform**

Remdex ingests FCA feedback XML and enriches rejected MiFIR transaction reports with trade registry, LEI, and relationship manager data. An AI agent pipeline analyzes each rejection, diagnoses the root cause, and recommends a fix — approve, amend, or escalate.

## How It Works

1. **Ingest** — Upload FCA feedback XML containing rejected transaction reports
2. **Enrich** — Cross-reference rejections against the trade registry, LEI snapshot, and relationship management database
3. **Analyze** — AI agent orchestrator diagnoses each rejection and recommends remediation
4. **Review** — Approve, amend, or escalate each rejection through the dashboard

## Stack

- **Frontend:** Vite + React + TypeScript
- **API:** Vercel Serverless Functions (TypeScript)
- **AI:** OpenAI via Cursor SDK for rejection analysis
- **Data:** CSV/XML parsers, in-memory join engine

---

*Built for the [Cursor AI Hackathon](https://cursor.com) (April 2026).*
