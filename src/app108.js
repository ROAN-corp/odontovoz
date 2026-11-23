/* ===== 1.21.2: «No es de este paciente»: una evolución traída del sistema anterior se pasa a la ficha correcta (o se anula) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, MF = A.modalFns, $ = q => document.querySelector(q);
  const noteOf = (pid, id) => ((A.pd(pid) || {}).notes || []).filter(n => n.id === id)[0] || null;

  A.acts.mvnAsk = el => { S.modal = { type: 'mvn', from: S.fichaPid, id: el.getAttribute('data-id'), q: '' }; A.renderModal(); setTimeout(() => { const i = $('#mvnQ'); if (i) i.focus(); }, 50); };
  function results(m) {
    const q = String(m.q || '').trim();
    if (A.norm(q).length < 2) return '<p class="hint" style="margin:0">Escribí al menos 2 letras del nombre, el apellido o el DNI.</p>';
    const r = (A.searchPats(q, 8) || []).filter(p => p.id !== m.from);
    if (!r.length) return '<p class="hint" style="margin:0">No encontré pacientes con eso.</p>';
    return '<div class="mvn-res">' + r.map(p => '<button class="mvn-p" data-act="mvnPick" data-pid="' + esc(p.id) + '">' + (A.avatarSm ? A.avatarSm(p.id, 'av-sm') : '') + '<span><b>' + esc(p.name) + '</b><small>DNI ' + esc(p.dni || '—') + ' · ' + esc(p.cov || 'Particular') + '</small></span></button>').join('') + '</div>';
  }
  MF.mvn = m => {
    const n = noteOf(m.from, m.id), from = A.PAT(m.from) || {};
    if (!n) return A.modalShell('Evolución', '<p>No encontré esa nota.</p>', '<button class="btn" data-act="closeModal">Cerrar</button>');
    const to = m.to && A.PAT(m.to);
    let b = '<div class="mvn-note"><div class="mvn-m">' + esc(A.fmtDMY(n.date)) + ' · en la ficha de <b>' + esc(from.name || '') + '</b></div><div class="mvn-t">' + esc(n.text.length > 400 ? n.text.slice(0, 400) + '…' : n.text) + '</div></div>';
    if (to) {
      b += '<p>¿Pasar esta evolución a la ficha de <b>' + esc(to.name) + '</b> (DNI ' + esc(to.dni || '—') + ')?</p>' +
        (n.odon ? '<p class="pd-warn">Esta nota ya se había pasado al odontograma de ' + esc(from.name || '') + '. Después revisá los dos odontogramas.</p>' : '') +
        '<p class="hint">Queda registrado en el historial de cambios de las dos fichas.</p>';
      return A.modalShell('Pasar a otra ficha', b, '<button class="btn" data-act="mvnBack">Volver</button><button class="btn primary" data-act="mvnGo">Pasar a ' + esc(to.first || to.name) + '</button>');
    }
    b += '<label class="field"><span>¿De qué paciente es?</span><input class="inp" id="mvnQ" data-in="mvnQ" autocomplete="off" placeholder="Nombre, apellido o DNI" value="' + esc(m.q) + '"></label><div id="mvnRes">' + results(m) + '</div>' +
      '<p class="hint">Si no sabés de quién es, anulala: queda guardada pero oculta, como pide la ley.</p>';
    return A.modalShell('No es de este paciente', b, '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="mvnVoid">No sé de quién es: anularla</button>');
  };
  let t = null;
  A.ins.mvnQ = el => { S.modal.q = el.value; clearTimeout(t); t = setTimeout(() => { const h = $('#mvnRes'); if (h && S.modal && S.modal.type === 'mvn') h.innerHTML = results(S.modal); }, 120); };
  A.acts.mvnPick = el => { S.modal.to = el.getAttribute('data-pid'); A.renderModal(); };
  A.acts.mvnBack = () => { delete S.modal.to; A.renderModal(); };
  A.acts.mvnVoid = () => { const m = S.modal; S.modal = { type: 'evVoid', id: m.id }; A.renderModal(); const w = $('#evWhy') || document.querySelector('.modal textarea, .modal input[type=text]'); if (w && !w.value) w.value = 'No es de este paciente (vino mal en la mudanza del sistema anterior).'; };
  A.acts.mvnGo = () => {
    const m = S.modal, a = A.pd(m.from), b = A.pd(m.to), n = noteOf(m.from, m.id); if (!n || !b) return;
    const toP = A.PAT(m.to) || {}, fromP = A.PAT(m.from) || {};
    a.notes = a.notes.filter(x => x !== n); b.notes = b.notes || []; b.notes.push(n);
    if (n.odon) delete n.odon;
    b.notes.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
    if (A.alog) { A.alog(m.from, 'mudanza', 'Una evolución del ' + A.fmtDMY(n.date) + ' pasó a la ficha de ' + (toP.name || '') + ' (no era de este paciente).'); A.alog(m.to, 'mudanza', 'Llegó una evolución del ' + A.fmtDMY(n.date) + ' desde la ficha de ' + (fromP.name || '') + ' (había quedado ahí por la mudanza).'); }
    A.touchPd(m.from); A.touchPd(m.to); A.saveNow && A.saveNow();
    S.modal = null; A.renderModal(); A.refresh(); A.toast('Evolución pasada a la ficha de ' + (toP.name || '') + '.');
  };

  const css = document.createElement('style');
  css.id = 'ovApp108';
  css.textContent = [
    '.mvn-note { border: 1px solid var(--line); border-left: 3px solid var(--warn); border-radius: 10px; padding: 8px 10px; margin-bottom: 12px; background: var(--surface-2); }',
    '.mvn-m { font-size: 12.5px; color: var(--ink-2); margin-bottom: 4px; } .mvn-t { font-size: 14px; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 160px; overflow: auto; }',
    '.mvn-res { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }',
    '.mvn-p { display: flex; align-items: center; gap: 10px; text-align: left; border: 1px solid var(--line); background: var(--surface); color: var(--ink); border-radius: 10px; padding: 8px 10px; cursor: pointer; font: inherit; min-height: 44px; }',
    '.mvn-p:hover { border-color: var(--accent); } .mvn-p span { display: flex; flex-direction: column; } .mvn-p small { color: var(--ink-2); font-size: 12.5px; }'
  ].join('\n');
  document.body.appendChild(css);
})();
