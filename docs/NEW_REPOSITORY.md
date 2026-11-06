# Create a new repository and commit the integrated project

## Recommended arrangement

Use one Git repository with separate deployment targets. The frontend stays in `frontend/`;
the existing Python/data-platform paths remain at the root. This permits one reviewed
change to update the API, UI, tests, and documentation together, while Next.js and backend
services can be deployed independently. Clones include frontend source without submodules.

The project repository is
[hbquyen2812/ev-campaign-analyser](https://github.com/hbquyen2812/ev-campaign-analyser).
The integration was prepared on `codex/monorepo-integration` for publication to `main`.
This workspace now uses the new project as `origin` and the original backend as `upstream`.
The initial migration steps below are a reference for another empty destination; do not
repeat remote creation if `git remote -v` already shows the intended project. For regular
development after publication, use the feature-branch commands in section 4.

## 1. Review and validate

```powershell
Set-Location D:\USER-BEHAVIOR-SOCIAL-MEDIA
git status --short --branch
git remote -v
npm run check:web
npm run build:web
```

Read `docs/PROJECT_OVERVIEW.md`, `docs/VERIFICATION.md`, and `docs/SOURCE_PROVENANCE.md`.
The pre-existing `summary.md` belongs to your earlier work and is not included in the
explicit staging command below. Decide separately whether to keep it local or publish it.

## 2. Stage the integration and create a commit

```powershell
git add README.md .dockerignore package.json frontend .github/workflows/frontend.yml .github/workflows/promote-to-prod.yml scripts/local_web_config.ps1 scripts/setup_local_web.ps1 scripts/start_api.ps1 docs/PROJECT_OVERVIEW.md docs/PROJECT_ACHIEVEMENTS.txt docs/RUNNING.md docs/NEW_REPOSITORY.md docs/SOURCE_PROVENANCE.md docs/VERIFICATION.md
git diff --cached --stat
git diff --cached --name-only
git commit -m "refactor: integrate web frontend and document local development"
```

Check that staged files do not include `.env`, `.env.local`, model weights, collected data,
virtual environments, `node_modules`, `.next`, or `.local-analysis`. Existing ignore rules
exclude these. `frontend/.env.local.example` should be included: it contains placeholders.
The original frontend Git metadata is ignored and is not part of the new project.

Do not run `git init` inside `frontend`; it is now part of the parent repository.

## 3. Create an empty GitHub repository

Create a repository under your own account/organization, for example
`ev-campaign-analyser`. Start with an empty repository: do not generate another README,
license, or .gitignore in the creation screen. Choose visibility according to your needs.

If GitHub CLI is installed and authenticated, the equivalent optional command is:

```powershell
gh repo create YOUR_ACCOUNT/ev-campaign-analyser --private
```

Replace `YOUR_ACCOUNT`; this document does not assume ownership or create the remote.
Review the original sources and your rights before assigning a license to the combined work.

## 4. Preserve history and push to the new remote

The recommended approach preserves the backend history and records the frontend import
in your integration commit. If `upstream` does not already exist:

```powershell
git remote rename origin upstream
git remote add origin https://github.com/YOUR_ACCOUNT/ev-campaign-analyser.git
git switch main
git merge --ff-only codex/monorepo-integration
git push -u origin main
git remote -v
```

`upstream` retains the original backend reference. `origin` becomes your repository.
If fast-forward fails because local history has changed, inspect it and resolve normally;
do not force-push or hard-reset as a shortcut. No changes are pushed to the original source
repositories by these commands.

For a new feature after publishing:

```powershell
git switch -c codex/your-feature
# Edit files and run relevant checks.
git add path/to/intended-file
git commit -m "feat: describe the concrete behavior"
git push -u origin codex/your-feature
```

Open a pull request into your new repository's `main`. Review the inherited release
workflows before configuring production secrets; a new repository does not inherit the
original repository's deployment settings.

Production promotion is disabled unless the repository Actions variable
`ENABLE_AUTO_PROMOTION` equals `true`. Configure the production branch and release
credentials before opting in. Ordinary frontend/backend validation remains enabled.

## 5. Alternative: completely fresh history

If you explicitly want a clean first commit, first create the integration commit above,
then export that committed source into a different, empty directory:

```powershell
git archive --format=zip --output=.local-analysis/integrated-source.zip HEAD
Expand-Archive -LiteralPath .local-analysis/integrated-source.zip -DestinationPath D:\EV-CAMPAIGN-ANALYSER
Set-Location D:\EV-CAMPAIGN-ANALYSER
git init -b main
git add .
git commit -m "feat: initialize integrated EV campaign analyser"
git remote add origin https://github.com/YOUR_ACCOUNT/ev-campaign-analyser.git
git push -u origin main
```

Choose an unused destination. `git archive` includes committed source only, so local
credentials, models, datasets, and uncommitted files are not copied. Recreate local
configuration and restore compatible model artifacts using `RUNNING.md`. Keep
`SOURCE_PROVENANCE.md` so the new history still records its upstream sources.

## 6. Deployment layout

| Deployment | Source root | Build/start |
|---|---|---|
| Next.js product app | `frontend` | `npm ci`, `npm run build`, `npm start` |
| AI prediction API | Repository/`ml` build context | Compose `ai-server`, or the documented Python launcher |
| Data platform | Repository root | Docker Compose and Airflow configuration |

Configure `AI_SERVER_URL` and `AI_SERVER_TOKEN` in the frontend host's server environment.
Supply weights to the backend separately. A new GitHub repository does not deploy services,
copy Docker volumes, provision user authentication, or reproduce a model experiment by itself.
