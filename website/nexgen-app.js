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
  var KEY = 'sb_publishable_eKTOE3ywBI9ye02QFVDmvg_231pdTTJ';
  /* ---- server route ----
     Some internet providers in India (Jio / Airtel / ACT) block *.supabase.co. The website still
     opens, but login and data fail ("No internet"). Then every software talks to the database
     through the website's own address (/sb/ → edge-functions/sb). Checked in the background;
     the choice is remembered on this device and every software reads window.NGS_SB_URL. */
  var SB_DIRECT = 'https://nqqbduqqiwpaixmrweef.supabase.co';
  var SB_PROXY = new URL('./sb', me.src || location.href).href;
  var ROUTE_KEY = 'ngs-sb-route';
  var route = null; try { route = localStorage.getItem(ROUTE_KEY); } catch (e) { }
  var SB = route === 'proxy' ? SB_PROXY : SB_DIRECT;
  window.NGS_SB_URL = SB;
  (function probeRoute() {
    function reach(base, ms) {
      var ctl = window.AbortController ? new AbortController() : null;
      var t = setTimeout(function () { if (ctl) ctl.abort(); }, ms);
      return fetch(base + '/auth/v1/health', { headers: { apikey: KEY }, cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function (r) { clearTimeout(t); return r.status > 0 && r.status < 500; }, function () { clearTimeout(t); return false; });
    }
    var last = 0; try { last = +localStorage.getItem(ROUTE_KEY + '-at') || 0; } catch (e) { }
    if (route && Date.now() - last < 6 * 3600e3) return;          // checked recently on this device
    reach(SB_DIRECT, 6000).then(function (direct) {
      if (direct) {
        try { localStorage.setItem(ROUTE_KEY, 'direct'); localStorage.setItem(ROUTE_KEY + '-at', String(Date.now())); } catch (e) { }
        return;                                                     // (a device that moved back to an open network uses direct from its next start)
      }
      return reach(SB_PROXY, 8000).then(function (viaSite) {
        if (!viaSite) return;                                       // really offline – nothing to change
        try { localStorage.setItem(ROUTE_KEY, 'proxy'); localStorage.setItem(ROUTE_KEY + '-at', String(Date.now())); } catch (e) { }
        if (SB !== SB_PROXY) {                                      // this page started on the blocked address → open it again once
          var k = 'ngs-sb-reloaded'; var done = false; try { done = sessionStorage.getItem(k) === '1'; sessionStorage.setItem(k, '1'); } catch (e) { }
          if (!done) location.reload();
        }
      });
    });
  })();
  var STORE = 'nexgen-portal-auth', LIC = 'ngs-lic-' + APP;
  var GATE = APP !== 'portal';
  var OWNLOGIN = GATE && ds.gate === 'off';   // the software has its own login page (e.g. residents of a society); its server checks the plan
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
    '.bar button{background:transparent;border:0;color:#94a3b8;font-size:18px;cursor:pointer}.bar.urgent{background:#b91c1c}.bar.urgent button{color:#fecaca}.gate p.sm{font-size:13px;color:#64748b}' +
    '.ver{position:fixed;right:6px;bottom:calc(env(safe-area-inset-bottom,0px) + 6px);pointer-events:auto;display:flex;align-items:center;gap:5px;' +
    'background:rgba(255,255,255,.92);color:#334155;border:1px solid #e2e8f0;border-radius:999px;padding:3px 9px 3px 7px;font-size:11px;font-weight:700;' +
    'box-shadow:0 2px 8px rgba(15,23,42,.12);cursor:pointer;opacity:.85}' +
    '.nx-ov{position:fixed;inset:0;z-index:5;pointer-events:auto;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:14px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}' +
    '.nx-box{background:#fff;color:#0f172a;border-radius:22px;width:100%;max-width:560px;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 30px 80px rgba(0,0,0,.35);overflow:hidden}' +
    '.nx-hd{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid #eef0f6}.nx-hd b{font-size:17px}.nx-x{border:0;background:#f1f5f9;border-radius:999px;width:34px;height:34px;font-size:20px;cursor:pointer;color:#334155}' +
    '.nx-bd{padding:16px 18px 18px;overflow-y:auto}.nx-mut{color:#64748b;font-size:13px;margin:6px 0}.nx-bd h4{margin:18px 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b}' +
    '.nx-hero{border-radius:18px;padding:16px;color:#fff;background:linear-gradient(135deg,#4f46e5,#1e1b4b)}.nx-hero.warn{background:linear-gradient(135deg,#d97706,#92400e)}.nx-hero.bad{background:linear-gradient(135deg,#dc2626,#7f1d1d)}' +
    '.nx-hero b{display:block;font-size:28px;font-weight:800;margin:6px 0 2px}.nx-hero span{font-size:12.5px;opacity:.9}.nx-st{display:inline-block;background:rgba(255,255,255,.2);border-radius:999px;padding:3px 10px;font-weight:700;font-size:11px!important;letter-spacing:.06em;text-transform:uppercase}' +
    '.nx-bar{height:6px;border-radius:9px;background:rgba(255,255,255,.25);margin-top:12px;overflow:hidden}.nx-bar i{display:block;height:100%;background:#fff;border-radius:9px}' +
    '.nx-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.nx-grid div{background:#f8fafc;border:1px solid #eef0f6;border-radius:14px;padding:10px 12px}.nx-grid span{display:block;font-size:11px;color:#64748b;font-weight:700}.nx-grid b{display:block;font-size:13.5px;margin-top:3px}' +
    '.nx-grid .nx-due{grid-column:1/-1;background:#fef2f2;border-color:#fecaca}.nx-due b{color:#dc2626;font-size:16px}.nx-due em{font-style:normal;font-size:12px;color:#b91c1c;font-weight:700}' +
    '.nx-list{border:1px solid #eef0f6;border-radius:14px;overflow:hidden}.nx-it{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #eef0f6}.nx-it:last-child{border-bottom:0}.nx-it div{flex:1;min-width:0}.nx-it div b{display:block;font-size:13px}.nx-it div span{display:block;font-size:11.5px;color:#64748b;margin-top:1px}.nx-amt{font-size:13.5px;white-space:nowrap}' +
    '.nx-btn{border:0;background:#4f46e5;color:#fff;border-radius:999px;padding:7px 12px;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap}.nx-btn.ghost{background:#f1f5f9;color:#334155}' +
    '.nx-cta{display:block;text-align:center;margin-top:16px;background:#16a34a;color:#fff;text-decoration:none;font-weight:800;border-radius:14px;padding:12px}' +
    '.nx-rcpt{width:100%;height:60vh;border:1px solid #e2e8f0;border-radius:12px;background:#fff}.nx-row{display:flex;gap:8px;justify-content:flex-end;margin-top:10px}' +
    '.nx-help{display:flex;align-items:center;gap:12px;margin-bottom:14px}.nx-help img{width:44px;height:44px;border-radius:12px}.nx-help span{display:block;font-size:12.5px;color:#64748b}.nx-help b{display:block;font-size:16px}' +
    '.nx-hls{display:grid;gap:10px}.nx-hl{display:flex;align-items:center;gap:12px;border:1px solid #e2e8f0;border-radius:16px;padding:12px 14px;text-decoration:none;color:#0f172a;background:#fff;cursor:pointer;font:inherit;text-align:left}.nx-hl.wa{border-color:#bbf7d0;background:#f0fdf4}' +
    '.nx-hl i{font-style:normal;font-size:22px}.nx-hl span{display:block;font-size:13px;color:#475569}.nx-hl b{display:block;font-size:14.5px;color:#0f172a}' +
    '.nx-q{position:fixed;left:8px;bottom:calc(env(safe-area-inset-bottom,0px) + 32px);pointer-events:auto;width:34px;height:34px;border-radius:999px;border:0;background:#1e1b4b;color:#fff;font:800 16px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.25);opacity:.85}' +
    '.demo{position:fixed;right:6px;bottom:calc(env(safe-area-inset-bottom,0px) + 70px);pointer-events:auto;background:#fef3c7;color:#92400e;border:1px solid #fcd34d;border-radius:999px;padding:5px 11px;font:700 11px/1.2 system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.12)}.demo b{background:#b45309;color:#fff;border-radius:6px;padding:1px 5px;margin-right:4px;font-size:10px}' +
    '.sw{position:fixed;right:6px;bottom:calc(env(safe-area-inset-bottom,0px) + 32px);pointer-events:auto;display:flex;align-items:center;gap:6px;background:#1e1b4b;color:#fff;border:0;border-radius:999px;' +
    'padding:6px 12px 6px 9px;font:700 12px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 4px 14px rgba(15,23,42,.3);cursor:pointer;opacity:.92}.sw:hover{opacity:1}.sw b{font-size:14px;line-height:1}' +
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
  /* SWITCH button (every software): the super admin goes straight back to the Super Admin panel,
     a customer with more than one software goes back to "My softwares" – no logout / login needed. */
  var swEl = null;
  if (!GATE) { try { sessionStorage.removeItem('ngs-switch'); } catch (e) { } }
  var demoEl = null;
  function showSwitch(kind) {
    try { if (kind) sessionStorage.setItem('ngs-switch', kind); else kind = sessionStorage.getItem('ngs-switch'); } catch (e) { }
    if (!GATE || !kind) return;
    if (swEl) { if (swEl.getAttribute('data-k') === kind) return; swEl.remove(); swEl = null; }
    mount();
    var admin = kind === 'admin';
    swEl = el('<button class="sw" title="' + (admin ? 'Back to the Super Admin panel' : 'Open your other softwares') + '"><b>&#8644;</b>' + (admin ? 'Super Admin' : 'My softwares') + '</button>');
    swEl.setAttribute('data-k', kind);
    // the super admin sees his own DEMO shop here. A customer login of his own (a real subscription)
    // can be opened right here: this browser holds one login at a time.
    if (admin && !demoEl) {
      demoEl = el('<button class="demo" title="This is your demo shop. Tap to log in here with a customer Email ID instead."><b>DEMO</b> shop · Use customer login</button>');
      demoEl.onclick = function () {
        if (!confirm('This is your Super Admin DEMO shop.\n\nLog out of Super Admin in this browser and log in with a customer Email ID (for example your own subscription)?\n\nTip: keep Super Admin in this window and use a separate Chrome profile or Incognito window for the customer login – then both stay open.')) return;
        try { localStorage.removeItem(STORE); Object.keys(localStorage).forEach(function (k) { if (k.indexOf('ngs-lic-') === 0) localStorage.removeItem(k); }); sessionStorage.removeItem('ngs-switch'); } catch (e) { }
        location.href = ROOT + 'portal/?app=' + encodeURIComponent(APP);
      };
    }
    swEl.onclick = function () {
      var url = ROOT + (admin ? 'admin/' : 'portal/');
      // installed on a computer as its own app: keep this app open and show the panel in the browser
      if (standalone && !inApk && !isAndroid && !isIOS) { var w = window.open(url, '_blank'); if (w) return; }
      location.href = url;
    };
  }
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


  /* ===================================================================
     ONE PHONE APP + ONE COMPUTER PER LOGIN
     The APK and one browser may be open together. Logging in on a third
     place takes over that kind's slot and logs the older device out.
     =================================================================== */
  // slot by device type: any phone / tablet (APK or browser) = the phone slot, a laptop / desktop = the computer slot
  var isMobile = inApk || isAndroid || isIOS || /mobi|tablet/i.test(ua);
  var KIND = isMobile ? 'apk' : 'web';
  function deviceId() {
    var d = ls('ngs-device');
    if (!d) { d = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)); ls('ngs-device', d); }
    return d;
  }
  function deviceLabel() {
    var os = /android/i.test(ua) ? 'Android phone' : isIOS ? 'iPhone / iPad' : /windows/i.test(ua) ? 'Windows computer' : /mac os/i.test(ua) ? 'Mac' : /linux/i.test(ua) ? 'Linux computer' : 'Computer';
    var br = inApk ? 'App' : /edg\//i.test(ua) ? 'Edge' : /opr\//i.test(ua) ? 'Opera' : /firefox/i.test(ua) ? 'Firefox' : /chrome/i.test(ua) ? 'Chrome' : /safari/i.test(ua) ? 'Safari' : 'Browser';
    return os + ' · ' + br;
  }
  function deviceArgs() { return { p_kind: KIND, p_device: deviceId(), p_label: deviceLabel() }; }
  var guardOn = false, guardTimer = null, kickedEl = null;
  function kicked(by) {
    if (kickedEl) return;
    try { localStorage.removeItem(STORE); Object.keys(localStorage).forEach(function (k) { if (k.indexOf('ngs-lic-') === 0) localStorage.removeItem(k); }); sessionStorage.removeItem('ngs-switch'); } catch (e) { }
    mount();
    kickedEl = el('<div class="gate"><div class="card"><img class="logo" alt="" src="' + esc(ICON) + '"><h2>Logged out on this ' + (KIND === 'apk' ? 'phone' : 'computer') + '</h2>' +
      '<p>This account was just opened on another ' + (KIND === 'apk' ? 'phone' : 'computer') + (by ? ' (<b>' + esc(by) + '</b>)' : '') + '.</p>' +
      '<p class="sm">One login can be used on <b>one phone</b> and <b>one computer</b> at the same time. Your data is safe.</p>' +
      '<a class="btn pri" href="' + esc(ROOT + 'portal/' + (APP !== 'portal' ? '?app=' + encodeURIComponent(APP) : '')) + '">Log in here again</a></div></div>');
    document.documentElement.classList.add('ngs-lock');
  }
  function guardTick() {
    if (document.hidden || kickedEl) return;
    var s = readSession();
    if (!s || !s.access_token || (s.expires_at && s.expires_at * 1000 < Date.now() + 5000)) return;   // the app refreshes its own login; check next time
    fetch(SB + '/rest/v1/rpc/device_check', {
      method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify(deviceArgs())
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d && d.ok === false) kicked(d.by); }).catch(function () { });
  }
  function startGuard() {
    if (guardOn) { guardTick(); return; }
    guardOn = true; guardTick();
    guardTimer = setInterval(guardTick, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) guardTick(); });
  }
  // after a password login: take this device's slot (logs the older one out)
  function deviceClaim(accessToken) {
    return fetch(SB + '/rest/v1/rpc/device_claim', {
      method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' }, body: JSON.stringify(deviceArgs())
    }).then(function (r) { return r.ok ? r.json() : {}; }).then(function (d) { startGuard(); return d || {}; }).catch(function () { startGuard(); return {}; });
  }

  /* ===================================================================
     LICENCE + HELP DESK + RECEIPTS (every software)
     Licence: plan, days left, price, payments with printable receipts.
     Help Desk: email / WhatsApp / calling number set in Super Admin.
     =================================================================== */
  var LT = {
    licence: ['Licence', 'लाइसेंस', 'लायसन्स'], help: ['Help Desk', 'हेल्प डेस्क', 'हेल्प डेस्क'],
    daysLeft: ['days left', 'दिन बाकी', 'दिवस बाकी'], dayLeft: ['day left', 'दिन बाकी', 'दिवस बाकी'], lastDay: ['Last day today', 'आज आखिरी दिन', 'आज शेवटचा दिवस'],
    expired: ['Expired', 'समाप्त', 'संपले'], active: ['Active', 'चालू', 'चालू'], trial: ['Trial', 'ट्रायल', 'ट्रायल'],
    plan: ['Plan', 'प्लान', 'प्लॅन'], valid: ['Valid', 'वैधता', 'वैधता'], price: ['Price', 'कीमत', 'किंमत'], paid: ['Paid', 'जमा', 'भरले'],
    balance: ['Balance due', 'बकाया', 'बाकी रक्कम'], by: ['by', 'तक', 'पर्यंत'], history: ['Subscription history', 'सब्सक्रिप्शन इतिहास', 'सबस्क्रिप्शन इतिहास'],
    receipts: ['Payment receipts', 'पेमेंट रसीदें', 'पेमेंट पावत्या'], receipt: ['Receipt', 'रसीद', 'पावती'], view: ['View / Print', 'देखें / प्रिंट', 'पहा / प्रिंट'],
    noReceipts: ['No payment receipts yet.', 'अभी कोई रसीद नहीं।', 'अजून पावती नाही.'],
    renew: ['Renew on WhatsApp', 'WhatsApp पर रिन्यू करें', 'WhatsApp वर रिन्यू करा'],
    staff: ['Price and receipts are shown to the shop owner.', 'कीमत और रसीदें दुकान मालिक को दिखती हैं।', 'किंमत आणि पावत्या दुकान मालकाला दिसतात.'],
    demo: ['You are the Super Admin – this is your demo shop, it has no licence.', 'आप सुपर एडमिन हैं – यह आपकी डेमो दुकान है, इसका लाइसेंस नहीं।', 'तुम्ही सुपर ॲडमिन आहात – हे तुमचं डेमो दुकान आहे, याला लायसन्स नाही.'],
    helpIntro: ['Need help with', 'मदद चाहिए', 'मदत हवी आहे'], contact: ['Contact', 'संपर्क करें', 'संपर्क करा'],
    whatsapp: ['WhatsApp', 'WhatsApp', 'WhatsApp'], call: ['Call', 'कॉल करें', 'कॉल करा'], email: ['Email', 'ईमेल', 'ईमेल'],
    notSet: ['Support contact is not set yet.', 'सपोर्ट संपर्क अभी सेट नहीं है।', 'सपोर्ट संपर्क अजून सेट नाही.'],
    close: ['Close', 'बंद करें', 'बंद करा'], loading: ['Loading…', 'लोड हो रहा है…', 'लोड होत आहे…'],
    err: ['Could not load. Check the internet and try again.', 'लोड नहीं हुआ। इंटरनेट देखकर फिर कोशिश करें।', 'लोड झालं नाही. इंटरनेट तपासून पुन्हा प्रयत्न करा.'],
    print: ['Print / Save PDF', 'प्रिंट / PDF सेव करें', 'प्रिंट / PDF सेव्ह करा'], back: ['Back', 'वापस', 'मागे'],
    monthly: ['Monthly', 'मासिक', 'मासिक'], yearly: ['Yearly', 'वार्षिक', 'वार्षिक'], licence1: ['One-time licence', 'एक बार लाइसेंस', 'एकदाच लायसन्स'],
    licence_rec: ['Licence + recurring', 'लाइसेंस + नियमित', 'लायसन्स + नियमित'], recurring: ['Recurring', 'नियमित', 'नियमित'],
    months: ['months', 'महीने', 'महिने'], everyMonth: ['every month', 'हर महीने', 'दर महिन्याला'], everyYear: ['every year', 'हर साल', 'दर वर्षी'],
    every: ['every', 'हर', 'दर'], helpMsg: ['Hello, I need help with', 'नमस्ते, मुझे मदद चाहिए', 'नमस्कार, मला मदत हवी आहे'],
    renewMsg: ['Hello, I want to renew', 'नमस्ते, मुझे रिन्यू करना है', 'नमस्कार, मला रिन्यू करायचं आहे']
  };
  function lg() { var l = 'en'; try { l = typeof window.getAppLanguage === 'function' ? window.getAppLanguage() : (document.documentElement.lang || 'en'); } catch (e) { } l = String(l).slice(0, 2); return l === 'mr' ? 2 : l === 'hi' ? 1 : 0; }
  function T(k) { var v = LT[k]; return v ? v[lg()] : k; }
  function rs(v) { var n = parseFloat(v) || 0; return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function dmy(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || '')); return m ? m[3] + '-' + m[2] + '-' + m[1] : String(d || ''); }
  function every(m) { m = +m || 1; return m === 1 ? T('everyMonth') : m === 12 ? T('everyYear') : T('every') + ' ' + m + ' ' + T('months'); }
  function planText(s) {
    var m = s.meta || {};
    if (s.plan === 'trial') return T('trial');
    if (s.plan === 'licence') return T('licence1') + ' · ' + s.periods + ' ' + T('months');
    if (s.plan === 'licence_rec') return T('licence') + ' ' + rs(m.licence_fee) + ' + ' + rs(m.recurring_amount) + ' ' + every(m.cycle_months);
    if (s.plan === 'recurring') return T('recurring') + ' ' + rs(m.recurring_amount) + ' ' + every(m.cycle_months);
    return T(s.plan) + (s.periods > 1 ? ' × ' + s.periods : '');
  }
  function planTextEn(s) {          // the printed receipt is always in English
    var m = s.meta || {}, ev = function (x) { x = +x || 1; return x === 1 ? 'every month' : x === 12 ? 'every year' : 'every ' + x + ' months'; };
    if (s.plan === 'trial') return 'Trial';
    if (s.plan === 'licence') return 'One-time licence · ' + s.periods + ' months';
    if (s.plan === 'licence_rec') return 'Licence ' + rs(m.licence_fee) + ' + ' + rs(m.recurring_amount) + ' ' + ev(m.cycle_months);
    if (s.plan === 'recurring') return 'Recurring ' + rs(m.recurring_amount) + ' ' + ev(m.cycle_months);
    return (s.plan === 'monthly' ? 'Monthly' : 'Yearly') + (s.periods > 1 ? ' × ' + s.periods : '');
  }
  function words(n) {
    n = Math.round(parseFloat(n) || 0);
    var a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'],
        b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    function two(x) { return x < 20 ? a[x] : b[Math.floor(x / 10)] + (x % 10 ? ' ' + a[x % 10] : ''); }
    function three(x) { return (x >= 100 ? a[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : ''); }
    if (!n) return 'Zero';
    var out = [], cr = Math.floor(n / 1e7), lk = Math.floor(n / 1e5) % 100, th = Math.floor(n / 1e3) % 100, rest = n % 1000;
    if (cr) out.push(three(cr) + ' Crore'); if (lk) out.push(two(lk) + ' Lakh'); if (th) out.push(two(th) + ' Thousand'); if (rest) out.push(three(rest));
    return out.join(' ');
  }
  // printable receipt (also used by the Super Admin panel)
  function receiptHtml(d) {
    var e = esc, sup = d.seller || {}, bal = Math.max(0, (parseFloat(d.total) || 0) - (parseFloat(d.paidTotal) || 0));
    var logo = new URL('logo/mark.svg', ROOT).href;
    return '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Receipt R-' + e(String(d.no).padStart(4, '0')) + '</title><style>' +
      '*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#0f172a;background:#fff}' +
      '.r{max-width:720px;margin:24px auto;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden}' +
      '.h{display:flex;align-items:center;gap:14px;padding:20px 24px;background:#1e1b4b;color:#fff}.h img{width:46px;height:46px;border-radius:12px;background:#fff;padding:4px}' +
      '.h b{font-size:20px;display:block}.h span{font-size:12px;color:#c7d2fe}.h .t{margin-left:auto;text-align:right}.h .t b{font-size:16px;letter-spacing:.12em}' +
      '.b{padding:20px 24px}.g{display:grid;grid-template-columns:1fr 1fr;gap:14px 24px;margin-bottom:16px}.k{font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:#64748b;font-weight:700}.v{font-size:14px;font-weight:600;margin-top:2px}' +
      'table{width:100%;border-collapse:collapse;margin-top:6px}th,td{padding:10px;border-bottom:1px solid #e2e8f0;text-align:left;font-size:13.5px}th{background:#f8fafc;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b}td.n{text-align:right;font-weight:700}' +
      '.amt{margin-top:16px;padding:14px 16px;border-radius:12px;background:#eef2ff;display:flex;justify-content:space-between;align-items:center}.amt b{font-size:22px;color:#3730a3}.w{font-size:12.5px;color:#475569;margin-top:8px}' +
      '.s{display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;font-size:12.5px;color:#475569}.s b{color:#0f172a}' +
      '.f{padding:14px 24px;border-top:1px solid #e2e8f0;font-size:11.5px;color:#64748b;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}' +
      '@media print{.r{border:0;margin:0;max-width:none}}</style></head><body><div class="r">' +
      '<div class="h"><img src="' + e(logo) + '" alt=""><div><b>' + e(sup.company || 'NexGen Softwares') + '</b><span>' + e([sup.phone || sup.whatsapp, sup.email].filter(Boolean).join(' · ')) + '</span></div>' +
      '<div class="t"><b>RECEIPT</b><span>No. R-' + e(String(d.no).padStart(4, '0')) + '<br>' + e(dmy(d.date)) + '</span></div></div>' +
      '<div class="b"><div class="g"><div><div class="k">Received from</div><div class="v">' + e(d.company || '') + '</div><div class="w">' + e([d.name !== d.company ? d.name : '', d.code ? 'Customer ID ' + d.code : '', d.gstin ? 'GSTIN ' + d.gstin : ''].filter(Boolean).join(' · ')) + '</div></div>' +
      '<div><div class="k">Payment mode</div><div class="v">' + e(d.mode || '—') + '</div><div class="w">' + e(d.ref ? 'Ref / UTR: ' + d.ref : '') + '</div></div></div>' +
      '<table><thead><tr><th>Software</th><th>Plan</th><th>Period</th><th style="text-align:right">Amount</th></tr></thead><tbody><tr><td><b>' + e(d.software) + '</b></td><td>' + e(d.plan) + '</td><td>' + e(dmy(d.start) + ' → ' + dmy(d.end)) + '</td><td class="n">' + e(rs(d.amount)) + '</td></tr></tbody></table>' +
      '<div class="amt"><span>Amount received</span><b>' + e(rs(d.amount)) + '</b></div><div class="w">Rupees ' + e(words(d.amount)) + ' Only</div>' +
      '<div class="s"><span>Plan total <b>' + e(rs(d.total)) + '</b></span><span>Paid till now <b>' + e(rs(d.paidTotal)) + '</b></span><span>Balance <b>' + e(rs(bal)) + '</b></span></div></div>' +
      '<div class="f"><span>Thank you for choosing ' + e(sup.company || 'NexGen Softwares') + '.</span><span>Computer generated receipt – no signature needed.</span></div></div></body></html>';
  }
  function printHtml(html) {
    var f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    var d = f.contentWindow.document; d.open(); d.write(html); d.close();
    setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { } setTimeout(function () { f.remove(); }, 4000); }, 500);
  }
  function waLinkTo(num, text) { var d = String(num || '').replace(/\D/g, ''); if (d.length === 10) d = '91' + d; return 'https://wa.me/' + d + '?text=' + encodeURIComponent(text); }
  var panel = null;
  function openPanel(title, html) {
    mount(); if (panel) panel.remove();
    panel = el('<div class="nx-ov"><div class="nx-box"><div class="nx-hd"><b>' + esc(title) + '</b><button class="nx-x" aria-label="Close">×</button></div><div class="nx-bd">' + html + '</div></div></div>');
    panel.querySelector('.nx-x').onclick = closePanel;
    panel.onclick = function (ev) { if (ev.target === panel) closePanel(); };
    return panel;
  }
  function closePanel() { if (panel) { panel.remove(); panel = null; } }
  function loadLicence() {
    var s = readSession();
    var tok = s && s.expires_at && s.expires_at * 1000 > Date.now() + 15000 ? Promise.resolve(s) : freshSession();
    return tok.then(function (ss) {
      if (!ss) throw new Error('login');
      return fetch(SB + '/rest/v1/rpc/my_licence', { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + ss.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_app: APP }) })
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
    });
  }
  function openLicence() {
    var p = openPanel(T('licence'), '<p class="nx-mut">' + esc(T('loading')) + '</p>');
    loadLicence().then(function (d) {
      if (!panel || panel !== p) return;
      var bd = p.querySelector('.nx-bd');
      if (d.role === 'super_admin') { bd.innerHTML = '<p class="nx-mut">' + esc(T('demo')) + '</p>'; return; }
      var a = d.app || {}, left = +a.days_left, st = a.state || 'expired', sub = (d.subs || [])[0] || {};
      var total = 0; if (a.start_date && a.end_date) total = (Date.parse(a.end_date) - Date.parse(a.start_date)) / 864e5 + 1;
      var pct = total > 0 ? Math.max(0, Math.min(100, (left + 1) / total * 100)) : 0;
      var cur = (d.subs || []).filter(function (x) { return x.start_date <= a.end_date && x.end_date >= a.start_date; })[0] || sub;
      var html = '<div class="nx-hero ' + (st === 'expired' ? 'bad' : left <= (a.remind_days || 8) ? 'warn' : 'ok') + '"><div><span class="nx-st">' + esc(T(st === 'trial' ? 'trial' : st === 'expired' ? 'expired' : 'active')) + '</span>' +
        '<b>' + (st === 'expired' ? esc(T('expired')) : left <= 0 ? esc(T('lastDay')) : left + ' ' + esc(T(left === 1 ? 'dayLeft' : 'daysLeft'))) + '</b>' +
        '<span>' + esc(d.software || NAME) + '</span></div><div class="nx-bar"><i style="width:' + pct.toFixed(1) + '%"></i></div></div>' +
        '<div class="nx-grid"><div><span>' + esc(T('plan')) + '</span><b>' + esc(cur.plan ? planText(cur) : '—') + '</b></div>' +
        '<div><span>' + esc(T('valid')) + '</span><b>' + esc(a.start_date ? dmy(a.start_date) + ' → ' + dmy(a.end_date) : '—') + '</b></div>';
      if (d.role === 'customer') {
        html += '<div><span>' + esc(T('price')) + '</span><b>' + esc(cur.amount != null ? rs(cur.amount) : '—') + '</b></div>' +
          '<div><span>' + esc(T('paid')) + '</span><b>' + esc(cur.paid != null ? rs(cur.paid) : '—') + '</b></div>';
        var dues = (d.subs || []).filter(function (x) { return +x.balance > 0; });
        if (dues.length) html += '<div class="nx-due"><span>' + esc(T('balance')) + '</span><b>' + esc(rs(dues.reduce(function (t, x) { return t + +x.balance; }, 0))) + '</b>' + (dues[0].due_date ? '<em>' + esc(T('by')) + ' ' + esc(dmy(dues[0].due_date)) + '</em>' : '') + '</div>';
      }
      html += '</div>';
      if (d.role === 'customer') {
        html += '<h4>' + esc(T('receipts')) + '</h4>' + ((d.payments || []).length ? '<div class="nx-list">' + d.payments.map(function (x, i) {
          return '<div class="nx-it"><div><b>' + esc(T('receipt')) + ' R-' + esc(String(x.receipt_no).padStart(4, '0')) + '</b><span>' + esc(dmy(x.paid_on)) + ' · ' + esc(planText(x)) + (x.mode ? ' · ' + esc(x.mode) : '') + '</span></div>' +
            '<b class="nx-amt">' + esc(rs(x.amount)) + '</b><button class="nx-btn" data-r="' + i + '">' + esc(T('view')) + '</button></div>'; }).join('') + '</div>'
          : '<p class="nx-mut">' + esc(T('noReceipts')) + '</p>');
        if ((d.subs || []).length > 1) html += '<h4>' + esc(T('history')) + '</h4><div class="nx-list">' + d.subs.map(function (x) {
          return '<div class="nx-it"><div><b>' + esc(planText(x)) + '</b><span>' + esc(dmy(x.start_date) + ' → ' + dmy(x.end_date)) + '</span></div><b class="nx-amt">' + esc(rs(x.amount)) + '</b></div>'; }).join('') + '</div>';
      } else html += '<p class="nx-mut">' + esc(T('staff')) + '</p>';
      var sp = d.support || {};
      if (sp.whatsapp) html += '<a class="nx-cta" target="_blank" rel="noopener" href="' + esc(waLinkTo(sp.whatsapp, T('renewMsg') + ' ' + (d.software || NAME) + ' – ' + ((d.customer || {}).company || '') + ' (' + ((d.customer || {}).code || '') + ')')) + '">' + esc(T('renew')) + '</a>';
      bd.innerHTML = html;
      Array.prototype.forEach.call(bd.querySelectorAll('[data-r]'), function (b) {
        b.onclick = function () {
          var x = d.payments[+b.dataset.r], c = d.customer || {};
          var r = { no: x.receipt_no, date: x.paid_on, company: c.company, name: c.name, code: c.code, gstin: c.gstin, mode: x.mode, ref: x.ref, software: d.software || NAME,
            plan: planTextEn(x), start: x.start_date, end: x.end_date, amount: x.amount, total: x.total, paidTotal: x.paid_total, seller: sp };
          showReceipt(r);
        };
      });
    }).catch(function () { if (panel === p) p.querySelector('.nx-bd').innerHTML = '<p class="nx-mut">' + esc(T('err')) + '</p>'; });
  }
  function showReceipt(r) {
    var html = receiptHtml(r);
    var p = openPanel(T('receipt') + ' R-' + String(r.no).padStart(4, '0'), '<iframe class="nx-rcpt" title="Receipt"></iframe><div class="nx-row"><button class="nx-btn ghost" data-b>' + esc(T('back')) + '</button><button class="nx-btn" data-p>' + esc(T('print')) + '</button></div>');
    var f = p.querySelector('.nx-rcpt'); f.srcdoc = html;
    p.querySelector('[data-p]').onclick = function () { printHtml(html); };
    p.querySelector('[data-b]').onclick = openLicence;
  }
  function openHelp() {
    var p = openPanel(T('help'), '<p class="nx-mut">' + esc(T('loading')) + '</p>');
    var draw = function (sp, cust) {
      if (!panel || panel !== p) return;
      sp = sp || {}; cust = cust || {};
      var msg = T('helpMsg') + ' ' + NAME + (cust.company ? ' – ' + cust.company : '') + (cust.code ? ' (' + cust.code + ')' : '');
      var rows = '';
      if (sp.whatsapp) rows += '<a class="nx-hl wa" target="_blank" rel="noopener" href="' + esc(waLinkTo(sp.whatsapp, msg)) + '"><i>💬</i><span><b>' + esc(T('whatsapp')) + '</b>' + esc(sp.whatsapp) + '</span></a>';
      if (sp.phone || sp.whatsapp) rows += '<a class="nx-hl" href="tel:' + esc(String(sp.phone || sp.whatsapp).replace(/[^\d+]/g, '')) + '"><i>📞</i><span><b>' + esc(T('call')) + '</b>' + esc(sp.phone || sp.whatsapp) + '</span></a>';
      if (sp.email) rows += '<a class="nx-hl" href="mailto:' + esc(sp.email) + '?subject=' + encodeURIComponent(msg) + '"><i>✉️</i><span><b>' + esc(T('email')) + '</b>' + esc(sp.email) + '</span></a>';
      p.querySelector('.nx-bd').innerHTML = '<div class="nx-help"><img src="' + esc(new URL('logo/mark.svg', ROOT).href) + '" alt=""><div><span>' + esc(T('helpIntro')) + ' ' + esc(NAME) + '?</span><b>' + esc(T('contact')) + ' ' + esc(sp.company || 'NexGen Softwares') + '</b></div></div>' +
        (rows ? '<div class="nx-hls">' + rows + '</div>' : '<p class="nx-mut">' + esc(T('notSet')) + '</p>');
    };
    loadLicence().then(function (d) { draw(d.support, d.customer); }).catch(function () {
      fetch(SB + '/rest/v1/settings?select=company_name,support_email,support_mobile,support_phone&id=eq.1', { headers: { apikey: KEY } }).then(function (r) { return r.json(); })
        .then(function (a) { var s = a && a[0] || {}; draw({ company: s.company_name, email: s.support_email, whatsapp: s.support_mobile, phone: s.support_phone }); })
        .catch(function () { if (panel === p) p.querySelector('.nx-bd').innerHTML = '<p class="nx-mut">' + esc(T('err')) + '</p>'; });
    });
  }
  // softwares without a menu entry of their own get one small "?" button (Licence + Help Desk)
  var helpBtn = null;
  function showHelpButton() {
    if (helpBtn || ds.help === 'menu' || APP === 'portal' || APP === 'admin') return;
    mount();
    helpBtn = el('<button class="nx-q" title="Licence & Help Desk">?</button>');
    helpBtn.onclick = function () {
      var p = openPanel(NAME, '<div class="nx-hls"><button class="nx-hl" data-l><i>🪪</i><span><b>' + esc(T('licence')) + '</b></span></button><button class="nx-hl" data-h><i>🛟</i><span><b>' + esc(T('help')) + '</b></span></button></div>');
      p.querySelector('[data-l]').onclick = openLicence; p.querySelector('[data-h]').onclick = openHelp;
    };
  }

  if (!GATE) { window.NexGenShell = { app: APP, install: install, afterLogin: afterLogin, update: hardUpdate, guard: startGuard, deviceClaim: deviceClaim, deviceArgs: deviceArgs, receiptHtml: receiptHtml, printHtml: printHtml }; return; }

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
  function logoutAll() { ls(STORE, null); ls(LIC, null); try { sessionStorage.removeItem('ngs-switch'); } catch (e) { } toLogin(); }

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
      var left = app.days_left <= 0 ? '<b>Last day today</b>' : '<b>' + app.days_left + ' day' + (app.days_left === 1 ? '' : 's') + ' left</b>';
      var b = el('<div class="bar' + (app.days_left <= 3 ? ' urgent' : '') + '"><span>⏳ ' + left + ' – your ' + esc(NAME) + ' plan ends on ' + fmtD(app.end_date) + '. Renew to keep using it; your data stays safe.</span>' +
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
    if (okCached) { unlock(); if (cached.who === 'admin') showSwitch('admin'); else showSwitch(); }   // open instantly, confirm in background
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
          if (me.role === 'super_admin') { ls(LIC, JSON.stringify({ ok: true, until: '9999-12-31', who: 'admin' })); unlock(); showSwitch('admin'); afterLogin({ suggest: false }); return; }
          if (me.role !== 'customer' && me.role !== 'member') return logoutAll();
          var app = (me.apps || []).filter(function (a) { return a.code === APP; })[0];
          if (app && (app.state === 'active' || app.state === 'trial')) {
            ls(LIC, JSON.stringify({ ok: true, until: app.end_date, who: me.customer.code }));
            unlock();
            if (me.role === 'customer' && (me.apps || []).length > 1) showSwitch('apps');
            else { try { sessionStorage.removeItem('ngs-switch'); } catch (e) { } if (swEl) { swEl.remove(); swEl = null; } }
            var c = me.customer || {};
            afterLogin({ tenant_code: c.tenant_code || c.code, company: c.company_name || c.name });
            if (app.days_left <= (app.remind_days || 8)) soonBar(app);
            startGuard(); showHelpButton();
            return;
          }
          ls(LIC, null);
          blocked(me, app);
        });
      });
    }).catch(function () { if (!unlocked) offline(); });
  }

  if (OWNLOGIN) {
    unlocked = true; startVersion();
    freshSession().then(function (s) {
      if (!s) return;
      return fetch(SB + '/rest/v1/rpc/my_portal', {
        method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, body: '{"p_login":false}'
      }).then(function (r) { return r.ok ? r.json() : null; }).then(function (me) {
        if (!me) return;
        if (me.role === 'super_admin') showSwitch('admin');
        else if (me.role === 'customer' && (me.apps || []).length > 1) showSwitch('apps');
        if (me.role === 'customer' || me.role === 'member') startGuard();
        if (me.role !== 'none') showHelpButton();
      });
    }).catch(function () { });
    window.NexGenShell = { app: APP, ownLogin: true, session: freshSession, guard: startGuard, deviceClaim: deviceClaim, deviceArgs: deviceArgs, licence: openLicence, help: openHelp, receiptHtml: receiptHtml, printHtml: printHtml, toPanel: function () { location.href = ROOT + 'portal/?app=' + encodeURIComponent(APP); },
      install: install, afterLogin: afterLogin, checkLatest: checkLatest, update: hardUpdate };
    return;
  }
  lock();
  check();
  // re-check when the app comes back to the screen (plan may have ended / been renewed)
  var lastCheck = Date.now();
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Date.now() - lastCheck > 30 * 60 * 1000) { lastCheck = Date.now(); check(); }
  });
  window.NexGenShell = { app: APP, session: freshSession, guard: startGuard, deviceClaim: deviceClaim, deviceArgs: deviceArgs, licence: openLicence, help: openHelp, receiptHtml: receiptHtml, printHtml: printHtml, toPanel: function () { location.href = ROOT + 'portal/'; }, logout: logoutAll, install: install, afterLogin: afterLogin, checkLatest: checkLatest, update: hardUpdate };
})();
