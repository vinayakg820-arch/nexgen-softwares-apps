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
  function canShow() {
    if (standalone) return false;
    var h = +ls(HIDE) || 0;
    return Date.now() > h;
  }
  function showInstall() {
    if (!canShow() || btn) return;
    mount();
    btn = el('<div class="inst" role="button" aria-label="Install ' + esc(NAME) + '" title="Install ' + esc(NAME) + '">' +
      '<img alt="" src="' + esc(ICON) + '"><div class="t"><span>' + (isAndroid ? 'Install APK' : 'Install app') + '</span><b class="dl">&#8595;</b></div>' +
      '<button class="x" aria-label="Hide">&times;</button></div>');
    btn.style.display = 'flex';
    btn.querySelector('.x').onclick = function (e) { e.stopPropagation(); ls(HIDE, String(Date.now() + 3 * 864e5)); btn.remove(); btn = null; };
    btn.onclick = install;
    setTimeout(function () { btn && btn.classList.add('mini'); }, 7000);
  }
  function apkSheet() {
    mount();
    var m = el('<div class="mask"><div class="sheet"><div class="row"><img alt="" src="' + esc(ICON) + '"><div><h3>' + esc(NAME) + '</h3>' +
      '<p style="margin:0">Android app (APK)</p></div></div>' +
      '<p><b>1.</b> The APK download has started. If not, tap <b>Download APK</b>.</p>' +
      '<p><b>2.</b> Open the downloaded file (from the notification or <b>Downloads</b>).</p>' +
      '<p><b>3.</b> If the phone asks, tap <b>Settings → Allow from this source</b>, then go back.</p>' +
      '<p><b>4.</b> Tap <b>Install</b>, then <b>Open</b>. Updates come automatically — no need to reinstall.</p>' +
      '<a class="btn pri" href="' + esc(APK_URL) + '" download>Download APK</a>' +
      (deferred ? '<button class="btn gh" data-web>Install as web app instead</button>' : '') +
      '<button class="btn gh" data-close>Close</button></div></div>');
    m.onclick = function (e) {
      if (e.target === m || e.target.hasAttribute('data-close')) m.remove();
      if (e.target.hasAttribute('data-web')) { m.remove(); webInstall(); }
    };
  }
  function install() {
    if (isAndroid) {                       // start the APK download straight away, then show the steps
      var a = document.createElement('a'); a.href = APK_URL; a.download = 'NexGen-' + APP + '.apk';
      document.body.appendChild(a); a.click(); a.remove();
      return apkSheet();
    }
    webInstall();
  }
  function webInstall() {
    if (deferred) {
      deferred.prompt();
      (deferred.userChoice || Promise.resolve()).then(function (c) { if (c && c.outcome === 'accepted' && btn) { btn.remove(); btn = null; } });
      deferred = null;
      return;
    }
    // iPhone / browsers without an install prompt: show the steps
    mount();
    var m = el('<div class="mask"><div class="sheet"><div class="row"><img alt="" src="' + esc(ICON) + '"><div><h3>Install ' + esc(NAME) + '</h3>' +
      '<p style="margin:0">Add it to your home screen like an app</p></div></div>' +
      (isIOS ? '<p>1. Tap the <b>Share</b> button (square with arrow) in Safari.</p><p>2. Choose <b>Add to Home Screen</b>, then <b>Add</b>.</p>'
             : '<p>1. Open the browser menu <b>&#8942;</b> (top-right).</p><p>2. Tap <b>Install app</b> or <b>Add to Home screen</b>.</p>') +
      '<p style="font-size:12.5px">Each NexGen software installs as its own app with its own icon.</p>' +
      '<button class="btn gh">OK</button></div></div>');
    m.onclick = function (e) { if (e.target === m || e.target.tagName === 'BUTTON') m.remove(); };
  }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; showInstall(); });
  window.addEventListener('appinstalled', function () { if (btn) { btn.remove(); btn = null; } });
  if ((isIOS || isAndroid) && !standalone) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', showInstall); else showInstall();
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

  if (!GATE) return;

  /* ===================================================================
     LICENCE GATE
     =================================================================== */
  var lockCss = document.createElement('style');
  lockCss.textContent = 'html.ngs-lock body{visibility:hidden!important}';
  document.head ? document.head.appendChild(lockCss) : document.documentElement.appendChild(lockCss);
  var gateEl = null, unlocked = false;

  function lock() { document.documentElement.classList.add('ngs-lock'); }
  function unlock() {
    unlocked = true;
    document.documentElement.classList.remove('ngs-lock');
    if (gateEl) { gateEl.remove(); gateEl = null; }
  }
  function showGate(inner, loading) {
    lock(); mount();
    if (gateEl) gateEl.remove();
    gateEl = el('<div class="gate' + (loading ? ' loading' : '') + '">' + inner + '</div>');
    return gateEl;
  }
  function toLogin() { location.replace(ROOT + '?app=' + encodeURIComponent(APP)); }
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
      '<div id="wa"></div><a class="btn gh" href="' + esc(ROOT) + '">Go to my softwares</a>' +
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
    if (okCached) unlock();                       // open instantly, confirm in background
    else showGate('<div><img class="logo" alt="" src="' + esc(ICON) + '" style="width:76px;height:76px;border-radius:20px"><div class="spin"></div></div>', true);

    freshSession().then(function (s) {
      if (!s) return toLogin();
      return fetch(SB + '/rest/v1/rpc/my_portal', {
        method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: '{"p_login":false}'
      }).then(function (r) {
        if (r.status === 401) { ls(STORE, null); return toLogin(); }
        if (!r.ok) throw new Error('offline');
        return r.json().then(function (me) {
          if (me.role === 'super_admin') { ls(LIC, JSON.stringify({ ok: true, until: '9999-12-31', who: 'admin' })); return unlock(); }
          if (me.role !== 'customer') return logoutAll();
          var app = (me.apps || []).filter(function (a) { return a.code === APP; })[0];
          if (app && (app.state === 'active' || app.state === 'trial')) {
            ls(LIC, JSON.stringify({ ok: true, until: app.end_date, who: me.customer.code }));
            unlock();
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
  window.NexGenShell = { app: APP, logout: logoutAll, install: install };
})();
