// @ts-nocheck
// OdontoVoz · Recordatorios automáticos por WhatsApp (servicio pago) · manda los de la cola y cuida el número (1.39.1)
// Se publica como «wa-cron» SIN «Verify JWT»; la llama pg_cron cada 10 minutos con el encabezado x-ov-cron.
// Secretos: META_TOKEN, WA_CRON_KEY. Opcionales: WA_TPL_REM (nombre de la plantilla), WA_TPL_LANG, GRAPH_VER.
//
// Cuidados para el número del cliente:
//  · Solo plantillas de «servicio» (recordatorio de turno) aprobadas por Meta, nunca promociones.
//  · Solo de 9 a 20 h (hora argentina), con tope por día y nunca a quien pidió BAJA.
//  · Si Meta baja la calidad del número a ROJO, se frenan solos todos los mensajes salientes.

const env = (k: string, d = '') => (globalThis as any).Deno?.env?.get(k) ?? d;
const SB = () => env('SUPABASE_URL');
const KEY = () => env('SUPABASE_SERVICE_ROLE_KEY');
const GV = () => env('GRAPH_VER', 'v23.0');
const TZ = 'America/Argentina/Buenos_Aires';
const HARD_MAX_DAY = 250;

async function db(path: string, init: any = {}) {
  const r = await fetch(SB() + '/rest/v1/' + path, {
    method: init.method || 'GET',
    headers: { apikey: KEY(), Authorization: 'Bearer ' + KEY(), 'Content-Type': 'application/json', Prefer: init.prefer || 'return=representation' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error('db ' + r.status + ' ' + t.slice(0, 200));
  return t ? JSON.parse(t) : null;
}
async function graph(path: string, body?: any) {
  const r = await fetch('https://graph.facebook.com/' + GV() + '/' + path, {
    method: body ? 'POST' : 'GET', headers: { Authorization: 'Bearer ' + env('META_TOKEN'), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, j };
}
function nowAR() {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(new Date());
  const g = (t: string) => (p.find(x => x.type === t) || { value: '' }).value;
  return { date: g('year') + '-' + g('month') + '-' + g('day'), hour: +g('hour') % 24 };
}
const dayStartUTC = (d: string) => new Date(d + 'T03:00:00Z').toISOString();   // 00:00 en Argentina

async function quality(w: any) {
  const last = w.cfg?._qAt ? Date.parse(w.cfg._qAt) : 0;
  if (Date.now() - last < 6 * 3600e3 || !w.phone_id) return w;
  const g = await graph(w.phone_id + '?fields=quality_rating,messaging_limit_tier,display_phone_number');
  if (!g.ok) return w;
  const q = String(g.j.quality_rating || '').toUpperCase();
  const patch: any = { quality: q || null, tier: g.j.messaging_limit_tier || null, cfg: { ...(w.cfg || {}), _qAt: new Date().toISOString() }, updated_at: new Date().toISOString() };
  if (g.j.display_phone_number && !w.display) patch.display = g.j.display_phone_number;
  if (q === 'RED') { patch.out_paused = true; patch.cfg._pausedWhy = 'Calidad del número en rojo: se frenaron los recordatorios para cuidarlo.'; }
  await db('ov_wa?owner=eq.' + w.owner, { method: 'PATCH', prefer: 'return=minimal', body: patch });
  return { ...w, ...patch };
}

async function sendOne(w: any, it: any) {
  const p = it.params || {};
  const tpl = env('WA_TPL_REM', 'ov_recordatorio_turno'), lang = env('WA_TPL_LANG', 'es_AR');
  const vals = [p.nombre || 'paciente', p.consultorio || 'el consultorio', p.dia || '', p.hora || '', p.profesional || 'tu profesional'].map(v => ({ type: 'text', text: String(v).slice(0, 60) }));
  const g = await graph(w.phone_id + '/messages', {
    messaging_product: 'whatsapp', to: it.wa_id, type: 'template',
    template: { name: tpl, language: { code: lang }, components: [
      { type: 'body', parameters: vals },
      { type: 'button', sub_type: 'quick_reply', index: '0', parameters: [{ type: 'payload', payload: 'conf:' + it.appt }] },
      { type: 'button', sub_type: 'quick_reply', index: '1', parameters: [{ type: 'payload', payload: 'camb:' + it.appt }] },
    ] },
  });
  const text = 'Hola ' + vals[0].text + ', te recordamos tu turno en ' + vals[1].text + ' el ' + vals[2].text + ' a las ' + vals[3].text + ' con ' + vals[4].text + '. ¿Nos confirmás? [Confirmo] [Necesito cambiarlo]';
  let chat = ((await db('ov_wa_chats?owner=eq.' + w.owner + '&wa_id=eq.' + it.wa_id + '&select=id')) || [])[0];
  if (!chat) chat = (await db('ov_wa_chats', { method: 'POST', body: { owner: w.owner, wa_id: it.wa_id, name: p.nombre || null } }))[0];
  await db('ov_wa_msgs', { method: 'POST', prefer: 'return=minimal', body: { owner: w.owner, chat: chat.id, dir: 'out', who: 'sistema', body: text, wamid: g.j?.messages?.[0]?.id || null, status: g.ok ? 'sent' : 'failed' } });
  await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { last_at: new Date().toISOString(), last_text: 'Recordatorio enviado' } });
  await db('ov_wa_out?id=eq.' + it.id, { method: 'PATCH', prefer: 'return=minimal', body: { status: g.ok ? 'enviado' : 'fallo', sent_at: new Date().toISOString(), why: g.ok ? null : JSON.stringify(g.j?.error || {}).slice(0, 200) } });
  return g.ok;
}

export async function serve(req: Request): Promise<Response> {
  if (!env('WA_CRON_KEY') || req.headers.get('x-ov-cron') !== env('WA_CRON_KEY')) return new Response('no', { status: 401 });
  const now = nowAR(), sum = { sent: 0, skipped: 0, failed: 0 };
  const list = (await db('ov_wa?status=eq.activo&select=*')) || [];
  for (let w of list) {
    try { w = await quality(w); } catch (e) { console.error(e); }
    if (w.out_paused || w.cfg?.rem === false || !w.rem_plan) continue;   // sin el servicio pago de recordatorios, no se manda nada
    const per = now.date.slice(0, 7);
    if (w.rem_period !== per) { w.rem_used = 0; w.rem_period = per; await db('ov_wa?owner=eq.' + w.owner, { method: 'PATCH', prefer: 'return=minimal', body: { rem_used: 0, rem_period: per } }); }
    let monthLeft = (w.rem_quota || 0) - (w.rem_used || 0);
    if (monthLeft <= 0) continue;                                         // se terminó el cupo del mes
    const [h0, h1] = env('WA_HOURS', '9-20').split('-').map(Number);
    if (now.hour < h0 || now.hour >= h1) continue;                    // solo en horario razonable (9 a 20 h)
    const max = Math.min(HARD_MAX_DAY, +(w.cfg?.maxDay || 150));
    const sentToday = ((await db('ov_wa_out?owner=eq.' + w.owner + '&status=eq.enviado&sent_at=gte.' + dayStartUTC(now.date) + '&select=id')) || []).length;
    let room = Math.min(max - sentToday, monthLeft);
    if (room <= 0) continue;
    const due = (await db('ov_wa_out?owner=eq.' + w.owner + '&status=eq.cola&send_after=lte.' + new Date().toISOString() + '&order=send_after.asc&limit=' + Math.min(room, 60) + '&select=*')) || [];
    for (const it of due) {
      const at = it.params?.at ? Date.parse(it.params.at) : 0;
      if (at && at < Date.now()) { await db('ov_wa_out?id=eq.' + it.id, { method: 'PATCH', prefer: 'return=minimal', body: { status: 'omitido', why: 'el turno ya pasó' } }); sum.skipped++; continue; }
      const opt = ((await db('ov_wa_chats?owner=eq.' + w.owner + '&wa_id=eq.' + it.wa_id + '&opt_out=eq.true&select=id')) || []).length;
      if (opt) { await db('ov_wa_out?id=eq.' + it.id, { method: 'PATCH', prefer: 'return=minimal', body: { status: 'omitido', why: 'baja' } }); sum.skipped++; continue; }
      try {
        if (await sendOne(w, it)) { sum.sent++; w.rem_used = (w.rem_used || 0) + 1; await db('ov_wa?owner=eq.' + w.owner, { method: 'PATCH', prefer: 'return=minimal', body: { rem_used: w.rem_used } }); }
        else sum.failed++;
      } catch (e) { console.error(e); sum.failed++; }
      if (--room <= 0) break;
    }
  }
  return new Response(JSON.stringify(sum), { headers: { 'Content-Type': 'application/json' } });
}
(globalThis as any).Deno?.serve?.(serve);
