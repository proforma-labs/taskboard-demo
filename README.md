# Dayboard

A small task board built and checked on the Proforma cloud runner, with a separate trusted release to persistent Cloud Run hosting.

Add and edit tasks, move them between To do, In progress and Done, and search or filter the board. Tasks are stored only in your browser on this device. They are not shared with other visitors or sent to a backend. Clearing browser storage removes them.

[Open Dayboard](https://proforma-dayboard-igmn6rk4yq-uc.a.run.app) · [Source repository](https://github.com/proforma-labs/taskboard-demo)

The September 26, 2026 release uses source commit `f749dd4cdf32a50ab810f0442972ac13d0b887b7`. Its Proforma cloud assignment completed in **42.683 seconds**; the cold VM reached its first command in **25.819 seconds**. Syntax checks, the build, eight state tests, and HTTP checks all passed. The four deployed asset hashes match the cloud build and committed source. The temporary runner VM and boot disk were independently confirmed deleted.

Live browser checks passed for creating, editing, moving, searching and filtering tasks, persistence after reload, and deleting with Undo. The layout and Add task dialog were checked at a 390 × 844 mobile viewport and a 1280-pixel desktop width, with no horizontal overflow or console warnings/errors. These checks cover this release; the timings describe one run.

The [public verification receipt](deployment/verification.json) records the source, build hashes, checks, deployment and cleanup.

## Local use

Requires Node 22+ and pnpm 9.15.0; there are no package dependencies.

```sh
pnpm lint
pnpm build
pnpm test
pnpm start
```

Open `http://localhost:8080`. The build writes four static assets and a deterministic SHA-256 manifest to `dist/`.

## Cloud execution and deployment

`runtime.json` is the bounded Proforma environment recipe. It runs the build, state tests and real HTTP checks at a pinned public repository SHA in a dedicated VM, with outbound networking disabled. Its logs contain `PROFORMA_BUILD_MANIFEST` and `PROFORMA_APP_HTTP` receipts.

Deployment credentials stay outside the repository workload. A trusted host reproduces the build at that same SHA, verifies every output hash against the runner manifest, then publishes the exact assets using `Dockerfile`. The service runs as a non-root user with a dedicated identity, no project data roles or mounted secrets, minimum instances zero and maximum one.

The published demonstration used an explicit build/verify/release handoff. This
branch prepares its container for Proforma's queued repository App release path;
a new deployment still requires a configured hosting target and a verified release
receipt. A public Cloud Run app is a persistent deployment, separate from
Proforma's temporary private repository previews.

The image declares numeric user `1000:1000` and includes the existing source and
tests, allowing the release runner to execute these checks against the same image
it will deploy:

```sh
node --test tests/board.test.mjs
node tests/http.test.mjs
```

Both checks support a read-only root filesystem and disabled external networking.
The HTTP check starts its own loopback server and confirms that source, package
metadata and server scripts are not publicly served. See the
[container release preparation plan](plans/proforma-container-release.md).

This is a browser-local task board: it has no shared database, account synchronization or server backup. Use it on the same browser and device to retain your tasks.
