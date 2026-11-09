// @ts-nocheck
// OdontoVoz · Autogestión por WhatsApp · una persona del consultorio responde desde la app (1.39)
// Se publica como «wa-send» CON «Verify JWT» (solo usuarios con sesión). Secretos: META_TOKEN.
// Solo deja escribir dentro de las 24 h desde el último mensaje del paciente (regla de WhatsApp, y es gratis).

const env = (k: string, d = '') => (globalThis as any).Deno?.env?.get(k) ?? d;
const SB = () => env('SUPABASE_URL');
const KEY = () => env('SUPABASE_SERVICE_ROLE_KEY');
const GV = () => env('GRAPH_VER', 'v23.0');
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-ov-owner, x-ov-device', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const out = (j: any, status = 200) => new Response(JSON.stringify(j), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

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

export async function serve(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return out({ ok: false, msg: 'Método no permitido' }, 405);
  const auth = req.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+/.test(auth)) return out({ ok: false, msg: 'Sin sesión' }, 401);
  let b: any = {}; try { b = await req.json(); } catch (_) { /* nada */ }
  const text = String(b.text || '').trim().slice(0, 3000);
  if (!b.chat || !text) return out({ ok: false, msg: 'Falta el mensaje' }, 400);

  /* ¿quién es? (con la sesión de la persona; respeta el lugar elegido con x-ov-owner) */
  const h: any = { apikey: env('SUPABASE_ANON_KEY'), Authorization: auth, 'Content-Type': 'application/json' };
  const place = req.headers.get('x-ov-owner'); if (place) h['x-ov-owner'] = place;
  const r = await fetch(SB() + '/rest/v1/rpc/ov_wa_me', { method: 'POST', headers: h, body: '{}' });
  const w = r.ok ? await r.json() : null;
  if (!w || !w.owner) return out({ ok: false, msg: 'Esta cuenta no tiene la Autogestión por WhatsApp.' }, 403);
  if (w.status !== 'activo' || !w.phone_id) return out({ ok: false, msg: 'El número todavía no está conectado.' }, 409);

  const chat = ((await db('ov_wa_chats?id=eq.' + encodeURIComponent(b.chat) + '&owner=eq.' + w.owner + '&select=*')) || [])[0];
  if (!chat) return out({ ok: false, msg: 'No encontré la charla.' }, 404);
  if (!chat.last_in || Date.now() - new Date(chat.last_in).getTime() > 24 * 3600e3)
    return out({ ok: false, closed: true, msg: 'Pasaron más de 24 horas desde el último mensaje del paciente. WhatsApp no deja escribirle primero desde acá: esperá a que escriba o llamalo.' }, 409);

  const g = await fetch('https://graph.facebook.com/' + GV() + '/' + w.phone_id + '/messages', {
    method: 'POST', headers: { Authorization: 'Bearer ' + env('META_TOKEN'), 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', recipient_type: 'individual', to: chat.wa_id, type: 'text', text: { preview_url: false, body: text } }),
  });
  const gj = await g.json().catch(() => ({}));
  const wamid = gj?.messages?.[0]?.id || null;
  await db('ov_wa_msgs', { method: 'POST', prefer: 'return=minimal', body: { owner: w.owner, chat: chat.id, dir: 'out', who: 'persona', body: text, wamid, status: g.ok ? 'sent' : 'failed' } });
  await db('ov_wa_chats?id=eq.' + chat.id, { method: 'PATCH', prefer: 'return=minimal', body: { mode: 'humano', unread: 0, last_at: new Date().toISOString(), last_text: text.slice(0, 140) } });
  if (!g.ok) return out({ ok: false, msg: 'WhatsApp no aceptó el mensaje. Probá de nuevo en un rato.' }, 502);
  return out({ ok: true });
}
(globalThis as any).Deno?.serve?.(serve);
