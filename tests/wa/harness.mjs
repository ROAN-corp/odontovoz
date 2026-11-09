// Prueba de las funciones del servidor con base, Meta e IA simuladas
import crypto from 'node:crypto';
const ENV = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_ROLE_KEY: 'srv', SUPABASE_ANON_KEY: 'anon', META_APP_SECRET: 'sec', META_TOKEN: 'tok', WA_VERIFY_TOKEN: 'vt', ANTHROPIC_API_KEY: 'ak', WA_CRON_KEY: 'ck', WA_HOURS: process.env.WH || '9-20' };
globalThis.Deno = { env: { get: k => ENV[k] } };
const OWNER = 'o1';
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
const add = (d, n) => { const t = new Date(d + 'T12:00:00Z'); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); };
export const T = {
  ov_wa: [{ owner: OWNER, status: 'activo', plan: 'wa1', quota: 100, used: 0, period: today.slice(0, 7), phone_id: 'P1', cfg: { botName: 'Sofi', info: 'Atendemos OSDE y Swiss Medical.' }, out_paused: false, rem_plan: 'r1', rem_quota: 300, rem_used: 0, rem_period: today.slice(0, 7) }],
  ov_booking: [{ owner: OWNER, slug: 'abc12345', enabled: true, data: { clinic: 'Consultorio Allen', addr: 'Roca 123', types: [{ k: 'control', label: 'Control' }, { k: 'urgencia', label: 'Urgencia' }], pros: [{ id: 'p1', name: 'Dra. Vega' }], slots: { control: { [add(today, 1)]: [['p1', 540, 30], ['p1', 600, 30], ['p1', 900, 30]], [add(today, 2)]: [['p1', 570, 30]] } } } }],
  ov_wa_chats: [], ov_wa_msgs: [], ov_wa_out: [], ov_wa_events: [], booking_reqs: [],
};
export const SENT = [], AI_CALLS = [];
let AI_SCRIPT = [];
export const setAI = s => { AI_SCRIPT = s.slice(); };
let id = 0;
function filt(rows, qs) {
  let out = rows;
  for (const [k, v] of qs) {
    if (['select', 'order', 'limit', 'on_conflict'].includes(k)) continue;
    const m = /^(eq|gt|gte|lte|lt)\.(.*)$/.exec(v); if (!m) continue;
    const val = decodeURIComponent(m[2]);
    out = out.filter(r => { const x = r[k]; const xs = x === null || x === undefined ? '' : String(x);
      if (m[1] === 'eq') return xs === val || (val === 'true' && x === true) || (val === 'false' && x === false);
      if (m[1] === 'gt') return xs > val; if (m[1] === 'gte') return xs >= val; if (m[1] === 'lte') return xs <= val; return xs < val; });
  }
  const o = qs.get('order'); if (o) { const [f, dir] = o.split('.'); out = out.slice().sort((a, b) => (a[f] > b[f] ? 1 : -1) * (dir === 'desc' ? -1 : 1)); }
  const l = qs.get('limit'); if (l) out = out.slice(0, +l);
  return out;
}
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(url), method = init.method || 'GET', body = init.body ? JSON.parse(init.body) : null;
  const res = (j, status = 200) => new Response(JSON.stringify(j), { status, headers: { 'Content-Type': 'application/json' } });
  if (u.host === 'graph.facebook.com') {
    if (method === 'GET') return res({ quality_rating: 'GREEN', messaging_limit_tier: 'TIER_1K' });
    if (body.status === 'read') return res({ success: true });
    SENT.push(body); return res({ messages: [{ id: 'wamid.out' + (++id) }] });
  }
  if (u.host === 'api.anthropic.com') { AI_CALLS.push(body); const next = AI_SCRIPT.shift() || { content: [{ type: 'text', text: '(sin guion)' }] }; return res(typeof next === 'function' ? next(body) : next); }
  if (u.host === 'sb.test') {
    const path = u.pathname.replace('/rest/v1/', '');
    if (path.startsWith('rpc/')) {
      const fn = path.slice(4);
      if (fn === 'ov_booking_request') { T.booking_reqs.push(body); return res({ ok: true, code: 'OV-AB12' }); }
      if (fn === 'ov_whoami') return res(init.headers.Authorization === 'Bearer userjwt' ? { owner: OWNER, role: 'dueno' } : null);
      if (fn === 'ov_wa_sim_hit') { T.sim = (T.sim || 0) + 1; return res(T.sim); }
      if (fn === 'ov_wa_me') return res(init.headers.Authorization === 'Bearer userjwt' ? T.ov_wa[0] : null);
      return res(null, 404);
    }
    const rows = T[path]; if (!rows) return res({ msg: 'no table ' + path }, 404);
    if (method === 'GET') return res(filt(rows, u.searchParams));
    if (method === 'POST') { const arr = (Array.isArray(body) ? body : [body]).map(r => ({ id: 'id' + (++id), created_at: new Date(Date.now() + id).toISOString(), ...r })); rows.push(...arr); return res(arr, 201); }
    if (method === 'PATCH') { const hit = filt(rows, u.searchParams); hit.forEach(r => Object.assign(r, body)); return res(hit); }
  }
  return res({ error: 'unexpected ' + url }, 500);
};
export const sign = raw => 'sha256=' + crypto.createHmac('sha256', 'sec').update(raw).digest('hex');
export const reply = (id, title, from = '5492994123456') => ({ entry: [{ changes: [{ value: { metadata: { phone_number_id: 'P1' }, messages: [{ id: 'wamid.in' + (++id_), from, type: 'interactive', interactive: { type: 'list_reply', list_reply: { id, title } } }] } }] }] });
let id_ = 5000;
export const inbound = (text, from = '5492994123456', extra = {}) => ({ entry: [{ changes: [{ value: { metadata: { phone_number_id: 'P1' }, contacts: [{ wa_id: from, profile: { name: 'Ana' } }], messages: [{ id: 'wamid.in' + (++id), from, type: 'text', text: { body: text }, ...extra }] } }] }] });
export const post = (handler, payload, sig) => { const raw = JSON.stringify(payload); return handler(new Request('https://x/wa-webhook', { method: 'POST', body: raw, headers: { 'x-hub-signature-256': sig === undefined ? sign(raw) : sig } })); };
export { today, add };
