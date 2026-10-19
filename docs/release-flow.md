# Release flow (source repo private, installers public)

| Repository | Visibility | Holds |
| --- | --- | --- |
| `magicorntech/magiclens` | **private** (once the bridge is over) | source code, GitHub Actions, secrets |
| `magicorntech/magiclens-releases` | **public** | download page (README), screenshots, GitHub Releases with installers |

Nobody without access to the source repository can see code, branches, history or tags.
The releases repository has no code: its "Source code" archives only contain the README.

## One-time setup

1. In `magiclens-releases` → Settings → keep the repository **public**.
2. Create a fine-grained personal access token (GitHub → Settings → Developer settings):
   - Resource owner: `magicorntech`, repository access: **only** `magiclens-releases`
   - Permissions: *Contents: Read and write*
3. In the source repository → Settings → Secrets and variables → Actions:
   - secret `RELEASES_TOKEN` = that token
   - variable `LEGACY_MIRROR` = `true` (bridge, see below)
   - the existing signing/notarization secrets stay as they are
4. Make sure Actions are allowed to run in the private repository (Settings → Actions → General).

## Cutting a release

Same as before: bump `package.json`, add the notes to `src/shared/whatsNew.ts`, push the tag `vX.Y.Z`.
The workflow builds macOS (arm64 + Intel), Windows and Linux, publishes a draft release in
`magiclens-releases`, then publishes it with the notes from `whatsNew.ts` (no commit subjects).

## Bridge for apps installed before the move

Apps up to v0.1.32 look for updates in `magicorntech/magiclens`. While `LEGACY_MIRROR=true`, every release is
also copied to that repository so those apps can update to the first build that knows the new location.

1. Release v0.1.33 (or later) with `LEGACY_MIRROR=true`.
2. Wait until most users have updated (the app checks in the background).
3. Set `LEGACY_MIRROR` to `false` and make `magicorntech/magiclens` **private**
   (Settings → General → Danger zone → Change visibility).

Making the repository private does not recall copies that already exist (clones, forks).

## Which files a release contains

- `.dmg` for Apple Silicon (`-arm64.dmg`) and Intel — what people download
- `-mac.zip` (+ blockmap) — **required** by the macOS auto-updater; without it Macs can no longer update themselves
- `.exe` (+ blockmap), `.AppImage`, `.deb`, and the `latest*.yml` update manifests
