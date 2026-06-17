# Loremex NRR Intelligence Assessment

Standalone web-based self-diagnostic for PE-backed B2B SaaS leaders. Top-of-funnel entry point for LoremexOne.

## Quick start (Windows + Claude Code)

```powershell
# 1. Clone or create the repo
cd G:\projects
git clone <repo-url> Loremex-Assessment   # or: mkdir Loremex-Assessment; cd Loremex-Assessment; git init

cd Loremex-Assessment

# 2. Drop the seed files (from this conversation's outputs) into the repo root:
#    - CLAUDE.md
#    - README.md (this file)
#    - rubric.json (will go into client/src/content/)
#    - PRD v1.2 docx (will go into docs/)
#    - export_rubric.py (will go into scripts/)
#    - Sprint_1_Plan.md, CTO_Decisions.md (will go into docs/)

# 3. Run the init script (creates folder structure + npm workspaces)
.\init.ps1

# 4. Open Claude Code in this folder
#    Claude Code will auto-load CLAUDE.md
claude-code .

# 5. Start with Sprint 1
#    First prompt to Claude Code:
#    "Read CLAUDE.md and docs/Sprint_1_Plan.md. Then scaffold the
#     monorepo per the file structure in CLAUDE.md. Begin with story S1.1."
```

## What's in this repo

- `client/` — React + Vite + TypeScript frontend (SSG landing + SPA assessment)
- `server/` — Express serverless functions for HubSpot + Resend
- `scripts/export_rubric.py` — Excel → rubric.json exporter (run when content changes)
- `docs/` — PRD, decisions log, sprint plan
- `client/src/content/rubric.json` — canonical assessment content (455 descriptors, 4 capabilities)

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite 5 + TypeScript 5 |
| Styling | Tailwind CSS v3 + brand tokens |
| State | React Context + Reducer + localStorage |
| Backend | Express 4 (Node 20) on Vercel serverless |
| PDF | jsPDF (client-side) |
| CRM | HubSpot |
| Email | Resend |
| Hosting | Vercel |
| Analytics | Vercel Analytics + Posthog |

## Local dev

```powershell
npm install
npm run dev        # starts client (5173) + server (3001) concurrently
npm run build      # builds client + server
npm run lint
npm run typecheck
npm run test
```

## Environment

Copy `.env.example` to `.env.local` and fill in:

```
VITE_HUBSPOT_PORTAL_ID=
VITE_HUBSPOT_FORM_ID=
HUBSPOT_API_KEY=
RESEND_API_KEY=
VITE_POSTHOG_KEY=
VITE_BASE_URL=http://localhost:5173
```

## Updating assessment content

The content is canonical in `NRR_Intelligence_Assessment.xlsx`. When you change it:

```powershell
# 1. Edit the Excel (or rubric_data_v9.py / build_v9.py)
# 2. Re-run the exporter
python scripts/export_rubric.py

# 3. Copy the new rubric.json into the client
copy rubric.json client/src/content/rubric.json

# 4. Re-test math against the reference cases in CLAUDE.md
npm run test
```

## Deploy

```powershell
# Vercel auto-deploys main on push. Always preview from staging first.
git checkout staging
git push
# Vercel preview URL appears in PR
# After review, merge staging into main with explicit approval
```

## Git rules

- Default branch: `main`. Working branch: `staging`.
- **No pushes to `main` without explicit approval from Laura.**
- `npm run build` must pass before every commit.
- Subagent for file edits and git ops: Freya (same as Loremex-Website repo).

## Documentation

Read in this order:
1. `CLAUDE.md` (you are reading this if you're Claude Code)
2. `docs/NRR_Intelligence_Assessment_PRD_v1.2.docx` (full spec)
3. `docs/CTO_Decisions.md` (resolved decisions)
4. `docs/Sprint_1_Plan.md` (what to build first)
