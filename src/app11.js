/* ===== 1.3: resumen estable al sincronizar, ficha completa para paciente nuevo, edad por fecha de nacimiento ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const N = s => A.norm(s);
  const UC = s => s.charAt(0).toUpperCase() + s.slice(1);
  const cap = s => String(s).split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  /* ---------- 1) el panel de resumen no se vuelve a «abrir» con cada cambio que llega de otro equipo ---------- */
  const keyOf = p => (p ? p.type + ':' + (p.pid || p.id) : '');
  const prevPanel = A.renderPanel;
  A.renderPanel = () => {
    const host = $('#panelHost'), key = keyOf(S.panel), old = host && host.querySelector('.panel');
    const same = !!(old && key && host.getAttribute('data-key') === key);
    let sc = 0, vals = null, focus = null;
    if (same) {
      sc = old.scrollTop; vals = {};
      old.querySelectorAll('input[id],textarea[id],select[id]').forEach(el => { vals[el.id] = el.type === 'checkbox' ? el.checked : el.value; });
      const ae = document.activeElement; if (ae && old.contains(ae) && ae.id) focus = { id: ae.id, s: ae.selectionStart, e: ae.selectionEnd };
    }
    prevPanel();
    if (!host) return;
    host.setAttribute('data-key', key);
    if (!same) return;
    const fromSync = !!A._fromSync;
    const np = host.querySelector('.panel'); if (!np) return;
    np.classList.add('still');
    const sc2 = host.querySelector('.scrim'); if (sc2) sc2.classList.add('still');
    /* lo que se estaba escribiendo (por ejemplo una nota rápida) no se pierde */
    if (fromSync) Object.keys(vals).forEach(id => { const el = np.querySelector('#' + CSS.escape(id)); if (!el) return; if (el.type === 'checkbox') { if (el.checked !== vals[id] && !el.hasAttribute('data-chg')) el.checked = vals[id]; } else if (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && !el.hasAttribute('data-chg'))) el.value = vals[id]; });
    np.scrollTop = sc;
    if (focus && fromSync) { const el = np.querySelector('#' + CSS.escape(focus.id)); if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(focus.s, focus.e); } catch (e) { /* nada */ } } }
  };

  /* ---------- 2) edad calculada con la fecha de nacimiento ---------- */
  A.ageFrom = b => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(b || '')); if (!m) return null;
    const t = A.today().split('-').map(Number), y = +m[1], mo = +m[2], d = +m[3];
    let a = t[0] - y; if (t[1] < mo || (t[1] === mo && t[2] < d)) a--;
    return a >= 0 && a < 130 ? a : null;
  };
  const prevDerive = A.derive;
  A.derive = p => { prevDerive(p); if (p.birth) { const a = A.ageFrom(p.birth); if (a != null) p.age = a; } return p; };
  try { (A.PATS || []).forEach(p => { if (p.birth) A.derive(p); }); } catch (e) { /* nada */ }

  /* fecha dicha o escrita: «3 de mayo de 1990», «03/05/1990», «3-5-90» */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  A.parseBirth = txt => {
    let s = N(txt).replace(/\bsetiembre\b/, 'septiembre').replace(/\bdel\b/g, 'de').replace(/\bel\b/g, ' ').trim(), d, mo, y;
    let m = /(\d{1,2})\s*[/.\-\s]\s*(\d{1,2})\s*[/.\-\s]\s*(\d{2,4})/.exec(s);
    if (m) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else {
      m = /(\S+(?:\s\S+)?)\s+de\s+([a-z]+)\s+(?:de\s+)?(.+)$/.exec(s); if (!m) return null;
      mo = MESES.indexOf(m[2]) + 1; if (!mo) return null;
      const num = w => { if (/^\d+$/.test(w)) return +w; try { const r = window.OVCmd.wordsNum(w.split(' ')); return r && r.value ? r.value : null; } catch (e) { return null; } };
      d = num(m[1].replace(/^(?:primero|1ro)$/, '1').split(' ').pop()); y = num(m[3].replace(/\s+/g, ' ').trim());
      if (d == null || y == null) return null;
    }
    if (y < 100) y += y > (+A.today().slice(2, 4)) ? 1900 : 2000;
    if (!(d >= 1 && d <= 31 && mo >= 1 && mo <= 12 && y > 1900)) return null;
    const iso = y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    return iso <= A.today() ? iso : null;
  };

  /* ---------- 3) paciente nuevo: ficha completa de una vez ---------- */
  const fld = (id, label, val, extra) => '<div class="field"><label for="' + id + '">' + label + '</label><input id="' + id + '" value="' + esc(val || '') + '"' + (extra || '') + '></div>';
  MF.patient = m => {
    const d = m.d || {}, pro = S.role === 'profesional', osOpts = (A.osList ? A.osList() : []).filter(o => !/^particular$/i.test(o.sigla));
    let b = '<div class="np-cols"><div>';
    b += '<section class="np-sec"><h3>Datos personales</h3>' +
      '<div class="row2">' + fld('npF', 'Nombre *', d.first, ' autocomplete="off"') + fld('npL', 'Apellido *', d.last, ' autocomplete="off"') + '</div>' +
      '<div class="row3">' + fld('npD', 'DNI', d.dni, ' inputmode="numeric"') + fld('npB', 'Fecha de nacimiento', d.birth, ' type="date" max="' + A.today() + '" data-in="npBirth"') +
      '<div class="field"><label for="npA">Edad</label><input id="npA" type="number" min="0" max="120" value="' + esc(d.age || '') + '" placeholder="sale de la fecha"><div class="hint" id="npAgeHint"></div></div></div>' +
      '<div class="row2">' + fld('npT', 'Teléfono (WhatsApp)', d.phone, ' inputmode="tel"') + fld('npE', 'Email', d.email, ' type="email"') + '</div>' +
      '<div class="row2">' + fld('npAddr', 'Domicilio', d.addr) + fld('npLoc', 'Localidad', d.loc) + '</div>' +
      '<div class="field"><label for="npPro">Profesional de cabecera</label><select id="npPro">' + A.PROS.map(x => '<option value="' + x.id + '"' + (x.id === (d.pro || (A.PROS[0] || {}).id) ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></div></section>';
    const hasOs = d.cov && !/^particular$/i.test(d.cov);
    b += '<section class="np-sec"><h3>Obra social</h3><div class="row-btns np-os-tg" role="radiogroup" aria-label="¿Tiene obra social?">' +
      '<button class="pill" data-act="npOs" data-v="0" aria-pressed="' + !hasOs + '">Particular (sin obra social)</button><button class="pill" data-act="npOs" data-v="1" aria-pressed="' + !!hasOs + '">Tiene obra social o prepaga</button></div>' +
      '<div id="npOsBox"' + (hasOs ? '' : ' hidden') + '><div class="field"><label for="npC">¿Cuál?</label><input id="npC" list="npOsDl" value="' + esc(hasOs ? d.cov : '') + '" placeholder="Elegí de la lista o escribí"><datalist id="npOsDl">' + osOpts.map(o => '<option value="' + esc(o.sigla) + '">' + esc(o.name) + '</option>').join('') + '</datalist></div>' +
      '<div class="row2">' + fld('npAfil', 'N.º de afiliado', d.afil) + fld('npPlan', 'Plan', d.plan, ' placeholder="Ej.: 210, Bronce, PMO"') + '</div></div></section>';
    b += '<section class="np-sec"><h3>Motivo de la consulta</h3><div class="field"><label for="npMot" class="sr">Motivo de la consulta</label><input id="npMot" value="' + esc(d.motivo || '') + '" placeholder="Ej.: dolor en una muela de abajo"></div></section>';
    b += '</div><div>';
    if (pro) {
      b += '<section class="np-sec"><h3>Salud (anamnesis)</h3><div class="check-grid">' + A.ANAM.map(a => '<label><input type="checkbox" class="np-cond" value="' + a[0] + '"> ' + esc(a[1]) + '</label>').join('') + '</div>' +
        '<div class="field" style="margin-top:10px"><label for="npMeds">Medicación actual</label><textarea id="npMeds" rows="2"></textarea></div>' +
        '<div class="field"><label for="npAnt">Antecedentes odontológicos y hábitos</label><textarea id="npAnt" rows="2"></textarea></div>' +
        '<div class="field"><label for="npAl">Alerta adicional (se ve en la agenda)</label><input id="npAl"></div></section>';
    } else b += '<section class="np-sec"><h3>Salud</h3><div class="hint">La anamnesis la completa el profesional en la ficha.</div></section>';
    b += '</div></div><div id="npMsg" class="hint bad"></div>';
    const h = A.modalShell('Paciente nuevo · ficha completa', b, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="npSave">Guardar y abrir la ficha</button>');
    return h.replace('<div class="modal"', '<div class="modal np-full"');
  };
  A.modalAfter.patient = () => { npAge(); const f = $('#npF'); if (f && !f.value && !(A.voice && A.voice.on)) setTimeout(() => f.focus(), 60); };
  function npAge() {
    const b = $('#npB'), a = $('#npA'), h = $('#npAgeHint'); if (!b || !a) return;
    const v = A.ageFrom(b.value);
    if (v != null) { a.value = v; a.readOnly = true; if (h) h.textContent = 'Calculada con la fecha de nacimiento.'; }
    else { a.readOnly = false; if (h) h.textContent = ''; }
  }
  A.ins.npBirth = () => npAge();
  document.addEventListener('change', e => { if (e.target && e.target.id === 'npB') npAge(); });
  A.acts.npOs = el => {
    const on = el.getAttribute('data-v') === '1';
    document.querySelectorAll('.np-os-tg .pill').forEach(p => p.setAttribute('aria-pressed', String(p === el)));
    const box = $('#npOsBox'); if (box) box.hidden = !on;
    if (on) { const c = $('#npC'); if (c) c.focus(); }
  };
  A.acts.newPatient = () => { S.modal = { type: 'patient' }; A.renderModal(); };
  A.acts.npSave = () => {
    const v = id => (($('#' + id) || {}).value || '').trim(), msg = t => { const e = $('#npMsg'); if (e) e.textContent = t; };
    const first = cap(v('npF')), last = cap(v('npL'));
    if (!first || !last) { msg('Completá nombre y apellido.'); ($('#' + (first ? 'npL' : 'npF')) || {}).focus && $('#' + (first ? 'npL' : 'npF')).focus(); return; }
    const dni = v('npD').replace(/\D/g, '');
    if (dni && A.PATS.some(p => String(p.dni) === dni)) { msg('Ya existe un paciente con ese DNI.'); return; }
    const birth = v('npB'), age = A.ageFrom(birth);
    const osOn = !($('#npOsBox') || {}).hidden, cov = osOn && v('npC') ? (A.osList().filter(o => N(o.sigla) === N(v('npC')) || N(o.name) === N(v('npC')))[0] || { sigla: v('npC') }).sigla : 'Particular';
    const p = A.addPatient({ first, last, dni, phone: v('npT'), email: v('npE'), cov, age: age != null ? age : (parseInt(v('npA'), 10) || 0), pro: v('npPro') || undefined });
    const extra = { age: age != null ? age : (parseInt(v('npA'), 10) || 0) };
    if (birth) extra.birth = birth; if (v('npAddr')) extra.addr = v('npAddr'); if (v('npLoc')) extra.loc = v('npLoc');
    if (osOn) { if (v('npAfil')) extra.afil = v('npAfil'); if (v('npPlan')) extra.plan = v('npPlan'); }
    A.setProfile(p.id, extra);
    const pd = A.pd(p.id), conds = Array.prototype.slice.call(document.querySelectorAll('.np-cond:checked')).map(x => x.value);
    if (conds.length || v('npMeds') || v('npAnt') || v('npAl')) {
      conds.forEach(c => { pd.hc.conds[c] = true; });
      if (v('npMeds')) pd.hc.meds = v('npMeds'); if (v('npAnt')) pd.hc.ant = v('npAnt'); if (v('npAl')) pd.hc.alertExtra = v('npAl');
      A.touchPd(p.id);
    }
    if (v('npMot') && A.setMotivo) A.setMotivo(p.id, v('npMot'));
    S.modal = null; A.renderModal(); A.toast('Paciente creado: ' + p.name); A.openFicha(p.id, 'datos');
    if (A.voice && A.voice.on && A.say) A.say('Listo, ficha de ' + p.name + ' guardada. Seguimos con la historia: decí «antecedentes…», «medicación…» o «alergia a…».');
  };

  /* ---------- 4) por voz: fecha de nacimiento, domicilio, localidad, afiliado y plan ---------- */
  const FIELDS = [
    ['birth', /^(?:la |su )?fecha de nacimiento(?: es)?\s*:?\s+(.+)$|^(?:nacio|nacida|nacido)(?: el)?\s+(.+)$/],
    ['addr', /^(?:el |su )?(?:domicilio|direccion)(?: es)?\s*:?\s+(.+)$|^vive en\s+(.+)$/],
    ['loc', /^(?:la |su )?(?:localidad|ciudad)(?: es)?\s*:?\s+(.+)$/],
    ['afil', /^(?:el |su )?(?:numero de afiliado|n de afiliado|afiliado|credencial)(?: es)?\s*:?\s+(.+)$/],
    ['plan', /^(?:el |su )?plan(?: es)?\s*:?\s+(.+)$/],
    ['particular', /^(?:es )?particular$|^no tiene obra social$|^sin obra social$/]
  ];
  const NP = { birth: 'npB', addr: 'npAddr', loc: 'npLoc', afil: 'npAfil', plan: 'npPlan' };
  const LBL = { birth: 'Fecha de nacimiento', addr: 'Domicilio', loc: 'Localidad', afil: 'N.º de afiliado', plan: 'Plan' };
  const execPrev = A.cmd.exec;
  A.cmd.exec = (text, o) => {
    const inNew = S.modal && S.modal.type === 'patient', inFicha = !S.modal && S.tab === 'ficha' && S.fichaPid && S.fichaTab === 'datos';
    if ((inNew || inFicha) && !(A.cloud && A.cloud.readonly)) {
      let c = N(text).replace(/[.,;]+$/, '').trim();
      const raw = String(A._lastRaw || text).replace(/[.,;]+$/, '').trim();
      for (const [f, re] of FIELDS) {
        const m = re.exec(c); if (!m) continue;
        if (f === 'particular') { if (inNew) { const b = document.querySelector('.np-os-tg .pill[data-v="0"]'); if (b) A.acts.npOs(b); } else { A.setProfile(S.fichaPid, { cov: 'Particular' }); A.refresh(); } return { ok: true, msg: 'Particular, sin obra social.' }; }
        let val = (m[1] || m[2] || '').trim(); const words = val.split(' ').length, rw = raw.split(/\s+/).slice(-words).join(' ');
        if (N(rw) === val) val = rw;
        if (f === 'birth') { const iso = A.parseBirth(val); if (!iso) return { ok: false, msg: 'No entendí la fecha. Decila así: «fecha de nacimiento 3 de mayo de 1990».' }; val = iso; }
        else if (f === 'afil') { const d = val.replace(/\D/g, ''); val = d.length >= 3 ? d : val.replace(/\s+/g, ''); }
        else val = cap(val);
        const say = f === 'birth' ? A.fmtDMY(val) + ' (' + A.ageFrom(val) + ' años)' : val;
        if (inNew) {
          if ((f === 'afil' || f === 'plan')) { const b = document.querySelector('.np-os-tg .pill[data-v="1"]'); if (b && $('#npOsBox').hidden) A.acts.npOs(b); }
          const el = $('#' + NP[f]); if (el) { el.value = val; el.dispatchEvent(new Event('input', { bubbles: true })); if (f === 'birth') npAge(); }
        } else { A.setProfile(S.fichaPid, { [f]: val }); A.refresh(); }
        return { ok: true, msg: LBL[f] + ': ' + say + '.' };
      }
      /* «obra social OSDE» en la ficha nueva: se marca que tiene obra social */
      if (inNew && /^(?:la |su )?(?:obra social|cobertura|prepaga)\b/.test(c) && !/particular|ninguna|no tiene/.test(c)) { const b = document.querySelector('.np-os-tg .pill[data-v="1"]'); if (b && $('#npOsBox').hidden) A.acts.npOs(b); }
      if (inNew && /^(?:la |su )?edad\b/.test(c) && ($('#npA') || {}).readOnly) return { ok: true, msg: 'La edad ya sale de la fecha de nacimiento: ' + $('#npA').value + ' años.' };
    }
    return execPrev(text, o);
  };

  document.head.insertAdjacentHTML('beforeend', '<style>' +
    '.panel.still{animation:none}' +
    '.modal.np-full{width:min(1080px,100%);max-height:calc(100vh - 24px)}.np-cols{display:grid;grid-template-columns:1fr 1fr;gap:18px}.np-sec{border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin-bottom:12px}.np-sec h3,.np-h{margin:0 0 8px;font-size:14px;letter-spacing:.02em}.np-h{margin-top:12px}.np-os-tg{margin-bottom:8px}#npA[readonly],#pf_age[readonly]{background:var(--surface-2,rgba(0,0,0,.04))}' +
    '@media (max-width:760px){.np-cols{grid-template-columns:1fr;gap:0}.modal-scrim:has(.np-full){padding:0}.modal.np-full{width:100%;max-height:none;height:100%;border-radius:0;padding-top:env(safe-area-inset-top,0px)}}' +
    /* agenda: turnos cortos y superpuestos legibles */
    '.blk.sz-xs{padding:0 6px;display:flex;align-items:center}.blk.sz-xs .n{flex:1;min-width:0;display:flex;align-items:center;gap:3px;font-size:12.5px}.blk.sz-xs .stb{width:20px;height:20px;font-size:11px;margin-right:2px;vertical-align:0}' +
    '.blk.sz-xs .tm{font-family:var(--f-mono);font-size:10.5px;color:var(--ink-2);margin-left:auto;padding-left:4px;flex:0 0 auto}.blk.sz-xs .grip{flex:0 0 auto}.blk.sz-xs .al{flex:0 0 auto}' +
    '.blk.sz-s{padding:2px 7px}.blk.sz-s .k{display:none}.blk.sz-s .t{font-size:10.5px}' +
    '.blk.narrow{display:flex;flex-direction:column;padding-left:5px;padding-right:4px}.blk.narrow .n{order:-1}.blk.narrow .t .wab{display:none}.blk.narrow .t .sb{font-size:9px}.blk.narrow.sz-xs{flex-direction:row}.blk.narrow .stb{width:18px;height:18px;font-size:10px;margin-right:3px}.blk.narrow .n{font-size:12px}.blk.narrow.sz-xs .tm,.blk.narrow.sz-xs .al{display:none}.blk.narrow .grip{padding:0}' +
    '</style>');
})();
