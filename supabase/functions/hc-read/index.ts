// @ts-nocheck
// OdontoVoz · Pasar historias de papel (1.53)
// Recibe las fotos de UNA historia clínica en papel y devuelve lo que se pudo leer, para que una persona lo revise y lo confirme en la app.
// No guarda nada: ni las fotos ni el texto. Se publica CON «Verify JWT» (solo usuarios con sesión).
// Secretos: ANTHROPIC_API_KEY. Opcionales: HC_AI_MODEL (modelo), HC_READ_MAX (hojas por día y cuenta, 600 por defecto).
// Tope diario: supabase/hcpapel.sql (ov_ai_hit). Si no está corrido, funciona sin tope.

const env = (k: string, d = '') => (globalThis as any).Deno?.env?.get(k) ?? d;
const SB = () => env('SUPABASE_URL');
const KEY = () => env('SUPABASE_SERVICE_ROLE_KEY');
const MODEL = () => env('HC_AI_MODEL', 'claude-sonnet-5-5');
const TZ = 'America/Argentina/Buenos_Aires';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-ov-owner, x-ov-device', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const out = (j: any, status = 200) => new Response(JSON.stringify(j), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

export const ANAM = ['hta', 'diabetes', 'cardio', 'anticoag', 'asma', 'epilepsia', 'hepatitis', 'renal', 'embarazo', 'penicilina', 'latex', 'anestesia', 'bifosf', 'fuma', 'bruxismo', 'sangrado'];

export const SYS = `Sos un asistente que transcribe historias clínicas ODONTOLÓGICAS argentinas escritas a mano o en planillas de papel.
Te pasan fotos de las hojas de UN paciente (frente, dorso, hojas de evolución). Tu trabajo es copiar lo que dice, sin inventar.
Reglas:
- Copiá textual lo que se lee. Si una palabra o número no se entiende, poné [?] en su lugar. Nunca completes con suposiciones.
- Fechas en formato AAAA-MM-DD. Si el año está con dos cifras, deducí el siglo (por ejemplo 15/3/19 → 2019-03-15). Si no hay fecha legible, dejala vacía.
- Piezas dentarias con numeración FDI (11 a 48, temporarios 51 a 85).
- Evoluciones: una por cada fecha/entrada, en el orden en que aparecen, con el texto completo de esa entrada (abreviaturas tal cual).
- Odontograma dibujado: describí cada marca como una frase corta por pieza, por ejemplo «obturación oclusal 16», «extracción 36», «corona 21», «caries distal 25». En Argentina, rojo = existente o realizado; azul = a realizar. Si no se distingue el color o no hay odontograma, dejá la lista vacía.
- Antecedentes médicos: marcá solo los que estén tildados o escritos como presentes. Si dice «no» o está vacío, no lo marques.
- Si las hojas parecen de más de un paciente, avisalo en "varios".
- En "dudoso" listá los campos que leíste con poca seguridad (por ejemplo "dni", "birth", "evol.3", "odon.1").
Respondé SIEMPRE usando la herramienta "historia".`;

export const TOOL = {
  name: 'historia',
  description: 'Datos leídos de la historia clínica en papel.',
  input_schema: {
    type: 'object',
    properties: {
      paciente: {
        type: 'object',
        properties: {
          first: { type: 'string', description: 'Nombre(s)' }, last: { type: 'string', description: 'Apellido(s)' }, dni: { type: 'string' },
          birth: { type: 'string', description: 'AAAA-MM-DD' }, age: { type: 'integer' }, phone: { type: 'string' }, email: { type: 'string' },
          addr: { type: 'string', description: 'Domicilio' }, loc: { type: 'string', description: 'Localidad' },
          cov: { type: 'string', description: 'Obra social o prepaga' }, afil: { type: 'string', description: 'N.º de afiliado' }, plan: { type: 'string' },
          job: { type: 'string', description: 'Ocupación' }, sex: { type: 'string' }
        }
      },
      antecedentes: {
        type: 'object',
        properties: {
          marcados: { type: 'array', items: { type: 'string', enum: ANAM }, description: 'hta=hipertensión, cardio=cardíaco, anticoag=anticoagulantes/aspirina, hepatitis=hígado, renal=riñón, embarazo=embarazo/lactancia, penicilina=alergia a penicilina, latex, anestesia=reacción a anestesia, bifosf=bifosfonatos/radioterapia, fuma, bruxismo, sangrado=hemorragias' },
          medicacion: { type: 'string' }, alergias: { type: 'string' }, otros: { type: 'string', description: 'Otros antecedentes, cirugías, observaciones generales, motivo de consulta' }
        }
      },
      odontograma: { type: 'array', items: { type: 'object', properties: { texto: { type: 'string' }, estado: { type: 'string', enum: ['realizado', 'a realizar', 'no se sabe'] } }, required: ['texto'] } },
      evoluciones: { type: 'array', items: { type: 'object', properties: { fecha: { type: 'string' }, texto: { type: 'string' }, firma: { type: 'string', description: 'Profesional o firma, si se lee' } }, required: ['texto'] } },
      dudoso: { type: 'array', items: { type: 'string' } },
      varios: { type: 'boolean', description: 'true si las hojas parecen de más de un paciente' },
      nota: { type: 'string', description: 'Algo que la persona que revisa tenga que saber (hoja cortada, borrosa, etc.)' }
    },
    required: ['paciente', 'evoluciones']
  }
};

/* limpia lo que devuelve la IA: solo campos conocidos, textos acotados */
export function tidy(x: any) {
  const s = (v: any, n = 300) => (v == null ? '' : String(v).replace(/\s+\n/g, '\n').trim().slice(0, n));
  const p = x?.paciente || {}, a = x?.antecedentes || {};
  const date = (v: any) => { const t = s(v, 20); return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : ''; };
  return {
    paciente: { first: s(p.first, 80), last: s(p.last, 80), dni: s(p.dni, 20).replace(/[^\d?]/g, ''), birth: date(p.birth), age: Number.isFinite(+p.age) && +p.age > 0 && +p.age < 120 ? Math.round(+p.age) : null, phone: s(p.phone, 40), email: s(p.email, 120), addr: s(p.addr, 160), loc: s(p.loc, 80), cov: s(p.cov, 80), afil: s(p.afil, 40), plan: s(p.plan, 40), job: s(p.job, 80), sex: s(p.sex, 20) },
    antecedentes: { marcados: (Array.isArray(a.marcados) ? a.marcados : []).filter((k: string) => ANAM.includes(k)), medicacion: s(a.medicacion, 600), alergias: s(a.alergias, 300), otros: s(a.otros, 2000) },
    odontograma: (Array.isArray(x?.odontograma) ? x.odontograma : []).slice(0, 120).map((o: any) => ({ texto: s(o?.texto, 160), estado: ['realizado', 'a realizar'].includes(o?.estado) ? o.estado : 'no se sabe' })).filter((o: any) => o.texto),
    evoluciones: (Array.isArray(x?.evoluciones) ? x.evoluciones : []).slice(0, 400).map((e: any) => ({ fecha: date(e?.fecha), texto: s(e?.texto, 4000), firma: s(e?.firma, 80) })).filter((e: any) => e.texto),
    dudoso: (Array.isArray(x?.dudoso) ? x.dudoso : []).slice(0, 60).map((d: any) => s(d, 40)),
    varios: !!x?.varios,
    nota: s(x?.nota, 400)
  };
}

async function rpc(fn: string, body: any) {
  const r = await fetch(SB() + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY(), Authorization: 'Bearer ' + KEY(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error('rpc ' + r.status);
  return r.json();
}

export async function serve(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return out({ ok: false }, 405);
  const auth = req.headers.get('authorization') || '';
  if (!/^Bearer\s+\S+/.test(auth)) return out({ ok: false, msg: 'Sin sesión' }, 401);
  if (!env('ANTHROPIC_API_KEY')) return out({ ok: false, off: true, msg: 'La lectura automática todavía no está encendida.' }, 503);
  let b: any = {}; try { b = await req.json(); } catch (_) { /* nada */ }
  const imgs = (Array.isArray(b.images) ? b.images : []).filter((i: any) => i && typeof i.data === 'string' && /^image\/(jpeg|png|webp)$/.test(i.type || 'image/jpeg'));
  if (!imgs.length) return out({ ok: false, msg: 'Faltan las fotos.' }, 400);
  if (imgs.length > 8) return out({ ok: false, msg: 'Máximo 8 hojas por historia.' }, 400);
  if (imgs.some((i: any) => i.data.length > 4_000_000)) return out({ ok: false, msg: 'Una foto es demasiado grande.' }, 413);

  /* de quién es la cuenta (respeta el lugar elegido) */
  const h: any = { apikey: env('SUPABASE_ANON_KEY'), Authorization: auth, 'Content-Type': 'application/json' };
  const place = req.headers.get('x-ov-owner'); if (place) h['x-ov-owner'] = place;
  const who = await fetch(SB() + '/rest/v1/rpc/ov_whoami', { method: 'POST', headers: h, body: '{}' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const owner = who && who.owner;
  if (!owner) return out({ ok: false, msg: 'No encontré tu cuenta.' }, 403);

  /* tope diario de hojas por cuenta (cuida el gasto); si el SQL no está corrido, sigue sin tope */
  const max = +env('HC_READ_MAX', '600'), day = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  const used = await rpc('ov_ai_hit', { p_owner: owner, p_day: day, p_kind: 'hc', p_n: imgs.length }).catch(() => 0);
  if (+used > max) return out({ ok: false, limit: true, msg: 'Por hoy se llegó al máximo de hojas leídas de esta cuenta. Mañana se puede seguir (o cargarla a mano mirando la foto).' }, 429);

  const content: any[] = imgs.map((i: any) => ({ type: 'image', source: { type: 'base64', media_type: i.type || 'image/jpeg', data: i.data } }));
  content.push({ type: 'text', text: 'Estas ' + imgs.length + ' foto(s) son de la historia clínica en papel de un paciente' + (b.hint ? ' (' + String(b.hint).slice(0, 120) + ')' : '') + '. Transcribila con la herramienta «historia».' });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL(), max_tokens: 8000, system: SYS, tools: [TOOL], tool_choice: { type: 'tool', name: 'historia' }, messages: [{ role: 'user', content }] })
  });
  if (!r.ok) { const t = await r.text().catch(() => ''); return out({ ok: false, msg: 'No se pudo leer ahora (' + r.status + '). Probá de nuevo en un rato.', detail: t.slice(0, 200) }, 502); }
  const j = await r.json();
  const use = (j.content || []).filter((x: any) => x.type === 'tool_use' && x.name === 'historia')[0];
  if (!use) return out({ ok: false, msg: 'No se pudo leer la historia. Probá con una foto más nítida o cargala a mano.' }, 422);
  return out({ ok: true, data: tidy(use.input), pages: imgs.length });
}

if ((globalThis as any).Deno?.serve) (globalThis as any).Deno.serve(serve);
