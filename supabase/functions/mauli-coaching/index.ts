// Mauli Coaching Classes – server for the NexGen Softwares cloud.
// Every coaching class is one NexGen customer (tenant). A login only ever reaches its own class.
//   Admin   = the customer: NexGen Email ID + password (or already logged in on the main NexGen link)
//   Teacher = Login ID + password made by the admin (Login IDs are unique across all classes)
//   Student = registered mobile number + own password (one password for all students on that number)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
class E extends Error { constructor(msg: string, public status = 400) { super(msg); } }

const URL_ = Deno.env.get('SUPABASE_URL')!;
const db = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { autoRefreshToken: false, persistSession: false } });
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const BUCKET = 'coaching-materials';
const RIGHTS = ['students', 'fees', 'attendance', 'progress', 'reports', 'materials'];

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const d10 = (p: unknown) => String(p ?? '').replace(/\D/g, '').slice(-10);
const tok = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (x) => x.toString(16).padStart(2, '0')).join('');
const num = (v: unknown) => { const n = Number(v); if (!Number.isFinite(n)) throw new E('Invalid id'); return Math.trunc(n); };
const must = <T>(r: { data: T; error: any }) => { if (r.error) { console.error(r.error); throw new E(r.error.message || 'Database error', 500); } return r.data; };
const rpc = async (fn: string, args: Record<string, unknown>) => must(await db.rpc(fn, args));

async function failGuard(login: string) {
  const since = new Date(Date.now() - 15 * 60000).toISOString();
  const { count } = await db.from('mc_login_fails').select('login', { count: 'exact', head: true }).eq('login', login).gte('at', since);
  if ((count || 0) >= 8) throw new E('Too many wrong attempts. Please try again after 15 minutes.', 429);
}
const failNote = (login: string) => db.from('mc_login_fails').insert({ login });

async function licensed(tenant: string) { return !!(await rpc('_mc_licensed', { p_tenant: tenant })); }
async function needLicence(tenant: string) {
  if (!(await licensed(tenant))) throw new E('This coaching class plan has ended. Please contact your class admin – your data is safe.', 403);
}
async function className(tenant: string) {
  const { data } = await db.from('mc_settings').select('data').eq('tenant', tenant).maybeSingle();
  return (data?.data?.className as string) || 'Mauli Coaching Classes';
}
async function bump(tenant: string) { return rpc('_mc_bump', { p_tenant: tenant }); }
async function newSession(tenant: string, role: string, uid: string, name: string) {
  const t = tok();
  must(await db.from('mc_sessions').insert({ token: t, tenant, role, uid, name }));
  return t;
}
async function docs(tenant: string, coll: string) {
  const rows = must(await db.from('mc_docs').select('data').eq('tenant', tenant).eq('coll', coll).order('id')) as any[];
  return rows.map((r) => r.data);
}
async function getDoc(tenant: string, coll: string, id: number) {
  const { data } = await db.from('mc_docs').select('data').eq('tenant', tenant).eq('coll', coll).eq('id', id).maybeSingle();
  return data?.data ?? null;
}
const putDocs = async (tenant: string, coll: string, list: any[]) => {
  if (!list.length) return;
  must(await db.from('mc_docs').upsert(list.map((d) => ({ tenant, coll, id: num(d.id), data: d, updated_at: new Date().toISOString() })), { onConflict: 'tenant,coll,id' }));
};
const tgOk = (tg: string, s: any) => !tg || tg === 'all' || tg === 'b:' + s.batchId || tg === 'g:' + s.grade;

// ---------- push notifications (web push, same keys as the rest of NexGen) ----------
let vapidReady = false;
async function vapid() {
  if (vapidReady) return true;
  const { data: cfg } = await db.from('billing_push_config').select('*').eq('id', 1).maybeSingle();
  if (!cfg) return false;
  webpush.setVapidDetails(cfg.subject, cfg.vapid_public, cfg.vapid_private);
  return (vapidReady = true);
}
async function notify(subs: any[], payload: Record<string, unknown>) {
  if (!subs.length || !(await vapid())) return 0;
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 6 * 3600, urgency: 'high' }); sent++; }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await db.from('mc_push').delete().eq('endpoint', s.endpoint); else console.error('push', e?.statusCode, e?.body || e?.message); }
  }));
  return sent;
}
async function subsFor(tenant: string, role: string, uids?: string[]) {
  let q = db.from('mc_push').select('*').eq('tenant', tenant).eq('role', role);
  if (uids) { if (!uids.length) return []; q = q.in('uid', uids); }
  return (must(await q) as any[]) || [];
}
// parents (student phones) of the students a target reaches
async function parentPhones(tenant: string, tg: string) {
  const st = await docs(tenant, 'students');
  return [...new Set(st.filter((s) => s.status !== 'Discontinued' && tgOk(tg, s)).map((s) => d10(s.phone)).filter((p) => p.length === 10))];
}

// ---------- who is calling ----------
type Sess = { token: string; tenant: string; role: 'admin' | 'teacher' | 'student'; uid: string; name: string; teacher?: any };
async function session(t: string): Promise<Sess> {
  if (!t) throw new E('Please sign in', 401);
  const { data: s } = await db.from('mc_sessions').select('*').eq('token', t).maybeSingle();
  if (!s || Date.parse(s.last_seen) < Date.now() - 60 * 864e5) throw new E('Session expired. Please sign in again.', 401);
  const out: Sess = { token: t, tenant: s.tenant, role: s.role, uid: s.uid, name: s.name || '' };
  if (s.role === 'teacher') {
    const { data: tc } = await db.from('mc_teachers').select('*').eq('tenant', s.tenant).eq('id', num(s.uid)).maybeSingle();
    if (!tc || !tc.active) throw new E('Your teacher login is disabled. Contact the admin.', 401);
    out.teacher = tc; out.name = tc.name;
  }
  if (s.role === 'student' && !(await db.from('mc_stu_acc').select('phone').eq('tenant', s.tenant).eq('phone', s.uid).maybeSingle()).data)
    throw new E('Your password was reset. Please sign in again.', 401);
  if (Date.parse(s.last_seen) < Date.now() - 10 * 60000) await db.from('mc_sessions').update({ last_seen: new Date().toISOString() }).eq('token', t);
  return out;
}
const isStaff = (s: Sess) => s.role === 'admin' || s.role === 'teacher';
const can = (s: Sess, r: string) => s.role === 'admin' || (s.role === 'teacher' && !!s.teacher?.rights?.[r]);
const need = (s: Sess, r: string) => { if (!can(s, r)) throw new E('You don’t have access to this section', 403); };
const needAdmin = (s: Sess) => { if (s.role !== 'admin') throw new E('Admin only', 403); };
async function myProfiles(s: Sess) {
  const st = await docs(s.tenant, 'students');
  return st.filter((x) => d10(x.phone) === s.uid);
}

// ---------- the actions ----------
const A: Record<string, (b: any) => Promise<unknown>> = {};

// admin: NexGen Email ID + password
A.login = async (b) => {
  const role = String(b.role || ''), id = String(b.id || '').trim(), pw = String(b.pw || '');
  if (!id || !pw) throw new E('Enter your login and password.');
  if (role === 'admin') {
    const key = id.toLowerCase(); await failGuard('a:' + key);
    const email = await rpc('login_email_for', { p_identifier: id }) as string | null;
    if (!email) { await failNote('a:' + key); throw new E('No NexGen account found with this Email ID.'); }
    const { data: cust } = await db.from('customers').select('password_set_at,status').eq('login_email', email).maybeSingle();
    if (cust && !cust.password_set_at) return { setup: true };
    const r = await fetch(URL_ + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) });
    if (!r.ok) { await failNote('a:' + key); throw new E('Wrong Email ID or password.'); }
    const j = await r.json();
    return ownerLogin(j.user.id);
  }
  if (role === 'teacher') {
    const login = id.toLowerCase(); await failGuard('t:' + login);
    const { data: tc } = await db.from('mc_teachers').select('*').eq('login', login).maybeSingle();
    if (!tc || !(await rpc('_mc_check', { p: pw, h: tc.pass_hash }))) { await failNote('t:' + login); throw new E('Wrong Login ID or password.'); }
    if (!tc.active) throw new E('Your teacher login is disabled. Contact the admin.');
    await needLicence(tc.tenant);
    const token = await newSession(tc.tenant, 'teacher', String(tc.id), tc.name);
    return { token, role: 'teacher', tid: tc.id, name: tc.name, cname: await className(tc.tenant) };
  }
  throw new E('Choose Admin, Teacher or Student.');
};
async function ownerLogin(uid: string) {
  const o = await rpc('_mc_owner_tenant', { p_uid: uid }) as any;
  if (!o) throw new E('This NexGen account has no Mauli Coaching Classes subscription.', 403);
  if (o.blocked) throw new E('This account is blocked. Please contact NexGen Softwares.', 403);
  await needLicence(o.tenant);
  if (!(await db.from('mc_settings').select('tenant').eq('tenant', o.tenant).maybeSingle()).data) await db.from('mc_settings').insert({ tenant: o.tenant, data: {} });
  const token = await newSession(o.tenant, 'admin', 'admin', o.name || 'Admin');
  return { token, role: 'admin', tid: 0, name: o.name || 'Admin', email: o.email || '', cname: await className(o.tenant) };
}
// already logged in on the main NexGen link → no second login
A.ng_login = async (b) => {
  const { data: u, error } = await db.auth.getUser(String(b.jwt || ''));
  if (error || !u?.user) throw new E('Please sign in again.', 400);
  return ownerLogin(u.user.id);
};
A.check = async () => { throw new E('Activation codes are not used any more. Admins sign in with their NexGen Email ID.'); };

// students
A.s_check = async (b) => {
  const ph = d10(b.phone); if (ph.length !== 10) throw new E('Enter a valid 10-digit mobile number.');
  await failGuard('s:' + ph);
  const rows = must(await db.from('mc_docs').select('tenant,data').eq('coll', 'students').like('data->>phone', '%' + ph)) as any[];
  const hit = rows.filter((r) => d10(r.data.phone) === ph);
  const tenants = [...new Set(hit.map((r) => r.tenant))];
  const ok: string[] = []; for (const t of tenants) if (await licensed(t)) ok.push(t);
  if (!ok.length) { await failNote('s:' + ph); throw new E(hit.length ? 'Your coaching class plan has ended. Please contact your class.' : 'This number is not registered with any coaching class. Ask your class to add it.'); }
  const acc = must(await db.from('mc_stu_acc').select('tenant').eq('phone', ph).in('tenant', ok)) as any[];
  const names: Record<string, string> = {}; for (const t of ok) names[t] = await className(t);
  const matches = hit.filter((r) => ok.includes(r.tenant)).map((r) => ({ id: r.data.id, name: r.data.name, grade: r.data.grade || '', tn: r.tenant, cname: names[r.tenant], hasPw: acc.some((a) => a.tenant === r.tenant) }));
  return { cname: names[ok[0]], matches, hasPw: ok.length === 1 ? acc.length > 0 : null };
};
async function stuTenant(b: any) {
  const ph = d10(b.phone), tn = String(b.tn || '');
  const rows = must(await db.from('mc_docs').select('tenant,data').eq('coll', 'students').like('data->>phone', '%' + ph)) as any[];
  const hit = rows.filter((r) => d10(r.data.phone) === ph && (!tn || r.tenant === tn));
  const tenants = [...new Set(hit.map((r) => r.tenant))];
  if (!hit.length) throw new E('This number is not registered with the coaching class.');
  if (tenants.length > 1) throw new E('Choose your coaching class first.');
  return { ph, tenant: tenants[0] as string, list: hit.map((r) => r.data) };
}
A.s_register = async (b) => {
  const { ph, tenant, list } = await stuTenant(b); const pw = String(b.pw || '');
  if (pw.length < 6) throw new E('Password must be at least 6 characters.');
  await needLicence(tenant);
  if ((await db.from('mc_stu_acc').select('phone').eq('tenant', tenant).eq('phone', ph).maybeSingle()).data) throw new E('A password already exists for this number. Please sign in.');
  must(await db.from('mc_stu_acc').insert({ tenant, phone: ph, pw, pass_hash: await rpc('_mc_hash', { p: pw }) }));
  await bump(tenant);
  const s = list.find((x) => String(x.id) === String(b.sid)) || list[0];
  return { token: await newSession(tenant, 'student', ph, s.name), tid: s.id };
};
A.s_login = async (b) => {
  const { ph, tenant, list } = await stuTenant(b); await failGuard('s:' + ph);
  const { data: acc } = await db.from('mc_stu_acc').select('*').eq('tenant', tenant).eq('phone', ph).maybeSingle();
  if (!acc) throw new E('Create your password first.');
  if (!(await rpc('_mc_check', { p: String(b.pw || ''), h: acc.pass_hash }))) { await failNote('s:' + ph); throw new E('Wrong password. Forgot it? Ask your coaching class admin to reset it.'); }
  await needLicence(tenant);
  const s = list.find((x) => String(x.id) === String(b.sid)) || list[0];
  return { token: await newSession(tenant, 'student', ph, s.name), tid: s.id };
};
A.logout = async (b, s?: Sess) => { await db.from('mc_sessions').delete().eq('token', String(b.t || '')); return { ok: true }; };

const SESSIONED: Record<string, (b: any, s: Sess) => Promise<unknown>> = {};
SESSIONED.ver = async (_b, s) => ({ ver: (await db.from('mc_settings').select('v').eq('tenant', s.tenant).maybeSingle()).data?.v || 1 });

SESSIONED.pull = async (_b, s) => {
  if (!isStaff(s)) throw new E('Not allowed', 403);
  const [students, requests, batches, leaves, reports, events, materials] = await Promise.all(['students', 'requests', 'batches', 'leaves', 'reports', 'events', 'materials'].map((c) => docs(s.tenant, c)));
  const set = (await db.from('mc_settings').select('data,v').eq('tenant', s.tenant).maybeSingle()).data;
  const tcs = (must(await db.from('mc_teachers').select('id,name,login,active,rights').eq('tenant', s.tenant).order('id')) as any[])
    .map((t) => ({ id: t.id, name: t.name, loginId: t.login, active: t.active, rights: t.rights || {} }));
  let stuAcc: any[] = [];
  if (s.role === 'admin') {
    const acc = must(await db.from('mc_stu_acc').select('phone,pw').eq('tenant', s.tenant)) as any[];
    const byPh: Record<string, string> = {}; acc.forEach((a) => byPh[a.phone] = a.pw);
    stuAcc = students.filter((x) => byPh[d10(x.phone)]).map((x) => ({ id: x.id, pw: byPh[d10(x.phone)] }));
  }
  return { students, requests, batches, leaves, reports, events, materials, teachers: tcs, stuAcc, settings: set?.data || {}, code: '', ver: set?.v || 1, me: { role: s.role, name: s.name } };
};

SESSIONED.push = async (b, s) => {
  if (!isStaff(s)) throw new E('Not allowed', 403);
  const ch = b.ch || {}; let changed = false; const newReq: any[] = [];
  // check every permission before writing anything, so a change is saved completely or not at all
  if ((ch.students?.del || []).length || (ch.requests?.del || []).length) needAdmin(s);
  if ((ch.students?.up || []).length && !['students', 'fees', 'attendance', 'progress'].some((r) => can(s, r))) throw new E('You don’t have access to students', 403);
  if (s.role !== 'admin') { delete ch.batches; delete ch.settings; }     // only the admin changes batches and settings
  if (ch.students) {
    const up = (ch.students.up || []) as any[], del = (ch.students.del || []) as any[];
    if (up.length) {
      if (!['students', 'fees', 'attendance', 'progress'].some((r) => can(s, r))) throw new E('You don’t have access to students', 403);
      const old = new Map((await docs(s.tenant, 'students')).map((x) => [String(x.id), x]));
      const list = up.map((x) => {
        if (!x || x.id == null || !String(x.name || '').trim()) throw new E('Student name is required');
        const prev = old.get(String(x.id));
        if (s.role === 'teacher') {
          if (!prev) { if (!can(s, 'students')) throw new E('You can’t add students', 403); x.fee = { ...(x.fee || {}), paid: 0, history: [] }; }
          else x.fee = prev.fee;      // teachers never change fees directly – they send a request the admin approves
        }
        return x;
      });
      await putDocs(s.tenant, 'students', list); changed = true;
    }
    if (del.length) { needAdmin(s); must(await db.from('mc_docs').delete().eq('tenant', s.tenant).eq('coll', 'students').in('id', del.map(num))); changed = true; }
  }
  if (ch.requests) {
    const up = (ch.requests.up || []) as any[], del = (ch.requests.del || []) as any[];
    if (up.length) {
      const old = new Map((await docs(s.tenant, 'requests')).map((x) => [String(x.id), x]));
      const list = up.filter((q) => {
        const prev = old.get(String(q.id));
        if (s.role === 'admin') return true;
        if (!can(s, 'fees')) return false;
        if (prev) return false;                  // only the admin decides
        q.status = 'pending'; q.by = s.name; q.at = q.at || Date.now(); newReq.push(q); return true;
      });
      await putDocs(s.tenant, 'requests', list); if (list.length) changed = true;
    }
    if (del.length) { needAdmin(s); must(await db.from('mc_docs').delete().eq('tenant', s.tenant).eq('coll', 'requests').in('id', del.map(num))); changed = true; }
  }
  if (ch.batches) {
    needAdmin(s);
    await putDocs(s.tenant, 'batches', ch.batches.up || []);
    if ((ch.batches.del || []).length) must(await db.from('mc_docs').delete().eq('tenant', s.tenant).eq('coll', 'batches').in('id', ch.batches.del.map(num)));
    changed = true;
  }
  if (ch.settings && (ch.settings.up || []).length) {
    needAdmin(s);
    const d = { ...ch.settings.up[0] }; delete d.id;
    must(await db.from('mc_settings').upsert({ tenant: s.tenant, data: d }, { onConflict: 'tenant' })); changed = true;
  }
  if (changed) await bump(s.tenant);
  if (newReq.length) {
    const q = newReq[0];
    await notify(await subsFor(s.tenant, 'admin'), { title: '💰 Fee request waiting for approval', body: `${q.sname || 'Student'} · ₹${q.amount} · by ${s.name}${newReq.length > 1 ? ` (+${newReq.length - 1} more)` : ''}`, tag: 'req-' + q.id, url: './?go=appr' });
  }
  return { ok: true };
};

SESSIONED.s_pull = async (b, s) => {
  if (s.role !== 'student') throw new E('Not allowed', 403);
  const pr = await myProfiles(s);
  if (!pr.length) throw new E('Your student record was removed. Please contact the class.', 401);
  const sd = pr.find((x) => String(x.id) === String(b.sid)) || pr[0];
  const [leaves, reports, events, materials] = await Promise.all(['leaves', 'reports', 'events', 'materials'].map((c) => docs(s.tenant, c)));
  const set = (await db.from('mc_settings').select('data,v').eq('tenant', s.tenant).maybeSingle()).data;
  const settings = { ...(set?.data || {}) }; delete settings.absentMessage; delete settings.feeReminderMessage;
  const mine = (x: any) => pr.some((p) => tgOk(x.tg, p));
  return {
    student: sd, profiles: pr.map((p) => ({ id: p.id, name: p.name, grade: p.grade })),
    leaves: leaves.filter((l) => pr.some((p) => String(p.id) === String(l.sid))),
    reports: reports.filter((r) => tgOk(r.tg, sd)), events: events.filter((e) => tgOk(e.tg, sd)), materials: materials.filter((m) => tgOk(m.tg, sd) || mine(m)),
    settings, ver: set?.v || 1,
  };
};

// leave requests
SESSIONED.s_leave = async (b, s) => {
  if (s.role !== 'student') throw new E('Not allowed', 403);
  const sd = (await myProfiles(s)).find((x) => String(x.id) === String(b.sid)); if (!sd) throw new E('Student not found');
  const from = String(b.from || ''), to = String(b.to || from), reason = String(b.reason || '').trim().slice(0, 300);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || to < from) throw new E('Choose valid dates.');
  if (!reason) throw new E('Write the reason for leave.');
  const l = { id: Date.now(), sid: sd.id, sname: sd.name, grade: sd.grade || '', from, to, reason, status: 'pending', at: Date.now() };
  await putDocs(s.tenant, 'leaves', [l]); await bump(s.tenant);
  await notify(await subsFor(s.tenant, 'admin'), { title: '📝 Leave request', body: `${sd.name} · ${from}${to !== from ? ' → ' + to : ''} · ${reason.slice(0, 60)}`, tag: 'lv-' + l.id, url: './?go=lv' });
  return { ok: true, id: l.id };
};
SESSIONED.s_leave_cancel = async (b, s) => {
  if (s.role !== 'student') throw new E('Not allowed', 403);
  const l = await getDoc(s.tenant, 'leaves', num(b.id)); const pr = await myProfiles(s);
  if (!l || !pr.some((p) => String(p.id) === String(l.sid))) throw new E('Request not found');
  if (l.status !== 'pending') throw new E('This request was already decided.');
  must(await db.from('mc_docs').delete().eq('tenant', s.tenant).eq('coll', 'leaves').eq('id', num(b.id))); await bump(s.tenant);
  return { ok: true };
};
SESSIONED.leave_decide = async (b, s) => {
  needAdmin(s);
  const l = await getDoc(s.tenant, 'leaves', num(b.id)); if (!l) throw new E('Request not found');
  Object.assign(l, { status: b.ok ? 'approved' : 'rejected', decidedAt: Date.now(), by: s.name });
  await putDocs(s.tenant, 'leaves', [l]); await bump(s.tenant);
  const sd = await getDoc(s.tenant, 'students', num(l.sid));
  if (sd) await notify(await subsFor(s.tenant, 'student', [d10(sd.phone)]), { title: b.ok ? '✅ Leave approved' : '❌ Leave not approved', body: `${l.sname} · ${l.from}${l.to !== l.from ? ' → ' + l.to : ''}`, tag: 'lvd-' + l.id, url: './?go=slv' });
  return { ok: true };
};

// daily reports + class in / out
SESSIONED.rep_save = async (b, s) => {
  need(s, 'reports'); const r = b.r || {}; const text = String(r.text || '').trim();
  if (!text) throw new E('Write what was taught today');
  const prev = r.id ? await getDoc(s.tenant, 'reports', num(r.id)) : null;
  const d = { id: prev ? prev.id : Date.now(), tg: String(r.tg || 'all'), tgName: String(r.tgName || 'All students'), date: String(r.date || today()), text: text.slice(0, 4000), by: prev ? prev.by : s.name, at: prev ? prev.at : Date.now(), ...(prev ? { editedAt: Date.now() } : {}) };
  await putDocs(s.tenant, 'reports', [d]); await bump(s.tenant);
  if (!prev) await notify(await subsFor(s.tenant, 'student', await parentPhones(s.tenant, d.tg)), { title: '📣 ' + (await className(s.tenant)) + ' · Daily report', body: text.slice(0, 140), tag: 'rep-' + d.id, url: './?go=supd' });
  return { ok: true, id: d.id };
};
SESSIONED.rep_del = async (b, s) => { need(s, 'reports'); must(await db.from('mc_docs').delete().eq('tenant', s.tenant).eq('coll', 'reports').eq('id', num(b.id))); await bump(s.tenant); return { ok: true }; };
SESSIONED.cls_evt = async (b, s) => {
  if (!can(s, 'attendance') && !can(s, 'reports')) throw new E('You don’t have access to this section', 403);
  const type = b.type === 'out' ? 'out' : 'in', tg = String(b.tg || 'all'), date = today();
  if ((await docs(s.tenant, 'events')).some((e) => e.date === date && e.tg === tg && e.type === type)) throw new E(`${type === 'in' ? 'Class in' : 'Class out'} is already done today for this batch`);
  const e = { id: Date.now(), tg, tgName: String(b.tgName || 'All students'), type, date, at: Date.now(), by: s.name };
  await putDocs(s.tenant, 'events', [e]); await bump(s.tenant);
  const cn = await className(s.tenant);
  const sent = await notify(await subsFor(s.tenant, 'student', await parentPhones(s.tenant, tg)), {
    title: type === 'in' ? `🔔 ${cn} · Class started` : `✅ ${cn} · Class is over`,
    body: `${e.tgName} · ${new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })}`, tag: 'cls-' + e.id, url: './?go=shome' });
  return { ok: true, sent };
};

// study material
SESSIONED.mat_up = async (b, s) => {
  need(s, 'materials'); const size = Number(b.size || 0);
  if (!(size > 0) || size > 25 * 1048576) throw new E('File must be smaller than 25 MB.');
  const safe = String(b.name || 'file').replace(/[^\w.\-]+/g, '_').slice(-80);
  const path = `${s.tenant}/${Date.now()}-${safe}`;
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw new E(error.message, 500);
  return { url: data.signedUrl, path };
};
SESSIONED.mat_save = async (b, s) => {
  need(s, 'materials'); const m = { ...(b.m || {}) };
  if (!['file', 'note', 'video'].includes(m.kind) || !String(m.title || '').trim()) throw new E('Enter a title.');
  if (m.kind === 'file' && !String(m.path || '').startsWith(s.tenant + '/')) throw new E('Upload the file first.');
  const prev = m.id ? await getDoc(s.tenant, 'materials', num(m.id)) : null;
  const d = { ...m, id: prev ? prev.id : Date.now(), by: prev ? prev.by : s.name, at: prev ? prev.at : Date.now(), tg: String(m.tg || 'all') };
  await putDocs(s.tenant, 'materials', [d]); await bump(s.tenant);
  if (!prev) await notify(await subsFor(s.tenant, 'student', await parentPhones(s.tenant, d.tg)), { title: '📚 New study material', body: `${d.title}${d.tgName ? ' · ' + d.tgName : ''}`, tag: 'mat-' + d.id, url: './?go=sstudy' });
  return { ok: true, id: d.id };
};
SESSIONED.mat_del = async (b, s) => {
  need(s, 'materials'); const m = await getDoc(s.tenant, 'materials', num(b.id));
  if (m?.path && String(m.path).startsWith(s.tenant + '/')) await db.storage.from(BUCKET).remove([m.path]);
  must(await db.from('mc_docs').delete().eq('tenant', s.tenant).eq('coll', 'materials').eq('id', num(b.id))); await bump(s.tenant);
  return { ok: true };
};
SESSIONED.mat_url = async (b, s) => {
  const m = await getDoc(s.tenant, 'materials', num(b.id)); if (!m || !m.path) throw new E('File not found');
  if (s.role === 'student') { const pr = await myProfiles(s); if (!pr.some((p) => tgOk(m.tg, p))) throw new E('File not found'); }
  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(m.path, 3600, { download: false });
  if (error) throw new E(error.message, 500);
  return { url: data.signedUrl };
};

// teachers (admin)
SESSIONED.teacher_save = async (b, s) => {
  needAdmin(s); const tc = b.tc || {}; const name = String(tc.name || '').trim(), login = String(tc.loginId || '').trim().toLowerCase(), pw = String(b.pw || '');
  if (!name) throw new E('Enter the teacher’s name.');
  if (!/^[a-z0-9._@+-]{3,60}$/.test(login)) throw new E('Login ID must be 3-60 characters: letters, numbers, . _ - @');
  const rights: Record<string, boolean> = {}; RIGHTS.forEach((r) => rights[r] = !!(tc.rights || {})[r]);
  const { data: taken } = await db.from('mc_teachers').select('tenant,id').eq('login', login).maybeSingle();
  const id = tc.id ? num(tc.id) : Date.now();
  if (taken && !(taken.tenant === s.tenant && Number(taken.id) === id)) throw new E(`Login ID "${login}" is already used. Please choose another one (e.g. ${login}.${Math.floor(Math.random() * 90 + 10)}).`);
  const { data: prev } = await db.from('mc_teachers').select('*').eq('tenant', s.tenant).eq('id', id).maybeSingle();
  if (!prev && pw.length < 6) throw new E('Password must be at least 6 characters.');
  if (pw && pw.length < 6) throw new E('Password must be at least 6 characters.');
  const row: any = { tenant: s.tenant, id, name, login, active: tc.active !== false, rights, pass_hash: pw ? await rpc('_mc_hash', { p: pw }) : prev.pass_hash };
  must(await db.from('mc_teachers').upsert(row, { onConflict: 'tenant,id' }));
  if (pw || row.active === false) await db.from('mc_sessions').delete().eq('tenant', s.tenant).eq('role', 'teacher').eq('uid', String(id));
  await bump(s.tenant);
  return { ok: true, id };
};
SESSIONED.teacher_del = async (b, s) => {
  needAdmin(s); const id = num(b.id);
  must(await db.from('mc_teachers').delete().eq('tenant', s.tenant).eq('id', id));
  await db.from('mc_sessions').delete().eq('tenant', s.tenant).eq('role', 'teacher').eq('uid', String(id));
  await bump(s.tenant); return { ok: true };
};
SESSIONED.stu_reset = async (b, s) => {
  needAdmin(s); const sd = await getDoc(s.tenant, 'students', num(b.sid)); if (!sd) throw new E('Student not found');
  const ph = d10(sd.phone);
  await db.from('mc_stu_acc').delete().eq('tenant', s.tenant).eq('phone', ph);
  await db.from('mc_sessions').delete().eq('tenant', s.tenant).eq('role', 'student').eq('uid', ph);
  await bump(s.tenant); return { ok: true };
};
SESSIONED.admin_pw = async (b, s) => {
  needAdmin(s);
  const { data: c } = await db.from('customers').select('user_id,is_internal').eq('id', s.tenant).maybeSingle();
  if (!c || c.is_internal) throw new E('Change the super admin password in NexGen Super Admin.');
  await rpc('_mc_admin_pw', { p_uid: c.user_id, p_pw: String(b.pw || '') });
  return { ok: true };
};
SESSIONED.rotate = async () => { throw new E('Activation codes are not used any more.'); };
SESSIONED.import = async (b, s) => {
  needAdmin(s); const students = Array.isArray(b.students) ? b.students : null; if (!students) throw new E('Invalid backup file');
  must(await db.from('mc_docs').delete().eq('tenant', s.tenant).in('coll', ['students', 'batches']));
  await putDocs(s.tenant, 'students', students.filter((x: any) => x && x.id != null));
  await putDocs(s.tenant, 'batches', (b.batches || []).filter((x: any) => x && x.id != null));
  if (b.settings && typeof b.settings === 'object') { const d = { ...b.settings }; delete d.id; must(await db.from('mc_settings').upsert({ tenant: s.tenant, data: d }, { onConflict: 'tenant' })); }
  await bump(s.tenant); return { ok: true, n: students.length };
};

// app activity (who uses the app, how often, how long)
const actId = (role: string, uid: string) => { let h = 5381; for (const c of role + ':' + uid) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0; return h; };
SESSIONED.ping = async (b, s) => {
  let uid = s.uid, name = s.name, phone: string | null = null;
  if (s.role === 'student') { phone = s.uid; const pr = await myProfiles(s); name = pr.map((p) => p.name).join(', ') || name; }
  const id = actId(s.role, uid), now = Date.now(), d = today();
  const { data: a } = await db.from('mc_activity').select('*').eq('tenant', s.tenant).eq('id', id).maybeSingle();
  const days = a?.days || {}; const t = days[d] || { o: 0, m: 0 };
  if (b.open) t.o = (t.o || 0) + 1; else if (a && now - Number(a.last || 0) < 150000) t.m = (t.m || 0) + 1;
  days[d] = t;
  const keys = Object.keys(days).sort(); while (keys.length > 75) delete days[keys.shift()!];
  await db.from('mc_activity').upsert({ tenant: s.tenant, id, role: s.role, name, phone, dev: String(b.dev || '').slice(0, 40), last: now, days }, { onConflict: 'tenant,id' });
  return { ok: true };
};
SESSIONED.act_pull = async (_b, s) => {
  needAdmin(s);
  const rows = must(await db.from('mc_activity').select('id,role,name,phone,dev,last,days').eq('tenant', s.tenant)) as any[];
  return { now: Date.now(), today: today(), activity: rows.map((r) => ({ ...r, last: Number(r.last) })) };
};

// notifications on this device
SESSIONED.sub = async (b, s) => {
  const sub = b.sub || {}; if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) throw new E('This device could not register for notifications.');
  if (s.role === 'teacher') return { ok: true, skipped: true };
  must(await db.from('mc_push').upsert({ endpoint: sub.endpoint, tenant: s.tenant, role: s.role, uid: s.uid, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: 'endpoint' }));
  return { ok: true };
};
SESSIONED.unsub = async (b, s) => { if (b.endpoint) await db.from('mc_push').delete().eq('endpoint', String(b.endpoint)).eq('tenant', s.tenant); return { ok: true }; };
SESSIONED.push_test = async (b, s) => {
  const { data: sub } = await db.from('mc_push').select('*').eq('endpoint', String(b.endpoint || '')).eq('tenant', s.tenant).maybeSingle();
  if (!sub) throw new E('This phone is not registered for notifications yet. Turn notifications on and try again.');
  const wait = Math.max(0, Math.min(20, Number(b.delay || 0))) * 1000;
  const send = async () => { await new Promise((r) => setTimeout(r, wait)); await notify([sub], { title: '🔔 ' + (await className(s.tenant)), body: 'Test notification – notifications are working on this phone ✅', tag: 'test-' + Date.now(), url: s.role === 'student' ? './?go=sntest' : './?go=ntest' }); };
  // @ts-ignore EdgeRuntime is provided by Supabase
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) EdgeRuntime.waitUntil(send()); else await send();
  return { ok: true };
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let b: any; try { b = await req.json(); } catch { return json({ error: 'Invalid request' }, 400); }
  const a = String(b?.a || '');
  try {
    if (A[a]) return json(await A[a](b));
    if (SESSIONED[a]) {
      const s = await session(String(b.t || ''));
      if (a !== 'logout' && a !== 'unsub') await needLicence(s.tenant);
      return json(await SESSIONED[a](b, s));
    }
    return json({ error: 'Unknown action' }, 400);
  } catch (e: any) {
    if (e instanceof E) return json({ error: e.message }, e.status);
    console.error(a, e); return json({ error: 'Server error. Please try again.' }, 500);
  }
});
