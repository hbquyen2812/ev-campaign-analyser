---
title: EV Campaign Analyser API
emoji: 🔋
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# EV Campaign Analyser — prediction API

Serves the Stage-1 viral model over HTTP for the web app. Copy this file to the
root of a Hugging Face Space as `README.md`; the front matter above is what tells
the Space to build from a Dockerfile rather than look for a Gradio app.

## Deploying to a Space

The Space builds from the repository root, while the image expects the `ml/`
folder as its build context (see the header of `ml/server/Dockerfile`). Two ways
to satisfy that:

- push only the contents of `ml/` to the Space repository, with this file renamed
  to `README.md` and `server/Dockerfile` copied to the root as `Dockerfile`; or
- keep the full repository and add a root `Dockerfile` whose build context is
  `ml/`.

The first is simpler and keeps the image small, since the Space then carries none
of the Spark, Airflow or collector code.

### What the image needs

`ml/models/*.joblib` must be present in the Space, and these are **not** in the
GitHub repository. Upload them to the Space repository directly — a Space is its
own git remote, so `git add` them there and nowhere else:

```
ml/models/stage1_multisource.joblib
ml/models/stage1_multisource_audience_x90.joblib
ml/models/topic_model.joblib
ml/models/rhetorical_role.joblib
```

They stay out of GitHub on purpose. `tests/scripts/test_serve_train_parity.py`
skips when the artefacts are absent and runs when they are present, and it
currently fails against them: the official model is contracted to exclude
audience features because the value is collected after publication and cannot be
proven to predate it, yet all three `stage1_multisource*` variants carry
`chan_audience_available`, `chan_audience_is_zero`, `chan_has_audience` and
`chan_log_audience`. Committing the files turned a skipped guard into a red
build. The guard is right; the artefacts predate it. Retraining is the fix, and
it is not a deployment task.

`xgboost==3.0.5` is pinned deliberately: 3.3.0 cannot deserialise these boosters
and fails with `XGBoostError: input stream corrupted` on the first prediction,
not at build time.

### Settings on the Space

| Setting | Value |
|---|---|
| SDK | Docker |
| `app_port` | 7860 (already in the front matter) |
| Secret `AI_SERVER_TOKEN` | any long random string |

Set the same token on the web app as `AI_SERVER_TOKEN`, and point its
`AI_SERVER_URL` at `https://<user>-<space>.hf.space`. Without a token the API is
open to anyone who finds the URL.

### Checking it

```bash
curl https://<user>-<space>.hf.space/health
```

`models.legacy.available` reports whether the file is in the image;
`models.legacy.loaded` only turns true after the first prediction, since the
model is loaded lazily.

A free Space sleeps after 48 hours idle and takes roughly 30 seconds to wake. If
a demo is scheduled, open it beforehand.
