<div align="center">

<img src="resources/icon.png" width="88" alt="MagicLens">

# MagicLens

**A native Kubernetes desktop for macOS, Windows, and Linux.**

Every cluster in one window — browse, debug, and operate without leaving the desktop.

<br>

[![Download](https://img.shields.io/github/v/release/magicorntech/magiclens?label=Download&style=for-the-badge&color=E24B3B)](https://github.com/magicorntech/magiclens/releases/latest)
[![macOS](https://img.shields.io/badge/macOS-arm64%20%7C%20Intel-555?style=for-the-badge)](https://github.com/magicorntech/magiclens/releases/latest)
[![Windows](https://img.shields.io/badge/Windows-x64-555?style=for-the-badge)](https://github.com/magicorntech/magiclens/releases/latest)
[![Linux](https://img.shields.io/badge/Linux-AppImage%20%7C%20deb-555?style=for-the-badge)](https://github.com/magicorntech/magiclens/releases/latest)

[Latest release](https://github.com/magicorntech/magiclens/releases/latest) ·
[All versions](https://github.com/magicorntech/magiclens/releases) ·
[Support](mailto:support@magicorn.co)

</div>

<p align="center">
  <img src="docs/screenshots/magiclens-nodes.png" alt="MagicLens nodes overview" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-clusters.png" alt="MagicLens cluster list" width="920">
</p>

---

## Download

MagicLens ships as **signed desktop installers**. Get the app from a **GitHub Release** — each version is a tag (`v0.1.25`, …). There is no source checkout and nothing to build.

**[Download the latest release →](https://github.com/magicorntech/magiclens/releases/latest)**

| You use | Install this file |
| --- | --- |
| macOS, Apple Silicon | `MagicLens-<version>-arm64.dmg` |
| macOS, Intel | `MagicLens-<version>.dmg` |
| Windows | `MagicLens-Setup-<version>.exe` |
| Linux | `MagicLens-<version>.AppImage` or `.deb` |

Older versions live on the same [Releases](https://github.com/magicorntech/magiclens/releases) page, one tag per build.

macOS builds are Developer ID signed and notarized. Windows installers are Authenticode-signed. After you install, MagicLens checks for new tags in the background — you choose when to apply an update.

### After install

1. Open MagicLens and add a kubeconfig (file or folder). The default scan path is `~/.kube`; you can point it at any file or directory.
2. Connect a cluster and open it as a tab.
3. Use the sidebar — Nodes, Workloads, Storage, Helm, Argo CD, Visualizer, Timeline, and the rest of the cluster.

---

## Why MagicLens

- **Local-first** — Talks to the Kubernetes API with your existing kubeconfig. Cluster data stays on your machine. Nothing is uploaded unless you opt into a hosted account feature.
- **Multi-cluster, one window** — Several contexts as tabs. Workspaces with names, logos, and accents. Split view for staging vs production. Cloud provider logos (AWS, GCP, Azure, Huawei) when the kubeconfig gives them away.
- **Operate, don’t just watch** — Scale, restart, roll back, change images, exec, tail logs, forward ports, sync Argo apps, install or roll back Helm — from the same UI.
- **See the shape of the cluster** — Nodes overview, Visualizer map, Topology graph, and an event Timeline sit next to the live tables.

---

## Clusters & workspaces

Scan a kubeconfig file or a folder of configs. Connect many clusters at once, pin favorites, and keep each context as a tab with its own namespace filter and last-opened resource.

Workspaces group clusters the way your org actually works — Aurora, payments, edge, observability. Give a workspace a name, logo, accent colour, and an optional shortcut that expands it and opens its clusters. Duplicate contexts that share the same API server and credentials can be merged into one entry.

Cluster avatars use your custom logo when you set one. Otherwise MagicLens reads the kubeconfig (server URL, context name, exec plugin) and shows AWS, Google Cloud, Azure, or Huawei when it can tell.

Each cluster has its own settings: environment tag, HTTP proxy, default namespace, pinned namespaces, Prometheus URL, terminal shell, node shell, and wallpaper.

<p align="center">
  <img src="docs/screenshots/magiclens-workspaces.png" alt="MagicLens workspaces and nodes overview" width="920">
</p>

---

## Nodes overview

The Nodes page is a fleet dashboard, not only a table. Kubelet versions, roles, ready / not-ready counts, CPU and memory capacity vs usage, pod capacity, and hotspots (highest CPU, highest memory, newest and oldest nodes, restart leaders) sit above the node list.

You can hide or reorder those sections and switch them between full and half width. One not-ready node turns the health strip to Degraded so you see it before you scroll.

<p align="center">
  <img src="docs/screenshots/magiclens-nodes.png" alt="MagicLens nodes overview" width="920">
</p>

---

## Resource explorer

Live-watched tables for the Kubernetes objects you work with every day. Namespace filter (all, pinned, system, apps), column picker, search, YAML edit / apply / delete, and a detail view that can open as a right drawer, a split panel, or a bottom tab.

**Workloads** — Pods, Deployments, StatefulSets, DaemonSets, ReplicaSets, ReplicationControllers, Jobs, CronJobs.

**Config** — ConfigMaps, Secrets, ResourceQuotas, LimitRanges, HorizontalPodAutoscalers, PodDisruptionBudgets, PriorityClasses, RuntimeClasses, Leases, admission webhooks and validating admission policies.

**Network** — Services, Endpoints, EndpointSlices, Ingresses, IngressClasses, NetworkPolicies.

**Storage** — PersistentVolumeClaims, PersistentVolumes, StorageClasses.

**Access** — ServiceAccounts, Roles, RoleBindings, ClusterRoles, ClusterRoleBindings.

**Custom resources** — CRDs and live instances on one page (All / Installed), plus discovered API groups and versions.

Global search (`⌘K` / `Ctrl+K`) jumps to clusters, namespaces, and resources. Bindings are editable in Settings → Keyboard; conflicting shortcuts swap automatically.

<p align="center">
  <img src="docs/screenshots/magiclens-pods.png" alt="MagicLens pods table" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-ingress.png" alt="MagicLens Ingresses" width="920">
</p>

---

## Workloads & pods

Scale a Deployment or StatefulSet, restart a rollout, pause or resume it, roll back to a previous ReplicaSet, or change a container image. Run or suspend Jobs and CronJobs. Batch-delete pods when you need a clean reschedule.

Open a pod and you get overview, containers, metrics, network (services and ports), logs, exec, events, Sparks notes, and YAML in one place. The overview shows phase, ready, restarts, node, IPs, QoS, owner, conditions, and scheduling.

<p align="center">
  <img src="docs/screenshots/magiclens-pod-detail.png" alt="MagicLens pod detail" width="920">
</p>

---

## Logs

Open Logs on a Pod or on a Deployment. A workload view merges every replica into one stream (`All pods`) so you can follow `storefront` without opening five containers. Pick a single pod when you need to isolate a crash.

Tail length (100 / 500 / …), timestamps, previous instance, wrap, follow, filter, and download. Restart the stream without leaving the panel. The same toolbar sits on the resource detail drawer and in split view.

<p align="center">
  <img src="docs/screenshots/magiclens-workload-logs.png" alt="MagicLens merged deployment logs" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-logs.png" alt="MagicLens workload log stream" width="920">
</p>

## Exec & terminals

Exec is an interactive shell inside the container — stdin, resize, and a reconnect button if the session drops. Node shell is available from cluster settings when you need the host.

Local terminals inherit that cluster’s kubeconfig context, default namespace, and optional extra environment. A YAML scratch editor sits next to the terminal so you can draft a manifest without opening another app. The Terminal / YAML dock can sit at the bottom, right, or left. A quick-actions balloon (terminal, blank YAML, new Spark) parks on a corner — or drag it anywhere.

<p align="center">
  <img src="docs/screenshots/magiclens-exec.png" alt="MagicLens pod exec" width="920">
</p>

---

## Storage & metrics

PVC tables show capacity, used bytes, and percent full when Prometheus scrapes `kubelet_volume_stats_*`. PersistentVolumes and StorageClasses (provisioner, reclaim policy, age) sit in the same Storage section.

Live CPU and memory come from metrics-server (nodes and pods). Historical charts, disk fullness, and node pressure need Prometheus — auto-discovered through the API-server service proxy, or a URL you set on the cluster. If Prometheus is missing, live metrics still work; history simply stays empty.

<p align="center">
  <img src="docs/screenshots/magiclens-storage.png" alt="MagicLens PersistentVolumeClaims" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-storageclasses.png" alt="MagicLens StorageClasses" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-metrics.png" alt="MagicLens pod CPU and memory metrics" width="920">
</p>

---

## Visualizer & Topology

**Visualizer** is a cluster-wide map: namespaces and Helm releases as groups, workloads and services as cards, brand icons from the container image (nginx, postgres, redis, Argo, …). Click a card for the full resource detail. It is a separate page from Topology — both stay in the sidebar.

**Topology** is the namespace graph: Deployments, Services, Ingresses, and volumes, with health on the nodes so you can jump from an application to its live dependencies.

<p align="center">
  <img src="docs/screenshots/magiclens-visualizer.png" alt="MagicLens Visualizer map" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-topology.png" alt="MagicLens topology map" width="920">
</p>

---

## Timeline

Recent cluster events as a Gantt. Filter by namespace, kind, and warning vs normal. Density on the top strip shows when the cluster was noisy. Hover a bar for reason and message — the same events you would `kubectl get events` for, laid out in time.

<p align="center">
  <img src="docs/screenshots/magiclens-timeline.png" alt="MagicLens event timeline" width="920">
</p>

---

## Helm

Browse installed charts and releases. Open a release for values (YAML), owned resources, history, rollback, and uninstall. The catalog searches known repos so you can inspect a chart, edit values, and install without leaving the app.

<p align="center">
  <img src="docs/screenshots/magiclens-helm.png" alt="MagicLens Helm chart catalog" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-helm-releases.png" alt="MagicLens Helm release detail" width="920">
</p>

---

## Argo CD, Grafana & Prometheus

Argo CD is first-class: dashboard, Applications, ApplicationSets, projects, repositories, and clusters, read from `argoproj.io` CRDs. Sync or refresh one app or many — no extra Argo API URL or token.

Grafana and Prometheus open as cluster apps when MagicLens finds the Service (or you paste a URL). Sessions stay alive via port-forward; you can also set a manual URL, username, and password per cluster.

<p align="center">
  <img src="docs/screenshots/magiclens-grafana.png" alt="MagicLens Grafana cluster app" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-prometheus.png" alt="MagicLens Prometheus cluster app" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-argocd.png" alt="MagicLens Argo CD web UI" width="920">
</p>

---

## Port forwarding

Forward a Pod or Service to a local port in a couple of clicks. Every open tunnel — across all clusters — is listed in Settings → Port Forwarding. Idle forwards can close themselves after 15 minutes to 4 hours, or never.

---

## Split view

Keep two cluster tabs side by side: Visualizer vs Nodes, Deployments vs Pods, staging vs production. Each pane has its own resource and namespace. Toggle with `⌘\` / `Ctrl+\` (configurable).

<p align="center">
  <img src="docs/screenshots/magiclens-split.png" alt="MagicLens split view" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-split-visualizer.png" alt="MagicLens split Visualizer and nodes" width="920">
</p>

---

## Sparks

Sparks is a **local Markdown notebook** inside MagicLens — runbooks, incident notes, sketches, and reminders that stay on your disk. Nothing is uploaded. The vault is a folder of `.md` files you can open in Finder, back up, or move. Change the vault location or import a tree of Markdown from another folder.

Every note can attach to **global**, a **workspace**, a **cluster**, or a **resource** (kind + namespace + name). Open a Deployment and the Sparks tab already shows the notes that belong to it. The sidebar also lists resource **alarms** so an overdue PVC note is one click from the object.

<p align="center">
  <img src="docs/screenshots/magiclens-sparks.png" alt="MagicLens Sparks notes vault" width="920">
</p>

**Write like a notebook.** Three modes: Write (editor only), Split (editor + live preview), Read (rendered page — click `[[wiki links]]` to jump). Title, body, pin, and optional reminder sit on the note. Tabs stay open; pin a tab, drag to reorder. Search covers titles, tags, and paths.

**Folders.** Nested folders with a name, icon, or photo. Move notes by drag-and-drop (including back to the vault root). Deleting a folder that still has notes takes two confirmations so a whole runbook tree is not one mis-click.

**Wiki links & graph.** `[[Note title]]` creates an outgoing link. Missing links can create the note. The links panel shows outbound links and backlinks. **Graph** maps every note as a node — click a node to open it. Empty graph copy tells you to add `[[links]]` to grow the map.

<p align="center">
  <img src="docs/screenshots/magiclens-sparks-graph.png" alt="MagicLens Sparks note graph" width="920">
</p>

**Canvas.** A free board: drop note cards, stickies, and connections. Arrange incident timelines or architecture sketches spatially. Clear the board with a confirm.

**Draw on the page.** Switch the surface from Write to Draw: pen, highlighter, eraser, rectangle, ellipse, line, arrow, undo, clear. Attachments (photo, video, file) land in the note and on disk under the vault. Drawings stay with the Markdown — they do not leave the machine.

**Paper.** Lined, grid, or notebook backgrounds. Narrow / normal / wide / full width, zoom, and page length (normal / tall / extra long) so a long postmortem still feels like a page.

**Split layouts.** Single panel, two notes side by side, Note + Graph, Note + Canvas, or Graph + Canvas. Open a second note into the focused pane.

**Reminders.** Once, weekly, monthly, or specific dates. OS + in-app notification (keep MagicLens open). Weekly and monthly alarms keep firing until you clear them. Upcoming alarms appear in the sidebar; overdue items stay visible. Inbox collects pings.

**Themes.** Sparks has its own vault look — System (follows MagicLens), Paper, Parchment, Mono, Matcha, Ocean, Forest, Rose, Ink, Dusk, Nord, Solar, Ember. These do **not** change cluster tables or the rest of the app. Built-in modules (graph, canvas, …) can be toggled in Settings → Sparks.

<p align="center">
  <img src="docs/screenshots/magiclens-sparks-themes.png" alt="MagicLens Sparks vault themes" width="920">
</p>

---

## VPN

Attach OpenVPN, Pritunl, or WireGuard profiles and link them to a cluster so connecting can bring the tunnel up. MagicLens can install or repair the OpenVPN Community CLI and WireGuard helpers (macOS uses Homebrew; OpenVPN Connect is not supported). PIN and MFA prompts stay in the app.

<p align="center">
  <img src="docs/screenshots/magiclens-vpn.png" alt="MagicLens VPN extensions" width="920">
</p>

---

## Appearance & settings

Light, dark, or system theme. Built-in accents (White, Violet, Ocean, Forest, Sunset, …) plus named custom colours. UI fonts include Inter, Manrope, Plus Jakarta Sans, Outfit, and Sora.

Resource detail: right drawer, split panel, or bottom tab. Optional blur behind the drawer. Sidebar can hide Favorites or Workspaces. Language: English, Türkçe, Deutsch, Français, 日本語, 한국어, 中文.

App shortcuts cover search, split view, clusters, VPN, sidebar, and settings. Each workspace can have its own shortcut.

<p align="center">
  <img src="docs/screenshots/magiclens-settings-theme.png" alt="MagicLens theme mode" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-settings-colors.png" alt="MagicLens accent colors" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-settings-layout.png" alt="MagicLens resource detail layout" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-settings-shortcuts.png" alt="MagicLens keyboard shortcuts" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-settings-workspaces.png" alt="MagicLens workspace shortcuts" width="920">
</p>

---

## macOS menu bar

A menu-bar icon opens a live panel for the clusters you pin. Each card can show health, CPU, memory, pods, pending / failed pods, and nodes. Page through three clusters at a time. Colour values amber above 75% and red above 90%. Stacked or side-by-side cards, compact rows, per-cluster accents, and a refresh interval while the panel is open. The tray can stay icon-only or show a live value from the first cluster.

<p align="center">
  <img src="docs/screenshots/magiclens-menubar.png" alt="MagicLens macOS menu bar widget" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-menubar-settings.png" alt="MagicLens menu bar widget settings" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-menubar-content.png" alt="MagicLens menu bar widget metrics" width="920">
</p>

<p align="center">
  <img src="docs/screenshots/magiclens-menubar-layout.png" alt="MagicLens menu bar widget layout" width="920">
</p>

---

## Requirements

| Need | For |
| --- | --- |
| A kubeconfig on disk | Cluster access |
| metrics-server | Live CPU / memory on nodes and pods |
| Prometheus *(optional)* | History, node disks, PVC fullness (`kubelet_volume_stats_*`) |
| OpenVPN Community CLI or WireGuard *(optional)* | PIN + MFA tunnels — OpenVPN Connect is not supported |

UI languages: English, Türkçe, Deutsch, Français, 日本語, 한국어, 中文.

---

## Privacy

MagicLens uses your existing kubeconfig credentials against the cluster API. It does not upload cluster data to Magicorn unless you opt into a hosted account feature. Sparks notes stay in a folder on your disk.

---

## Support

Questions and issues: [support@magicorn.co](mailto:support@magicorn.co)

Installers and past versions: [github.com/magicorntech/magiclens/releases](https://github.com/magicorntech/magiclens/releases)
