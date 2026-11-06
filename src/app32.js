/* ===== 1.22: modo Empresa como árbol: Empresa › consultorio › profesionales; cada consultorio con su agenda propia ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc;
  const isEmp = () => !!(A.isEmp && A.isEmp());
  const sedes = () => (A.locs ? A.locs() : []);
  const sedeById = id => sedes().filter(l => l.id === id)[0] || null;
  const cur = () => (isEmp() && A.empSede ? A.empSede() : null);
  const prosOf = sd => A.PROS.filter(p => Array.isArray(p.sedes) && p.sedes.indexOf(sd) >= 0);
  const canAll = () => (A.empPermAll ? A.empPermAll() : true);
  const go = (sd, tab, pro) => { if (A.empSetSede) A.empSetSede(sd); S.proSel = pro ? [pro] : null; S.view = 'dia'; S.tab = tab || 'agenda'; A.refresh(); window.scrollTo(0, 0); };

  /* ---------- cada consultorio ve solo a sus profesionales (si no tiene, no se muestra ninguno) ---------- */
  const vpPrev = A.visPros;
  A.visPros = () => {
    if (!isEmp()) return vpPrev();
    const sd = cur(); if (!sd) return vpPrev();
    let l = A.PROS.filter(p => Array.isArray(p.sedes) && p.sedes.indexOf(sd) >= 0);
    if (S.uimode === 'atencion' && S.me) { const me = l.filter(p => p.id === S.me); if (me.length) l = me; }
    return l;
  };
  /* y solo los turnos de ese consultorio (un profesional que atiende en dos no mezcla sus agendas) */
  const keepPrev = A.locKeep;
  A.locKeep = a => {
    if (!isEmp()) return keepPrev ? keepPrev(a) : true;
    const sd = cur(); if (!sd || !a || a.type === 'block') return true;
    return A.locOf(a) === sd;
  };

  /* ---------- consultorio sin profesionales: pantalla propia, sin mezclar ---------- */
  function emptyHTML(sd) {
    const l = sedeById(sd) || {}, others = A.PROS.filter(p => !(Array.isArray(p.sedes) && p.sedes.indexOf(sd) >= 0));
    return '<section class="card emp-empty" style="--sc:' + esc(l.color || 'var(--accent)') + '"><h2><span class="emp-dot"></span> ' + esc(l.name || 'Consultorio') + '</h2><p>Este consultorio todavía no tiene profesionales. Su agenda queda vacía hasta que sumes al menos uno.</p>' +
      '<div class="row-btns"><button class="btn primary" data-act="treeProNew" data-s="' + esc(sd) + '">+ Profesional nuevo</button></div>' +
      (others.length && canAll() ? '<h3 class="emp-h3">O sumá a alguien que ya trabaja en otro consultorio</h3><ul class="tree-pick">' + others.map(p => '<li><span><i class="stdot" style="background:' + esc(p.color) + '"></i> ' + esc(p.name) + '<small>' + esc((p.sedes || []).map(id => (sedeById(id) || {}).name).filter(Boolean).join(', ')) + '</small></span><button class="btn small" data-act="treeProAdd" data-p="' + p.id + '" data-s="' + esc(sd) + '">Sumar a ' + esc(l.name || 'este consultorio') + '</button></li>').join('') + '</ul>' : '') + '</section>';
  }
  ['agenda', 'inicio'].forEach(tab => {
    const prev = A.render[tab];
    A.render[tab] = function () {
      const sd = cur();
      if (isEmp() && sd && !A.visPros().length) { const host = $('#view-' + tab); if (host) host.innerHTML = emptyHTML(sd); return; }
      return prev.apply(this, arguments);
    };
  });
  /* sin profesionales no se puede dar un turno ahí */
  ['newAppt', 'newSobre', 'agFreeToday', 'blockNew'].forEach(k => {
    const prev = A.acts[k]; if (!prev) return;
    A.acts[k] = function () { if (isEmp() && cur() && !A.visPros().length) { A.toast('Este consultorio todavía no tiene profesionales.'); return; } return prev.apply(this, arguments); };
  });
  const execPrev = A.cmd && A.cmd.exec;
  if (execPrev) A.cmd.exec = (t, o) => { try { return execPrev(t, o); } catch (e) { if (isEmp() && cur() && !A.visPros().length) return { ok: false, msg: 'Este consultorio todavía no tiene profesionales.' }; throw e; } };

  /* ---------- profesional nuevo: queda en el consultorio donde estás ---------- */
  A.acts.treeProNew = el => { S._treeSede = el.getAttribute('data-s'); if (A.acts.cfgOpen) A.acts.cfgOpen({ getAttribute: k => (k === 'data-t' ? 'pros' : null) }); if (A.acts.cfgProNew) A.acts.cfgProNew(); };
  A.acts.treeProAdd = el => {
    const p = A.PROS.filter(x => x.id === el.getAttribute('data-p'))[0], sd = el.getAttribute('data-s'); if (!p) return;
    p.sedes = (Array.isArray(p.sedes) ? p.sedes : []).filter(id => sedeById(id)); if (p.sedes.indexOf(sd) < 0) p.sedes.push(sd);
    if (A.empAudit) A.empAudit(p.name + ' ahora también atiende en ' + (sedeById(sd) || {}).name + '.'); A.save(); A.refresh(); A.toast(p.name + ' sumado a ' + (sedeById(sd) || {}).name + '.');
  };
  A.acts.treeProMove = el => { S.modal = { type: 'treeMove', p: el.getAttribute('data-p'), from: el.getAttribute('data-s') }; A.renderModal(); };
  A.modalFns.treeMove = m => {
    const p = A.PRO(m.p), ps = Array.isArray(p.sedes) ? p.sedes : [];
    return A.modalShell(p.name, '<p>¿En qué consultorios atiende? Tildá todos los que correspondan. El primero que quede marcado es su consultorio principal.</p><div class="tree-chk">' + sedes().map(l => '<label class="chk"><input type="checkbox" data-sd="' + esc(l.id) + '"' + (ps.indexOf(l.id) >= 0 ? ' checked' : '') + '> <span><span class="emp-dot" style="background:' + esc(l.color) + '"></span> ' + esc(l.name) + '</span></label>').join('') + '</div><div class="hint bad" id="tmMsg"></div>',
      '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="treeMoveGo">Guardar</button>');
  };
  A.acts.treeMoveGo = () => {
    const m = S.modal, p = A.PRO(m.p), sel = A.$$('[data-sd]').filter(c => c.checked).map(c => c.getAttribute('data-sd'));
    if (!sel.length) { $('#tmMsg').textContent = 'Tiene que quedar en al menos un consultorio.'; return; }
    const old = (p.sedes || [])[0]; p.sedes = sel.sort((a, b) => (a === old ? -1 : b === old ? 1 : 0));
    if (A.empAudit) A.empAudit(p.name + ': atiende en ' + sel.map(id => (sedeById(id) || {}).name).join(', ') + '.');
    S.modal = null; A.renderModal(); A.save(); A.refresh();
  };
  /* los profesionales que se crean sin consultorio quedan en el consultorio donde se está trabajando */
  const arPrev = A.afterRefresh;
  A.afterRefresh = () => {
    if (isEmp()) {
      let ch = false; const sd = S._treeSede || cur() || (sedes()[0] || {}).id;
      A.PROS.forEach(p => { if (!Array.isArray(p.sedes) && sd) { p.sedes = [sd]; ch = true; } });
      if (ch) { S._treeSede = null; A.save(); }
    }
    if (arPrev) arPrev();
    crumbs();
  };

  /* ---------- camino arriba de todo: Empresa › Consultorio › Profesional ---------- */
  function crumbs() {
    document.querySelectorAll('.emp-crumb').forEach(e => e.remove());
    if (!isEmp() || ['agenda', 'inicio', 'caja', 'pacientes', 'liq'].indexOf(S.tab) < 0) return;
    const sd = cur(); if (!sd && S.tab === 'inicio') return;
    const host = $('#view-' + S.tab); if (!host) return;
    const l = sedeById(sd), all = canAll(), pro = S.tab === 'agenda' && S.proSel && S.proSel.length === 1 ? A.PRO(S.proSel[0]) : null;
    let h = '<nav class="emp-crumb" aria-label="Dónde estás" style="--sc:' + esc(l ? l.color : 'var(--accent)') + '">';
    h += all ? '<button class="ec-node" data-act="treeGo" data-s="">🏢 Empresa</button><span class="ec-sep">›</span>' : '';
    if (l) {
      h += all && sedes().length > 1 ? '<label class="ec-sel"><span class="emp-dot"></span><select data-chg="treeSede" aria-label="Consultorio">' + sedes().map(x => '<option value="' + esc(x.id) + '"' + (x.id === sd ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></label>' : '<span class="ec-node cur"><span class="emp-dot"></span> ' + esc(l.name) + '</span>';
      if (S.tab === 'agenda') { const ps = A.visPros(); if (ps.length > 1) h += '<span class="ec-sep">›</span><span class="ec-pros"><button class="ec-pro' + (!pro ? ' on' : '') + '" data-act="treePro" data-p="">Todos (' + ps.length + ')</button>' + ps.map(p => '<button class="ec-pro' + (pro && pro.id === p.id ? ' on' : '') + '" data-act="treePro" data-p="' + p.id + '" style="--pc:' + esc(p.color) + '">' + esc(p.short || p.name) + '</button>').join('') + '</span>'; else if (ps.length === 1) h += '<span class="ec-sep">›</span><span class="ec-node">' + esc(ps[0].name) + '</span>'; }
    } else h += '<span class="ec-node cur">Todos los consultorios</span>';
    h += '</nav>';
    host.insertAdjacentHTML('afterbegin', h);
  }
  A.acts.treeGo = el => { const id = el.getAttribute('data-s'); if (!id) go(null, 'inicio'); else go(id, 'agenda'); };
  A.chg.treeSede = el => go(el.value, S.tab === 'inicio' ? 'agenda' : S.tab);
  A.acts.treePro = el => { const id = el.getAttribute('data-p'); S.proSel = id ? [id] : null; A.refresh(); };

  /* ---------- Empresa › Consultorios: el árbol completo ---------- */
  A.empTreeHTML = () => {
    const L = sedes(), today = A.today();
    let h = '<section class="card tree"><h2>Organización</h2><p class="hint" style="margin-top:0">Tocá un consultorio para entrar a su agenda, o un profesional para ver solo la suya. Con «Mover» cambiás en qué consultorios atiende.</p>' +
      '<div class="tree-root"><button class="tree-node root" data-act="treeGo" data-s="">🏢 ' + esc(A.CLINIC) + '<small>Empresa · ' + L.length + ' consultorio' + (L.length === 1 ? '' : 's') + ' · ' + A.PROS.length + ' profesional' + (A.PROS.length === 1 ? '' : 'es') + '</small></button><ul class="tree-l1">';
    L.forEach(l => {
      const ps = prosOf(l.id), hoy = ps.filter(p => A.hoursFor(p, today).length).length;
      h += '<li><div class="tree-row"><button class="tree-node sede" data-act="treeGo" data-s="' + esc(l.id) + '" style="--sc:' + esc(l.color) + '"><span class="emp-dot"></span> ' + esc(l.name) + '<small>' + ps.length + ' profesional' + (ps.length === 1 ? '' : 'es') + (ps.length ? ' · ' + hoy + ' atiende' + (hoy === 1 ? '' : 'n') + ' hoy' : '') + '</small></button><button class="btn small" data-act="treeProNew" data-s="' + esc(l.id) + '">+ Profesional</button></div><ul class="tree-l2">' +
        (ps.length ? ps.map(p => '<li><button class="tree-node pro" data-act="treeGoPro" data-s="' + esc(l.id) + '" data-p="' + p.id + '" style="--pc:' + esc(p.color) + '"><i class="stdot" style="background:' + esc(p.color) + '"></i> ' + esc(p.name) + '<small>' + esc(p.spec || '') + (p.sedes && p.sedes[0] === l.id && p.sedes.length > 1 ? ' · principal' : '') + (A.hoursFor(p, today).length ? ' · hoy' : '') + '</small></button><button class="btn small ghost" data-act="treeProMove" data-p="' + p.id + '" data-s="' + esc(l.id) + '">Mover</button></li>').join('') : '<li class="tree-empty">Sin profesionales todavía</li>') + '</ul></li>';
    });
    return h + '</ul></div></section>';
  };
  A.acts.treeGoPro = el => go(el.getAttribute('data-s'), 'agenda', el.getAttribute('data-p'));

  const css = document.createElement('style');
  css.textContent = '.emp-crumb{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 10px;margin:0 0 10px;border:1px solid var(--line);border-left:5px solid var(--sc);border-radius:12px;background:var(--surface);font-size:14px}.emp-crumb ~ .emp-sedebar{display:none}' +
    '.ec-node{all:unset;cursor:pointer;font-weight:700;color:var(--accent);padding:4px 2px}.ec-node.cur{color:var(--ink);cursor:default;display:inline-flex;align-items:center;gap:6px}.ec-sep{color:var(--ink-2)}' +
    '.ec-sel{display:inline-flex;align-items:center;gap:6px;font-weight:700}.ec-sel select{font:700 14px inherit;border:1px solid var(--line);border-radius:8px;padding:4px 6px;background:var(--surface);color:var(--ink);min-height:34px;max-width:200px}' +
    '.ec-pros{display:flex;gap:4px;flex-wrap:wrap}.ec-pro{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:3px 10px;font:600 13px inherit;cursor:pointer}.ec-pro.on{background:color-mix(in srgb,var(--pc,var(--accent)) 16%,var(--surface));border-color:var(--pc,var(--accent))}' +
    '.emp-empty{border-top:5px solid var(--sc)}.emp-empty h2{display:flex;align-items:center;gap:8px}.tree-pick{list-style:none;margin:0;padding:0}.tree-pick li{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 0;border-top:1px solid var(--line)}.tree-pick li>span{flex:1;min-width:180px;display:flex;flex-direction:column}.tree-pick small{color:var(--ink-2);font-size:12.5px}' +
    '.tree-root{display:flex;flex-direction:column;gap:6px}.tree-node{all:unset;cursor:pointer;display:flex;flex-direction:column;gap:1px;padding:8px 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface);font-weight:700;font-size:15px}.tree-node small{font-weight:400;font-size:12.5px;color:var(--ink-2)}.tree-node:hover{border-color:var(--accent)}.tree-node.root{font-size:17px;border-width:2px}' +
    '.tree-node.sede{border-left:5px solid var(--sc);flex:1;display:block}.tree-node.sede small{display:block}.tree-node.pro{flex:1;display:block}.tree-node.pro small{display:block}' +
    '.tree-l1,.tree-l2{list-style:none;margin:0;padding:0 0 0 22px;border-left:2px solid var(--line);display:flex;flex-direction:column;gap:8px}.tree-l1{margin-left:16px;padding-top:6px}.tree-l2{margin:6px 0 4px 18px;gap:6px}' +
    '.tree-l1>li,.tree-l2>li{position:relative}.tree-l1>li::before,.tree-l2>li::before{content:"";position:absolute;left:-22px;top:20px;width:18px;border-top:2px solid var(--line)}' +
    '.tree-row,.tree-l2>li{display:flex;align-items:center;gap:8px}.tree-empty{color:var(--ink-2);font-size:13.5px;padding:4px 0}.tree-chk{display:flex;flex-direction:column;gap:6px}';
  document.head.appendChild(css);
})();
