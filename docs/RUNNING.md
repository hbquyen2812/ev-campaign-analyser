# Running the integrated project

These instructions target the Windows workspace `D:\USER-BEHAVIOR-SOCIAL-MEDIA`.
Run commands from the repository root unless a different location is stated.
The product UI, inference API, and data pipeline can run separately.

## 1. Choose the required scope

| Goal | Required components |
|---|---|
| View pages, static examples, and browser history | Next.js |
| Predict and generate a template report | Next.js + FastAPI + compatible model files |
| Generate Ollama reports | Above + reachable Ollama and downloaded model |
| Collect/process data and use the operations dashboard | Docker data platform and source configuration |
| Train an official model | Data platform, eligible observations, pinned dataset, clean Git state, training environment |

Starting the entire lakehouse is unnecessary for inference with existing artifacts.
Starting the frontend alone does not provide predictions.

## 2. Prerequisites

- Git and PowerShell for the commands below.
- Node.js and npm. This integration was checked with Node 24.13.1 and npm 11.8.0;
  frontend CI now uses Node 24. Dependencies are locked in `frontend/package-lock.json`.
- Python 3.12 for the ML environment, matching the API container's Python family.
  Do not assume the `python` command points to it: this machine's default is Python 3.14.
- Docker Desktop with Linux containers and Compose for the data platform or container API.
- Compatible trained model artifacts for real predictions.
- Source credentials/session only if running the corresponding collectors.

```powershell
Set-Location D:\USER-BEHAVIOR-SOCIAL-MEDIA
git --version
node --version
npm --version
python --version
docker compose version
```

If PowerShell blocks `npm.ps1`, use `npm.cmd` for the same commands.

## 3. Configure local development

Create the root environment file only if missing:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

For the web/API path, the relevant root settings are:

```dotenv
AI_SERVER_PORT=8000
AI_SERVER_TOKEN=replace-with-a-printable-ascii-token
```

Use a token without spaces or non-ASCII characters. A token is optional in the backend
implementation, but the provided helpers preserve it when configured. The integration
fixed an invalid local token and synchronized dashboard/frontend settings; its previous
root configuration is preserved locally as described in `SOURCE_PROVENANCE.md`.

Install frontend packages and generate its server-only configuration:

```powershell
npm run setup:web
.\scripts\setup_local_web.ps1
```

The setup helper reads the root API port/token and creates `frontend/.env.local` without
printing credentials. It leaves an existing file alone. After changing the root token/port:

```powershell
.\scripts\setup_local_web.ps1 -Force
```

The generated file uses:

```dotenv
AI_SERVER_URL=http://127.0.0.1:8000
AI_SERVER_TOKEN=the-same-token-as-the-backend
```

These values are used only by the Next.js server proxy. The old `NEXT_PUBLIC_API_URL`
setting is no longer used. Restart Next.js after configuration changes.

## 4. Prepare Python and model artifacts

This workspace already has `ml/.venv` based on Python 3.12.10. On a new machine, create
it with a verified Python 3.12 executable. For example, if the Python launcher knows it:

```powershell
py -3.12 -m venv ml/.venv
.\ml\.venv\Scripts\python.exe -m pip install -r ml/requirements-train.txt -r ml/server/requirements.txt
```

If `py -3.12` is unavailable, replace it with the full path to your Python 3.12 executable.
Do not recreate a functioning environment unnecessarily. The requirements files define
the exact requested package versions; installation requires access to a package index
that provides them. Do not silently change versions for an official experiment.

The default local artifact locations are:

```text
ml/models/stage1_multisource.joblib               legacy
ml/models/stage1_multisource_audience_x90.joblib  audience-x90
```

Older bundles can also require `rhetorical_role.joblib` and `topic_model.joblib` from
the matching training run. Keep artifacts and dependency versions compatible. The local
legacy file exists; the default audience-x90 file was absent during inspection.
Git ignores model weights, so a new clone will not include them. Obtain the appropriate
artifacts or train a model before expecting prediction requests to succeed.

## 5. Start the API and frontend

In terminal 1:

```powershell
Set-Location D:\USER-BEHAVIOR-SOCIAL-MEDIA
.\scripts\start_api.ps1
```

The helper uses `ml/.venv`, reads the root token/port, supplies host model paths, uses
template reports by default, and binds to `127.0.0.1`. It restores the process environment
when it exits. It does not load the model until prediction is requested.

In terminal 2:

```powershell
Set-Location D:\USER-BEHAVIOR-SOCIAL-MEDIA
npm run dev:web
```

Open <http://127.0.0.1:3000>. API documentation is at <http://127.0.0.1:8000/docs>.
The browser calls `/api/ai/*` on Next.js; Next.js calls FastAPI and attaches the token.

If the selected ports are occupied, set `AI_SERVER_PORT` in `.env`, regenerate frontend
configuration, and restart both processes. For a different frontend port:

```powershell
npm --prefix frontend run dev -- --hostname 127.0.0.1 --port 3001
```

Stop these foreground processes with Ctrl+C in their respective terminals.

## 6. Verify the application

Check service/model status through the same proxy used by the browser:

```powershell
Invoke-RestMethod http://127.0.0.1:3000/api/ai/health | ConvertTo-Json -Depth 5
```

`status: ok` means the service responds. `models.legacy.available` checks the file;
an actual prediction checks that it can be loaded and executed:

```powershell
$body = @{
    text = 'This electric vehicle offers a tested 510 km range and an eight-year battery warranty.'
    source = 'x'
    model = 'legacy'
    lang = 'en'
} | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:3000/api/ai/predict -Method Post -ContentType 'application/json' -Body $body
Invoke-RestMethod http://127.0.0.1:3000/api/ai/report -Method Post -ContentType 'application/json' -Body $body
```

In the UI, choose the available model, enter content, and run Analyze. Variant Lab uses
batch prediction. History is stored only in that browser/profile. The optional barrier,
greenwashing, and sentiment cards cannot succeed against imported backend main because
their endpoints are missing. Report-job submission returns 404 and the client falls back
to `/report`; that particular fallback is expected.

## 7. Production build and deployment separation

```powershell
npm run check:web
npm run build:web
npm run start:web
```

Stop a development server using port 3000 before starting the production server there.
The production proxy requires a Node-capable Next.js runtime, not static hosting.

For a separate frontend deployment, use `frontend` as its root directory and configure
server-only `AI_SERVER_URL` and `AI_SERVER_TOKEN`. The API URL must be reachable from the
frontend host. Its `127.0.0.1` refers to that host, not to your PC. Configure application
access control before opening the proxy to untrusted users: the shared backend token
does not authenticate each person using the web application. Hosting request limits must
also accommodate synchronous reports, or a real queue backend must be implemented.

The frontend, API, and data platform can be released independently from the same repository.
The source currently retains legacy product metadata/domain references; review them when
deploying under your own project name and domain.

## 8. Run the API in Docker instead

With Docker Desktop running, root `.env` configured, and model files available:

```powershell
docker compose up -d --build ai-server
docker compose logs --tail 100 ai-server
```

Compose mounts `AI_MODEL_DIR` (default `./ml/models`) at `/app/models`. Keep container
model variables as container paths. Do not run the host API on the same host port at
the same time. The frontend proxy can use the same local port/token configuration.
Use `docker compose stop ai-server` to stop only this service.

## 9. Start the data platform

In root `.env`, configure `DOCKER_HOST_PROJECT_DIR` to the checkout's real host path,
for example `D:/USER-BEHAVIOR-SOCIAL-MEDIA`. Configure MinIO/Airflow credentials and
`PRIVACY_HASH_SALT` for the intended environment. Add `YOUTUBE_API_KEY` for YouTube
discovery/refresh; enable X/Reddit only after their source/session setup is ready.

MinIO server/client images are built from pinned official source because their
original public container tags are unavailable. The initial build takes several
minutes. See [the MinIO build notes](../deployment/minio/README.md).

```powershell
.\scripts\ensure_resilient_stack.ps1 -SparkWorkers 1 -SkipXBrowser
```

One worker is an explicitly selected local starting point, not a benchmark claim. The
script's own default is four. It starts Docker Desktop if needed, resolves available
ports, updates local `.env`, builds/starts core services, and verifies key endpoints.
It does **not** include the AI service or Next.js in its core service list.

For configured online collectors:

```powershell
.\scripts\ensure_resilient_stack.ps1 -IncludeCollectors
```

Default interfaces (actual ports may change when occupied):

| Service | URL |
|---|---|
| Product frontend | http://127.0.0.1:3000 |
| AI API docs | http://127.0.0.1:8000/docs |
| Streamlit dashboard | http://127.0.0.1:8501 |
| Airflow | http://127.0.0.1:8088 |
| Spark master UI | http://127.0.0.1:8080 |
| MinIO console | http://127.0.0.1:9001 |
| Kafdrop | http://127.0.0.1:9002 |

Use the configured Airflow credentials, inspect DAG state, then trigger the appropriate
workflow. `user_behavior_lakehouse_no_row_checks` accepts no new rows while recording
quality evidence; `user_behavior_lakehouse` is the strict diagnostic path. Use the
dashboard import interface for existing CSV/JSON/JSONL/NDJSON data when appropriate.

```powershell
docker compose ps
docker compose logs --tail 100 airflow-scheduler
docker compose logs --tail 100 dashboard
```

`docker compose stop` stops services while retaining volumes. Do not use volume-deleting
commands as a routine restart: lakehouse, Kafka, and Airflow state live in Docker volumes.

## 10. Official training and optional Ollama

Official training requires a clean working tree, sufficient eligible observations,
an explicit label contract/reference-size choice, and valid snapshot lineage. Use the
`ai_train_pipeline` DAG or the documented official launcher with a real manifest:

```powershell
python ml/run_official_container.py --service ai-trainer --build -- python ml/run_pipeline.py --lakehouse-manifest /workspace/data/lakehouse-ml/ml/runs/ACTUAL_RUN.json --report
```

`ACTUAL_RUN.json` is a placeholder. Use the actual output of dataset construction.
The balancing volume is mounted under `/workspace/data/lakehouse-ml`; the builder's
`ml/runs/` subdirectory must remain in that path. See
[EXPERIMENT_REPRODUCIBILITY.md](EXPERIMENT_REPRODUCIBILITY.md) and
[VIRALITY_LABEL_CONTRACT.md](VIRALITY_LABEL_CONTRACT.md). This integration did not train models.

For local Ollama reporting, prepare the configured model, start Ollama, then:

```powershell
ollama pull qwen2.5:3b
.\scripts\start_api.ps1 -ReportBackend ollama
```

The launcher defaults to `http://127.0.0.1:11434` and respects a process-level
`OLLAMA_BASE_URL`. Container configuration normally uses a host-reachable address instead.
Ollama does not add the three missing marketing-analysis endpoints.

## 11. Tests and common failures

```powershell
npm run check:web
npm run build:web
.\ml\.venv\Scripts\python.exe -m pytest ml/server/test_app.py -q
docker compose --env-file .env.example -f docker-compose.yml config --quiet
```

Frontend tests include mocked HTTP calls and server-proxy behavior. API unit tests stub
inference; passing them alone is not evidence of real model execution.

To run the complete deterministic data-pipeline test, start Docker and use Bash
(Git Bash on Windows) from the repository root:

```bash
bash tests/e2e/run_pipeline_reliability_e2e.sh
```

The script uses `python3`, falling back to `python` on Git Bash; set `PYTHON_BIN`
to override it. It builds a separate Compose project, injects fixture events,
tests crash recovery and replay, exports a training dataset, and checks dashboard
reads. It removes only its own containers and test volumes when finished. Evidence
is saved in `tests/e2e/.artifacts/`. Do not run two copies concurrently in the same
checkout. GitHub Actions runs this test after unit, contract, Spark, and Airflow checks.

| Symptom | Meaning and next action |
|---|---|
| Proxy 502 | Start FastAPI and check server-only `AI_SERVER_URL` |
| Proxy/backend 401 | Synchronize token, then restart API and Next.js |
| Header ASCII error | Replace a non-ASCII/whitespace token; setup helpers reject it |
| Prediction 503 | Selected model artifact is missing |
| Prediction 500 | Read API logs; verify model/dependency/auxiliary-artifact compatibility |
| `/report/jobs` 404 | Expected compatibility fallback to synchronous reporting |
| Optional marketing API 404 | Endpoint is not implemented in backend main |
| Proxy 504 | Upstream call exceeded the configured request budget |
| Docker named-pipe error | Docker Desktop/Linux engine is not running |
| `pull access denied for minio/mc` | Update to the source-build fix, then rebuild `minio` and `minio-init` |
| Empty dashboard | Verify actual ingestion/tables, not only container liveness |
| Official training rejects dirty Git | Commit intended source or use an explicitly non-official experiment |
| Fresh clone cannot predict | Git does not include trained model artifacts |

The verification record for this integration is maintained in [VERIFICATION.md](VERIFICATION.md).
