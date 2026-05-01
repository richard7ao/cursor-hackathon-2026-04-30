# MiFIR Rejection Remediation Engine

**Autonomous regulatory feedback pipeline that transforms FCA rejection data into actionable remediation workflows in seconds.**

Built at the Cursor x Briefcase Hackathon, April 2026.

---

## The Problem

When financial institutions submit MiFID II / MiFIR transaction reports to the FCA, rejections are returned as cryptic XML feedback files with terse error codes. A single large bank can generate thousands of rejections daily. Each one must be:

1. Parsed and decoded from raw regulator feedback
2. Traced back to the original submitted report
3. Cross-referenced against GLEIF for LEI validity
4. Linked to the internal trade registry and client account
5. Routed to the correct relationship manager
6. Diagnosed with a root cause and remediation path
7. Communicated to the client with a compliant, actionable email

Firms do this manually. It takes hours per batch. Miss the resubmission window and you're in regulatory breach.

**This engine does it in one click.**

---

## Architecture

```
                         Upload XML/CSV
                              |
                    +---------v---------+
                    |   FCA XML Parser  |    CSV Rejection Loader
                    |  (fast-xml-parser)|    (csv-parse/sync)
                    +---------+---------+
                              |
                    +---------v---------+
                    |  Enrichment Layer |
                    |                   |
                    |  Submitted Reports ----> Transaction match
                    |  Trade Registry   ----> Client account link
                    |  GLEIF LEI DB     ----> LEI status lookup
                    |  RM Database      ----> Relationship manager
                    +---------+---------+
                              |
                    +---------v---------+
                    |  Diagnosis Engine  |
                    |                   |
                    |  Cursor SDK Agent ----> AI-powered analysis
                    |  Deterministic    ----> Rule-based fallback
                    +---------+---------+
                              |
                    +---------v---------+
                    |   Email Generator |
                    |                   |
                    |  Draft remediation emails per rejection
                    |  Route to correct RM with priority
                    +---------+---------+
                              |
                    +---------v---------+
                    |   React Frontend  |
                    |                   |
                    |  Upload zone, rejection cards,
                    |  tabbed modal (email + analysis),
                    |  approval workflow, CSV preview
                    +-------------------+
```

---

## Data Pipeline

The engine joins **6 data sources** across 4 enrichment dimensions:

| Source | Purpose | Join Key |
|--------|---------|----------|
| `fca_feedback_rejected_transactions.xml` | Raw FCA rejection feedback | `ReferenceNumber` |
| `reg_feedback_rejects.csv` | Parsed rejection records | `transaction_reference_number` |
| `submitted_mifir_reports.csv` | Original submitted reports | `transaction_reference_number` |
| `fxall_trade_registry.csv` | FXall venue trade registry | `venue_transaction_id` |
| `gleif_lei_snapshot.csv` | GLEIF LEI status database | `lei` |
| `relationship_management_database.csv` | RM routing table | `client_reference` |

Every rejection is enriched end-to-end: from a raw error code to the RM's email address, the LEI's renewal status, and a draft remediation email.

---

## Diagnosis Engine

**Dual-mode analysis:**

- **Cursor SDK Agent** -- Sends the full enriched rejection context to Claude via `@cursor/sdk` `Agent.prompt()`. Produces nuanced, context-aware root cause analysis with severity classification and remediation instructions.

- **Deterministic Fallback** -- Rule-based engine that pattern-matches on error codes (`LEIV001`, `LEIV002`), LEI status (`LAPSED`, `ANNULLED`, `RETIRED`), and field validation. Handles 100% of known FCA rejection patterns with zero latency.

Both paths produce identical output structures: severity rating, root cause, recommended fix, actioner assignment, regulatory deadline, and a draft email.

---

## Frontend

React + Tailwind v4 with a purpose-built compliance workflow:

- **Drag-and-drop upload** -- XML or CSV, detected automatically
- **Rejection cards** -- Severity-coded with RM name and LEI status badges
- **Center-stage modal** with two tabs:
  - **Email** -- Editable subject and body, priority badge, approve/escalate/reject actions
  - **Analysis** -- AI diagnosis, FCA feedback detail, LEI status, submitted report, trade registry, RM info
- **CSV Preview** -- Expandable accordion showing all 5 source data files as rendered tables
- **Approval workflow** -- One-click approve & send, escalate, or reject with audit timestamps

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 25 / Bun 1.3 |
| Backend | TypeScript, native HTTP server |
| AI Agent | `@cursor/sdk` with Claude Sonnet 4.6 |
| XML Parsing | `fast-xml-parser` |
| CSV Parsing | `csv-parse/sync` |
| Frontend | React 19, Vite 6, Tailwind CSS v4 |
| Icons | Lucide React |
| API Format | JSON REST with CORS |

---

## Quick Start

```bash
# Install dependencies
bun install
cd frontend && bun install && cd ..

# Set your Cursor API key
echo "CURSOR_API_KEY=crsr_your_key_here" > .env

# Start the API server
node --env-file=.env --import tsx dev-server.ts

# Start the frontend (separate terminal)
cd frontend && bun dev
```

Open `http://localhost:5173`, upload `data/fca_feedback_rejected_transactions.xml` or `data/reg_feedback_rejects.csv`, and hit **Run with AI Agent**.

---

## Project Structure

```
.
├── data/                    # Source datasets (XML + 5 CSVs)
├── lib/
│   ├── types.ts             # Shared TypeScript interfaces
│   ├── parsers/
│   │   ├── fca-xml-parser.ts    # FCA XML feedback parser
│   │   ├── csv-loader.ts        # CSV loaders for all 5 data sources
│   │   └── __tests__/
│   ├── enrichment/
│   │   ├── join-engine.ts       # Multi-source data enrichment
│   │   ├── lei-lookup.ts        # GLEIF LEI status resolver
│   │   └── __tests__/
│   └── agent/
│       ├── orchestrator.ts      # Cursor SDK agent + fallback
│       ├── prompts.ts           # System prompt + user prompt builder
│       ├── tools.ts             # Response parser + email generator
│       └── __tests__/
├── frontend/
│   └── src/components/
│       ├── DocumentAnalyzer.tsx  # Main application component
│       ├── Header.tsx            # Navigation header
│       └── Layout.tsx            # Page layout shell
├── api/                     # Vercel serverless endpoints
├── dev-server.ts            # Local development server
└── .env                     # Cursor API key (not committed)
```

---

## Regulatory Context

This engine targets **MiFID II / MiFIR** transaction reporting under the **UK FCA** regime. The specific rejection codes handled:

- **LEIV001** -- Invalid LEI: status is LAPSED (entity failed to renew)
- **LEIV002** -- Invalid LEI: status is ANNULLED/RETIRED (entity permanently removed)

The engine is designed to extend to the full FCA rejection code taxonomy, EMIR derivatives reporting, and cross-regime validation (EU ESMA, SEC Rule 10c-1).

---

*Built with the Cursor SDK and Claude.*
