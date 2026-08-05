---
id: fdaa323b-a51d-41b3-890b-8c221e62325a
title: Welcome to Sparks
tags:
  - welcome
scope: global
pinned: true
createdAt: 2026-08-05T20:02:56.320Z
updatedAt: 2026-08-05T20:02:56.320Z
---

Sparks is the **notes workspace** inside MagicLens — write Markdown, link ideas, draw on the page, and attach context from your clusters.

## Start here

1. Skim this page for the full feature map
2. Open [[Getting Started]] for a short hands-on tour
3. Keep [[Wiki Links]] handy for `[[link]]` syntax

---

## Write modes

Toolbar icons (hover for names):

| Mode | What it does |
| --- | --- |
| **Write** | Markdown editor only |
| **Split** | Editor + live preview side by side |
| **Read** | Preview only — click `[[links]]` to jump |
| **Draw** | Draw / shape / media tools on the note page |

Title and body **autosave** as you type.

## Draw on the page

Switch to **Draw** to open the tool strip:

- **Pen / highlighter / eraser** — freehand on the sheet
- **Shapes** — rectangle, ellipse, line, arrow
- **Image / video / file** — attach into the note (saved under `Attachments/`)
- Colors, stroke size, undo, clear

Drawings stay with the note; media also lands in the Markdown body.

## Notebook paper

- **Page style** — plain, lined, grid, or notebook
- **Size** — width (narrow → full), zoom, and page length (normal / tall / extra long)

## Wiki links

- Type `[[` for autocomplete of existing notes
- `[[Note title]]` or `[[Note title|label]]`
- **Links** panel — outgoing links + backlinks; create missing notes in one click

See [[Wiki Links]] for the cheatsheet.

## Graph & Canvas

| View | Purpose |
| --- | --- |
| **Graph** | Map of who links to whom — click a node to open |
| **Canvas** | Free board — place notes, stickies, connections |
| **Split** | Note + Graph, Note + Canvas, or Graph + Canvas |

Toggle Graph / Canvas modules under **Settings → Sparks** if you hide them.

## Organize

- **Folders** — tree in the sidebar; create folders anytime
- **Tags** — `#tag` in the body or frontmatter; filter from the sidebar
- **Search** — title, body, path, tags
- **Tabs** — open several notes; pin, close, drag to reorder
- **Pin** — keep important notes marked

## Templates

Use **Templates** for ready-made starters:

- Daily journal
- Incident note
- Concept
- Project

## Reminders

- Bell on the note — once, weekly, monthly, or custom dates
- Fires as OS + in-app pings while MagicLens is open
- **Sparks inbox** (bell) — unread pings, mark read, jump to the note

## Themes

Pick a vault look in **Settings → Sparks**: System, Paper, Parchment, Mono, Matcha, Ocean, Forest, Rose, Ink, Dusk, Nord, Solar, Ember.

## Vault

- Notes are plain `.md` files in a vault folder on disk
- **Choose vault folder** — pick where Sparks stores files
- **Open vault on disk** — reveal the folder in Finder / Explorer

## Kubernetes → Sparks

- From a pod / workload: **Add spark** creates a note with cluster & resource metadata in frontmatter
- Resource detail views include a **Sparks** tab for notes scoped to that object
- Scope can be global, workspace, cluster, or resource when creating from the K8s UI

## Modules

In **Settings → Sparks** (or the plugins menu) you can toggle:

- Templates
- Graph
- Canvas
- Wiki links

---

Next: [[Getting Started]] · [[Wiki Links]]