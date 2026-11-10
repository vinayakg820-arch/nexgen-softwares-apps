/* =====================================================================
   NexGen Softwares – shared app shell (one file for every software)
   - Install button (top-right, with the software's own logo)
   - Licence gate: the software opens only for a customer whose plan is
     active in the NexGen Super Admin (or for the super admin)
   Usage, first tag inside <head> of each software:
     <script src="../nexgen-app.js" data-app="billing" data-name="Charvi Computers Billing"
             data-icon="icon-192.png" data-color="#1a6cb3"></script>
   For the portal itself: data-app="portal" (install button only, no gate)
   Optional: data-version="1.0.0" data-updater="shell" → this file shows the
   "Update now" bar for that app when /versions.json has a newer version
   (use it for new apps that do not have their own update popup).
   ===================================================================== */
(function () {
  'use strict';
  var me = document.currentScript || {};
  var ds = me.dataset || {};
  var APP = ds.app || 'portal';
  var NAME = ds.name || document.title || 'NexGen';
  var ICON = new URL(ds.icon || 'icon-192.png', location.href).href;
  var COLOR = ds.color || '#4f46e5';
  var ROOT = new URL('./', me.src || location.href).href;          // site root (this file lives there)
  var SB = 'https://nqqbduqqiwpaixmrweef.supabase.co';
  var KEY = 'sb_publishable_eKTOE3ywBI9ye02QFVDmvg_231pdTTJ';
  var STORE = 'nexgen-portal-auth', LIC = 'ngs-lic-' + APP;
  var GATE = APP !== 'portal';
  var SPLASH = ds.splash || '';        // the app's own opening screen stays visible while the licence is checked
  var VERSION = ds.version || '';
  var SHELL_UPDATER = ds.updater === 'shell';

  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /android/i.test(ua);
  var inApk = false;
  try {
    if (/[?&]src=apk\b/.test(location.search) || document.referrer.indexOf('android-app://') === 0) sessionStorage.setItem('ngs-apk', '1');
    inApk = sessionStorage.getItem('ngs-apk') === '1';
  } catch (e) { }
  var standalone = inApk || (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  var APK_URL = ROOT + 'apk/NexGen-' + APP + '.apk';
  var loggedIn = false;

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function todayIST() { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date()); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function fmtD(d) { return d ? String(d).slice(0, 10).split('-').reverse().join('-') : ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /* ---------------- one shadow host for all our UI (app CSS cannot break it) ---------------- */
  var host = document.createElement('nexgen-shell');
  host.style.cssText = 'all:initial;position:fixed;inset:0;pointer-events:none;z-index:2147483647;visibility:visible';
  var root = host.attachShadow ? host.attachShadow({ mode: 'open' }) : host;
  root.innerHTML = '<style>' +
    ':host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.inst{position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);right:10px;pointer-events:auto;display:none;align-items:center;gap:8px;' +
    'background:#fff;color:#0f172a;border-radius:999px;padding:5px 6px 5px 5px;box-shadow:0 6px 24px rgba(15,23,42,.22);border:1px solid #e2e8f0;cursor:pointer;' +
    'font-size:13px;font-weight:700;transition:padding .25s;max-width:calc(100vw - 20px)}' +
    '.inst img{width:30px;height:30px;border-radius:9px;object-fit:cover;flex:0 0 auto}' +
    '.inst .t{white-space:nowrap;display:flex;align-items:center;gap:6px}' +
    '.inst .dl{width:18px;height:18px;border-radius:50%;background:var(--c);color:#fff;display:grid;place-items:center;font-size:11px}' +
    '.inst .x{width:22px;height:22px;border-radius:50%;border:0;background:#f1f5f9;color:#64748b;font-size:14px;line-height:1;cursor:pointer;display:grid;place-items:center}' +
    '.inst.mini .t span,.inst.mini .x{display:none}.inst.mini{padding:5px}' +
    '.inst.mini .dl{position:absolute;right:-3px;bottom:-3px;width:16px;height:16px;border:2px solid #fff}' +
    '.mask{position:fixed;inset:0;background:rgba(15,23,42,.55);pointer-events:auto;display:flex;align-items:flex-end;justify-content:center;padding:16px}' +
    '.sheet{background:#fff;color:#0f172a;border-radius:20px;max-width:420px;width:100%;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.3)}' +
    '.sheet h3{margin:0 0 6px;font-size:17px}.sheet p{margin:6px 0;color:#475569;font-size:14px;line-height:1.5}' +
    '.row{display:flex;gap:12px;align-items:center;margin-bottom:12px}.row img{width:48px;height:48px;border-radius:12px}' +
    '.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:0;border-radius:12px;padding:12px 16px;font-weight:700;font-size:14px;cursor:pointer;text-decoration:none;width:100%;margin-top:8px}' +
    '.pri{background:var(--c);color:#fff}.gh{background:#f1f5f9;color:#0f172a}.wa{background:#25d366;color:#fff}' +
    '.gate{position:fixed;inset:0;pointer-events:auto;display:grid;place-items:center;padding:24px;text-align:center;background:linear-gradient(160deg,#1e1b4b,#312e81)}' +
    '.gate .card{background:#fff;border-radius:22px;padding:28px 24px;max-width:400px;width:100%;box-shadow:0 24px 70px rgba(0,0,0,.35)}' +
    '.gate img.logo{width:76px;height:76px;border-radius:20px;margin-bottom:12px}' +
    '.gate h2{margin:0 0 6px;font-size:20px;color:#0f172a}.gate p{margin:6px 0;color:#475569;font-size:14px;line-height:1.5}' +
    '.gate.loading{background:#fff}.spin{width:30px;height:30px;border:3px solid #e2e8f0;border-top-color:var(--c);border-radius:50%;animation:r .7s linear infinite;margin:14px auto 0}' +
    '@keyframes r{to{transform:rotate(360deg)}}' +
    '.bar{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);transform:translateX(-50%);pointer-events:auto;background:#0f172a;color:#fff;border-radius:14px;' +
    'padding:10px 10px 10px 14px;display:flex;gap:10px;align-items:center;font-size:13px;box-shadow:0 10px 30px rgba(0,0,0,.3);width:min(400px,calc(100vw - 24px))}' + '.bar span{flex:1}' +
    '.bar a{color:#fff;background:#25d366;border-radius:9px;padding:6px 10px;text-decoration:none;font-weight:700;white-space:nowrap}' +
    '.bar button{background:transparent;border:0;color:#94a3b8;font-size:18px;cursor:pointer}' +
    '.ver{position:fixed;right:6px;bottom:calc(env(safe-area-inset-bottom,0px) + 6px);pointer-events:auto;display:flex;align-items:center;gap:5px;' +
    'background:rgba(255,255,255,.92);color:#334155;border:1px solid #e2e8f0;border-radius:999px;padding:3px 9px 3px 7px;font-size:11px;font-weight:700;' +
    'box-shadow:0 2px 8px rgba(15,23,42,.12);cursor:pointer;opacity:.85}' +
    '.ver:hover{opacity:1}.ver i{width:8px;height:8px;border-radius:50%;background:#94a3b8;display:inline-block}' +
    '.ver.ok i{background:#16a34a}.ver.old{background:#fff7ed;border-color:#fdba74;color:#9a3412;opacity:1}.ver.old i{background:#ea580c}' +
    '</style>';
  root.host ? (root.host.style.setProperty('--c', COLOR)) : host.style.setProperty('--c', COLOR);
  function mount() { if (!host.isConnected) document.documentElement.appendChild(host); }
  // keep our layer last in the page so the app's own overlays/splash never cover it
  document.addEventListener('DOMContentLoaded', function () { if (host.isConnected) document.documentElement.appendChild(host); });
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; var n = d.firstElementChild; root.appendChild(n); return n; }

  /* ===================================================================
     INSTALL BUTTON (top-right, with the logo)
     =================================================================== */
  var deferred = null, btn = null, HIDE = 'ngs-inst-hide-' + APP;
  // wait until the app's own opening screen has finished, so nothing is drawn over it
  function afterSplash(cb) {
    var sp = SPLASH && document.querySelector(SPLASH);
    if (!sp || sp.classList.contains('gone') || sp.style.display === 'none' || getComputedStyle(sp).display === 'none') return cb();
    setTimeout(function () { afterSplash(cb); }, 300);
  }
  function canShow() {
    if (standalone || !loggedIn) return false;             // only after a successful login
    return Date.now() > (+ls(HIDE) || 0);
  }
  function showInstall() {
    if (!canShow()) return;
    var sp = SPLASH && document.querySelector(SPLASH);
    if (sp && !sp.classList.contains('gone') && sp.style.display !== 'none') return afterSplash(showInstall);
    if (btn) { var im = btn.querySelector('img'); if (im) im.src = ICON; return; }
    mount();
    btn = el('<div class="inst" role="button" aria-label="Install ' + esc(NAME) + '" title="Install ' + esc(NAME) + '">' +
      '<img alt="" src="' + esc(ICON) + '"><div class="t"><span>' + (isAndroid ? 'Install APK' : 'Install app') + '</span><b class="dl">&#8595;</b></div>' +
      '<button class="x" aria-label="Hide">&times;</button></div>');
    btn.style.display = 'flex';
    btn.querySelector('.x').onclick = function (e) { e.stopPropagation(); ls(HIDE, String(Date.now() + 3 * 864e5)); btn.remove(); btn = null; };
    btn.onclick = function () { installSheet(); };
    setTimeout(function () { btn && btn.classList.add('mini'); }, 7000);
  }
  var sheetOpen = false, onPrompt = [];
  var clicked = function () { return !navigator.userActivation || navigator.userActivation.isActive; };
  function installSheet() {
    if (sheetOpen) return;
    if (!isAndroid && deferred && clicked()) return webInstall();   // a click: straight to the browser's own "Install app?" window
    sheetOpen = true; mount();
    var m = el('<div class="mask"><div class="sheet"><div class="row"><img alt="" src="' + esc(ICON) + '"><div><h3>' + esc(NAME) + '</h3>' +
      '<p style="margin:0">' + (isAndroid ? 'Install the app on this phone' : 'Install it as an app on this computer') + '</p></div></div><div data-body></div>' +
      '<button class="btn gh" data-close>Not now</button></div></div>');
    var body = m.querySelector('[data-body]');
    function close() { m.remove(); sheetOpen = false; onPrompt = []; }
    function paint(state) {
      if (isAndroid) {
        body.innerHTML = '<p>Tap <b>Download APK</b>, open the downloaded file, allow <b>Install from this source</b> if the phone asks, then tap <b>Install</b>. Updates come automatically — no reinstall needed.</p>' +
          '<a class="btn pri" data-dl href="' + esc(APK_URL) + '" download>Download APK</a>' + (deferred ? '<button class="btn gh" data-web>Install as web app instead</button>' : '');
      } else if (isIOS) {
        body.innerHTML = '<p>1. Tap the <b>Share</b> button in Safari.</p><p>2. Choose <b>Add to Home Screen</b>, then <b>Add</b>.</p>';
      } else if (deferred) {
        body.innerHTML = '<p>Ready. It installs like a normal program, with its own icon on the desktop and in the Start menu.</p><button class="btn pri" data-web>Install now</button>';
      } else if (state === 'wait') {
        body.innerHTML = '<p>Getting the app ready to install…</p><div class="spin"></div>';
      } else {
        body.innerHTML = '<p style="color:#9a3412"><b>The browser has not offered the install yet.</b></p>' +
          '<p>• Already installed? Open it from the desktop / app list.<br>• Press <b>Try again</b> once (the browser sometimes needs a reload).<br>• Still nothing: use the install icon at the right end of the address bar, or ⋮ menu → <b>Cast, save and share → Install</b>.</p>' +
          '<button class="btn pri" data-retry>Try again</button>';
      }
    }
    paint(deferred ? 'ready' : 'wait');
    if (!isAndroid && !isIOS && !deferred) {
      onPrompt.push(function () { if (sheetOpen) paint('ready'); });
      setTimeout(function () { if (sheetOpen && !deferred) paint('help'); }, 4000);
    }
    m.onclick = function (e) {
      var tg = e.target;
      if (tg === m || tg.hasAttribute('data-close')) close();
      else if (tg.hasAttribute('data-web')) { close(); webInstall(); }
      else if (tg.hasAttribute('data-retry')) location.reload();
      else if (tg.hasAttribute('data-dl')) setTimeout(close, 400);
    };
  }
  function install() { installSheet(); }
  function webInstall() {
    if (!deferred) return installSheet();
    var ev = deferred;
    if (!clicked()) return installSheet();          // never spend the browser's install offer without a click
    deferred = null;
    var keep = function () { if (!deferred) deferred = ev; };
    var pr; try { pr = ev.prompt(); } catch (e) { keep(); return; }
    if (pr && pr.catch) pr.catch(keep);
    (ev.userChoice || Promise.resolve()).then(function (c) {
      if (c && c.outcome === 'accepted') { if (btn) { btn.remove(); btn = null; } }
      else keep();                                   // "Cancel": the Install button works again
    }).catch(keep);
  }
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferred = e;
    if (loggedIn) showInstall();
    var cbs = onPrompt; onPrompt = []; cbs.forEach(function (f) { try { f(); } catch (x) { } });
  });
  window.addEventListener('appinstalled', function () { if (btn) { btn.remove(); btn = null; } });

  /* called once the login is confirmed: show the install button and suggest installing (once per device).
     The app / APK keeps the SOFTWARE's own name + icon, so two softwares stay easy to tell apart;
     the customer's name + logo are shown inside the software itself. */
  function afterLogin(info) {
    info = info || {};
    if (info.company) window.NexGenBrand = { company: info.company, code: info.tenant_code };
    loggedIn = true;
    if (standalone) return;
    showInstall();
    // suggest once per device (per software) right after the first successful login
    var key = 'ngs-suggested-' + APP;
    if (info.suggest !== false && !ls(key) && Date.now() > (+ls(HIDE) || 0)) {
      ls(key, String(Date.now()));
      afterSplash(function () { setTimeout(installSheet, 900); });
    }
  }

  /* ===================================================================
     VERSION BADGE (bottom-right): this software's version + up to date or not
     =================================================================== */
  var verEl = null, verLatest = null;
  // Update = remove only THIS software's old copy (its service worker + caches), fetch fresh files, restart
  function hardUpdate(nv) {
    mount();
    var ov = el('<div class="gate"><div class="card"><img class="logo" alt="" src="' + esc(ICON) + '"><h2>Updating ' + esc(NAME) + '</h2>' +
      '<p>' + (nv ? 'Installing v' + esc(nv) + '. ' : '') + 'The app will restart in a few seconds…</p><div class="spin"></div></div></div>');
    try { sessionStorage.setItem('ngs-upd-' + APP, JSON.stringify({ from: VERSION, to: nv || '' })); } catch (e) { }
    var scope = new URL('./', location.href).href, jobs = [];
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
        jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) {
          return Promise.all(rs.filter(function (r) { return r.scope === scope; }).map(function (r) { return r.unregister(); }));
        }));
      }
      if (window.caches) {
        jobs.push(caches.keys().then(function (ks) {
          return Promise.all(ks.map(function (k) {
            return caches.open(k).then(function (c) { return c.keys(); }).then(function (reqs) {
              var mine = reqs.length && reqs.every(function (r) { return r.url.indexOf(scope) === 0; });
              return mine ? caches.delete(k) : null;
            });
          }));
        }));
      }
      ['./', 'index.html', 'sw.js', 'manifest.json'].forEach(function (u) { jobs.push(fetch(u, { cache: 'reload' }).catch(function () { })); });
    } catch (e) { }
    var go = function () { location.replace(location.pathname + '?v=' + encodeURIComponent(nv || Date.now()) + location.hash); };
    Promise.all(jobs).then(function () { setTimeout(go, 700); }, go);
    void ov;
  }
  // after the restart: tell the user whether it worked
  function afterUpdateNotice() {
    var info = null;
    try { info = JSON.parse(sessionStorage.getItem('ngs-upd-' + APP) || 'null'); sessionStorage.removeItem('ngs-upd-' + APP); } catch (e) { }
    if (!info) return;
    var ok = !info.to || info.to === VERSION;
    mount();
    var m = el('<div class="mask"><div class="sheet" style="text-align:center"><img alt="" src="' + esc(ICON) + '" style="width:64px;height:64px;border-radius:16px">' +
      '<h3 style="margin-top:10px">' + (ok ? '&#10003; Updated successfully' : 'Update not finished yet') + '</h3>' +
      '<p>' + (ok ? esc(NAME) + ' is now on <b>v' + esc(VERSION) + '</b>.' : 'Still on v' + esc(VERSION) + '. The website may need a minute – please try again.') + '</p>' +
      (ok ? '' : '<button class="btn pri" data-again>Try again</button>') + '<button class="btn gh" data-close>OK</button></div></div>');
    m.onclick = function (e) {
      if (e.target === m || e.target.hasAttribute('data-close')) m.remove();
      else if (e.target.hasAttribute('data-again')) { m.remove(); hardUpdate(info.to); }
    };
  }
  function drawVersion() {
    if (!VERSION) return;
    mount();
    if (!verEl) { verEl = el('<div class="ver" role="button"></div>'); verEl.onclick = versionSheet; }
    var old = verLatest && verLatest !== VERSION;
    verEl.className = 'ver' + (verLatest ? (old ? ' old' : ' ok') : '');
    verEl.title = old ? 'Update available: v' + verLatest : (verLatest ? 'Up to date' : 'Version');
    verEl.innerHTML = '<i></i>v' + esc(VERSION) + (old ? ' · Update' : '');
  }
  function versionSheet() {
    mount();
    var old = verLatest && verLatest !== VERSION;
    var m = el('<div class="mask"><div class="sheet"><div class="row"><img alt="" src="' + esc(ICON) + '"><div><h3>' + esc(NAME) + '</h3>' +
      '<p style="margin:0">Installed version <b>v' + esc(VERSION) + '</b></p></div></div>' +
      (verLatest ? (old ? '<p style="color:#9a3412"><b>New version v' + esc(verLatest) + ' is available.</b></p><button class="btn pri" data-up>Update now</button>'
                        : '<p style="color:#15803d"><b>&#10003; Up to date</b> – latest version is v' + esc(verLatest) + '.</p>')
                 : '<p>Could not check for updates (no internet?).</p>') +
      '<button class="btn gh" data-chk>Check again</button><button class="btn gh" data-close>Close</button></div></div>');
    m.onclick = function (e) {
      var tg = e.target;
      if (tg === m || tg.hasAttribute('data-close')) m.remove();
      else if (tg.hasAttribute('data-up')) { m.remove(); hardUpdate(verLatest); }
      else if (tg.hasAttribute('data-chk')) { m.remove(); checkLatest(true); }
    };
  }
  function checkLatest(openAfter) {
    if (!VERSION) return;
    fetch(ROOT + 'versions.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) { verLatest = (v && v[APP]) || null; drawVersion(); if (openAfter) versionSheet(); })
      .catch(function () { drawVersion(); if (openAfter) versionSheet(); });
  }
  var verStarted = false;
  function startVersion() {
    if (verStarted || !VERSION || ds.badge === 'off') return;
    verStarted = true;
    afterSplash(function () { drawVersion(); checkLatest(false); afterUpdateNotice(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) checkLatest(false); });
  }

  /* ===================================================================
     PER-APP UPDATE (only for apps with data-updater="shell")
     /versions.json lists the live version of every software; when this
     app's entry is newer than data-version, only THIS app shows the bar.
     =================================================================== */
  var updBar = null;
  function checkVersion() {
    if (!SHELL_UPDATER || !VERSION || updBar) return;
    fetch(ROOT + 'versions.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (v) {
        var nv = v && v[APP];
        if (!nv || nv === VERSION || updBar) return;
        mount();
        updBar = el('<div class="bar"><span>' + esc(NAME) + ' ' + esc(nv) + ' is available</span><a href="#" style="background:var(--c)">Update now</a></div>');
        updBar.querySelector('a').onclick = function (e) {
          e.preventDefault();
          var go = function () { location.replace(location.pathname + '?v=' + encodeURIComponent(nv) + location.hash); };
          if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) {
            navigator.serviceWorker.getRegistration().then(function (reg) { return reg && reg.update(); }).then(go, go);
          } else go();
        };
      }).catch(function () { });
  }
  if (SHELL_UPDATER) {
    setTimeout(checkVersion, 3000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) checkVersion(); });
  }

  if (!GATE) { window.NexGenShell = { app: APP, install: install, afterLogin: afterLogin, update: hardUpdate }; return; }

  /* ===================================================================
     LICENCE GATE
     =================================================================== */
  var lockCss = document.createElement('style');
  lockCss.textContent = SPLASH ? 'html.ngs-lock body>*:not(' + SPLASH + '){visibility:hidden!important}' : 'html.ngs-lock body{visibility:hidden!important}';
  document.head ? document.head.appendChild(lockCss) : document.documentElement.appendChild(lockCss);
  var gateEl = null, unlocked = false;

  function lock() { document.documentElement.classList.add('ngs-lock'); }
  function unlock() {
    unlocked = true;
    startVersion();
    document.documentElement.classList.remove('ngs-lock');
    if (gateEl) { gateEl.remove(); gateEl = null; }
  }
  function showGate(inner, loading) {
    lock(); mount();
    if (gateEl) gateEl.remove();
    gateEl = el('<div class="gate' + (loading ? ' loading' : '') + '">' + inner + '</div>');
    return gateEl;
  }
  function toLogin() { location.replace(ROOT + 'portal/?app=' + encodeURIComponent(APP)); }
  function logoutAll() { ls(STORE, null); ls(LIC, null); toLogin(); }

  function readSession() { try { var s = JSON.parse(ls(STORE) || 'null'); return s && s.access_token ? s : null; } catch (e) { return null; } }
  function freshSession() {
    var s = readSession();
    if (!s) return Promise.resolve(null);
    if (s.expires_at && s.expires_at * 1000 > Date.now() + 60000) return Promise.resolve(s);
    return fetch(SB + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token })
    }).then(function (r) {
      if (r.status === 400 || r.status === 401) { ls(STORE, null); return null; }
      if (!r.ok) throw new Error('offline');
      return r.json().then(function (n) {
        if (!n.expires_at && n.expires_in) n.expires_at = Math.floor(Date.now() / 1000) + n.expires_in;
        ls(STORE, JSON.stringify(n));
        return n;
      });
    });
  }
  function supportMobile() {
    return fetch(SB + '/rest/v1/settings?select=support_mobile,company_name&id=eq.1', { headers: { apikey: KEY } })
      .then(function (r) { return r.ok ? r.json() : []; }).then(function (a) { return (a && a[0]) || {}; }).catch(function () { return {}; });
  }
  function wa(mobile, text) { var d = String(mobile || '').replace(/\D/g, ''); if (d.length === 10) d = '91' + d; return 'https://wa.me/' + d + '?text=' + encodeURIComponent(text); }

  function blocked(me, app) {
    var c = me.customer || {};
    var msg = app && app.state === 'expired'
      ? 'Your plan for <b>' + esc(NAME) + '</b> ended on <b>' + fmtD(app.end_date) + '</b>. Renew it to continue — your data is safe.'
      : app && app.state === 'cancelled' ? 'Your <b>' + esc(NAME) + '</b> plan is not active.'
      : 'Your account <b>' + esc(c.code) + '</b> does not include <b>' + esc(NAME) + '</b> yet.';
    var g = showGate('<div class="card"><img class="logo" alt="" src="' + esc(ICON) + '"><h2>' + esc(NAME) + '</h2><p>' + msg + '</p>' +
      '<div id="wa"></div><a class="btn gh" href="' + esc(ROOT + 'portal/') + '">Go to my softwares</a>' +
      '<button class="btn gh" id="sw">Log in with another account</button></div>');
    g.querySelector('#sw').onclick = logoutAll;
    supportMobile().then(function (st) {
      if (!st.support_mobile) return;
      var t = 'Hello ' + (st.company_name || 'NexGen Softwares') + ', please ' + (app ? 'renew' : 'activate') + ' ' + NAME + ' for ' + (c.company_name || c.name || '') + ' (ID ' + (c.code || '') + ').';
      var box = g.querySelector('#wa'); if (box) box.innerHTML = '<a class="btn wa" target="_blank" rel="noopener" href="' + esc(wa(st.support_mobile, t)) + '">Renew on WhatsApp</a>';
    });
  }
  function offline() {
    var g = showGate('<div class="card"><img class="logo" alt="" src="' + esc(ICON) + '"><h2>' + esc(NAME) + '</h2>' +
      '<p>No internet connection. Connect to the internet once to open the app.</p><button class="btn pri" id="rt">Try again</button></div>');
    g.querySelector('#rt').onclick = function () { location.reload(); };
  }
  function soonBar(app) {
    var key = 'ngs-soon-' + APP + '-' + todayIST();
    if (ls(key)) return;
    supportMobile().then(function (st) {
      mount();
      var b = el('<div class="bar"><span>' + esc(NAME) + ' plan ends ' + (app.days_left <= 0 ? 'today' : 'in ' + app.days_left + ' day' + (app.days_left === 1 ? '' : 's')) + '</span>' +
        (st.support_mobile ? '<a target="_blank" rel="noopener" href="' + esc(wa(st.support_mobile, 'Hello, please renew ' + NAME + '.')) + '">Renew</a>' : '') +
        '<button aria-label="Close">&times;</button></div>');
      b.querySelector('button').onclick = function () { ls(key, '1'); b.remove(); };
    });
  }

  function check() {
    var cached = null;
    try { cached = JSON.parse(ls(LIC) || 'null'); } catch (e) { }
    var okCached = cached && cached.ok && cached.until >= todayIST() && readSession();
    var loadingHtml = '<div><img class="logo" alt="" src="' + esc(ICON) + '" style="width:76px;height:76px;border-radius:20px"><div class="spin"></div></div>';
    if (okCached) unlock();                       // open instantly, confirm in background
    else if (SPLASH) setTimeout(function () { if (!unlocked && !gateEl) showGate(loadingHtml, true); }, 4500);
    else showGate(loadingHtml, true);

    freshSession().then(function (s) {
      if (!s) return toLogin();
      return fetch(SB + '/rest/v1/rpc/my_portal', {
        method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: '{"p_login":false}'
      }).then(function (r) {
        if (r.status === 401) { ls(STORE, null); return toLogin(); }
        if (!r.ok) throw new Error('offline');
        return r.json().then(function (me) {
          if (me.role === 'super_admin') { ls(LIC, JSON.stringify({ ok: true, until: '9999-12-31', who: 'admin' })); unlock(); afterLogin({ suggest: false }); return; }
          if (me.role !== 'customer' && me.role !== 'member') return logoutAll();
          var app = (me.apps || []).filter(function (a) { return a.code === APP; })[0];
          if (app && (app.state === 'active' || app.state === 'trial')) {
            ls(LIC, JSON.stringify({ ok: true, until: app.end_date, who: me.customer.code }));
            unlock();
            var c = me.customer || {};
            afterLogin({ tenant_code: c.tenant_code || c.code, company: c.company_name || c.name });
            if (app.days_left <= 5) soonBar(app);
            return;
          }
          ls(LIC, null);
          blocked(me, app);
        });
      });
    }).catch(function () { if (!unlocked) offline(); });
  }

  lock();
  check();
  // re-check when the app comes back to the screen (plan may have ended / been renewed)
  var lastCheck = Date.now();
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Date.now() - lastCheck > 30 * 60 * 1000) { lastCheck = Date.now(); check(); }
  });
  window.NexGenShell = { app: APP, logout: logoutAll, install: install, afterLogin: afterLogin, checkLatest: checkLatest, update: hardUpdate };
})();
