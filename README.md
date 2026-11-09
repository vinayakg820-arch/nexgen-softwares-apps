# NexGen Softwares

Everything for **https://nexgensoftwares.edgeone.dev** lives here.

| Folder | What |
|---|---|
| `website/` | The whole website = the ZIP uploaded to EdgeOne. Portal + Super Admin at the root, one folder per software |
| `website/versions.json` | Live version of every software (+ `site` = ZIP version) |
| `website/nexgen-app.js` | Shared shell in every software: licence check, Install (APK / web app) button, per-app update bar |
| `website/apk/` | The Android APKs offered by the Install APK button |
| `app/`, `build.gradle`… | Android project: one APK per software (Trusted Web Activity) |
| `signing/` | APK signing key — **keep this repo private** |
| `scripts/make-site-zip.sh` | Makes `NexGen-Softwares-Site-v<site>.zip` |

## Update one software
1. Replace `website/<code>/` with the new version (keep the `nexgen-app.js` script tag at the top of its `<head>`, update its `data-version`).
2. Set the new version for `<code>` in `website/versions.json` and bump `site`.
3. `scripts/make-site-zip.sh` → upload the ZIP to EdgeOne. Only that software's users see the update; no new APK.

## Add a new software `<code>`
1. `website/<code>/` with index.html, manifest (`"id": "./"`, `"start_url": "./"`, `"scope": "./"`), icons, sw.js.
2. First line in its `<head>` after `<meta charset>`:
   `<script src="../nexgen-app.js" data-app="<code>" data-version="1.0.0" data-updater="shell" data-name="Name" data-icon="icon-192.png" data-color="#hex"></script>`
3. Add `<code>` to `website/versions.json`.
4. Super Admin → Softwares → Add software: code `<code>`, App URL `https://nexgensoftwares.edgeone.dev/<code>/`.
5. APK: add `<code>` to `apps` in `app/build.gradle`, icons in `app/src/<code>/res/`, add `com.nexgensoftwares.<code>` to `website/.well-known/assetlinks.json`; run Actions → Build NexGen APKs; copy `NexGen-<code>-v*.apk` from branch `apk-builds` to `website/apk/NexGen-<code>.apk`.
6. Make the ZIP and upload.
