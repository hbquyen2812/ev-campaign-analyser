# Source provenance

Reviewed and integrated on **6 November 2026**. These revisions identify the source
before the integration changes made in this workspace.

| Component | Repository | Branch | Commit |
|---|---|---|---|
| Backend, pipeline, dashboard | https://github.com/raph0603/USER-BEHAVIOR-SOCIAL-MEDIA | `main` | `ffffbb60b8644107ee6a7bead566ee0ee068f41a` |
| Next.js frontend | https://github.com/VeillonC/viral-insight-webapp-USER-BEHAVIOR | `main` | `617b7968033faede5b0445f058ed11109a525cf3` |

The backend was fetched and pulled with `--ff-only`; main was already up to date.
Frontend main was cloned and imported as ordinary files in `frontend/`. It is not
a submodule and will require no second clone once the integrated files are committed.

The original frontend Git metadata is retained locally in
`.local-analysis/frontend-original.git`, which is ignored by Git and Docker. It is a
recovery aid, not a dependency. The original backend history is retained, with its
repository configured as `upstream`. The user's project is configured as `origin`:
[hbquyen2812/ev-campaign-analyser](https://github.com/hbquyen2812/ev-campaign-analyser).
Integration work was prepared on `codex/monorepo-integration` for publication to `main`.

The pre-existing `summary.md`, datasets, model weights, and Python environments were
retained. A local API token containing non-ASCII characters could not be sent in HTTP
headers, so it was replaced with a generated ASCII token and synchronized with the
dashboard and frontend. The previous `.env` is preserved in the ignored local file
`.local-analysis/env-before-web-integration`. Other root environment settings were retained.
`frontend/.env.local` was generated from backend connection settings and is ignored by Git.

The user created the destination repository. Publishing this source does not deploy
production services or train models. Automatic production promotion requires the explicit
Actions variable `ENABLE_AUTO_PROMOTION=true`. See [NEW_REPOSITORY.md](NEW_REPOSITORY.md)
for repository setup and the normal development workflow.

## Repository ownership and inherited history

The destination owner is `hbquyen2812`. On 6 November 2026, GitHub's collaborator
API listed only `hbquyen2812`, with the `admin` role. Contributor names describe
commit authorship; they do not grant access to this new repository.

The integration commit `07fa2cd` retained the original 393 backend-history commits,
bringing that revision to 394 commits. Git preserves author names, commit dates,
and parent links when history is pushed to another remote. Consequently, August
2026 commits remain visible even though this destination was created in November.
Those dates describe the original commits, not the creation date of this repository.
Subsequent fixes increase the count. The imported frontend's separate Git history
is not included as additional ancestors; its source revision is recorded above.
