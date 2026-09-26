# Task board cloud-runner demonstration — Implementation Plan

> **Branch:** `codex/cloud-runner-taskboard`
> **Status:** Complete — deployed and verified September 26, 2026
> **Owner:** Chris / Codex
> **Related PR:** Standalone new demo repository; no changes to Proforma runtime behavior.

## Why

Demonstrate a newly authored app built and verified by the deployed Proforma cloud runner, then released as a persistent, usable website. The previous MDN test proved read-only repository verification; this exercise adds a real custom build and a separately authorized hosting step.

## Design principles

- Use a public repository containing only generated demo code and synthetic tasks. No credentials or workspace/customer data.
- A small dependency-free web app keeps execution bounded and reproducible. Use pnpm for project commands and Node built-ins for build/server/tests.
- Pin the source SHA and immutable environment File. Cloud runner executes build, meaningful state tests, and HTTP checks; no network access is required for the workload.
- A deterministic build emits a SHA-256 manifest. Trusted publication verifies its local output matches the cloud-runner evidence before deploying the exact files.
- Persistent hosting uses a separate public Cloud Run service with no project data permissions, no mounted secrets, min instances zero, max instances one. Repository guest never receives deployment credentials.
- This is an explicit release handoff, not a claim that the native executor supports deployments. Do not change the restricted workspace's visibility or enable private preview/write gates.

## Part 1: Custom application

Create a responsive task board with To do, In progress, and Done columns. Support adding, editing, moving, deleting, searching and filtering tasks. Include synthetic examples and browser-local persistence, with clear UI text that tasks are saved on this device. Make controls keyboard accessible. Use a polished light UI, strong type hierarchy, restrained colors and no external fonts/assets.

### Files to create

- `src/index.html`, `src/styles.css`, `src/app.js`, `src/board.js`: application and reusable state operations.
- `scripts/build.mjs`: deterministic copy/build and manifest generation.
- `scripts/server.mjs`: static hosting with explicit asset allowlist and safe response headers.
- `tests/board.test.mjs`, `tests/http.test.mjs`: state invariants and real HTTP asset checks.
- `package.json`, `Dockerfile`, `.dockerignore`, `.gitignore`, `README.md`: bounded commands and deployment packaging.
- `runtime.json`: immutable Proforma environment recipe for build/test/HTTP commands.

## Part 2: Cloud verification and publication

Create the new public demo repository, connect it in the existing restricted production test workspace, save its environment revision and explicit execution consent, and ask Chat to run the native dedicated verification at the exact SHA. Capture command outcomes, output manifest, task completion and VM/disk deletion.

Use the trusted host to reproduce the deterministic output from that SHA and compare every artifact digest with cloud evidence. Build and deploy the runtime image to the new Cloud Run demo service. Check the live manifest/assets and use a browser to verify add/move/edit/delete/search and reload persistence. Save a deployment receipt containing source SHA, build manifest, runner assignment, image/revision/URL, tests and cleanup.

## Live outcome

Dayboard is live at [proforma-dayboard-igmn6rk4yq-uc.a.run.app](https://proforma-dayboard-igmn6rk4yq-uc.a.run.app), with public source at [proforma-labs/taskboard-demo](https://github.com/proforma-labs/taskboard-demo). The deployed source is `f749dd4cdf32a50ab810f0442972ac13d0b887b7`, published as Cloud Run revision `proforma-dayboard-f749dd4`.

The normal production Chat flow created a durable Work-backed verification assignment on a dedicated VM. At the pinned source and immutable environment revision, all four commands passed: syntax checks for seven JavaScript modules, deterministic build, eight state tests, and real HTTP checks. The assignment completed in **42.683 seconds**. VM creation to the first command took **25.819 seconds**, and all four commands finished **30.944 seconds** after VM creation. These measurements describe one cold run without an intervening diagnostic redeployment.

The trusted host compared all four cloud-built asset hashes with the pinned source, reproduced build and hosting image before publication. All four live assets returned HTTP 200 with matching hashes. This was a separate explicit Cloud Run release; the native executor did not receive deployment credentials or automatically publish the app. Hosting uses a non-root process, no mounted secrets, no project data roles, minimum instances zero and maximum one. The temporary runner VM and boot disk were independently confirmed absent after completion.

Live browser checks passed for create, edit, status moves, search, priority filtering, reload persistence, delete and Undo, with no console warnings or errors. At 390 × 844, all eight task cards remained present, the board formed one column, both document and body widths stayed at 390 pixels, and the Add task dialog kept every control and button visible. Cancel worked. Restoring the 1280-pixel desktop viewport left no horizontal overflow and no open dialog.

The first coordinator attempt used GPT-5.6 Luna and failed before creating an assignment because its provider rejected a lookaround expression in a tool JSON schema. Selecting Grok 4.5 through the normal model selector allowed the successful retry without changing server validation. This compatibility issue is retained in the evidence rather than omitted from the result.

The [public verification receipt](../deployment/verification.json) records source, build hashes, check results, timing, publication, browser checks, and completed cleanup. This small release record keeps internal platform identifiers out of the public demo repository; detailed evidence is retained in Proforma’s repository runtime test artifacts. The board remains browser-local: no shared backend, account synchronization or server backup is implied, and clearing browser storage removes saved tasks.

## Summary

No new framework dependencies or Proforma primitives. Hosting credentials remain outside untrusted execution. Source, runner evidence, deployed content and user-facing URL remain traceable.

## Not building (on purpose)

- Shared task database or multi-user accounts: this is a browser-local demo.
- Native automatic deployment capability, arbitrary output export, private GitHub App setup or preview-domain setup: those are separate product features.
- New access to existing customer data or changes to Proforma workspace visibility.

## Implementation order

1. Author source and bounded checks.
2. Freeze source; connect repository and run through production Chat.
3. Publish exact verified build; verify live functionality and cleanup.

## Future (not now)

Add a durable artifact export and a trusted deployment Action so Proforma can own the release handoff automatically.
