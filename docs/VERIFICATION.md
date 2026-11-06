# Integration verification

Verification date: **6 November 2026**. Source revisions are recorded in
[SOURCE_PROVENANCE.md](SOURCE_PROVENANCE.md). These are local checks, not production
certification or a new model evaluation.

## Passed

| Check | Observed result |
|---|---|
| Backend synchronization | `git pull --ff-only origin main`: already up to date |
| Frontend import | Main commit `617b796` cloned and integrated into the parent repository |
| Frontend translation parity | 259 EN/VI keys and 31 factor-label keys match |
| TypeScript | `tsc --noEmit` passes |
| Frontend unit tests | 27 tests pass across four files, including eight proxy tests |
| Production build | Next.js 14.2.35 build passes, including the dynamic API proxy |
| API unit tests | 11 tests pass using the existing Python 3.12 environment; inference is stubbed |
| Real API inference/report | Installed `legacy` artifact produces a prediction, five factors, and a template report |
| Product route HTTP checks | `/`, `/analyze`, `/variant-lab`, `/history`, `/insights` return 200 |
| Proxy health, prediction, report | All return 200 through the production Next.js server |
| Token boundary | Proxy succeeds with server credentials; direct unauthenticated backend prediction returns 401 |
| Expected compatibility gaps | Report-job and three optional marketing-analysis endpoints return 404 |
| Compose syntax | `docker compose --env-file .env.example -f docker-compose.yml config --quiet` passes |
| PowerShell helper syntax | All three helper scripts parse successfully |
| Git exclusions | Local environment files, node_modules, .next, and .local-analysis are ignored |
| Public build credential check | No configured server token found in generated public static files |

The real smoke-test input was an English EV post describing a tested 510 km range
and an eight-year battery warranty, evaluated for X with the `legacy` alias. The local
artifact returned score `0.104`, label `not-viral`, five factors, and a 391-character
template report. This demonstrates inference execution for that artifact/input; it
does not validate predictive accuracy, calibration, or generalization.

## Issues found and addressed

- Frontend previously called a hardcoded private-network address from the browser and
  did not forward the backend token. It now uses a same-origin server proxy.
- The existing local token contained non-ASCII characters, making it invalid in HTTP
  headers. A generated ASCII token was synchronized across local consumers. The original
  root environment file is preserved in an ignored backup; no token values are documented.
- A subsequent production build failed in Next.js's Google Fonts loader. External font
  fetching was removed in favor of system fonts; the final production build passes.
- Restricted sandbox processes encountered socket/build-output permission failures.
  The affected local checks were rerun with the required tool execution permissions.

## Not verified or not available

- Full Docker/Kafka/Spark/Airflow ingestion, reconciliation, and E2E runtime execution.
  Docker Desktop's Linux engine was not running during the initial inspection.
- A new training run, model benchmark, official v3 evaluation, or Stage-2 evaluation.
- Production deployment, remote server state, public hosting, or GitHub Actions execution.
- Real Ollama report generation and live external-source collection.
- Browser interaction/visual rendering; page checks above are HTTP checks.
- The `audience-x90` model: its default local artifact path is missing.
- Successful optional barrier/greenwashing/sentiment APIs: they are not implemented in
  the imported backend main branch.

Temporary local API and web servers used for HTTP verification are stopped after checks.
Use [RUNNING.md](RUNNING.md) to start your own development sessions.
