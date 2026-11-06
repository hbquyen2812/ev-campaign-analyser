# Reproducible MinIO images

The original E2E run on 6 November 2026 failed before starting the pipeline:
Docker Hub could no longer serve `minio/mc:RELEASE.2025-08-13T08-35-41Z`.
The corresponding Quay images were also unavailable during verification.

This Dockerfile builds the same server and client releases from official source.
It verifies each source archive with SHA-256 before compilation. It does not
download an executable from an unofficial mirror or change the data volume format.

| Target | Upstream release | Source commit |
|---|---|---|
| `server` | `RELEASE.2025-09-07T16-13-09Z` | `07c3a429bfed433e49018cb0f78a52145d4bedeb` |
| `client` | `RELEASE.2025-08-13T08-35-41Z` | `7394ce0dd2a80935aded936b09fa12cbb3cb8096` |

Source: [MinIO server](https://github.com/minio/minio) and
[MinIO client](https://github.com/minio/mc). The images retain their upstream
license files under `/usr/share/licenses/`. Build arguments and hashes are
recorded in the Dockerfile. Go modules are resolved using the upstream lock files
with `-mod=readonly`. This preserves these historical releases; it is not an
upgrade to a currently maintained storage release.

## Local builds

From the repository root:

```sh
docker compose build minio minio-init
```

The first build needs internet access to the official Go/Alpine registries,
GitHub source archives, and Go module services. Allow several minutes and enough
Docker disk space for compiler layers. Later builds reuse Docker's cache.

The isolated E2E Compose file uses the same Dockerfile. The publication workflow
builds both targets as project images. The deployment bundle removes local build
contexts and pulls those published images, so publish the matching image tag in
your configured `DOCKERHUB_NAMESPACE` before using a release bundle.

## Updating a pin

Choose an upstream commit, independently verify the downloaded source archive,
and update its hash and release metadata together. Rebuild both targets and run
`tests/e2e/run_pipeline_reliability_e2e.sh` before publishing. Do not bypass a
checksum failure or substitute an unverified container mirror.
