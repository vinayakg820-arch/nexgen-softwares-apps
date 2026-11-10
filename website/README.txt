NexGen Softwares – website (upload this whole ZIP to EdgeOne: nexgensoftwares.edgeone.dev)

/                 Main link – sends everyone to the right place
/admin/           Super Admin panel (its own app – install it from here)
/portal/          Customer login + their softwares (its own app)
/billing/         Charvi Computers Billing
/coaching/        Mauli Coaching Classes
/leadmaster/      LeadMaster
/society/         Society Connect
/nexgen-app.js    Shared: licence check + "Install app" button (used by every software)
/apk/             Android apps: NexGen-portal / billing / coaching / leadmaster / society .apk
/.well-known/     assetlinks.json – lets the Android APKs open full-screen (keep it!)

To update ONE software: replace only its folder, upload the ZIP again.
Only that software's users see its update – others are untouched.

To add a NEW software:
 1. Put it in a new folder, e.g. /hotel/  (its index.html, manifest, icons, sw.js)
 2. Add this as the first line inside its <head> (after <meta charset>):
    <script src="../nexgen-app.js" data-app="hotel" data-name="Hotel Manager" data-icon="icon-192.png" data-color="#0ea5e9"></script>
 3. Super Admin → Softwares → Add software with code "hotel" and App URL https://nexgensoftwares.edgeone.dev/hotel/

Android APKs: built by GitHub repo vinayakg820-arch/nexgen-softwares-apps (Actions → Build NexGen APKs).
They open this website, so normal updates need ONLY this ZIP – no new APK, no reinstall.
A new APK is needed only for a brand-new software or a new app icon/name.
