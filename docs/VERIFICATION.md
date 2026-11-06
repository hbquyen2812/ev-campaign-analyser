# Integration verification

Verification date: **6 November 2026**. Source revisions are recorded in
[SOURCE_PROVENANCE.md](SOURCE_PROVENANCE.md). This records local checks and the initial GitHub Actions investigation. It is not
production certification or a new model evaluation.

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
| Browser interaction | Sample campaign produced three platform scores and a template report; History saved it; Variant lab ranked two posts |
| Additional model availability | `audience-x90` returns 503 because its local model file is absent |
| MinIO source builds | Server and client compile from the pinned, checksum-verified official sources |
| Compose/CI/fixture regression checks | 12 focused tests pass; development, bundle, and E2E Compose configurations validate |
| Complete Docker E2E | Passes with the source-built MinIO images, including injected failure, restart, reconciliation, analytics, dataset export, and replay |
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

## GitHub Actions failure investigation

The first main-branch run for `07fa2cd` is
[Main Branch Validation #42186713184](https://github.com/hbquyen2812/ev-campaign-analyser/actions/runs/42186713184).
Frontend validation and the static-unit, contract, Spark, and Airflow jobs passed.
Only E2E failed, before it could execute the data pipeline, because Docker Hub
rejected `minio/mc:RELEASE.2025-08-13T08-35-41Z` with `pull access denied`.
This was an infrastructure-image retrieval failure, not a failed Git push.

The fix builds both MinIO releases from pinned official source with archive
checksums, wires the images into development/E2E/release Compose configurations,
and includes the build context in the Airflow image. Hidden E2E evidence is now
included in the Actions artifact upload. Git Bash also uses a suitable Python
executable and relative fixture paths compatible with native Windows Python.
See [the build notes](../deployment/minio/README.md).

## Full local pipeline result after the fix

`tests/e2e/run_pipeline_reliability_e2e.sh` completed with exit code 0 using the
isolated Compose project `codex-ci-verify-20261106` on Docker Desktop. The test
containers and their MinIO volume were removed by the test cleanup handler.

- The fixture contains 17 messages and 15 distinct valid events.
- After the intentional post-commit failure, the Bronze journal remained intact
  and its current projection was still empty. Restarting recovered the projection.
- Bronze/Silver reconciliation reported 15 journal events, 15 applied events,
  zero missing events, zero duplicates, and zero orphan applied events.
- Analytics produced 5 contents, 2 interactions, 3 transcripts, and 6 snapshots.
- Two dataset builds produced the same dataset version with 2 training examples.
- Replaying the complete fixture preserved these counts and passed reconciliation.
- The dashboard loader read 7 events, 5 contents, 3 transcripts, and 2 training examples
  before and after replay.

Detailed local evidence is retained in the ignored `tests/e2e/.artifacts/` directory.
The fixture is intentionally small and synthetic; these results establish the tested
pipeline behavior, not production throughput or trained-model accuracy.

## Not verified or not available

- Airflow scheduling against a production deployment; the initial CI DagBag job passed,
  while the local E2E invokes the same pipeline jobs directly through Spark.
- A new training run, model benchmark, official v3 evaluation, or Stage-2 evaluation.
- Production deployment, remote server state, or public hosting.
- Real Ollama report generation and live external-source collection.
- The `audience-x90` model: its default local artifact path is missing.
- Successful optional barrier/greenwashing/sentiment APIs: they are not implemented in
  the imported backend main branch.

Temporary local API and web servers used for HTTP verification are stopped after checks.
Use [RUNNING.md](RUNNING.md) to start your own development sessions.
