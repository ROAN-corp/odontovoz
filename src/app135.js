/* ===== 1.52: mensajes de WhatsApp editables (recordatorio de turno y los que sumen otros módulos), con variables y vista previa ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, $ = q => document.querySelector(q);

  /* registro: cada módulo suma sus mensajes con A.waTplReg(clave, { name, def, vars: [[var, ayuda]], sample: {…} }) */
  const REG = {}, ORDER = [];
  A.waTplReg = (k, o) => { if (!REG[k]) ORDER.push(k); REG[k] = o; };
  const tplCfg = () => { if (!A.CFG.waTpl || typeof A.CFG.waTpl !== 'object') A.CFG.waTpl = {}; return A.CFG.waTpl; };
  const fill = (t, v) => String(t || '').replace(/\{(\w+)\}/g, (m, k) => (v && v[k] != null && v[k] !== '' ? v[k] : m));
  A.waFill = fill;
  /* el texto de un mensaje: el editado si hay uno, si no el original */
  A.waTplText = k => { const t = tplCfg()[k]; return typeof t === 'string' && t.trim() ? t : (REG[k] ? REG[k].def : ''); };
  A.waTpl = (k, vars) => fill(A.waTplText(k), vars);
  const canEdit = () => !A.isMember || !A.isMember() || (A.mbRole && A.mbRole() === 'admin');

  /* recordatorio de turno */
  A.waTplReg('rem', {
    name: 'Recordatorio de turno', hint: 'Se manda al paciente desde la agenda o desde «Para recordar mañana».',
    def: 'Hola {nombre}, te recordamos tu turno del {fecha} a las {hora} con {profesional} en {centro}.\nRespondé 1 para confirmar o 2 para cancelar.',
    vars: [['nombre', 'nombre del paciente'], ['fecha', 'día del turno'], ['hora', 'hora del turno'], ['profesional', 'profesional'], ['centro', 'nombre del consultorio']],
    sample: { nombre: 'Lucía', fecha: 'jueves 12 de noviembre', hora: '17:00', profesional: 'Dra. Vega', centro: 'Tu consultorio' }
  });
  const remPrev = A.reminderText;
  A.reminderText = a => {
    const t = tplCfg().rem; if (typeof t !== 'string' || !t.trim()) return remPrev(a);
    const p = A.PAT(a.pid) || {}, pro = A.PRO(a.pro) || {};
    return fill(t, { nombre: String(p.first || p.name || '').split(' ')[0], fecha: A.fmtLong ? A.fmtLong(a.date) : a.date, hora: A.mm(a.start), profesional: pro.name || '', centro: A.CLINIC || '' });
  };

  /* ---------- la ventana para editar ---------- */
  A.acts.waTplOpen = () => { S.modal = { type: 'waTpl' }; A.renderModal(); };
  MF.waTpl = () => {
    const can = canEdit(), T = tplCfg();
    let b = '<p class="hint" style="margin-top:0">Así se escriben los mensajes que mandás por WhatsApp desde la app. Podés cambiar el texto como quieras. Las palabras entre llaves, como <b>{nombre}</b>, se reemplazan solas con los datos de cada caso: tocalas para sumarlas al texto.' + (can ? '' : ' Solo el dueño o la administración puede cambiarlos.') + '</p>';
    ORDER.forEach(k => {
      const o = REG[k], txt = A.waTplText(k), edited = typeof T[k] === 'string' && T[k].trim() && T[k] !== o.def;
      b += '<div class="wt-box" data-k="' + esc(k) + '"><div class="wt-h"><b>' + esc(o.name) + '</b>' + (edited ? '<span class="chip">editado</span>' : '') + '</div>' + (o.hint ? '<div class="hint" style="margin:2px 0 6px">' + esc(o.hint) + '</div>' : '') +
        '<textarea id="wt_' + esc(k) + '" class="wt-t" rows="5" data-in="wtTxt" data-k="' + esc(k) + '"' + (can ? '' : ' readonly') + '>' + esc(txt) + '</textarea>' +
        (can ? '<div class="wt-vars"><span>Sumar:</span>' + (o.vars || []).map(v => '<button type="button" class="chip wt-v" data-act="wtVar" data-k="' + esc(k) + '" data-v="' + esc(v[0]) + '" title="' + esc(v[1]) + '">{' + esc(v[0]) + '}</button>').join('') + '</div>' : '') +
        '<div class="wt-pv"><small>Así se ve:</small><div id="wtp_' + esc(k) + '" class="wt-prev">' + esc(fill(txt, o.sample)) + '</div></div>' +
        (can ? '<div class="row-btns"><button class="btn small ghost" data-act="wtRestore" data-k="' + esc(k) + '">Volver al texto original</button></div>' : '') + '</div>';
    });
    return A.modalShell('Mensajes de WhatsApp', b, '<button class="btn primary" data-act="closeModal">Listo</button>', true);
  };
  A.ins.wtTxt = el => {
    const k = el.getAttribute('data-k'), o = REG[k]; if (!o || !canEdit()) return;
    const t = tplCfg(); if (el.value.trim()) t[k] = el.value; else delete t[k];
    const pv = $('#wtp_' + k); if (pv) pv.textContent = fill(el.value.trim() ? el.value : o.def, o.sample);
    clearTimeout(A.ins.wtTxt._t); A.ins.wtTxt._t = setTimeout(() => A.save(), 600);
  };
  A.acts.wtVar = el => {
    const k = el.getAttribute('data-k'), v = '{' + el.getAttribute('data-v') + '}', ta = $('#wt_' + k); if (!ta) return;
    const a = ta.selectionStart == null ? ta.value.length : ta.selectionStart, b = ta.selectionEnd == null ? a : ta.selectionEnd;
    ta.value = ta.value.slice(0, a) + v + ta.value.slice(b); ta.focus(); try { ta.setSelectionRange(a + v.length, a + v.length); } catch (e) { /* nada */ }
    A.ins.wtTxt(ta);
  };
  A.acts.wtRestore = el => { delete tplCfg()[el.getAttribute('data-k')]; A.save(); const b = $('.m-body'), t = b ? b.scrollTop : 0; A.renderModal(); const b2 = $('.m-body'); if (b2) b2.scrollTop = t; A.toast('Volvió al texto original.'); };

  /* la entrada: dentro de «WhatsApp para recordatorios» (Ajustes › La app en este equipo) */
  const cfgPrev = MF.waCfg;
  if (cfgPrev) MF.waCfg = function () {
    const h = cfgPrev.apply(this, arguments); if (typeof h !== 'string') return h;
    const blk = '<div class="wt-entry"><b>Los mensajes</b><span>Cambiá el texto del recordatorio de turno y de los otros mensajes que mandás por WhatsApp.</span><button class="btn small primary" data-act="waTplOpen">Editar los mensajes</button></div>';
    return h.indexOf('<div class="seg wp-seg"') >= 0 ? h.replace('<div class="seg wp-seg"', blk + '<div class="seg wp-seg"') : h;
  };

  const css = document.createElement('style'); css.id = 'ovApp135';
  css.textContent = '.wt-entry{display:flex;flex-direction:column;gap:6px;align-items:flex-start;border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:0 0 12px;background:var(--surface-2)}.wt-entry span{font-size:.88rem;color:var(--ink-2);line-height:1.4}' +
    '.wt-box{border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:0 0 12px;background:var(--surface-2)}.wt-h{display:flex;gap:8px;align-items:center;justify-content:space-between}.wt-t{width:100%;box-sizing:border-box;font:inherit;line-height:1.4;padding:9px 10px;border:1px solid var(--line);border-radius:10px;background:var(--surface);color:var(--ink);resize:vertical}' +
    '.wt-vars{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:8px 0}.wt-vars span{font-size:.82rem;color:var(--ink-2)}.wt-v{cursor:pointer;border:1px solid var(--line);background:var(--surface);color:var(--accent);font-weight:600}.wt-pv small{color:var(--ink-2)}.wt-prev{white-space:pre-wrap;margin-top:4px;padding:9px 11px;border-radius:12px;background:var(--accent-soft);color:var(--ink);font-size:.92rem;line-height:1.4}';
  document.head.appendChild(css);
})();
