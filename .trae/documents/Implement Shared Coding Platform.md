## Architecture Overview
- Leverage existing stack: Monaco via `@monaco-editor/react`, Yjs (`y-websocket`, `y-monaco`), Socket.IO, Express backend.
- Current integration points:
  - Editor: `frontend/src/pages/InterviewSession.tsx` uses `Editor` with Yjs binding via `MonacoBinding` and awareness.
  - Host logic: `frontend/src/pages/InterviewSession.tsx:138` derives host from `created_by`.
  - Focus priority: `frontend/src/pages/InterviewSession.tsx:279–282` prioritizes host changes.
  - Yjs server: `backend/src/collaboration/index.ts` upgrades HTTP to `"/yjs"` and calls `setupWSConnection`.
  - Socket auth: `backend/src/websocket/index.ts` verifies `socket.handshake.auth.token` and attaches `socket.data.user`.

## Language Support
- Baseline Monaco languages: enable JS/TS, JSON, HTML, CSS, Markdown immediately.
- Extended languages with LSP-backed validation and features:
  - Python (Pyright WASM) for syntax diagnostics and autocomplete.
  - Java (Eclipse JDT LS via server proxy).
  - C/C++ (clangd via server proxy), C# (OmniSharp), Go (gopls), Rust (rust-analyzer).
- Implement a language plugin registry:
  - Each plugin defines: language id, loader (worker/LSP), validation provider, autocomplete provider, indentation rules.
  - Fallback to Monaco tokenization and bracket matching where LSP unavailable.
- Language-specific features:
  - Python: indentation guides and auto-indent tuned to `:` blocks, PEP8-aware suggestions.
  - JavaScript/TypeScript: ES6+ support, semantic tokens, diagnostics from Monaco/TS language service.
  - Distinct color schemes per language using Monaco theme token rules.

## Editor Features
- Enable and configure:
  - Bracket matching with visual indicators; highlight matching pairs and unmatched errors.
  - Intelligent indent matching and auto-indentation per language rules.
  - Context-aware autocomplete: LSP-backed suggestions including symbols from open files and imports.
  - Distinct color schemes: define custom Monaco themes (dark, light, high-contrast) with specific token colors for variables, keywords, types.
  - Line numbering and code folding: Monaco options + per-language folding ranges.
- Add editor workers where needed for performance (TS/JSON workers, custom workers for LSP transport).

## Real-time Collaboration
- Presence:
  - Continue using Yjs awareness for remote cursors; attach username/color; render labeled cursors and selection decorations (avatar bubble near caret).
- Typing indicators:
  - Broadcast lightweight "isTyping" state via awareness with timeout debounce (no per-keystroke emits).
- Locking mechanism:
  - Range-based locks stored in a shared `Y.Map('locks')` keyed by file+range.
  - Acquisition flow: client requests lock; if free, assigns owner and timestamp; otherwise enqueues in FIFO `Y.Array` queue.
  - Enforcement: non-owners are blocked from editing locked ranges; Monaco decorations display locked area and owner.
  - Release: owner releases or times out; notify next queued user.
- Queue & notifications:
  - Change notifications via Socket.IO and/or awareness events; toast + inline banner when a locked section becomes available.
- Propagation:
  - Continue `MonacoBinding` for CRDT text; use minimal awareness updates for presence/typing.

## Conflict Resolution
- Version control integration per session:
  - Server-side Git repository per session using `isomorphic-git` or `simple-git`.
  - Actions: commit snapshot, branch per participant, merge with three-way diff.
  - UI: commit message input, view history, diff viewer for conflicting changes.
- Auto-merge policy:
  - Favor CRDT merge; if overlapping edits outside locks create semantic conflicts, allow manual merge via diff tool.

## Performance Requirements
- Sub-second latency targets:
  - Yjs binary delta updates already efficient; ensure `wss` with compression.
  - Debounce high-frequency editor events; batch decorations updates.
  - Use editor `automaticLayout` and worker offloading for diagnostics.
- Simultaneous editing:
  - Partition model by files; allow parallel edits; locks are per-range.
  - Optimize awareness broadcasts; throttle typing status transitions.

## Testing Requirements
- Unit tests:
  - Editor features per language (indent, bracket match, diagnostics providers).
  - Locking logic: acquisition, queue, release, timeouts.
- Integration tests:
  - Multi-user collaboration flows with mocked Yjs and Socket.IO.
  - Version control snapshots and merge flows.
- E2E tests:
  - Playwright/Cypress for real-time indicators, labeled cursors, locking under contention.
- Load testing:
  - k6 scenarios for concurrent edits and presence updates; validate sub-second latency.

## Accessibility
- Keyboard shortcuts for all editor functions; expose discoverable shortcut help.
- Screen reader support:
  - ARIA labels for presence lists, lock banners, notifications; focus order and roles set correctly.
  - Ensure Monaco accessibility options enabled; provide text alternatives for cursor labels.
- High-contrast mode:
  - Provide Monaco `hc-black` theme variant and custom high-contrast tokens; toggle in settings.

## Security
- Authentication:
  - Enforce JWT on all collaboration endpoints; validate token on Yjs upgrade path (`/yjs`) using query param.
- Permissions:
  - Session RBAC: creator/interviewer vs candidate; restrict lock overrides and commit actions to privileged roles.
- Transport security:
  - Use `https` and `wss`; configure CORS and CSRF protections for REST; rate-limit signaling endpoints.

## Implementation Phases
1. Editor enhancements and language registry
2. Collaboration presence, typing indicators, and labeled cursors
3. Locking + queue + notifications
4. Version control integration and conflict UI
5. Performance tuning and observability (metrics, tracing)
6. Accessibility and keyboard shortcuts
7. Security hardening across collaboration endpoints
8. Comprehensive tests and load validation

## Risks & Mitigations
- LSP servers runtime complexity: use server proxy containers; provide fallback to Monaco-only features when unavailable.
- Lock starvation: implement fair FIFO queue and time-sliced locks; add admin override.
- Performance under load: throttle awareness updates; monitor and tune server websockets.

## Deliverables & Verification
- Feature-complete editor with language plugins and LSP-backed validation.
- Real-time collaboration with presence, labeled cursors, locks, and notifications.
- Git-backed version control with snapshot/branch/merge UI.
- Tests across unit/integration/E2E and load metrics proving sub-second latency.
- Accessibility verified with screen readers and high-contrast mode.
- Security verified via authenticated, permissioned endpoints and secure transport.