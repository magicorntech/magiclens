# macOS Code Signing, Notarization & Auto-Update

MagicLens ships signed macOS builds through the `Release` GitHub Actions workflow
(`.github/workflows/release.yml`), which runs on every pushed `v*` tag.

Everything on the repo side is already wired. What's needed is an Apple Developer ID
certificate and five repository secrets. Until those exist, the workflow still produces
working artifacts — but they're only ad-hoc signed, Gatekeeper warns on them, and
**auto-update does not work**, because Squirrel.Mac refuses to install an update whose
signature doesn't match the running app's.

---

## Why signing is required for auto-update

macOS auto-update goes through Squirrel.Mac. Before swapping the app bundle it verifies that
the downloaded build carries the *same* code-signing identity as the installed one. Two
consequences:

- An unsigned or ad-hoc-signed app can never auto-update — the check has nothing stable to
  compare against.
- Once you ship a signed release, **the signing identity must stay the same** across
  releases. Switching to a different certificate/team breaks the update path for everyone
  already running the old build; they have to reinstall by hand.

So the certificate below is a long-lived asset. Keep the `.p12` and its password somewhere
recoverable (a password manager), not just in the keychain of one laptop.

---

## One-time Apple setup

These steps happen in Apple's web portal and in Keychain Access — they can't be scripted,
and they involve credentials, so run them yourself.

### 1. Create the certificate

You want **Developer ID Application**. (Not "Mac App Distribution" — that one is only for the
Mac App Store and cannot sign a directly-distributed app.)

1. Open **Keychain Access → Certificate Assistant → Request a Certificate From a Certificate
   Authority**. Enter your email, leave *CA Email* blank, choose **Saved to disk**. This
   produces a `CertificateSigningRequest.certSigningRequest` file.
2. Go to <https://developer.apple.com/account/resources/certificates/list> → **+** →
   **Developer ID Application** → upload the CSR → download the resulting `.cer`.
3. Double-click the `.cer` to install it into your **login** keychain.

Confirm it landed, and note the Team ID in parentheses:

```bash
security find-identity -v -p codesigning
```

You should see a line like
`"Developer ID Application: Your Company (ABCDE12345)"`.

### 2. Export it for CI

GitHub Actions needs the certificate as a base64 blob, not a keychain entry.

1. **Keychain Access → My Certificates**, find *Developer ID Application: …*, right-click →
   **Export** → format `.p12` → set a strong password (this becomes `MAC_CSC_KEY_PASSWORD`).
2. Base64-encode it:

```bash
base64 -i /path/to/certificate.p12 | pbcopy
```

The clipboard now holds `MAC_CSC_LINK`.

### 3. Create an app-specific password for notarization

Notarization authenticates separately from signing. At <https://appleid.apple.com> →
**Sign-In and Security → App-Specific Passwords** → generate one (name it e.g. "notarytool").
This becomes `APPLE_APP_SPECIFIC_PASSWORD`. It is *not* your Apple ID password.

### 4. Add the repository secrets

In GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `MAC_CSC_LINK` | base64 of the `.p12` (step 2) |
| `MAC_CSC_KEY_PASSWORD` | the `.p12` export password |
| `APPLE_ID` | your Apple ID email |
| `APPLE_APP_SPECIFIC_PASSWORD` | app-specific password (step 3) |
| `APPLE_TEAM_ID` | the 10-character Team ID (step 1) |

The workflow imports the `.p12` into a job-scoped keychain and leaves `CSC_LINK` unset so
electron-builder signs from `security find-identity`. Do not put `CSC_LINK` back on the
macOS job: electron-builder 25 then calls `security set-key-partition-list` with the `.p12`
password, and macOS 26 runners fail with `SecKeychainUnlock`. Add all five secrets together.

That's the whole setup. Notarization needs no config in `electron-builder.yml`:
electron-builder runs `notarytool` automatically as soon as `APPLE_ID`,
`APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` are all present.

---

## Releasing

```bash
npm version <patch|minor|major>
git push && git push --tags
```

The tag triggers `release.yml`, which verifies the tag matches `package.json`, builds macOS
(dmg + zip, arm64 + x64), Windows and Linux artifacts, signs and notarizes the macOS ones,
and publishes them to the GitHub Release. `electron-updater` reads that release through the
`publish:` block in `electron-builder.yml`.

Verify a released build:

```bash
# Should print "Authority=Developer ID Application: … (TEAMID)" and no "Signature=adhoc".
codesign -dvv /Applications/MagicLens.app

# Should print "accepted / source=Notarized Developer ID".
spctl -a -vvv -t install /Applications/MagicLens.app
```

---

## Signing a local build

Once the certificate is in your login keychain, electron-builder discovers it automatically —
`CSC_LINK` is only for CI. To notarize locally as well, export the same three Apple vars first:

```bash
export APPLE_ID="you@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="ABCDE12345"
npm run dist:mac
```

Notarization adds several minutes — Apple's service has to accept the upload and return a
ticket.

---

## Gotchas

- **`app-update.yml` missing / `ENOENT` on launch.** Expected for `electron-builder --dir`
  builds: that file is only generated for real distributable targets (dmg/zip). Use
  `npm run dist:mac` to produce a build whose updater is wired up. In dev the updater skips
  the startup check for the same reason.
- **`build/afterSign.js` and ad-hoc signatures.** Without a certificate this hook applies a
  free ad-hoc signature, because Apple Silicon refuses to launch a completely unsigned binary
  ("… is damaged and can't be opened"). It detects an existing real signature via `codesign`
  and leaves it alone — important, since notarization runs *before* `afterSign`, so
  re-signing there would silently invalidate both the signature and the notarization ticket.
- **Certificates expire** (5 years for Developer ID). Renew *before* expiry and keep the same
  Team ID; already-notarized builds keep working, but new ones need a valid certificate.
- **Windows signing** uses the separate `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` secrets and
  needs its own (non-Apple) Authenticode certificate. The release workflow exports those
  **only on the Windows job**. Never put the Apple `CSC_LINK` in the Windows environment —
  electron-builder will otherwise Authenticode-sign `MagicLens-Setup-*.exe` with
  `Developer ID Application: …`, which Windows cannot trust. Auto-update then fails with
  "New version is not signed by the application owner" / "certificate chain could not be
  built to a trusted root authority". Unsigned Windows builds still run, with a SmartScreen
  warning; they also auto-update between unsigned releases because there is no publisher
  name to mismatch.
- **Already-shipped Apple-signed Windows builds cannot auto-update.** The installed app
  remembers publisher `Developer ID Application: Huseyin YENER (…)` and will reject every
  later installer (unsigned or correctly Authenticode-signed). Those users have to download
  the new `.exe` from the GitHub release and run it once; after that, auto-update works
  again.
- **`SecKeychainUnlock` on `set-key-partition-list`.** Not a wrong `.p12` password.
  electron-builder 25 (#10066) unlocks the temporary keychain with the certificate password.
  macOS 26 refuses that. The release workflow imports the cert itself; do not set `CSC_LINK`
  to work around it. Fixed upstream in electron-builder 26.16 — we can drop the workaround
  after upgrading.
