# EV Campaign Analyser frontend

Next.js App Router application for comparing proposed EV marketing content across
YouTube, X, and Reddit. It is part of the parent monorepo.

## Run from the repository root

```powershell
npm run setup:web
.\scripts\setup_local_web.ps1
# Terminal 1, after installing Python requirements:
.\scripts\start_api.ps1
# Terminal 2:
npm run dev:web
```

Open <http://127.0.0.1:3000>. See [the complete running guide](../docs/RUNNING.md).

## API boundary

```text
Browser -> Next.js /api/ai/* -> FastAPI -> model and report renderer
```

`lib/http.ts` handles browser transport; `lib/api.ts` exposes prediction, batch,
report polling, and optional analysis functions. `app/api/ai/[...path]/route.ts`
uses `lib/server/ai-proxy.ts` to forward allowed endpoints and attach credentials
on the server. The old `NEXT_PUBLIC_API_URL` variable is no longer used.

Copy `.env.local.example` to `.env.local`, or use the setup helper:

```dotenv
AI_SERVER_URL=http://127.0.0.1:8000
AI_SERVER_TOKEN=
```

The token must match the backend when authentication is enabled. Both variables
are server-only. Restart Next.js after changing them.

## Screens and limitations

| Route | Purpose |
|---|---|
| `/` | Introduction and illustrative example reports |
| `/analyze` | Cross-platform predictions, explanations, optional analysis, report |
| `/variant-lab` | Compare two to five text variants |
| `/history` | Browser-local history, search, reuse, deletion, CSV export |
| `/insights` | Static model descriptions and historical metrics |
| `/stage-2`, `/glossary` | Redirect home; not implemented product screens |

Existing English/Vietnamese UI support is retained. New developer documentation
is in English. System fonts make builds independent of Google Fonts downloads.

The imported backend supports `/health`, `/predict`, `/predict/batch`, `/report`.
Reports fall back to `/report` when the queue endpoint returns 404. The optional
`/barriers`, `/greenwashing`, and `/sentiment` endpoints are missing from backend
main; those cards show errors while primary reporting can continue.

Model selectors are not proof of installed weights. Insights values and landing
examples are not live evaluations. See [the overview](../docs/PROJECT_OVERVIEW.md).

## Validation and deployment

```powershell
npm run check:i18n
npm run typecheck
npm test
npm run build
npm start -- --hostname 127.0.0.1
```

CI lives at `../.github/workflows/frontend.yml`. For hosting, set the project root
to `frontend` and use a Node-capable Next.js runtime; static export cannot run the
proxy. The backend URL must be reachable from that hosting server. Its localhost
does not refer to your development computer. Application access controls are needed
before exposing a token-bearing proxy to untrusted users; a service token is not an
end-user login system.
