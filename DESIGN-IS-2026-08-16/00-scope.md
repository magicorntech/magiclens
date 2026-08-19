# Scope — MagicLens Design Audit

**Audited:** MagicLens repo (`/Users/huseyinyener/Magicorn/magiclens`, branch `release/v0.1.17`) — Electron + Vite + TypeScript + React desktop app, explicitly modeled after Lens ("Lens-style resource sidebar", `resourceNavConfig.ts:41`). Provides Kubernetes cluster discovery (via local kubeconfig files) and a full cluster-management dashboard (resource CRUD, logs, exec, port-forwarding, topology, Helm, plus a "Sparks" notes/vault feature).

**Primary surfaces in scope:**
- Global visual system: typography, color/contrast tokens, spacing scale (`src/renderer/src/styles/global.css`, `src/renderer/src/design-system/tokens.ts`, `src/renderer/src/theme/`)
- Resource-kind list pages (Pods/Services/PVCs/etc — `ResourceTable.tsx`, `.ml-resource-page`)
- Overview pages (Cluster/Workloads/Config/Network/Storage — `src/renderer/src/components/Overview/`)
- Nodes dashboard specifically (`src/renderer/src/components/Nodes/NodesOverviewPage.tsx`, `NodesDashboardSettings.tsx`) — user wants more widget/metric options and more flexible panel layout (not just show/hide/reorder). Column selection for the Nodes table is already implemented — excluded from scope.
- Resource-kind tab bar and resource-detail drawer (already had two rounds of targeted spacing fixes this session — audit should note current state, not re-litigate)

**Primary user:** A DevOps/platform engineer (this app's actual user, `huseyin@magicorn.co`) managing multiple Kubernetes clusters day-to-day — connecting to clusters, inspecting/editing resources, tailing logs, execing into pods, watching for problems.

**Primary task:** Get from "something might be wrong" or "I need to check/change X" to a confirmed answer or completed action, across possibly many open clusters/tabs, as fast and unambiguously as possible.

**Constraints:**
- Stack is fixed: Electron, React 19, antd (Ant Design) as the component library, Tailwind-less hand-rolled CSS with custom properties (`--ml-*` tokens), lucide-react icons. Any recommendation must work within antd's theming API + the existing `--ml-*` token system, not replace them.
- No hard deadline; user asked for a "more professional" feel — this is a polish/refine request, not a rewrite request, unless the audit evidence says otherwise.
- Must stay evidence-driven per Dieter Rams' ten principles — no aesthetic opinions without a citation.

**Reference design:** Lens (the open-source Kubernetes IDE this app is explicitly patterned after) is the implicit competitor/reference, though not independently re-audited here — evidence is drawn from MagicLens's own source only.

**Input materials:** Source code only (no Figma, no screenshots supplied by user). The Electron app is running in dev mode but is not meaningfully screenshot-able in this environment (no OS screen-recording permission granted to this session, confirmed earlier this session), and the renderer isn't functional when opened as a plain browser tab (it depends on `window.api`, an Electron preload IPC bridge unavailable outside the Electron shell). Visual evidence is therefore drawn from source (CSS tokens, component structure) and marked **INFERRED** per the skill's fallback rule for static-repo audits.
