<div align="center">

<img src="resources/icon.png" width="96" alt="MagicLens">

# MagicLens

**Native Kubernetes for macOS, Windows, and Linux.**

One window for every cluster — browse, debug, and operate without leaving the desktop.

[Download](https://github.com/magicorntech/magiclens/releases/latest) ·
[Releases](https://github.com/magicorntech/magiclens/releases) ·
[Support](mailto:support@magicorn.co)

[![Release](https://img.shields.io/github/v/release/magicorntech/magiclens?label=latest)](https://github.com/magicorntech/magiclens/releases/latest)
[![Platforms](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-555)](https://github.com/magicorntech/magiclens/releases/latest)

</div>

<p align="center">
  <img src="docs/screenshots/magiclens-logs.png" alt="MagicLens workload logs" width="920">
</p>

---

## Why MagicLens

- **Local-first** — Talks to the Kubernetes API with your kubeconfig. Cluster data stays on your machine.
- **Multi-cluster** — Open several contexts as tabs. Group them into workspaces with names, logos, and accents.
- **Operate, don’t just watch** — Scale, restart, roll back, exec, forward ports, sync Argo apps, manage Helm — from the same UI.

---

## Highlights

**Clusters & workspaces**  
Scan kubeconfig files or folders. Connect many clusters at once. Favorites, resizable sidebars, light / dark / system themes, and custom accents.

**Resource explorer**  
Live-watched tables for workloads, config, network, storage, RBAC, and CRDs. Namespace filter, global search (⌘K / Ctrl+K), YAML edit / apply / delete.

**Workloads**  
Scale, restart, pause or resume rollouts, roll back, change images, run or suspend Jobs and CronJobs. Pods, aggregated logs, events, and notes on one detail view.

**Logs, exec & terminals**  
Follow and download logs (including merged workload logs). Exec into containers or nodes. Local terminals and a YAML scratch editor from the quick-actions control.

**Port forwarding**  
Forward pods and services; keep active tunnels in one panel.

**Storage & metrics**  
PVC usage (used / capacity / % full) when Prometheus scrapes kubelet volume stats. Node and pod CPU/memory from metrics-server; history, disks, and pressure with Prometheus.

**Topology**  
Live graph of workloads, services, ingresses, and volumes in a namespace.

**Helm**  
Releases, values, resources, history, rollback, uninstall, and charts.

**Argo CD**  
Health, sync, ApplicationSets, projects, repos, and clusters via `argoproj.io` CRDs — no extra Argo API URL or token.

**Sparks**  
Local Markdown vault (notes, sketches, reminders) next to the cluster and resource they belong to.

**VPN**  
Attach OpenVPN, Pritunl, or WireGuard profiles so connecting a cluster can bring the tunnel up.

**macOS menu bar**  
Cluster health, CPU, memory, and pod counts for the clusters you pin.

<p align="center">
  <img src="docs/screenshots/magiclens-storage.png" alt="MagicLens PVC usage" width="920">
</p>

---

## Download

Get the latest build from **[GitHub Releases](https://github.com/magicorntech/magiclens/releases/latest)**.

| Platform | Artifact |
| --- | --- |
| macOS (Apple Silicon) | `MagicLens-<version>-arm64.dmg` |
| macOS (Intel) | `MagicLens-<version>.dmg` |
| Windows | `MagicLens-Setup-<version>.exe` |
| Linux | `MagicLens-<version>.AppImage` or `.deb` |

macOS builds are Developer ID signed and notarized. Auto-update runs on all platforms: the download happens in the background, install is always explicit.

### Get started

1. Install MagicLens and add a kubeconfig (file or folder).
2. Open a cluster tab.
3. Pick a resource from the sidebar — Deployments, Pods, Storage, Helm, Argo CD, and the rest.

---

## Requirements

| Need | For |
| --- | --- |
| Kubeconfig on disk | Cluster access |
| metrics-server | Live CPU / memory |
| Prometheus *(optional)* | History, node disks, PVC fullness (`kubelet_volume_stats_*`) |
| OpenVPN Community CLI or WireGuard *(optional)* | PIN + MFA tunnels — OpenVPN Connect is not supported |

UI languages: English, Türkçe, Deutsch, Français, 日本語, 한국어, 中文.

---

## Privacy

MagicLens uses your existing kubeconfig credentials against the cluster API. It does not upload cluster data to Magicorn unless you opt into a hosted account feature.

---

## Docs & support

- [Code signing](docs/code-signing.md)
- [Local backend](docs/backend-local.md)
- [support@magicorn.co](mailto:support@magicorn.co)
