# Dayboard container release preparation

Status: Prepared and locally verified — dedicated branch; not deployed.

Prepare Dayboard for Proforma's queued repository App release path. The branch
starts at `25c46846a0d8628ac7dec3ecb538bd02e86039b9`, whose application source is
identical to deployed commit `f749dd4cdf32a50ab810f0442972ac13d0b887b7`; the later
commit only records the previous release evidence.

- Declare numeric non-root `USER 1000:1000` in the pinned Node image.
- Include `src/` and `tests/` with the existing static server and built `dist/`
  files so the release service can check the exact candidate image.
- Keep the static HTTP allowlist and browser-local persistence unchanged. Source
  and tests inside the image do not become public HTTP routes.
- Run lint, deterministic build and the existing tests, then build Linux amd64
  and run both checks by immutable image id with offline networking, read-only
  root, dropped capabilities, bounded CPU/memory/processes and a temporary `/tmp`.
- Push a dedicated branch and open a draft PR. This preparation does not modify
  the existing Dayboard service or claim a new live deployment.

Files: `Dockerfile`, `.dockerignore`, `README.md`, and this plan. No dependency or
application behavior changes are needed.

## Verification

- `pnpm lint`, `pnpm build`, and `pnpm test` passed on 2026-09-26.
- Built the pinned Dockerfile for `linux/amd64`. Both checks passed against the
  same immutable local image id:
  `sha256:dd035ecc06757840ba13b522ed730ce0dc85665716bbf61a8630441829a60f26`.
- `node --test tests/board.test.mjs`: all eight state tests passed.
- `node tests/http.test.mjs`: all four assets matched their build hashes; five
  restricted paths returned 404, POST returned 405, and HEAD returned 200.
- Image user was `1000:1000`. Both checks ran with `--network=none`,
  `--cap-drop=ALL`, `--security-opt=no-new-privileges`, `--read-only`,
  `--tmpfs=/tmp:rw,noexec,nosuid,size=67108864`, `--pids-limit=128`,
  `--memory=512m`, and `--cpus=1`.

This local verification is preparation for the configured Proforma release
path, not a production release receipt. No image was published and no Cloud Run
service was changed.
