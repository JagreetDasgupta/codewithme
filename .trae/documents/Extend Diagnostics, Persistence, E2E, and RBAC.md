## Scope & Goals
- Add Python/Java/C++ diagnostics via language servers proxied through backend
- Persist Yjs documents with recovery and versioning
- Add E2E tests for multi-user collaboration and locking contention
- Enforce role-based permissions for lock overrides and snapshots

## Current Integration References
- Editor page entry: `frontend/src/pages/InterviewSession.tsx`
- Yjs server setup: `backend/src/collaboration/index.ts`
- Auth middleware: `backend/src/middleware/auth.ts`
- Socket.IO server: `backend/src/websocket/index.ts`

## Diagnostics via Language Servers
- Introduce a backend LSP gateway (`/lsp/:language`) that authenticates via JWT and proxies WebSocket JSON-RPC to language servers
- Use `monaco-languageclient`, `vscode-ws-jsonrpc`, `vscode-languageserver-protocol` in frontend to connect Monaco to LSP endpoints
- Language servers:
  - Python: `pyright-langserver` (Node) container; stdio → WebSocket bridge
  - Java: Eclipse JDT LS (requires JRE); run in container, expose via gateway
  - C++: `clangd` in container; expose via gateway
- Frontend:
  - Create a language plugin registry to configure diagnostics, autocomplete, hover, go-to-def using `monaco-languageclient`
  - Fallback to Monaco tokenization when LSP is unavailable; keep ES6+ support for JS/TS
- Security & performance:
  - Authenticate on `/lsp` with `Bearer` token; enforce per-session quotas and rate limits
  - Use keep-alive and request batching in the gateway; log latency for sub-second targets

## Yjs Persistence & Versioning
- Implement persistence in `backend/src/collaboration/index.ts` using a bindState adapter:
  - Store incremental updates per document in Redis list `yjs:session-<id>:updates` and periodic full snapshots in `yjs:session-<id>:snapshot:<timestamp>`
  - On connection, read updates and `applyUpdate` to reconstruct doc; on snapshot, store `encodeStateAsUpdate(ydoc)`
- Recovery flow:
  - If updates list grows, auto-compact by creating a new snapshot and trimming old updates
  - Add REST endpoints: `GET /api/v1/sessions/:id/yjs-versions` and `POST /api/v1/sessions/:id/yjs-snapshot`
- Frontend:
  - Add UI to restore from a version and display snapshot timestamps

## E2E Tests (Playwright)
- Add Playwright setup and scripts
- Scenarios:
  - Two users join the same session; verify remote cursors and typing indicators
  - Lock contention: user A locks a range; user B attempts edit → blocked; queue transfers on release
  - Sub-second latency check: measure time from edit in A to view in B
  - Snapshot save and list; restore a snapshot and verify editor content
- CI integration: run backend and frontend, seed session, execute tests headless

## RBAC for Overrides
- Use `restrictTo` middleware (`backend/src/middleware/auth.ts`) and session participant roles:
  - Define permissions: `interviewer` and `admin` can force-release/transfer locks and approve snapshots; `candidate` cannot
- Server enforcement:
  - Add endpoints: `POST /api/v1/sessions/:id/locks/override` (requires role), `POST /api/v1/sessions/:id/snapshots/approve`
  - Move lock authority to server via Socket.IO channel (`locks:*`) to prevent client bypass; server validates role before emitting Yjs lock map changes
- Frontend visibility:
  - Show override controls only to privileged roles; reflect server responses in activity log

## Milestones
1. Backend LSP gateway + Python LSP; frontend `monaco-languageclient` integration
2. Extend to Java and C++ in containers; error handling and fallback
3. Yjs persistence adapter with Redis storage, versions, and recovery endpoints
4. Frontend version UI and restore controls
5. Playwright E2E tests for presence, locking, latency, snapshots
6. RBAC enforcement endpoints and server-authoritative lock management; frontend controls
7. Performance tuning and metrics dashboards

## Verification & Deliverables
- Diagnostics active for Python/Java/C++ with autocomplete/hover/validation
- Yjs state persists across server restarts; versions listable and restorable
- E2E suite passes for multi-user and lock contention with latency under 1s
- RBAC prevents unauthorized overrides and controls are visible only to privileged users