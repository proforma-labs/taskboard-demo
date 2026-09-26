# Dayboard

A small task board built and checked on the Proforma cloud runner, with a separate trusted release to persistent Cloud Run hosting.

Add and edit tasks, move them between To do, In progress and Done, and search or filter the board. Tasks are stored only in your browser on this device. They are not shared with other visitors or sent to a backend. Clearing browser storage removes them.

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

The current Proforma runner does not automatically publish applications. This demonstration uses an explicit build/verify/release handoff. A public Cloud Run app is a persistent deployment, separate from Proforma's temporary private repository previews.
