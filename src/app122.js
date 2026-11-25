/* ===== 1.36: vacaciones: se ofrece cancelar los turnos de esos días y avisar a los pacientes; la agenda dice «Vacaciones» en las columnas cerradas ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.acts.cfgVacAdd || !A.vacOn) return;
  const live = a => a && a.type !== 'block' && a.status !== 'cancelado' && a.status !== 'atendido' && !/^g\d/.test(String(a.id));
  const inRange = (pro, f, t) => { const out = []; Object.keys(S.days || {}).forEach(k => { if (k >= f && k <= t) (S.days[k] || []).forEach(a => { if (a.pro === pro && live(a)) out.push(a); }); }); return out.sort((x, y) => (x.date + x.start < y.date + y.start ? -1 : 1)); };
  const msg = a => { const p = A.PAT(a.pid) || {}, cl = A.CLINIC || 'el consultorio', first = String(p.first || p.name || '').split(' ')[0]; return 'Hola ' + first + ', te escribimos de ' + cl + '. Tu turno del ' + (A.fmtShort ? A.fmtShort(a.date) : a.date) + ' a las ' + A.mm(a.start) + ' hay que reprogramarlo porque ese día no vamos a atender. Te pedimos disculpas. ¿Te parece si te damos un nuevo turno? Respondé este mensaje y lo coordinamos.'; };

  /* ---------- al cargar vacaciones: ofrecer cancelar los turnos que ya había ---------- */
  const prev = A.acts.cfgVacAdd;
  A.acts.cfgVacAdd = function (el) {
    const id = el.getAttribute('data-id'), f = ($('#vcFrom') || {}).value, t = (($('#vcTo') || {}).value || f), why = (($('#vcWhy') || {}).value || '').trim();
    const r = prev.apply(this, arguments);
    try { const p = A.PRO(id), L = f && t >= f ? inRange(id, f, t) : []; if (p && L.length && (p.vac || []).some(v => v.from === f)) { S.modal = { type: 'vacTurnos', pro: id, from: f, to: t, why: why || 'Vacaciones', ids: L.map(a => a.id) }; A.renderModal(); } } catch (e) { /* nada */ }
    return r;
  };
  MF.vacTurnos = m => {
    const p = A.PRO(m.pro) || {}, L = m.ids.map(i => A.apptById(i)).filter(Boolean), rng = A.fmtShort(m.from) + (m.to !== m.from ? ' al ' + A.fmtShort(m.to) : '');
    if (m.done) {
      const sent = Object.keys(m.sent || {}).length;
      return A.modalShell('Turnos cancelados', '<div class="do-ok">✔ ' + L.length + ' turno' + (L.length === 1 ? '' : 's') + ' cancelado' + (L.length === 1 ? '' : 's') + ' por vacaciones (' + esc(rng) + ').</div><h3 class="hp-h">Avisale a cada paciente <span class="count">' + sent + ' de ' + L.length + '</span></h3><ul class="do-list wa">' + L.map(a => { const pt = A.PAT(a.pid) || {}, url = A.waLink ? A.waLink(pt.phone, msg(a)) : ''; return '<li><span class="mono">' + esc(A.fmtShort(a.date)) + ' ' + A.mm(a.start) + '</span> <span class="nm">' + esc(pt.name || '') + '</span>' + (url ? '<a class="btn small' + (m.sent && m.sent[a.id] ? '' : ' primary') + '" target="_blank" rel="noopener" href="' + esc(url) + '" data-act="vacSent" data-id="' + esc(a.id) + '">' + (m.sent && m.sent[a.id] ? 'Avisado ✔' : 'Avisar por WhatsApp') + '</a>' : '<span class="chip warn">sin teléfono</span>') + '</li>'; }).join('') + '</ul>', '<button class="btn primary" data-act="closeModal">Listo</button>', true);
    }
    return A.modalShell('Hay turnos en esos días', '<p><b>' + esc(p.name || '') + '</b> quedó de vacaciones del <b>' + esc(rng) + '</b>, y en esos días ya hay <b>' + L.length + ' turno' + (L.length === 1 ? '' : 's') + '</b>:</p><ul class="do-list">' + L.slice(0, 40).map(a => '<li><span class="mono">' + esc(A.fmtShort(a.date)) + ' ' + A.mm(a.start) + '</span> ' + esc((A.PAT(a.pid) || {}).name || '') + '</li>').join('') + '</ul>' + '<p class="hint">Si los cancelás, te muestro la lista para avisarle a cada paciente por WhatsApp. Si no, quedan como están y los reprogramás vos.</p>',
      '<button class="btn" data-act="closeModal">Dejarlos como están</button><button class="btn primary danger-ish" data-act="vacCancelGo">Cancelar los ' + L.length + ' turnos y avisar</button>', true);
  };
  A.acts.vacCancelGo = () => {
    const m = S.modal; if (!m) return; const L = m.ids.map(i => A.apptById(i)).filter(Boolean), dates = Array.from(new Set(L.map(a => a.date)));
    A.mutate(dates, () => { L.forEach(a => { a.status = 'cancelado'; a.rem = 'cancelo'; a.dayOff = m.why; }); }, 'Turnos cancelados por vacaciones: ' + L.length + '.');
    S.modal = Object.assign({}, m, { done: 1, sent: {} }); A.renderModal(); A.refresh();
  };
  A.acts.vacSent = el => { const m = S.modal; if (m && m.sent) { m.sent[el.getAttribute('data-id')] = 1; setTimeout(() => A.renderModal(), 400); } };

  /* ---------- «Vacaciones» / «Cerrado» escrito en las columnas sin atención ---------- */
  function label() {
    document.querySelectorAll('#gridWrap .gb[data-pro][data-date]').forEach(gb => {
      const pro = A.PRO(gb.getAttribute('data-pro')), d = gb.getAttribute('data-date'); if (!pro) return;
      let txt = '', sub = '', ic = '';
      const cl = A.closedOn && A.closedOn(d), v = A.vacOn(pro, d);
      if (cl) { ic = '🚫'; txt = 'Cerrado'; sub = cl.why || ''; } else if (v) { ic = '🏖'; txt = 'Vacaciones'; sub = v.why && !/^vacaciones$/i.test(v.why) ? v.why : ''; }
      const old = gb.querySelector(':scope > .gb-offlbl');
      if (!txt) { if (old) old.remove(); return; }
      const html = '<div class="gb-offlbl" aria-hidden="true"><span>' + ic + ' ' + esc(txt) + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
      if (old) { if (old.outerHTML !== html) old.outerHTML = html; } else gb.insertAdjacentHTML('afterbegin', html);
    });
  }
  let rq = 0; const sched = () => { if (rq) return; rq = requestAnimationFrame(() => { rq = 0; try { label(); } catch (e) { /* nada */ } }); };
  try { new MutationObserver(sched).observe(document.body, { childList: true, subtree: true }); } catch (e) { /* nada */ }
  sched();

  const css = document.createElement('style');
  css.textContent = '.gb-offlbl{position:absolute;left:6px;right:6px;top:10px;z-index:3;display:flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none;text-align:center}.gb-offlbl span{background:color-mix(in srgb,var(--red) 14%,var(--surface));color:color-mix(in srgb,var(--red) 65%,var(--ink));border:1px solid color-mix(in srgb,var(--red) 35%,var(--line));border-radius:999px;padding:4px 14px;font-size:.82rem;font-weight:800}.gb-offlbl small{color:var(--ink-2);font-size:.74rem}';
  document.body.appendChild(css);
})();
