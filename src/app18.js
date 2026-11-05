/* ===== 1.10: ventanas que no se cierran solas, borrar turnos y profesionales, inicio personalizable, más apariencia, logo, sugerencias y botón Hoy ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const LOGO = '<svg class="ov-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M9 4c-3.2 0-5.5 2.6-5.5 6 0 2.6 1 4.4 1.8 6.6.9 2.5.9 5.4 1.9 8.5.5 1.6 2.4 1.7 3 .1.9-2.4 1.1-5.2 2.4-5.2h2.8c1.3 0 1.5 2.8 2.4 5.2.6 1.6 2.5 1.5 3-.1 1-3.1 1-6 1.9-8.5.8-2.2 1.8-4 1.8-6.6 0-3.4-2.3-6-5.5-6-2.2 0-3.4 1.2-5 1.2S11.2 4 9 4Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M13 12.5v4M16 11v7M19 12.5v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  /* =====================================================================
     1) LAS VENTANAS SOLO SE CIERRAN CON «CERRAR» O LA CRUZ
     (antes, al seleccionar texto y soltar el mouse afuera, se cerraban)
     ===================================================================== */
  A.acts.scrimClose = () => { /* tocar afuera ya no cierra la ventana */ };
  let downEl = null;
  document.addEventListener('pointerdown', e => { downEl = e.target; }, true);
  const closePanelPrev = A.acts.closePanel;
  A.acts.closePanel = (el, ev) => { if (el && el.classList && el.classList.contains('scrim') && downEl !== el) return; return closePanelPrev(el, ev); };
  const drawerPrev = A.acts.drawerClose;
  A.acts.drawerClose = (el, ev) => { if (el && el.classList && el.classList.contains('drawer-scrim') && downEl !== el) return; return drawerPrev(el, ev); };

  /* =====================================================================
     2) BORRAR UN TURNO POR COMPLETO (deja el horario libre)
     ===================================================================== */
  A.acts.apDelAsk = (el, ev) => { if (ev) ev.stopPropagation(); S.modal = { type: 'apDel', id: el.getAttribute('data-id') }; A.renderModal(); };
  MF.apDel = m => {
    const a = A.apptById(m.id); if (!a) return A.modalShell('Borrar turno', '<p>Ese turno ya no está.</p>', '<button class="btn primary" data-act="closeModal">Listo</button>');
    const who = a.pid && A.PAT(a.pid) ? A.PAT(a.pid).name : (a.label || 'Bloqueo');
    return A.modalShell('Borrar turno', '<p>Se borra <b>' + esc(who) + '</b> del ' + esc(A.fmtLong(a.date)) + ' a las ' + A.mm(a.start) + ' y el horario queda libre para otro turno.</p>' +
      (A.senaOf && A.senaOf(a) ? '<p class="hint">La seña que dejó sigue registrada en la cuenta del paciente.</p>' : '') + '<p class="hint">Si te equivocaste, lo recuperás desde el aviso de abajo o en «Cambios de hoy».</p>',
    '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="apDelGo" data-id="' + a.id + '">Borrar turno</button>');
  };
  A.acts.apDelGo = el => {
    const a = A.apptById(el.getAttribute('data-id')); if (!a) { A.closeModal(); return; }
    A.mutate([a.date], () => { const l = A.day(a.date), i = l.indexOf(a); if (i >= 0) l.splice(i, 1); }, 'Turno borrado: el horario quedó libre.');
    S.modal = null; A.renderModal(); S.panel = null; if (A.renderPanel) A.renderPanel(); A.refresh();
  };
  const delBtn = id => '<button class="btn small danger ghost" data-act="apDelAsk" data-id="' + id + '">Borrar turno</button>';
  const rpPrev = A.renderPanel;
  if (rpPrev) A.renderPanel = function () {
    const r = rpPrev.apply(this, arguments);
    try { if (S.panel && S.panel.id) { const b = document.querySelector('.panel [data-act="apCancel"], .panel [data-act="apRestore"]'); if (b && !document.querySelector('.panel [data-act="apDelAsk"]')) b.insertAdjacentHTML('afterend', delBtn(S.panel.id)); else if (!b && !document.querySelector('.panel [data-act="apDelAsk"]')) { const f = document.querySelector('.panel .panel-head'); if (f) f.insertAdjacentHTML('afterend', '<div class="row-btns" style="padding:0 16px">' + delBtn(S.panel.id) + '</div>'); } } } catch (e) { /* nada */ }
    return r;
  };
  const stPrev = MF.stMenu;
  if (stPrev) MF.stMenu = m => { const h = stPrev(m); return h ? h.replace('<div class="st-more">', '<div class="st-more">' + '<button class="btn danger" data-act="apDelAsk" data-id="' + esc(m.id) + '">Borrar turno</button>') : h; };

  /* =====================================================================
     3) PROFESIONALES: borrar del todo a los dados de baja sin historia
     ===================================================================== */
  function proHasHistory(id) {
    for (const k in S.days) if ((S.days[k] || []).some(a => a.pro === id)) return true;
    for (const p in S.pd) { const d = S.pd[p]; if (!d) continue; if ((d.tx || []).some(t => t.pro === id) || (d.ledger || []).some(e => e.pro === id) || (d.rx || []).some(r => r.pro === id) || (d.notes || []).some(n => n.pro === id && !n.auto)) return true; }
    return false;
  }
  const cfgPrev = MF.cfg;
  MF.cfg = m => {
    let h = cfgPrev(m);
    if (m.tab === 'pros' && !m.sel && !m.wiz && !m.rm) {
      (A.PROS_OLD || []).forEach(p => {
        const re = '<button class="btn small" data-act="cfgProBack" data-id="' + p.id + '">Reactivar</button>';
        const hist = proHasHistory(p.id);
        h = h.replace(re, re + (hist ? '<span class="hint" style="margin:0 0 0 8px" title="Tiene turnos o tratamientos a su nombre: se conserva por la historia clínica">tiene historia: queda guardado</span>' : '<button class="btn small danger" data-act="cfgProDel" data-id="' + p.id + '">' + (S.proDelAsk === p.id ? 'Tocá de nuevo para borrar' : 'Borrar del todo') + '</button>'));
      });
      h = h.replace('Podés reactivarlos.</div>', 'Podés reactivarlos, o borrarlos del todo si nunca tuvieron turnos ni tratamientos.</div>');
    }
    if (m.tab === 'online') {
      h = h.replace(/<div class="tip"><b>Honestidad sobre esta demo:<\/b>[\s\S]*?<\/div>/, '');
      h = h.replace('<b>y deje una seña obligatoria</b> para confirmar', 'y pida el turno: te llega a la agenda para que lo confirmes');
      h = h.replace('Seña obligatoria ($)', 'Seña a pedir ($, 0 = sin seña)');
      h = h.replace('<div class="block"><h3>Profesionales que reciben turnos online</h3>', '<label class="chk" style="margin-top:-6px"><input type="checkbox" data-chg="cfgOnOther"' + (A.CFG.online.other !== false ? ' checked' : '') + '> Ofrecer «Otro motivo (lo escribo yo)» para que el paciente cuente qué necesita</label><div class="block"><h3>Profesionales que reciben turnos online</h3>');
    }
    return h;
  };
  A.acts.cfgProDel = el => {
    const id = el.getAttribute('data-id');
    if (S.proDelAsk !== id) { S.proDelAsk = id; A.renderModal(); return; }
    S.proDelAsk = null; if (proHasHistory(id)) { A.toast('Tiene historia: no se puede borrar.'); return; }
    const i = A.PROS_OLD.findIndex(p => p.id === id); if (i < 0) return; const p = A.PROS_OLD.splice(i, 1)[0];
    if (A.CFG.online && A.CFG.online.pros) delete A.CFG.online.pros[id];
    A.save(); A.renderModal(); A.toast(p.name + ' se borró del todo.');
  };
  A.chg.cfgOnOther = el => { A.CFG.online.other = el.checked; A.save(); };
  const onTypePrev = A.chg.cfgOnType;
  if (onTypePrev) A.chg.cfgOnType = el => { A.CFG.online.typesSet = true; return onTypePrev(el); };

  /* =====================================================================
     4) APARIENCIA: color principal, fondo y tamaño de letra (en este equipo)
     ===================================================================== */
  const PAL = {
    teal: ['Verde azulado', '#0b6b6f', null], azul: ['Azul', '#1f5fbf', ['#dbe6f8', '#6ba7ff', '#061a33', '#1d3555']], violeta: ['Violeta', '#6b4fbf', ['#e7e1f7', '#b49cff', '#1b0f3a', '#2c2347']],
    verde: ['Verde', '#2c7a4b', ['#d9efe1', '#5fcf8f', '#062413', '#173a2a']], coral: ['Terracota', '#b5523b', ['#f6e0da', '#f08a6e', '#2b0d05', '#4a2a20']], grafito: ['Grafito', '#2f3e46', ['#e1e7ea', '#a9bcc6', '#0b1316', '#26343a']]
  };
  const BGS = { '': ['Gris claro', '#f1f5f6', '#e8eef0'], blanco: ['Blanco', '#ffffff', '#f0f3f4'], arena: ['Arena', '#f6f2ea', '#ece6da'], azulado: ['Azulado', '#eef2f8', '#e2e8f2'] };
  const SIZES = [['s', 'Chica'], ['', 'Normal'], ['l', 'Grande'], ['xl', 'Más grande']];
  const look = () => { try { return JSON.parse(LS.get('odontovoz.look', '{}')) || {}; } catch (e) { return {}; } };
  function applyLook() {
    const L = look(), r = document.documentElement;
    ['acc', 'bg', 'size'].forEach(k => { if (L[k]) r.setAttribute('data-' + k, L[k]); else r.removeAttribute('data-' + k); });
  }
  (function css() {
    let c = '';
    Object.keys(PAL).forEach(k => { const p = PAL[k]; if (!p[2]) return;
      c += ':root[data-acc="' + k + '"]{--accent:' + p[1] + ';--accent-ink:#fff;--accent-soft:' + p[2][0] + '}';
      c += '@media (prefers-color-scheme: dark){:root[data-acc="' + k + '"]:not([data-theme="light"]){--accent:' + p[2][1] + ';--accent-ink:' + p[2][2] + ';--accent-soft:' + p[2][3] + '}}';
      c += ':root[data-acc="' + k + '"][data-theme="dark"]{--accent:' + p[2][1] + ';--accent-ink:' + p[2][2] + ';--accent-soft:' + p[2][3] + '}'; });
    Object.keys(BGS).forEach(k => { if (!k) return; const b = BGS[k];
      c += '@media (prefers-color-scheme: light){:root[data-bg="' + k + '"]:not([data-theme="dark"]){--bg:' + b[1] + ';--surface-2:' + b[2] + '}}:root[data-bg="' + k + '"][data-theme="light"]{--bg:' + b[1] + ';--surface-2:' + b[2] + '}'; });
    c += ':root[data-size="s"] body{zoom:.94}:root[data-size="l"] body{zoom:1.08}:root[data-size="xl"] body{zoom:1.16}';
    const st = document.createElement('style'); st.textContent = c; document.head.appendChild(st);
  })();
  applyLook();
  const appearPrev = MF.appear;
  MF.appear = m => {
    const L = look(), h = appearPrev(m);
    const extra = '<div class="opt" style="margin-top:14px"><div class="lbl">Color principal</div><div class="lk-row">' + Object.keys(PAL).map(k => '<button class="lk-sw" data-act="lookSet" data-k="acc" data-v="' + (k === 'teal' ? '' : k) + '" aria-pressed="' + ((L.acc || '') === (k === 'teal' ? '' : k)) + '" title="' + PAL[k][0] + '"><i style="background:' + PAL[k][1] + '"></i><span>' + PAL[k][0] + '</span></button>').join('') + '</div></div>' +
      '<div class="opt" style="margin-top:12px"><div class="lbl">Fondo (tema claro)</div><div class="lk-row">' + Object.keys(BGS).map(k => '<button class="lk-sw" data-act="lookSet" data-k="bg" data-v="' + k + '" aria-pressed="' + ((L.bg || '') === k) + '"><i style="background:' + BGS[k][1] + ';border:1px solid var(--line)"></i><span>' + BGS[k][0] + '</span></button>').join('') + '</div></div>' +
      '<div class="opt" style="margin-top:12px"><div class="lbl">Tamaño de letra</div><div class="seg" role="group" aria-label="Tamaño de letra">' + SIZES.map(s => '<button data-act="lookSet" data-k="size" data-v="' + s[0] + '" aria-pressed="' + ((L.size || '') === s[0]) + '">' + s[1] + '</button>').join('') + '</div></div>' +
      '<div class="opt" style="margin-top:12px"><div class="lbl">Accesos del inicio</div><div class="row-btns"><button class="btn small" data-act="homeEditGo">Ordenar y elegir accesos</button><button class="btn small ghost" data-act="homeReset">Volver a los de siempre</button></div><div class="hint">También: en el inicio, mantené apretado un acceso y arrastralo donde quieras.</div></div>' +
      '<div class="hint" style="margin-top:10px">Estos cambios son de este equipo: cada uno arma la app a su gusto.</div>';
    return h.replace('</div><div class="m-foot">', extra + '</div><div class="m-foot">');
  };
  A.acts.lookSet = el => { const L = look(), k = el.getAttribute('data-k'), v = el.getAttribute('data-v'); if (v) L[k] = v; else delete L[k]; LS.set('odontovoz.look', JSON.stringify(L)); applyLook(); A.renderModal(); };

  /* =====================================================================
     5) INICIO PERSONALIZABLE: elegir accesos y ordenarlos manteniendo apretado
     ===================================================================== */
  const IC = p => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  const SC = {
    search: { t: 'Buscar paciente', s: 'Nombre, apellido o DNI', act: 'searchToggle' },
    agenda: { t: 'Agenda completa', s: 'Día, semana y mes', act: 'tab', tab: 'agenda' },
    voice: { t: 'Hablar con el asistente', s: 'Por voz', act: 'handsFree' },
    menu: { t: 'Menú', s: 'Pacientes, caja, ajustes', act: 'gear' },
    turno: { t: 'Dar un turno', s: 'Turno nuevo', act: 'newAppt', ic: IC('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M12 13v5M9.5 15.5h5"/>') },
    pacientes: { t: 'Pacientes', s: 'Lista y fichas', act: 'tab', tab: 'pacientes', ic: IC('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14a6 6 0 0 1 3 6"/>') },
    caja: { t: 'Caja', s: 'Cobros y gastos', act: 'tab', tab: 'caja', ic: IC('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>') },
    lab: { t: 'Laboratorio', s: 'Trabajos y entregas', act: 'labAllOpen', ic: IC('<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>') },
    turnero: { t: 'Turnero online', s: 'Link para pacientes', act: 'tnOpen', ic: IC('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3Z"/>') },
    rem: { t: 'Recordatorio', s: 'Anotar algo para hoy', act: 'remNew', ic: IC('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>') },
    cambios: { t: 'Cambios de hoy', s: 'Ver y deshacer', act: 'jrOpen', ic: IC('<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>') },
    ajustes: { t: 'Ajustes', s: 'Consultorio y horarios', act: 'cfgOpen', ic: IC('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>') }
  };
  const DEF = ['search', 'agenda', 'voice', 'menu'];
  const homeKeys = () => { try { const l = JSON.parse(LS.get('odontovoz.home', 'null')); return Array.isArray(l) && l.length ? l.filter(k => SC[k]) : DEF.slice(); } catch (e) { return DEF.slice(); } };
  const saveKeys = l => LS.set('odontovoz.home', JSON.stringify(l));
  let editing = false;
  function mountHome() {
    const wrap = document.querySelector('#view-inicio .home-actions'); if (!wrap || wrap.getAttribute('data-cust')) return;
    const orig = {}; Array.from(wrap.querySelectorAll('.ha')).forEach(b => { const a = b.getAttribute('data-act'), t = b.getAttribute('data-tab'); const k = a === 'searchToggle' ? 'search' : a === 'tab' && t === 'agenda' ? 'agenda' : a === 'handsFree' ? 'voice' : a === 'gear' ? 'menu' : null; if (k) orig[k] = b.outerHTML; });
    const html = k => { if (orig[k]) return orig[k].replace('<button class="ha', '<button data-hk="' + k + '" class="ha'); const s = SC[k]; return '<button class="ha" data-hk="' + k + '" data-act="' + s.act + '"' + (s.tab ? ' data-tab="' + s.tab + '"' : '') + '>' + (s.ic || '') + '<span>' + esc(s.t) + '<small>' + esc(s.s) + '</small></span></button>'; };
    wrap.setAttribute('data-cust', '1'); wrap.innerHTML = homeKeys().map(html).join('');
    wrap.classList.toggle('many', homeKeys().length > 4);
    if (editing) startEdit(wrap);
  }
  function startEdit(wrap) {
    wrap = wrap || document.querySelector('#view-inicio .home-actions'); if (!wrap) return; editing = true; wrap.classList.add('editing');
    if (!$('#homeEditBar')) wrap.insertAdjacentHTML('beforebegin', '<div class="he-bar" id="homeEditBar"><span>Arrastrá los accesos para ordenarlos</span><button class="btn small" data-act="homePick">Elegir accesos</button><button class="btn small primary" data-act="homeEditDone">Listo</button></div>');
  }
  A.acts.homeEditDone = () => { editing = false; const b = $('#homeEditBar'); if (b) b.remove(); const w = document.querySelector('#view-inicio .home-actions'); if (w) w.classList.remove('editing'); };
  A.acts.homeEditGo = () => { A.closeModal(); S.tab = 'inicio'; editing = true; A.refresh(); window.scrollTo({ top: 0 }); setTimeout(() => { const w = document.querySelector('#view-inicio .home-actions'); if (w) w.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 80); };
  A.acts.homeReset = () => { saveKeys(DEF); A.toast('Accesos del inicio como al principio.'); A.refresh(); };
  A.acts.homePick = () => { S.modal = { type: 'homePick', keys: homeKeys() }; A.renderModal(); };
  MF.homePick = m => A.modalShell('Accesos del inicio', '<p class="hint" style="margin-top:0">Elegí hasta 8. Después los ordenás arrastrándolos.</p><div class="hp-list">' + Object.keys(SC).map(k => '<label class="chk"><input type="checkbox" data-chg="homePickT" data-k="' + k + '"' + (m.keys.indexOf(k) >= 0 ? ' checked' : '') + '> <b>' + esc(SC[k].t) + '</b> <span class="muted">· ' + esc(SC[k].s) + '</span></label>').join('') + '</div><div class="hint" id="hpMsg"></div>',
    '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="homePickGo">Guardar</button>');
  A.chg.homePickT = el => { const m = S.modal, k = el.getAttribute('data-k'), i = m.keys.indexOf(k); if (el.checked && i < 0) { if (m.keys.length >= 8) { el.checked = false; $('#hpMsg').textContent = 'Hasta 8 accesos.'; return; } m.keys.push(k); } if (!el.checked && i >= 0) m.keys.splice(i, 1); };
  A.acts.homePickGo = () => { const k = S.modal.keys; if (!k.length) { $('#hpMsg').textContent = 'Elegí al menos uno.'; return; } saveKeys(k); A.closeModal(); A.refresh(); };
  /* mantener apretado (o clic sostenido) → modo ordenar; arrastrar para mover */
  (function () {
    let t = null, st = null, drag = null, swallow = false;
    document.addEventListener('pointerdown', e => {
      const b = e.target.closest && e.target.closest('#view-inicio .home-actions .ha'); if (!b) return;
      st = { x: e.clientX, y: e.clientY, b };
      if (editing) { drag = b; b.classList.add('dragging'); try { b.setPointerCapture(e.pointerId); } catch (er) { /* nada */ } e.preventDefault(); return; }
      t = setTimeout(() => { swallow = true; startEdit(); drag = b; b.classList.add('dragging'); if (navigator.vibrate) try { navigator.vibrate(25); } catch (er) { /* nada */ } }, 520);
    });
    document.addEventListener('pointermove', e => {
      if (t && st && Math.hypot(e.clientX - st.x, e.clientY - st.y) > 10) { clearTimeout(t); t = null; }
      if (!drag) return; e.preventDefault();
      const wrap = drag.parentNode, over = document.elementFromPoint(e.clientX, e.clientY), ob = over && over.closest && over.closest('.ha');
      if (ob && ob !== drag && ob.parentNode === wrap) { const items = Array.from(wrap.children), a = items.indexOf(drag), b = items.indexOf(ob); wrap.insertBefore(drag, a < b ? ob.nextSibling : ob); }
    }, { passive: false });
    const end = () => {
      clearTimeout(t); t = null; if (!drag) return; const wrap = drag.parentNode; drag.classList.remove('dragging'); drag = null;
      if (wrap) saveKeys(Array.from(wrap.querySelectorAll('.ha')).map(x => x.getAttribute('data-hk')).filter(Boolean));
    };
    document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
    document.addEventListener('click', e => { if ((swallow || editing) && e.target.closest && e.target.closest('#view-inicio .home-actions .ha')) { e.stopImmediatePropagation(); e.preventDefault(); swallow = false; } }, true);
    document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('#view-inicio .home-actions .ha')) e.preventDefault(); });
  })();

  /* =====================================================================
     6) LOGO SUTIL: en el saludo del inicio, en los cuadros vacíos y en Ayuda
     ===================================================================== */
  function mountLogo() {
    const hi = document.querySelector('#view-inicio .home-hi h1'); if (hi && !hi.querySelector('.ov-mark')) hi.insertAdjacentHTML('afterbegin', LOGO);
  }

  /* =====================================================================
     7) AYUDA: caja de comentarios y sugerencias
     ===================================================================== */
  const supPrev = MF.support;
  MF.support = m => {
    const h = supPrev(m), f = S.fbF || (S.fbF = { kind: 'sugerencia', text: '', sent: false });
    const box = '<div class="block fb-box"><h3>' + LOGO + ' Ayudanos a mejorar</h3>' + (f.sent ? '<p style="margin:0"><b>¡Gracias!</b> Lo leemos nosotros, Rodrigo y Angel, y nos ayuda un montón.</p><button class="btn small" data-act="fbAgain">Mandar otro</button>' :
      '<div class="hint" style="margin-top:0">¿Algo que te gustaría que tenga, que no anda bien o que te encantó? Contanos.</div><div class="seg" role="group" aria-label="Tipo de comentario">' + [['sugerencia', 'Idea'], ['problema', 'Algo no anda'], ['felicitacion', 'Me gustó'], ['otro', 'Otro']].map(x => '<button data-act="fbKind" data-k="' + x[0] + '" aria-pressed="' + (f.kind === x[0]) + '">' + x[1] + '</button>').join('') + '</div>' +
      '<label class="sr" for="fbTxt">Comentario</label><textarea id="fbTxt" class="inp" rows="4" maxlength="2000" placeholder="Escribí acá…">' + esc(f.text) + '</textarea><div class="row-btns"><button class="btn primary small" data-act="fbSend">Enviar</button><span class="hint" id="fbMsg"></span></div>') + '</div>';
    return h.replace('<div class="block"><h3>Contactar al soporte</h3>', box + '<div class="block"><h3>Contactar al soporte</h3>');
  };
  A.acts.fbKind = el => { const f = S.fbF; f.text = ($('#fbTxt') || {}).value || f.text; f.kind = el.getAttribute('data-k'); A.renderModal(); };
  A.acts.fbAgain = () => { S.fbF = { kind: 'sugerencia', text: '', sent: false }; A.renderModal(); };
  A.acts.fbSend = async () => {
    const f = S.fbF, t = (($('#fbTxt') || {}).value || '').trim(), msg = $('#fbMsg'); f.text = t;
    if (t.length < 3) { if (msg) msg.textContent = 'Escribí tu comentario.'; return; }
    const info = 'OdontoVoz ' + A.VERSION + ' · ' + (window.OV_NATIVE ? 'Android' : 'web') + ' · ' + (A.isSolo() ? 'consultorio' : 'centro');
    const viaMail = () => { const sup = A.SUPPORT || {}, body = '[' + f.kind + '] ' + t + '\n\n' + info; window.open('mailto:' + (sup.email || 'somosroan@gmail.com') + '?subject=' + encodeURIComponent('Sugerencia para OdontoVoz') + '&body=' + encodeURIComponent(body), '_blank'); };
    if (CL && CL.session && !A.DEMO) {
      if (msg) msg.textContent = 'Enviando…';
      try { await CL.api('/rest/v1/ov_feedback', { method: 'POST', body: { owner: CL.session.user.id, email: CL.session.user.email || '', kind: f.kind, text: t.slice(0, 2000), app: info }, headers: { Prefer: 'return=minimal' } }); f.sent = true; f.text = ''; A.renderModal(); return; }
      catch (e) { if (msg) msg.textContent = 'No se pudo enviar desde acá: se abre tu correo con el mensaje.'; viaMail(); return; }
    }
    viaMail(); f.sent = true; f.text = ''; A.renderModal();
  };

  /* =====================================================================
     8) AGENDA: botón «Hoy» cuando estás en otro día; lleva a la hora actual
     ===================================================================== */
  A.acts.agTodayNow = () => { S.date = A.today(); S.calM = null; A.refresh(); setTimeout(() => { if (A.scrollToNow) A.scrollToNow(true); }, 90); };
  function mountToday() {
    const head = document.querySelector('#view-agenda .ag-head'); if (!head) return;
    const has = head.querySelector('.ag-today'), need = S.date !== A.today();
    if (need && !has) { const n = head.querySelector('[data-act="agNext"]'); if (n) n.insertAdjacentHTML('beforebegin', '<button class="btn ag-today" data-act="agTodayNow" title="Volver a hoy, a la hora actual">Hoy</button>'); }
    if (!need && has) has.remove();
  }

  /* ---------- migración: motivos del turnero ---------- */
  let migrated = false;
  function migrate() {
    if (migrated) return; migrated = true; const o = A.CFG.online; if (!o) return;
    if (!o.typesSet && (o.types || []).join(',') === 'primera,control,urgencia,limpieza' && A.PUB_TYPES) { o.types = A.PUB_TYPES.filter(k => A.TYPES[k]); o.typesSet = true; A.save(); }
  }

  const afterPrev = A.afterRefresh;
  A.afterRefresh = () => { if (afterPrev) afterPrev(); try { migrate(); if (S.tab === 'inicio') { mountHome(); mountLogo(); } if (S.tab === 'agenda') mountToday(); } catch (e) { if (A.logError) A.logError('v110', e); } };

  /* ---------- estilos ---------- */
  const css = document.createElement('style');
  css.textContent =
    '.ov-mark{width:1.05em;height:1.05em;vertical-align:-.14em;margin-right:.35em;color:var(--accent);opacity:.85}.fb-box h3 .ov-mark{width:18px;height:18px}' +
    '.home-hi h1 .ov-mark{width:26px;height:26px;vertical-align:-4px}' +
    '.card > .empty::before{content:"";display:block;width:26px;height:26px;margin:0 auto 6px;opacity:.16;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Cpath d=%27M9 4c-3.2 0-5.5 2.6-5.5 6 0 2.6 1 4.4 1.8 6.6.9 2.5.9 5.4 1.9 8.5.5 1.6 2.4 1.7 3 .1.9-2.4 1.1-5.2 2.4-5.2h2.8c1.3 0 1.5 2.8 2.4 5.2.6 1.6 2.5 1.5 3-.1 1-3.1 1-6 1.9-8.5.8-2.2 1.8-4 1.8-6.6 0-3.4-2.3-6-5.5-6-2.2 0-3.4 1.2-5 1.2S11.2 4 9 4Z%27 fill=%27none%27 stroke=%27black%27 stroke-width=%272%27/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Cpath d=%27M9 4c-3.2 0-5.5 2.6-5.5 6 0 2.6 1 4.4 1.8 6.6.9 2.5.9 5.4 1.9 8.5.5 1.6 2.4 1.7 3 .1.9-2.4 1.1-5.2 2.4-5.2h2.8c1.3 0 1.5 2.8 2.4 5.2.6 1.6 2.5 1.5 3-.1 1-3.1 1-6 1.9-8.5.8-2.2 1.8-4 1.8-6.6 0-3.4-2.3-6-5.5-6-2.2 0-3.4 1.2-5 1.2S11.2 4 9 4Z%27 fill=%27none%27 stroke=%27black%27 stroke-width=%272%27/%3E%3C/svg%3E") center/contain no-repeat}' +
    '.lk-row{display:flex;flex-wrap:wrap;gap:8px}.lk-sw{display:flex;align-items:center;gap:6px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:99px;padding:5px 12px 5px 6px;font:inherit;font-size:13px;cursor:pointer}.lk-sw i{width:20px;height:20px;border-radius:50%;display:block}.lk-sw[aria-pressed="true"]{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft)}' +
    '.home-actions.many{grid-template-columns:repeat(2,minmax(0,1fr))}@media (min-width:760px){.home-actions.many{grid-template-columns:repeat(4,minmax(0,1fr))}}' +
    '.home-actions.editing .ha{border-style:dashed;cursor:grab;touch-action:none;animation:hwig .35s ease-in-out infinite alternate}.home-actions .ha.dragging{opacity:.75;box-shadow:var(--shadow);cursor:grabbing;animation:none}@keyframes hwig{from{transform:rotate(-.6deg)}to{transform:rotate(.6deg)}}' +
    '.he-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:6px 0;font-size:14px;color:var(--ink-2)}.he-bar span{flex:1 1 auto}.hp-list{display:grid;gap:4px}' +
    '.ag-today{font-weight:800;color:var(--accent);border-color:var(--accent)}' +
    '.mc-d{position:relative;align-items:center;justify-content:center;padding:3px 0;min-height:34px}.mc-d .mc-n{line-height:1.1}.mc-d .mc-t{font:600 9.5px var(--f-mono,monospace);color:var(--ink-2);line-height:1}.mc-d.sel .mc-t{color:inherit;opacity:.85}.mc-d i{display:none}';
  document.head.appendChild(css);
})();
