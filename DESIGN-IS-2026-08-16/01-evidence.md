# Evidence — MagicLens Design Audit

All findings below are consolidated from 5 parallel evidence subagents. Visual-system findings are marked INFERRED (read from source, not rendered pixels — screenshot capture unavailable in this environment).

## Structural Evidence

**Interactive-element count (ResourceTable toolbar):** `ResourceTableToolbar.tsx` is a pure layout shell (0 intrinsic controls). 6 top-level controls passed in from `ResourceTable.tsx:478-537` (NamespaceSelector, Search, conditional Delete, Create, LiveRefreshControl, conditional TableColumnPicker), each of the first two revealing further nested controls on click (NamespaceSelector panel: ~8 fixed + N dynamic rows; TableColumnPicker: 1 checkbox per column + reset).

**Max nesting depth:** 9 JSX/component levels from `.ml-resource-page` to the Status-cell's innermost span (`ResourceTable.tsx:479` → `ml-resource-page-body:538` → Fragment:542 → `ResizableTable`/`.ml-table-wrap`:553 → antd `<Table>` (opaque) → `StatusTag:291-293` → `StatusBadge:12` → `span.ml-status-badge:69-75` → `span.ml-status-badge-dot:73`), plus antd's own internal DOM layers not visible in source.

**Repeated-pattern count:** A shared `OverviewStat` component exists (`OverviewPage.tsx:32-61`) and is used by all 5 Overview pages for *some* tiles, but 4 of the 5 files (Workloads, Config, Network, Storage) also hand-roll an *identical* clickable-stat-tile pattern inline instead of calling `OverviewStat` (`WorkloadsOverviewPage.tsx:132-140`, `ConfigOverviewPage.tsx:94-102`, `NetworkOverviewPage.tsx:90-98`, `StorageOverviewPage.tsx:68-76`) — this includes the two Overview pages added this session, which followed the pre-existing (duplicated) convention rather than the shared component. A second pattern, the clickable `ml-overview-list__row`, is hand-rolled independently 8 times across the same 4 files with no shared component at all.

**Dead code:** 0 unused imports / 0 unused destructured props found across the 7 files checked.

## Visual Evidence (INFERRED — source-code only)

**Spacing scale:** `tokens.ts:22-30` declares a clean spacing scale (4/8/16/24/32/40/48) but it is **never wired into any CSS custom property** — `buildTheme.ts` never sets it. The only `--ml-spacing-*` references in global.css (3 total) always fall back to a hardcoded literal because the variable itself is undefined. Actual padding/margin values used across global.css span 19+ distinct px values including off-scale odd numbers (1, 3, 5, 7, 18, 22, 28px) mixed with the intended 4/8-multiples.

**Type scale:** `tokens.ts:39-48` declares a 6-step named scale (11/12/13/13/20/28), but 20 distinct font-size values are actually used in global.css, including half-pixel steps (10.5, 11.5, 12.5, 13.5, 15.5px) not present in the token scale at all — ad hoc sizing layered on top of, not derived from, the token system.

**Color count:** Token system defines 30 semantic color properties × 2 themes (`palette.ts`) plus 14 named color schemes × 2 themes (`schemes.ts`), correctly pushed to CSS vars (`buildTheme.ts:140-172`). However, global.css also contains 220 standalone hardcoded hex/rgb color literals that bypass the token system entirely (not `var(--ml-x, #fallback)` pairs, of which there are a separate 83) — e.g. a raw `#6366f1` gradient (line 194), raw `#22c55e` repeated across ~5 unrelated rules (lines 1302-1404), raw `#fff`/`#000` literals.

**Contrast:** Two themes define fixed text/bg hex pairs (light: `#1a1225` text / `#ffffff` bg; dark: `#f0ebf7` text / `#14101c` bg) — both very likely comfortably AA-passing at primary-text level. But the *tertiary* text tier is not a fixed value in the scheme-derived palettes — `schemes.ts:101` computes it as `mixHex(text, layout, 0.4)`, i.e. a 40% blend toward the background color, meaning tertiary text contrast is only as good as the schemes.ts author's judgment, not a token designed for a contrast floor. No "muted" text token exists at all in the app-content system (only sidebar-specific muted/subtle variants).

**States:** Shared `LoadingState`/`SkeletonRows`/`ErrorState`/`EmptyState`/`EmptyPodsState` all exist (`EmptyErrorStates.tsx`). Skeleton/shimmer CSS present. `:disabled` styled 19×. `:focus-visible` styled only **4 times in a 14,027-line stylesheet** — the sparsest state coverage found.

## Copy & Honesty Evidence

No marketing-inflation words found (zero hits for powerful/seamless/effortless/blazing/enterprise-grade/smart/intelligent/magical/etc. — the ~20 "Magic"/"MagicLens" hits are all the brand name, used factually). No dark patterns found across 19 `Modal.confirm` sites and all `danger`-styled confirmations — delete flows are *more* cautious than typical (the notes-folder delete is a deliberate two-step confirmation). No label→behavior mismatches found in any delete/confirm flow checked. One minor jargon gap: "MFA" is used 12× and never expanded to "multi-factor authentication." A few icon-only `MoreHorizontal` action buttons lack `aria-label`.

## Weight & Friction Evidence

**Dependency weight:** 34 runtime dependencies; heaviest packages on disk: monaco-editor 74M, antd 58M, @kubernetes/client-node 56M, @ant-design 46M, recharts 9.1M, framer-motion 5.6M, @xyflow 5.3M. No bundle-analyzer, no code-splitting/manualChunks config in `electron.vite.config.ts` — all of Monaco/antd/recharts/framer-motion/@xyflow ship as direct dependencies with no lazy-loading evidence found.

**Idle animation:** 17 distinct `infinite`-iteration CSS animations found across global.css that run continuously while their element is mounted (not hover/click-gated) — including 5 background "splash-drift" animations (22-30s), several VPN-visualization pulses/shimmers (1-2s), a status-dot pulse, a live-indicator pulse, and generic shimmer/spin loaders.

**Reduced motion:** Zero matches for `prefers-reduced-motion` anywhere in the renderer — none of the 17 idle animations (or any hover/transition) are gated for users who've asked the OS to reduce motion.

**Root-mounted chrome:** `App.tsx` unconditionally mounts `AppLayout`, `UpdateNotificationBanner`, `UpdateCenterModal`, `GlobalSearchModal`, `VpnSessionPromptModal`. A first-run (or post-update) cold start auto-shows a full-screen feature-tour splash with no user action required, and the update-checker runs every boot, capable of surfacing a toast unprompted.

**Polling discipline:** Most renderer polling is properly visibility/focus-gated via a shared `useLiveRefetchInterval` hook (used by ~9 hooks) and `useTopologyGraph`'s explicit `document.visibilityState` check. Two clear exceptions: `usePortForwards.ts` refetches every 2s regardless of tab/window focus, and several **main-process** timers (VPN stats every 1s while connected, notes-reminder scheduler every 5s, auto-update check every 4h) run unconditionally since the concept of "tab active" doesn't apply to the main process — expected, but worth noting as continuous background work while the app is merely open and idle.

## Supplementary Structural Finding — Cluster Overview vs. Nodes page duplication (user-reported, verified)

The user independently flagged that "Cluster Overview" and "Nodes" look almost identical. Verified directly:

- Both pages call `useClusterMetrics(clusterId, isActive)` and render `<NodesHealthBanner data={metrics} />` from the exact same data (`ClusterOverviewPage.tsx:31,54`; `NodesOverviewPage.tsx:209,299`).
- `ClusterOverviewPage.tsx:100-141` renders a 4-card `ResourceUsageCard` grid (CPU/Memory/Pods/Nodes) built inline; `NodesResourceGrid.tsx:73-110` (used by `NodesOverviewPage.tsx:306`) renders a 3-card `ResourceUsageCard` grid (CPU/Memory/Pods Capacity) — same component, same icons (`Cpu`/`MemoryStick`/`Box`), same accent colors (`var(--ml-primary)`, `#6366f1`, `#38bdf8`), same underlying `ClusterMetricsSummary` fields, just missing the 4th "Nodes" card and adding hover-popover history charts.
- Net effect: a user checking cluster health has two menu entries (Overview → Cluster, and the standalone Nodes page) that both open with the identical health banner and near-identical CPU/Memory/Pods usage cards, differing mainly in what's *below* the fold (Cluster Overview: namespace/deployment/service counts + recent events; Nodes: node table + hotspots + node-scoped events). This is a direct violation of principle #10 (two surfaces doing the same job) and weakens #4 (unclear which page is "the" health page).

## Accessibility Evidence

No `<main>` element or `role="main"` found anywhere in `AppShell.tsx`. No skip-link found anywhere in the renderer. The resource-kind tab bar correctly uses `role="tab"`/`role="tablist"` and a roving-tabindex pattern (`tabIndex={active ? 0 : -1}`), and all interactive affordances are either native `<button>` elements or have compensating `role`+`tabIndex`+manual `onKeyDown` — but the roving-tabindex tab list has **no `ArrowLeft`/`ArrowRight` key handling** to move focus between tabs (only `Enter`/`Space` to activate the currently-focused one), which is the core interaction the ARIA `tab` pattern implies. Total ARIA landmarks/roles across the 4 files audited: 9 `role=` attributes, 2 `<nav>`, 1 `<header>`, 0 `<main>`.
