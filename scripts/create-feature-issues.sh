#!/usr/bin/env bash
# Creates GitHub issues for the MagicLens feature roadmap.
# Safe to re-run: skips creation if an open issue with the same title already exists.

set -euo pipefail
cd "$(dirname "$0")/.."

issue_exists() {
  local title="$1"
  gh issue list --state open --search "in:title \"$title\"" --json title --jq ".[] | select(.title==\"$title\") | .title" | grep -qxF "$title"
}

create_issue() {
  local milestone="$1"
  shift
  local labels="$1"
  shift
  local title="$1"
  shift
  local body="$1"

  if issue_exists "$title"; then
    echo "SKIP (exists): $title"
    return 0
  fi

  gh issue create \
    --title "$title" \
    --body "$body" \
    --label "$labels" \
    --milestone "$milestone"
  echo "CREATED: $title"
}

# ─── Phase 0 — Platform ───────────────────────────────────────────────────────

create_issue "Phase 0 — Platform" "epic,area/platform,enhancement" \
"[Epic] Platform: Prometheus discovery & connection" "$(cat <<'EOF'
## Summary
Detect whether the cluster exposes Prometheus and resolve a query URL usable from the main process.

## Acceptance criteria
- [ ] Discover Prometheus via common patterns (kube-prometheus Service, `app.kubernetes.io/name=prometheus`, CRDs)
- [ ] Store per-cluster Prometheus base URL + availability flag
- [ ] Health check endpoint (`/api/v1/status/config` or `/api/v1/query?query=up`)
- [ ] Settings UI: manual Prometheus URL override (optional fallback)
- [ ] IPC: `prometheus:getStatus`, `prometheus:query`, `prometheus:queryRange`

## Suggested PRs
1. Main: discovery service + persistence
2. IPC + preload + shared types
3. Settings UI + cluster status indicator

## Notes
Metrics-server remains the source for **instant** metrics when Prometheus is absent.
EOF
)"

create_issue "Phase 0 — Platform" "epic,area/platform,enhancement" \
"[Epic] Platform: Metrics backend abstraction" "$(cat <<'EOF'
## Summary
Unify instant (metrics-server) and historical (Prometheus) metrics behind one API.

## Acceptance criteria
- [ ] `MetricsProvider` interface: `getInstant()`, `getRange(start, end, step)`
- [ ] Renderer hooks: `useInstantMetrics`, `useRangeMetrics`
- [ ] Graceful degradation when historical unavailable
- [ ] Shared time-range types (5m, 15m, 30m, 1h, 3h, 6h, 12h, 24h, custom)

## Suggested PRs
1. Shared types + main service
2. Renderer hooks + query keys
3. Wire into Node/Pod metrics panels

## Depends on
- Prometheus discovery issue
EOF
)"

create_issue "Phase 0 — Platform" "epic,area/platform,enhancement" \
"[Epic] Platform: Workload action registry" "$(cat <<'EOF'
## Summary
Central registry mapping resource kind → available actions (row menu, detail toolbar, bulk).

## Acceptance criteria
- [ ] `ResourceAction` type: id, label, icon, handler, permission, confirm?
- [ ] Kind-specific action lists (Pods, Deployments, …)
- [ ] Shared `ResourceActionsMenu` component
- [ ] IPC mutation helpers with list cache invalidation

## Suggested PRs
1. Registry + types
2. UI menu component
3. Migrate Pod/Deployment first; expand per kind in later issues
EOF
)"

create_issue "Phase 0 — Platform" "area/platform,enhancement" \
"RBAC permission check before destructive actions" "$(cat <<'EOF'
## Summary
Check SelfSubjectAccessReview (or equivalent) before showing/enabling delete, scale, drain, etc.

## Acceptance criteria
- [ ] IPC: `rbac:canI(verb, resource, namespace, name?)`
- [ ] Actions disabled/hidden when denied
- [ ] Tooltip explaining missing permission

## Suggested PR
Single PR after action registry exists.
EOF
)"

# ─── Phase 1 — Metrics ────────────────────────────────────────────────────────

create_issue "Phase 1 — Metrics" "epic,area/metrics,enhancement" \
"[Epic] Metrics: Time range selector UI" "$(cat <<'EOF'
## Summary
Let users pick a time window on metric screens.

## Ranges
- [ ] Last 5 / 15 / 30 minutes
- [ ] Last 1 / 3 / 6 / 12 / 24 hours
- [ ] Custom date/time range picker

## Surfaces
- [ ] Node metrics panel
- [ ] Pod metrics panel
- [ ] Cluster metrics summary (where applicable)

## Suggested PRs
1. Shared `MetricsTimeRange` control + store
2. Integrate into Node panel
3. Integrate into Pod panel + cluster summary
EOF
)"

create_issue "Phase 1 — Metrics" "area/metrics,enhancement" \
"Historical metrics via Prometheus (CPU & Memory)" "$(cat <<'EOF'
## Metrics
- [ ] CPU usage (node, pod, container)
- [ ] Memory usage (node, pod, container)

## Acceptance criteria
- [ ] Prometheus `query_range` with selected time range
- [ ] Charts render historical series (Recharts)
- [ ] If no Prometheus: show instant only + warning banner:
  > Historical metrics require Prometheus integration.

## Suggested PRs
1. PromQL templates + main query service
2. Node historical charts
3. Pod historical charts
EOF
)"

create_issue "Phase 1 — Metrics" "area/metrics,enhancement" \
"Historical metrics: Network, Disk, Restarts" "$(cat <<'EOF'
## Metrics (Prometheus required)
- [ ] Network receive / transmit
- [ ] Disk usage
- [ ] Pod restart count
- [ ] Container restart count

## Suggested PRs
1. Network series (node/pod)
2. Disk series
3. Restart counters + table badges
EOF
)"

create_issue "Phase 1 — Metrics" "area/metrics,enhancement" \
"Historical metrics: Node pressure, HPA scale, Deployment replicas" "$(cat <<'EOF'
## Metrics (Prometheus required)
- [ ] Node pressure events (memory/disk/PID pressure)
- [ ] HPA scale history
- [ ] Deployment replica history

## Suggested PRs
1. Node pressure panel / events overlay
2. HPA detail: scale history chart
3. Deployment detail: replica timeline
EOF
)"

# ─── Phase 2 — Logs ───────────────────────────────────────────────────────────

create_issue "Phase 2 — Logs" "epic,area/logs,enhancement" \
"[Epic] Log viewer: Load modes & tail presets" "$(cat <<'EOF'
## Features
- [ ] Load from beginning
- [ ] Load from end (tail)
- [ ] Tail presets: 100 / 500 / 1000 / 5000 lines
- [ ] From selected time (`sinceTime`)
- [ ] Previous crashed container logs

## Backend
- [ ] Extend log IPC: `tailLines`, `sinceTime`, `sinceSeconds`, `previous`, `timestamps`

## Suggested PRs
1. Backend log API params
2. UI toolbar + mode selector
3. Previous container support
EOF
)"

create_issue "Phase 2 — Logs" "area/logs,enhancement" \
"Log viewer: Follow / tail mode with pause & resume" "$(cat <<'EOF'
## Features
- [ ] True follow mode (stream attach/detach)
- [ ] Pause / resume streaming (not just auto-scroll)
- [ ] Auto-scroll on/off toggle

## Suggested PR
1. Main: pause/resume in `podLogManager`
2. UI: Follow + Auto-scroll controls
EOF
)"

create_issue "Phase 2 — Logs" "area/logs,enhancement" \
"Log viewer: Search, regex, highlight" "$(cat <<'EOF'
## Features
- [ ] Plain text search
- [ ] Regex search
- [ ] Match highlight + next/prev match navigation

## Suggested PRs
1. Search bar + highlight renderer
2. Regex mode + validation
EOF
)"

create_issue "Phase 2 — Logs" "area/logs,enhancement" \
"Log viewer: Virtualized rendering & infinite scroll" "$(cat <<'EOF'
## Features
- [ ] Virtualized log list (react-virtual or similar)
- [ ] Infinite scroll when loading older chunks from beginning
- [ ] Performance: 50k+ lines without UI freeze

## Suggested PRs
1. Virtual list component
2. Paginated fetch for "load older" when scrolling up
EOF
)"

create_issue "Phase 2 — Logs" "area/logs,enhancement" \
"Log viewer: Download, wrap, timestamps, log levels" "$(cat <<'EOF'
## Features
- [ ] Download visible logs
- [ ] Download full logs (existing — extend for tail/since modes)
- [ ] Wrap lines on/off
- [ ] Timestamp toggle
- [ ] Log level colorization (ERROR/WARN/INFO patterns)

## Suggested PRs
1. Download visible vs full
2. Wrap + timestamp toggles
3. Level coloring
EOF
)"

# ─── Phase 3 — Workloads ──────────────────────────────────────────────────────

create_issue "Phase 3 — Workloads" "epic,area/workloads,enhancement" \
"[Epic] Pods: Extended actions & detail tabs" "$(cat <<'EOF'
## Row / detail actions
- [ ] View details (exists)
- [ ] View / Edit YAML (exists)
- [ ] Delete pod (exists)
- [ ] View logs / Follow / Previous logs
- [ ] Exec terminal (exists)
- [ ] Port forward (partial — extend from network tab)
- [ ] View events / metrics / containers (partial)
- [ ] View volumes
- [ ] View environment variables
- [ ] Copy pod name / namespace
- [ ] Open node detail
- [ ] Restart pod
- [ ] Evict pod
- [ ] Add debug container (kubectl debug style)
- [ ] Describe output view

## Suggested PRs
1. Copy actions + open node
2. Restart / evict / debug container
3. Volumes + env vars tabs
4. Describe panel
EOF
)"

create_issue "Phase 3 — Workloads" "epic,area/workloads,enhancement" \
"[Epic] Deployments: Rollout & scale operations" "$(cat <<'EOF'
## Actions
- [ ] Scale replicas
- [ ] Restart rollout
- [ ] Pause / resume rollout
- [ ] Rollback rollout + history
- [ ] View ReplicaSets
- [ ] View Pods
- [ ] Change image
- [ ] Edit env, resources, probes, volumes
- [ ] Port forward selected pod
- [ ] Copy name / namespace

## Suggested PRs
1. Scale + rollout restart/pause/resume
2. Rollback + history modal
3. Linked RS/Pods navigation
4. Patch helpers (image, env, resources, probes)
EOF
)"

create_issue "Phase 3 — Workloads" "area/workloads,enhancement" \
"StatefulSets: workload actions" "$(cat <<'EOF'
- [ ] Scale replicas
- [ ] Restart rollout
- [ ] View pods / PVCs / volumeClaimTemplates
- [ ] Pod ordinal details + PVC bindings
- [ ] Change image, edit resources
- [ ] Rollout status
- [ ] Edit YAML, delete
- [ ] View events / metrics
EOF
)"

create_issue "Phase 3 — Workloads" "area/workloads,enhancement" \
"DaemonSets: workload actions" "$(cat <<'EOF'
- [ ] Restart rollout
- [ ] View pods on nodes / unavailable pods
- [ ] Change image
- [ ] Edit node selector / tolerations
- [ ] Edit YAML, delete
- [ ] View events / metrics
EOF
)"

create_issue "Phase 3 — Workloads" "area/workloads,enhancement" \
"ReplicaSets, Jobs, CronJobs: workload actions" "$(cat <<'EOF'
## ReplicaSets
- [ ] View pods, scale, edit YAML, delete, owner deployment, events/metrics

## Jobs
- [ ] View pods/logs, rerun, suspend/resume, completion status, create from CronJob

## CronJobs
- [ ] Suspend/resume, manual trigger, edit schedule/concurrency/history limits
- [ ] View jobs/logs, edit YAML, delete
EOF
)"

# ─── Phase 4 — Networking & Config ────────────────────────────────────────────

create_issue "Phase 4 — Networking & Config" "epic,area/networking,enhancement" \
"[Epic] Services & Ingress extended actions" "$(cat <<'EOF'
## Services
- [ ] Port forward (auto/custom local port, stop, open URL)
- [ ] View endpoints / endpoint slices
- [ ] Copy ClusterIP / ExternalIP / DNS name

## Ingresses
- [ ] Open HTTP/HTTPS in browser (partial — hosts exist)
- [ ] Copy URL, view TLS secret / backend / rules
- [ ] Validate backend service + broken backend warning
EOF
)"

create_issue "Phase 4 — Networking & Config" "area/networking,enhancement" \
"EndpointSlices, Endpoints, NetworkPolicies" "$(cat <<'EOF'
## Endpoints / EndpointSlices
- [ ] Backend pod IPs, ports, readiness
- [ ] Open related pod/service

## NetworkPolicies
- [ ] Ingress/egress rules view
- [ ] Visual network graph
- [ ] Affected pods, allowed namespaces/ports
EOF
)"

create_issue "Phase 4 — Networking & Config" "epic,area/config,enhancement" \
"[Epic] ConfigMaps & Secrets editors" "$(cat <<'EOF'
## ConfigMaps
- [ ] Key-value editor, add/delete keys, multi-line editor, search values
- [ ] Show mounted pods, copy value

## Secrets
- [ ] Mask by default, reveal with confirmation
- [ ] Auto base64 encode/decode
- [ ] TLS cert viewer, docker-registry secret viewer
- [ ] Show mounted pods
EOF
)"

create_issue "Phase 4 — Networking & Config" "area/config,enhancement" \
"ResourceQuotas, LimitRanges, HPA, PDB" "$(cat <<'EOF'
## ResourceQuotas — usage %, warnings, edit/delete
## LimitRanges — default/min/max view & edit
## HPA — min/max/target edit, scale history, current metrics
## PDB — minAvailable/maxUnavailable, allowed disruptions, affected pods
EOF
)"

# ─── Phase 5 — Storage & Cluster ──────────────────────────────────────────────

create_issue "Phase 5 — Storage & Cluster" "area/storage,enhancement" \
"PVC, PV, StorageClass actions" "$(cat <<'EOF'
## PVC — capacity, storage class, access mode, bound PV, expand, mounted pods
## PV — reclaim policy, claim ref, backend info, edit/delete
## StorageClass — provisioner, binding mode, set default SC
EOF
)"

create_issue "Phase 5 — Storage & Cluster" "epic,area/cluster,enhancement" \
"[Epic] Nodes extended management" "$(cat <<'EOF'
- [ ] CPU/memory/disk/network metrics (disk/network → Prometheus)
- [ ] Running pods list
- [ ] Taints, labels, annotations, conditions
- [ ] Cordon / uncordon / drain
- [ ] Edit labels / taints / YAML
- [ ] Node shell (partial — node exec exists)
EOF
)"

create_issue "Phase 5 — Storage & Cluster" "area/cluster,enhancement" \
"Namespaces & Events enhancements" "$(cat <<'EOF'
## Namespaces
- [ ] Resources inside namespace, quotas, limit ranges, events
- [ ] Create, edit labels/annotations/YAML, delete

## Events
- [ ] Live stream, namespace/type/object filters, warning-only, search, export
EOF
)"

# ─── Phase 6 — RBAC, Helm, CRD, General ───────────────────────────────────────

create_issue "Phase 6 — RBAC, Helm, CRD & General" "area/rbac,enhancement" \
"ServiceAccounts, Roles, RoleBindings views & edit" "$(cat <<'EOF'
## ServiceAccounts — secrets, tokens, roles, bindings
## Roles / ClusterRoles — rules editor, add/remove rule
## RoleBindings / ClusterRoleBindings — subjects, add/remove
EOF
)"

create_issue "Phase 6 — RBAC, Helm, CRD & General" "area/helm,enhancement" \
"Helm releases: upgrade, rollback, values edit" "$(cat <<'EOF'
- [ ] View release / values / manifest / history / notes (partial)
- [ ] Edit values
- [ ] Upgrade release
- [ ] Rollback release
- [ ] Uninstall (exists)
EOF
)"

create_issue "Phase 6 — RBAC, Helm, CRD & General" "area/crd,enhancement" \
"CRD / custom resources: schema & discovery polish" "$(cat <<'EOF'
- [ ] Auto discover (exists)
- [ ] CRD schema viewer when available
- [ ] Group by API group, search by kind
- [ ] Create/edit/delete/YAML (partial)
EOF
)"

create_issue "Phase 6 — RBAC, Helm, CRD & General" "epic,area/general,enhancement" \
"[Epic] Cross-cutting resource features" "$(cat <<'EOF'
All resource kinds should support where applicable:

- [ ] Search / filter / sort (partial)
- [ ] YAML view / edit (partial)
- [ ] Diff preview before apply
- [ ] Apply
- [ ] Delete (partial)
- [ ] Copy name / namespace / YAML
- [ ] View events (partial)
- [ ] Owner references, labels, annotations in detail
- [ ] Favorite resource (tabs partial)
- [ ] Open in new tab / split view (partial)
- [ ] Refresh / live watch (partial)
- [ ] Export CSV / JSON / YAML
- [ ] Audit action history
- [ ] Undo for supported actions
EOF
)"

create_issue "Phase 6 — RBAC, Helm, CRD & General" "epic,enhancement" \
"[Tracking] MagicLens Feature Roadmap — master checklist" "$(cat <<'EOF'
Master tracking issue for the full feature spec. Link child issues as they are completed.

## Phases
- [ ] **Phase 0** — Platform (Prometheus, metrics abstraction, action registry, RBAC)
- [ ] **Phase 1** — Metrics time range + historical Prometheus metrics
- [ ] **Phase 2** — Advanced log viewer
- [ ] **Phase 3** — Workload actions (Pods → CronJobs)
- [ ] **Phase 4** — Networking & Config
- [ ] **Phase 5** — Storage & Cluster
- [ ] **Phase 6** — RBAC, Helm, CRD, cross-cutting

## How to use
1. Pick a phase milestone in GitHub
2. Implement one issue ≈ one focused PR (or split sub-PRs listed in issue body)
3. Close linked issues when merged

## Current baseline (v0.1.6)
- metrics-server instant metrics, session charts
- Basic pod logs (tail 500, stream, download)
- Resource tables with watch, YAML edit/delete, batch delete
- Pod detail: logs, exec, metrics, network
- Helm: releases list, detail, uninstall
- Node exec, resizable columns, resource tab favorites/split
EOF
)"

echo "Done."
