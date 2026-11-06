# Build the existing MinIO releases from verified upstream source. Historical
# minio/minio and minio/mc images are no longer publicly pullable.
FROM golang:1.24.8-bookworm AS server-build
ENV CGO_ENABLED=0 GOTOOLCHAIN=local GOMAXPROCS=2
WORKDIR /src
ARG MINIO_COMMIT=07c3a429bfed433e49018cb0f78a52145d4bedeb
ARG MINIO_SOURCE_SHA256=8819e3e7817e46b7b3798f8f200ead208562e571563c2e040352378031abe9f2
RUN curl --fail --location --retry 3 \
      "https://codeload.github.com/minio/minio/tar.gz/${MINIO_COMMIT}" -o /tmp/source.tar.gz \
    && echo "${MINIO_SOURCE_SHA256}  /tmp/source.tar.gz" | sha256sum --check - \
    && tar -xzf /tmp/source.tar.gz --strip-components=1 \
    && rm /tmp/source.tar.gz
RUN go build -mod=readonly -p 2 -tags kqueue -trimpath \
    -ldflags "-s -w -X github.com/minio/minio/cmd.Version=2025-09-07T16:13:09Z -X github.com/minio/minio/cmd.ReleaseTag=RELEASE.2025-09-07T16-13-09Z -X github.com/minio/minio/cmd.CommitID=${MINIO_COMMIT}" \
    -o /out/minio .

FROM golang:1.24.8-bookworm AS client-build
ENV CGO_ENABLED=0 GOTOOLCHAIN=local GOMAXPROCS=2
WORKDIR /src
ARG MC_COMMIT=7394ce0dd2a80935aded936b09fa12cbb3cb8096
ARG MC_SOURCE_SHA256=95cd293c7119f16921a6dc515a1fb74a2227f19fd994b9c8b770a154e802ac44
RUN curl --fail --location --retry 3 \
      "https://codeload.github.com/minio/mc/tar.gz/${MC_COMMIT}" -o /tmp/source.tar.gz \
    && echo "${MC_SOURCE_SHA256}  /tmp/source.tar.gz" | sha256sum --check - \
    && tar -xzf /tmp/source.tar.gz --strip-components=1 \
    && rm /tmp/source.tar.gz
RUN go build -mod=readonly -p 2 -tags kqueue -trimpath \
    -ldflags "-s -w -X github.com/minio/mc/cmd.Version=2025-08-13T08:35:41Z -X github.com/minio/mc/cmd.ReleaseTag=RELEASE.2025-08-13T08-35-41Z -X github.com/minio/mc/cmd.CommitID=${MC_COMMIT}" \
    -o /out/mc .

FROM alpine:3.22.2 AS runtime
RUN apk add --no-cache ca-certificates curl

FROM runtime AS server
LABEL org.opencontainers.image.source="https://github.com/minio/minio" \
      org.opencontainers.image.revision="07c3a429bfed433e49018cb0f78a52145d4bedeb" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
COPY --from=server-build /out/minio /usr/bin/minio
COPY --from=server-build /src/LICENSE /usr/share/licenses/minio/LICENSE
EXPOSE 9000 9001
ENTRYPOINT ["/usr/bin/minio"]
CMD ["server", "/data", "--console-address", ":9001"]

FROM runtime AS client
LABEL org.opencontainers.image.source="https://github.com/minio/mc" \
      org.opencontainers.image.revision="7394ce0dd2a80935aded936b09fa12cbb3cb8096" \
      org.opencontainers.image.licenses="AGPL-3.0-only"
COPY --from=client-build /out/mc /usr/bin/mc
COPY --from=client-build /src/LICENSE /usr/share/licenses/mc/LICENSE
ENTRYPOINT ["/usr/bin/mc"]
