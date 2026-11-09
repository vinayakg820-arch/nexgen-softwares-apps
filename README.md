# NexGen Softwares – Android apps

One Gradle project builds a separate APK for each software:

| APK | Opens |
|---|---|
| NexGen-portal | https://nexgensoftwares.edgeone.dev/ |
| NexGen-billing | https://nexgensoftwares.edgeone.dev/billing/ |
| NexGen-coaching | https://nexgensoftwares.edgeone.dev/coaching/ |
| NexGen-leadmaster | https://nexgensoftwares.edgeone.dev/leadmaster/ |
| NexGen-society | https://nexgensoftwares.edgeone.dev/society/ |

The APKs are Trusted Web Activities: they show the live website, so app updates are done by uploading the website ZIP to EdgeOne. A new APK is needed only to add a new software or change an app icon/name.

**Add a new software:** add a line to `apps` in `app/build.gradle`, put its icons in `app/src/<code>/res/`, add its package to `.well-known/assetlinks.json` on the website, then run the workflow (Actions → Build NexGen APKs → Run workflow).

Signing key: GitHub secrets `KEYSTORE_BASE64` and `KEYSTORE_PASSWORD` (alias `nexgen`). Keep a backup of the key – the same key is needed for future APK updates.
