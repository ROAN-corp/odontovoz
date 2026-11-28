/* ===== 1.61: turnero online: prácticas y motivos editables (cuáles se pueden pedir, cuánto dura cada una, precio opcional, prácticas propias, aviso y «otro motivo») ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.tnPubData || !A.TYPES) return;
  const O = () => A.CFG.online || (A.CFG.online = {});
  const DURS = [15, 20, 30, 40, 45, 50, 60, 75, 90, 120, 150, 180, 240];
  const OLD4 = 'primera,control,urgencia,limpieza';
  const label0 = k => (A.PUB_LABEL && A.PUB_LABEL[k]) || (A.TYPES[k] || [k])[0];
  const money = n => (A.money ? A.money(n) : '$' + n);
  /* lista de prácticas del turnero (se arma una vez a partir de lo que ya tenía la cuenta) */
  A.tnMotives = () => {
    const o = O();
    if (!Array.isArray(o.motives)) {
      const sel = o.types && o.types.length && (o.typesSet || o.types.join(',') !== OLD4) ? o.types : (A.PUB_TYPES || Object.keys(A.TYPES));
      o.motives = Object.keys(A.TYPES).map(k => ({ k, label: label0(k), dur: A.TYPES[k][1] || 30, on: sel.indexOf(k) >= 0, price: 0, showPrice: true }));
    }
    return o.motives;
  };
  A.tnMotive = k => A.tnMotives().filter(m => m.k === k)[0] || null;
  const persist = () => { const o = O(); o.types = A.tnMotives().filter(m => m.on !== false && A.TYPES[m.k]).map(m => m.k); o.typesSet = true; (A.saveNow || A.save)(); };
  const near = lab => { const n = A.norm ? A.norm(lab) : String(lab).toLowerCase(); if (!n || !A.CAT) return null; return A.CAT.filter(c => (A.norm ? A.norm(c.label) : c.label.toLowerCase()) === n)[0] || A.CAT.filter(c => { const x = A.norm ? A.norm(c.label) : c.label.toLowerCase(); return x.indexOf(n) >= 0 || n.indexOf(x) >= 0; })[0] || null; };

  /* ---- resumen en Configuración › Turnero online ---- */
  const MFcfg = MF.cfg;
  MF.cfg = function (m) {
    let h = MFcfg.apply(this, arguments); if (typeof h !== 'string' || !m || m.tab !== 'online') return h;
    const a = h.indexOf('<div class="block"><h3>Motivos que puede elegir el paciente</h3>'), b = h.indexOf('<div class="block"><h3>Profesionales que reciben turnos online</h3>'); if (a < 0 || b < 0 || b < a) return h;
    const L = A.tnMotives(), on = L.filter(x => x.on !== false && x.label), o = O();
    const blk = '<div class="block"><h3>Prácticas y motivos que puede elegir el paciente</h3>' +
      '<div class="tm-sum">' + (on.length ? on.slice(0, 8).map(x => '<span class="pill">' + esc(x.label) + ' · ' + x.dur + ' min' + (x.price > 0 && x.showPrice !== false ? ' · ' + esc(money(x.price)) : '') + '</span>').join('') + (on.length > 8 ? '<span class="pill">+' + (on.length - 8) + ' más</span>' : '') : '<span class="hint">No hay ninguna práctica habilitada.</span>') + '</div>' +
      '<div class="hint">' + (L.length - on.length ? (L.length - on.length) + ' práctica' + (L.length - on.length > 1 ? 's' : '') + ' que el paciente no puede pedir solo (por ejemplo, las que preferís evaluar antes). ' : '') + '«Otro motivo»: ' + (o.other !== false ? 'permitido' : 'desactivado') + '.</div>' +
      '<div class="row-btns"><button class="btn primary" data-act="tnMotOpen">Editar prácticas, tiempos y precios</button></div></div>';
    return h.slice(0, a) + blk + h.slice(b);
  };

  /* ---- ventana de edición ---- */
  A.acts.tnMotOpen = () => { A.tnMotives(); S.modal = { type: 'tnMot' }; A.renderModal(); };
  const durSel = (v, i) => '<select data-chg="tnMotF" data-i="' + i + '" data-f="dur" aria-label="Duración">' + (DURS.indexOf(v) < 0 ? '<option value="' + v + '" selected>' + v + ' min</option>' : '') + DURS.map(d => '<option value="' + d + '"' + (d === v ? ' selected' : '') + '>' + (d >= 60 && d % 60 === 0 ? d / 60 + ' h' : d + ' min') + '</option>').join('') + '</select>';
  MF.tnMot = () => {
    const L = A.tnMotives(), o = O();
    const rows = L.map((m, i) => '<div class="tm-row' + (m.on === false ? ' tm-off' : '') + '"><div class="tm-top"><label class="chk"><input type="checkbox" data-chg="tnMotF" data-i="' + i + '" data-f="on"' + (m.on !== false ? ' checked' : '') + ' aria-label="El paciente puede pedirla"> <span class="tm-sw">' + (m.on !== false ? 'Se puede pedir' : 'No se puede pedir online') + '</span></label>' + (String(m.k).indexOf('x_') === 0 ? '<button class="btn small ghost" data-act="tnMotDel" data-i="' + i + '">Quitar</button>' : '') + '</div>' +
      '<div class="field"><label>Cómo la ve el paciente</label><input data-chg="tnMotF" data-i="' + i + '" data-f="label" maxlength="60" value="' + esc(m.label) + '" placeholder="Ej.: Limpieza y control"></div>' +
      '<div class="row2"><div class="field"><label>Cuánto dura</label>' + durSel(m.dur, i) + '</div><div class="field"><label>Precio <span class="muted">(opcional)</span></label><div class="tm-pr"><input inputmode="numeric" data-chg="tnMotF" data-i="' + i + '" data-f="price" value="' + (m.price > 0 ? m.price : '') + '" placeholder="Sin precio"><button class="btn small" data-act="tnMotPrice" data-i="' + i + '" title="Traer el precio de tu lista de precios">De mi lista</button></div></div></div></div>').join('');
    const body = '<p class="m-lead">Elegí qué prácticas puede pedir el paciente por su cuenta, cuánto tiempo reservás para cada una y, si querés, el precio que se le muestra. Lo que dejes sin tildar no aparece en la página de turnos.</p>' + rows +
      '<div class="row-btns"><button class="btn" data-act="tnMotAdd">+ Agregar una práctica</button></div>' +
      '<div class="block"><h3>«Otro motivo»</h3><label class="chk"><input type="checkbox" data-chg="tnMotO" data-f="other"' + (o.other !== false ? ' checked' : '') + '> El paciente puede escribir otro motivo</label>' +
      '<div class="row2"><div class="field"><label>Tiempo que se reserva</label><select data-chg="tnMotO" data-f="otherDur">' + [15, 20, 30, 45, 60].map(d => '<option value="' + d + '"' + ((o.otherDur || 30) === d ? ' selected' : '') + '>' + d + ' min</option>').join('') + '</select></div></div>' +
      '<div class="field"><label>Aclaración para quien elija «otro motivo»</label><input data-chg="tnMotO" data-f="otherHint" maxlength="160" value="' + esc(o.otherHint || '') + '" placeholder="Ej.: Las extracciones se evalúan primero en una consulta."></div></div>' +
      '<div class="block"><h3>Aviso en la página de turnos</h3><div class="field"><textarea rows="2" maxlength="220" data-chg="tnMotO" data-f="msg" placeholder="Ej.: No hacemos extracciones. Para urgencias escribinos por WhatsApp.">' + esc(o.msg || '') + '</textarea></div></div>';
    return A.modalShell('Prácticas del turnero online', body, '<button class="btn primary" data-act="tnMotBack">Listo</button>', true);
  };
  A.chg.tnMotF = el => {
    const L = A.tnMotives(), m = L[+el.getAttribute('data-i')], f = el.getAttribute('data-f'); if (!m) return;
    if (f === 'on') { m.on = !!el.checked; persist(); A.renderModal(); return; }
    if (f === 'label') { m.label = String(el.value).trim().slice(0, 60); if (!m.label) { m.label = label0(m.k) || ''; el.value = m.label; } }
    else if (f === 'dur') m.dur = Math.max(10, Math.min(240, parseInt(el.value, 10) || 30));
    else if (f === 'price') { const v = A.parseMoney ? A.parseMoney(el.value) : parseInt(String(el.value).replace(/\D/g, ''), 10); m.price = v > 0 ? Math.round(v) : 0; el.value = m.price > 0 ? m.price : ''; }
    persist();
  };
  A.acts.tnMotPrice = el => {
    const m = A.tnMotives()[+el.getAttribute('data-i')]; if (!m) return; const c = near(m.label);
    if (!c) { A.toast('No encontré «' + m.label + '» en tu lista de precios: escribí el precio a mano.'); return; }
    m.price = Math.round(c.price); persist(); A.renderModal(); A.toast('Precio traído de tu lista: ' + c.label + ' ' + money(c.price) + '.');
  };
  A.acts.tnMotAdd = () => { A.tnMotives().push({ k: 'x_' + A.uid().replace(/\W/g, '').slice(0, 8), label: '', dur: 30, on: true, price: 0, showPrice: true }); S.modal = { type: 'tnMot' }; A.renderModal(); setTimeout(() => { const i = document.querySelectorAll('.tm-row [data-f="label"]'); if (i.length) i[i.length - 1].focus(); }, 50); };
  A.acts.tnMotDel = el => { const L = A.tnMotives(), i = +el.getAttribute('data-i'); if (L[i] && String(L[i].k).indexOf('x_') === 0) { L.splice(i, 1); persist(); A.renderModal(); } };
  A.chg.tnMotO = el => {
    const o = O(), f = el.getAttribute('data-f');
    if (f === 'other') o.other = !!el.checked; else if (f === 'otherDur') o.otherDur = parseInt(el.value, 10) || 30; else o[f] = String(el.value).trim().slice(0, f === 'msg' ? 220 : 160);
    persist();
  };
  A.acts.tnCfg = () => { if (A.acts.tnClose && document.body.classList.contains('tn-on')) A.acts.tnClose(); A.acts.cfgOpen({ getAttribute: k => (k === 'data-t' ? 'online' : null) }); };
  A.acts.tnMotBack = () => {
    A.tnMotives().forEach(m => { if (!m.label) m.on = false; }); persist(); if (A.tnPublish) A.tnPublish(true);
    A.acts.cfgOpen({ getAttribute: k => (k === 'data-t' ? 'online' : null) });
  };

  const css = document.createElement('style'); css.id = 'ovApp145';
  css.textContent = '.tm-sum{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}.tm-row{border:1px solid var(--line);border-radius:12px;padding:10px;margin:8px 0;background:var(--surface)}.tm-row.tm-off{opacity:.7;background:var(--surface-2)}.tm-top{display:flex;justify-content:space-between;align-items:center;gap:8px}.tm-sw{font-weight:700}.tm-pr{display:flex;gap:6px}.tm-pr input{flex:1;min-width:0}';
  document.head.appendChild(css);
})();
