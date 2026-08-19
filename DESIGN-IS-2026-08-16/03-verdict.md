# Verdict — MagicLens Design Audit

**Total: 20/30. No principle scored 0. → REFINE.**

MagicLens has a sound structure — a real semantic design-token system, an honest and consistently-gated confirmation UX, a fast primary resource-management workflow, and a differentiated feature set beyond its Lens-derived navigation pattern — but its execution has measurable consistency debt: the token system it built is inconsistently enforced (raw color/spacing/type values leak past it throughout the stylesheet), focus-visible styling is nearly absent, motion is never gated for reduced-motion users, the JS-heavy dependency set ships unsplit, and one concrete page-level duplication (Cluster Overview vs. Nodes) confuses which surface is authoritative for cluster health. None of this is a foundational or purpose-level failure — every finding is a "tighten what's already there" fix, not a "start over" one. That is the textbook REFINE case: the bones are good, iterate.

## Top 5 highest-leverage moves

1. **[#10/#4] Resolve the Cluster Overview / Nodes duplication.** Both pages independently call `useClusterMetrics` and render `NodesHealthBanner` plus a near-identical CPU/Memory/Pods `ResourceUsageCard` grid (`ClusterOverviewPage.tsx:54,100-141` vs. `NodesOverviewPage.tsx:299,306` / `NodesResourceGrid.tsx:73-110`). Pick one canonical home for cluster-wide health/usage and have the other page link to it instead of re-rendering it.

2. **[#3] Enforce the design-token system instead of leaking past it.** `tokens.ts:22-30` declares a 7-step spacing scale that is never wired into any CSS custom property (dead code); 19+ ad hoc spacing values, 20 font-size values (vs. a 6-step type scale), and 220 raw hex/rgb color literals bypass the token system across `global.css`. Wire the declared tokens into `buildTheme.ts` and sweep the stylesheet to consume them.

3. **[#8] Build out `:focus-visible` coverage.** Only 4 rules exist across a 14,027-line stylesheet (`global.css:852,3404,3611,3684`) despite dozens of distinct custom interactive-element classes (tabs, list rows, table rows, toolbar buttons). Add a systematic focus-ring treatment keyed to the existing `--ml-primary` token.

4. **[#9] Respect `prefers-reduced-motion`; split the heaviest bundles.** Zero matches for `prefers-reduced-motion` anywhere in the renderer despite 17 always-running CSS animations. `electron.vite.config.ts` has no code-splitting for Monaco (74M)/antd/@kubernetes-client/recharts/framer-motion/@xyflow, all of which ship as direct dependencies with no lazy-loading evidence found.

5. **[#2/#10] Nodes dashboard: replace fixed-order sections with real flexibility.** User-requested. Today `NodesDashboardSettings.tsx` only supports show/hide + linear reorder of fixed-height sections. The user wants more widget/metric options and a genuinely flexible (not necessarily full drag-anywhere) panel layout — this should be scoped and planned explicitly rather than bolted on ad hoc, since it's the one item in this audit that is a feature request rather than a consistency fix.

**Minor items to fold into the plan's polish pass (not standalone moves):** expand "MFA" on first use (`en.ts`, 12 occurrences, never expanded); add `aria-label` to icon-only `MoreHorizontal` kebab buttons (`ResourceRowActions.tsx:148`, `WorkloadResourceRowActions.tsx:211`, `HelmRowActions.tsx:14`); add `ArrowLeft`/`ArrowRight` keyboard handling to the resource-kind tab list to complete the ARIA `tab` pattern it already started (`ResourceKindTabBar.tsx`).
