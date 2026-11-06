/* ===== 1.29: Empresa › Centros › Consultorios › Odontólogos: consultorios de cada centro y rotación semanal ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns;
  const isEmp = () => !!(A.isEmp && A.isEmp());
  const sedes = () => (A.locs ? A.locs() : []);
  const sedeById = id => sedes().filter(l => l.id === id)[0] || null;
  const cur = () => (isEmp() && A.empSede ? A.empSede() : null);
  const prosOf = sd => A.PROS.filter(p => Array.isArray(p.sedes) && p.sedes.indexOf(sd) >= 0);
  const canAll = () => (A.empPermAll ? A.empPermAll() : true);
  const canEdit = () => canAll() && (!(A.memberNow && A.memberNow()) || (A.mbRole && A.mbRole() === 'admin'));
  const SH = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const ORDER = [1, 2, 3, 4, 5, 6, 0];
  const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const toMin = s => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
  const audit = t => { if (A.empAudit) A.empAudit(t); };

  /* ---------- datos (van en la configuración: solo el dueño o un administrador los cambian) ---------- */
  const rooms = l => (l && Array.isArray(l.rooms) ? l.rooms : []);
  const roomById = (l, id) => rooms(l).filter(r => r.id === id)[0] || null;
  const rotAll = () => (A.CFG.rot && typeof A.CFG.rot === 'object' ? A.CFG.rot : (A.CFG.rot = {}));
  const rotOf = sd => { const R = rotAll(); return Array.isArray(R[sd]) ? R[sd] : (R[sd] = []); };
  const weekStart = k => { const d = A.dow(k); return A.add(k, d === 0 ? -6 : 1 - d); };
  const dateIn = (ws, dow) => A.add(ws, dow === 0 ? 6 : dow - 1);
  const applies = (e, key) => {
    if (e.dow !== A.dow(key)) return false;
    if (!e.wk) return true;
    const odd = A.isoWeek(key) % 2 === 1;
    return e.wk === 'odd' ? odd : !odd;
  };
  /* horario efectivo de una asignación ese día: el que se cargó o el del profesional */
  const hrsOf = (e, key) => {
    if (e.h && e.h.length === 2) return [e.h];
    const p = A.PRO(e.pro); return p ? A.hoursFor(p, key).map(r => [r[0], r[1]]) : [];
  };
  const overlap = (a, b) => a.some(x => b.some(y => x[0] < y[1] && y[0] < x[1]));
  const hrsTxt = h => (h.length ? h.map(r => A.mm(r[0]) + '–' + A.mm(r[1])).join(', ') : 'no atiende ese día');
  const shortRoom = r => { if (!r) return ''; const m = /^consultorio\s*(\S+)$/i.exec(r.name || ''); return m ? 'C' + m[1] : (r.name || '').slice(0, 10); };
  /* asignaciones de ese día en el centro, con choques marcados */
  function dayPlan(sd, key) {
    const l = sedeById(sd), list = rotOf(sd).filter(e => applies(e, key) && A.PRO(e.pro) && roomById(l, e.room));
    const bad = {};
    list.forEach((e, i) => list.forEach((f, j) => { if (j > i && e.room === f.room && overlap(hrsOf(e, key), hrsOf(f, key))) { bad[e.id] = f.pro; bad[f.id] = e.pro; } }));
    return { list, bad };
  }
  A.rotClashes = (sd, key) => Object.keys(dayPlan(sd, key).bad).length;

  /* en qué consultorio cae un turno */
  A.roomOf = a => {
    if (!isEmp() || !a || a.type === 'block') return null;
    const sd = A.locOf(a), l = sedeById(sd); if (!l || !rooms(l).length) return null;
    if (a.room && roomById(l, a.room)) return roomById(l, a.room);
    const es = rotOf(sd).filter(e => e.pro === a.pro && applies(e, a.date) && roomById(l, e.room));
    if (!es.length) return null;
    const hit = es.filter(e => hrsOf(e, a.date).some(r => r[0] <= a.start && a.start < r[1]))[0] || es[0];
    return roomById(l, hit.room);
  };
  /* profesionales que están en un consultorio ese día */
  const prosInRoom = (sd, rid, key) => { const out = []; dayPlan(sd, key).list.forEach(e => { if (e.room === rid && out.indexOf(e.pro) < 0) out.push(e.pro); }); return out; };

  /* ---------- el consultorio en cada turno de la agenda y en la ventanita del turno ---------- */
  const covPrev = A.blkCov;
  A.blkCov = function (a, p) {
    const r = A.roomOf(a);
    return (covPrev ? covPrev.apply(this, arguments) : '') + (r ? ' <span class="broom" title="' + esc(r.name) + '">' + esc(shortRoom(r)) + '</span>' : '');
  };
  new MutationObserver(() => {
    const tp = document.getElementById('tpop'); if (!tp || tp.querySelector('.tp-room')) return;
    const n = tp.querySelector('[data-act="tpFicha"][data-id]'), a = n && A.apptById(n.getAttribute('data-id')); if (!a) return;
    const r = A.roomOf(a), l = sedeById(A.locOf(a)); if (!r) return;
    const hd = tp.querySelector('.tp-head'); if (hd) hd.insertAdjacentHTML('afterend', '<div class="tp-room"><span aria-hidden="true">🚪</span> ' + esc(r.name) + (l ? ' · ' + esc(l.name) : '') + '</div>');
  }).observe(document.body, { childList: true });

  /* ---------- agenda: elegir un consultorio muestra a quienes trabajan ahí ese día ---------- */
  const arPrev = A.afterRefresh;
  A.afterRefresh = () => {
    if (arPrev) arPrev();
    if (!isEmp() || S.tab !== 'agenda') return;
    const sd = cur(), l = sedeById(sd), nav = document.querySelector('#view-agenda .emp-crumb'); if (!l || !nav || !rooms(l).length) return;
    const key = S.date || A.today();
    if (S._roomSel && !roomById(l, S._roomSel)) S._roomSel = null;
    let h = '<span class="ec-sep">›</span><span class="ec-rooms" role="group" aria-label="Consultorio"><button class="ec-room' + (!S._roomSel ? ' on' : '') + '" data-act="agRoom" data-r="">Todos los consultorios</button>';
    rooms(l).forEach(r => { const n = prosInRoom(sd, r.id, key).length; h += '<button class="ec-room' + (S._roomSel === r.id ? ' on' : '') + '" data-act="agRoom" data-r="' + esc(r.id) + '" title="' + n + ' profesional' + (n === 1 ? '' : 'es') + ' ese día">🚪 ' + esc(r.name) + (n ? ' <small>' + n + '</small>' : '') + '</button>'; });
    nav.insertAdjacentHTML('beforeend', h + '</span>');
  };
  A.acts.agRoom = el => {
    const r = el.getAttribute('data-r'), sd = cur();
    if (!r) { S._roomSel = null; S.proSel = null; A.refresh(); return; }
    const ps = prosInRoom(sd, r, S.date || A.today());
    if (!ps.length) { A.toast('Nadie tiene asignado ese consultorio ese día. Se arma en Empresa › Centros.'); return; }
    S._roomSel = r; S.proSel = ps; A.refresh();
  };
  /* al cambiar de día con un consultorio elegido, se vuelven a buscar sus profesionales */
  const agPrev = A.render.agenda;
  A.render.agenda = function () {
    if (isEmp() && S._roomSel && cur()) {
      if (S._roomDate !== S.date) { const ps = prosInRoom(cur(), S._roomSel, S.date); S.proSel = ps.length ? ps : null; if (!ps.length) S._roomSel = null; }
      S._roomDate = S.date;
    }
    return agPrev.apply(this, arguments);
  };
  const tpPrev = A.acts.treePro;
  if (tpPrev) A.acts.treePro = function () { S._roomSel = null; return tpPrev.apply(this, arguments); };

  /* ---------- Empresa › Centros: el árbol de tres niveles ---------- */
  const treePrev = A.empTreeHTML;
  A.empTreeHTML = () => {
    const L = sedes(); if (!isEmp()) return treePrev ? treePrev() : '';
    const today = A.today(), ws = weekStart(today);
    const count = L.reduce((n, l) => n + rooms(l).length, 0);
    let h = '<section class="card tree"><h2>Organización</h2><p class="hint" style="margin-top:0">Empresa › centros › consultorios › odontólogos. Tocá un centro para entrar a su agenda, un consultorio para ver a quienes trabajan hoy en él, o un profesional para ver solo la suya.</p>' +
      '<div class="tree-root"><button class="tree-node root" data-act="treeGo" data-s="">🏢 ' + esc(A.CLINIC) + '<small>Empresa · ' + L.length + ' centro' + (L.length === 1 ? '' : 's') + (count ? ' · ' + count + ' consultorio' + (count === 1 ? '' : 's') : '') + ' · ' + A.PROS.length + ' profesional' + (A.PROS.length === 1 ? '' : 'es') + '</small></button><ul class="tree-l1">';
    L.forEach(l => {
      const ps = prosOf(l.id), hoy = ps.filter(p => A.hoursFor(p, today).length).length, R = rooms(l);
      h += '<li><div class="tree-row"><button class="tree-node sede" data-act="treeGo" data-s="' + esc(l.id) + '" style="--sc:' + esc(l.color) + '"><span class="emp-dot"></span> ' + esc(l.name) + '<small>' + (R.length ? R.length + ' consultorio' + (R.length === 1 ? '' : 's') + ' · ' : '') + ps.length + ' profesional' + (ps.length === 1 ? '' : 'es') + (ps.length ? ' · ' + hoy + ' atiende' + (hoy === 1 ? '' : 'n') + ' hoy' : '') + '</small></button>' +
        (canEdit() ? '<button class="btn small" data-act="rotPlan" data-s="' + esc(l.id) + '">' + (R.length ? 'Rotación' : '+ Consultorios') + '</button>' : '') + '<button class="btn small" data-act="treeProNew" data-s="' + esc(l.id) + '">+ Profesional</button></div><ul class="tree-l2">';
      if (!R.length) {
        h += ps.length ? ps.map(p => proNode(l, p, today, '')).join('') : '<li class="tree-empty">Sin profesionales todavía</li>';
      } else {
        const used = {};
        R.forEach(r => {
          const wk = {}; rotOf(l.id).forEach(e => { if (e.room === r.id && A.PRO(e.pro)) { (wk[e.pro] = wk[e.pro] || []).push(e); used[e.pro] = 1; } });
          const ids = Object.keys(wk), nowIn = prosInRoom(l.id, r.id, today);
          h += '<li><div class="tree-row"><button class="tree-node room" data-act="treeRoom" data-s="' + esc(l.id) + '" data-r="' + esc(r.id) + '"><span aria-hidden="true">🚪</span> ' + esc(r.name) + '<small>' + ids.length + ' odontólogo' + (ids.length === 1 ? '' : 's') + ' en la semana' + (nowIn.length ? ' · hoy: ' + esc(nowIn.map(id => A.PRO(id).short || A.PRO(id).name).join(', ')) : ' · hoy libre') + '</small></button></div><ul class="tree-l3">' +
            (ids.length ? ids.map(id => proNode(l, A.PRO(id), today, wk[id].map(e => e.dow).filter((d, i, a) => a.indexOf(d) === i).sort((x, y) => ORDER.indexOf(x) - ORDER.indexOf(y)).map(d => SH[d]).join(', '))).join('') : '<li class="tree-empty">Nadie asignado todavía</li>') + '</ul></li>';
        });
        const free = ps.filter(p => !used[p.id]);
        if (free.length) h += '<li><div class="tree-row"><span class="tree-node room none">Sin consultorio fijo<small>' + free.length + ' profesional' + (free.length === 1 ? '' : 'es') + ' · asignalos en «Rotación»</small></span></div><ul class="tree-l3">' + free.map(p => proNode(l, p, today, '')).join('') + '</ul></li>';
      }
      h += '</ul></li>';
    });
    h += '</ul></div></section>';
    return h + (canEdit() ? planHTML() : '');
  };
  function proNode(l, p, today, days) {
    return '<li><button class="tree-node pro" data-act="treeGoPro" data-s="' + esc(l.id) + '" data-p="' + p.id + '" style="--pc:' + esc(p.color) + '"><i class="stdot" style="background:' + esc(p.color) + '"></i> ' + esc(p.name) + '<small>' + esc([p.spec || '', days, p.sedes && p.sedes[0] === l.id && p.sedes.length > 1 ? 'principal' : '', A.hoursFor(p, today).length ? 'hoy' : ''].filter(Boolean).join(' · ')) + '</small></button><button class="btn small ghost" data-act="treeProMove" data-p="' + p.id + '" data-s="' + esc(l.id) + '">Mover</button></li>';
  }
  A.acts.treeRoom = el => {
    const sd = el.getAttribute('data-s'), r = el.getAttribute('data-r'), ps = prosInRoom(sd, r, A.today());
    if (A.empSetSede) A.empSetSede(sd);
    S.date = A.today(); S.view = 'dia'; S.tab = 'agenda'; S._roomSel = ps.length ? r : null; S._roomDate = S.date; S.proSel = ps.length ? ps : null;
    if (!ps.length) A.toast('Hoy nadie tiene asignado ese consultorio.');
    A.refresh(); window.scrollTo(0, 0);
  };

  /* ---------- planilla de rotación ---------- */
  A.acts.rotPlan = el => { S._rotLoc = el.getAttribute('data-s'); const c = $('#rotPlan'); if (A.refresh) A.refresh(); setTimeout(() => { const x = $('#rotPlan'); if (x) x.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 30); return c; };
  function planHTML() {
    const L = sedes(); if (!L.length) return '';
    if (!sedeById(S._rotLoc)) S._rotLoc = (L.filter(l => rooms(l).length)[0] || L[0]).id;
    const sd = S._rotLoc, l = sedeById(sd), R = rooms(l);
    if (!S._rotWs) S._rotWs = weekStart(A.today());
    const ws = S._rotWs;
    const days = ORDER.filter(d => A.CFG.days.indexOf(d) >= 0 || prosOf(sd).some(p => A.hoursFor(p, dateIn(ws, d)).length));
    if (days.indexOf(S._rotDay) < 0) { const td = A.dow(A.today()); S._rotDay = days.indexOf(td) >= 0 ? td : days[0]; }
    const dsel = S._rotDay, key = dateIn(ws, dsel);
    let h = '<section class="card rot" id="rotPlan" style="--sc:' + esc(l.color) + '"><div class="rot-top"><h2>Consultorios y rotación</h2>' +
      (L.length > 1 ? '<label class="ec-sel"><span class="emp-dot"></span><select data-chg="rotLoc" aria-label="Centro">' + L.map(x => '<option value="' + esc(x.id) + '"' + (x.id === sd ? ' selected' : '') + '>' + esc(x.name) + '</option>').join('') + '</select></label>' : '<b>' + esc(l.name) + '</b>') + '</div>';
    if (!R.length) {
      return h + '<p>Cargá cuántos consultorios (sillones) tiene <b>' + esc(l.name) + '</b>. Después repartís a los odontólogos en cada uno, día por día.</p><div class="row-btns">' + [1, 2, 3, 4, 5, 6].map(n => '<button class="btn' + (n === 3 ? ' primary' : '') + '" data-act="rotMake" data-n="' + n + '">' + n + ' consultorio' + (n === 1 ? '' : 's') + '</button>').join('') + '</div></section>';
    }
    h += '<div class="rot-rooms">' + R.map(r => '<span class="rot-rchip">🚪 ' + esc(r.name) + '</span>').join('') + '<button class="btn small ghost" data-act="rotRooms">Editar consultorios</button></div>';
    h += '<div class="rot-wk"><button class="btn small" data-act="rotWk" data-d="-7" aria-label="Semana anterior">‹</button><span>Semana del ' + A.fmtDMY(ws) + '</span><button class="btn small" data-act="rotWk" data-d="7" aria-label="Semana siguiente">›</button>' + (ws !== weekStart(A.today()) ? '<button class="btn small ghost" data-act="rotWk" data-d="0">Esta semana</button>' : '') + '</div>';
    h += '<div class="rot-days" role="tablist">' + days.map(d => { const k = dateIn(ws, d), c = A.rotClashes(sd, k), miss = unassigned(sd, k).length; return '<button class="rot-day' + (d === dsel ? ' on' : '') + (c ? ' bad' : '') + '" data-act="rotDay" data-d="' + d + '" role="tab" aria-selected="' + (d === dsel) + '"><b>' + SH[d] + '</b><small>' + A.fmtDMY(k).slice(0, 5) + '</small>' + (c ? '<i title="Hay choques">!</i>' : miss ? '<i class="miss" title="Profesionales sin consultorio">' + miss + '</i>' : '') + '</button>'; }).join('') + '</div>';
    const P = dayPlan(sd, key);
    h += '<div class="rot-grid">' + R.map(r => {
      const es = P.list.filter(e => e.room === r.id).sort((a, b) => ((hrsOf(a, key)[0] || [0])[0]) - ((hrsOf(b, key)[0] || [0])[0]));
      return '<div class="rot-room"><div class="rr-h"><b>🚪 ' + esc(r.name) + '</b><button class="btn small" data-act="rotAdd" data-r="' + esc(r.id) + '">+ Asignar</button></div>' +
        (es.length ? es.map(e => { const p = A.PRO(e.pro), hh = hrsOf(e, key); return '<button class="rot-e' + (P.bad[e.id] ? ' bad' : '') + '" data-act="rotEdit" data-id="' + esc(e.id) + '" style="--pc:' + esc(p.color) + '"><i class="stdot" style="background:' + esc(p.color) + '"></i><span><b>' + esc(p.name) + '</b><small>' + esc(hrsTxt(hh)) + (e.wk ? ' · semana por medio' : '') + (P.bad[e.id] ? ' · se pisa con ' + esc((A.PRO(P.bad[e.id]) || {}).name || '') : '') + '</small></span></button>'; }).join('') : '<div class="rot-free">Libre todo el día</div>') + '</div>';
    }).join('') + '</div>';
    const miss = unassigned(sd, key);
    if (miss.length) h += '<div class="rot-miss"><b>Atienden ese día y no tienen consultorio:</b>' + miss.map(p => '<button class="ec-pro" data-act="rotAdd" data-p="' + p.id + '" style="--pc:' + esc(p.color) + '">' + esc(p.name) + ' <small>' + esc(hrsTxt(A.hoursFor(p, key))) + '</small></button>').join('') + '</div>';
    h += '<div class="row-btns"><button class="btn" data-act="rotAuto">Repartir solos a los que faltan (toda la semana)</button><button class="btn ghost" data-act="rotCopy">Copiar ' + esc(A.DOW[dsel]) + ' a otro día</button></div>';
    /* resumen de la semana (en la PC) */
    h += '<div class="rot-sum"><table class="tbl"><thead><tr><th>Consultorio</th>' + days.map(d => '<th>' + SH[d] + '</th>').join('') + '</tr></thead><tbody>' + R.map(r => '<tr><td><b>' + esc(r.name) + '</b></td>' + days.map(d => { const k = dateIn(ws, d), Q = dayPlan(sd, k); const es = Q.list.filter(e => e.room === r.id); return '<td' + (es.some(e => Q.bad[e.id]) ? ' class="bad"' : '') + '>' + (es.length ? es.map(e => { const p = A.PRO(e.pro); return '<span class="rs-p" style="--pc:' + esc(p.color) + '">' + esc(p.short || p.name.split(' ').slice(-1)[0]) + ' <small>' + esc(hrsOf(e, k).map(x => A.mm(x[0]).replace(':00', '') + '–' + A.mm(x[1]).replace(':00', '')).join(' ')) + '</small></span>'; }).join('') : '<span class="hint">—</span>') + '</td>'; }).join('') + '</tr>').join('') + '</tbody></table></div>';
    return h + '</section>';
  }
  const unassigned = (sd, key) => { const P = dayPlan(sd, key); return prosOf(sd).filter(p => A.hoursFor(p, key).length && !P.list.some(e => e.pro === p.id)); };
  const saveR = (msg, t) => { A.save(); A.refresh(); if (msg) A.toast(msg); if (t) audit(t); };

  A.chg.rotLoc = el => { S._rotLoc = el.value; A.refresh(); };
  A.acts.rotDay = el => { S._rotDay = +el.getAttribute('data-d'); A.refresh(); };
  A.acts.rotWk = el => { const d = +el.getAttribute('data-d'); S._rotWs = d ? A.add(S._rotWs || weekStart(A.today()), d) : weekStart(A.today()); A.refresh(); };
  A.acts.rotMake = el => {
    const l = sedeById(S._rotLoc), n = +el.getAttribute('data-n'); if (!l || !canEdit()) return;
    l.rooms = []; for (let i = 1; i <= n; i++) l.rooms.push({ id: uid('r'), name: 'Consultorio ' + i });
    saveR(n + ' consultorio' + (n === 1 ? '' : 's') + ' en ' + l.name + '. Ahora asigná a los odontólogos.', l.name + ': ' + n + ' consultorios.');
  };

  /* editar nombres de consultorios */
  A.acts.rotRooms = () => { const l = sedeById(S._rotLoc); S.modal = { type: 'rotRooms', s: l.id, list: rooms(l).map(r => ({ id: r.id, name: r.name })) }; A.renderModal(); };
  MF.rotRooms = m => {
    const l = sedeById(m.s);
    return A.modalShell('Consultorios de ' + l.name, '<p class="hint" style="margin-top:0">Ponele el nombre que usen en el centro (Consultorio 1, Box A, Sillón del fondo…).</p><div class="rot-rl">' +
      m.list.map((r, i) => '<div class="rot-rr"><input class="inp" data-ri="' + i + '" value="' + esc(r.name) + '" aria-label="Nombre del consultorio ' + (i + 1) + '"><button class="btn small ghost" data-act="rotRoomDel" data-i="' + i + '" aria-label="Quitar">✕</button></div>').join('') + '</div>' +
      '<button class="btn small" data-act="rotRoomAdd">+ Agregar consultorio</button><div class="hint bad" id="rrMsg"></div>',
      '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="rotRoomsGo">Guardar</button>');
  };
  const rrSync = () => { const m = S.modal; A.$$('[data-ri]').forEach(i => { const r = m.list[+i.getAttribute('data-ri')]; if (r) r.name = i.value; }); };
  A.acts.rotRoomAdd = () => { rrSync(); const m = S.modal; m.list.push({ id: uid('r'), name: 'Consultorio ' + (m.list.length + 1) }); A.renderModal(); };
  A.acts.rotRoomDel = el => {
    rrSync(); const m = S.modal, i = +el.getAttribute('data-i'), r = m.list[i];
    const n = rotOf(m.s).filter(e => e.room === r.id).length;
    if (n && !m.delOk) { m.delOk = r.id; $('#rrMsg').textContent = r.name + ' tiene ' + n + ' asignaci' + (n === 1 ? 'ón' : 'ones') + '. Tocá ✕ otra vez para quitarlo igual (esas asignaciones se borran).'; return; }
    m.list.splice(i, 1); m.delOk = null; A.renderModal();
  };
  A.acts.rotRoomsGo = () => {
    rrSync(); const m = S.modal, l = sedeById(m.s);
    if (m.list.some(r => !r.name.trim())) { $('#rrMsg').textContent = 'Cada consultorio necesita un nombre.'; return; }
    l.rooms = m.list.map(r => ({ id: r.id, name: r.name.trim() }));
    const ids = l.rooms.map(r => r.id); rotAll()[m.s] = rotOf(m.s).filter(e => ids.indexOf(e.room) >= 0);
    S.modal = null; A.renderModal(); saveR('Consultorios guardados.', l.name + ': consultorios ' + l.rooms.map(r => r.name).join(', ') + '.');
  };

  /* asignar un odontólogo a un consultorio un día */
  A.acts.rotAdd = el => {
    const sd = S._rotLoc, l = sedeById(sd), ps = prosOf(sd); if (!ps.length) { A.toast('Primero sumá profesionales a este centro.'); return; }
    S.modal = { type: 'rotE', s: sd, e: { id: '', room: el.getAttribute('data-r') || rooms(l)[0].id, pro: el.getAttribute('data-p') || (unassigned(sd, dateIn(S._rotWs, S._rotDay))[0] || ps[0]).id, dow: S._rotDay, h: null, wk: null } };
    A.renderModal();
  };
  A.acts.rotEdit = el => { const e = rotOf(S._rotLoc).filter(x => x.id === el.getAttribute('data-id'))[0]; if (!e) return; S.modal = { type: 'rotE', s: S._rotLoc, e: JSON.parse(JSON.stringify(e)) }; A.renderModal(); };
  MF.rotE = m => {
    const l = sedeById(m.s), e = m.e, key = dateIn(S._rotWs || weekStart(A.today()), e.dow), p = A.PRO(e.pro) || prosOf(m.s)[0], ph = A.hoursFor(p, key);
    const opt = (v, t, on) => '<option value="' + esc(v) + '"' + (on ? ' selected' : '') + '>' + esc(t) + '</option>';
    const thisOdd = A.isoWeek(key) % 2 === 1;
    return A.modalShell(e.id ? 'Asignación' : 'Asignar consultorio',
      '<div class="row2"><div class="field"><label for="reP">Odontólogo</label><select id="reP" class="inp" data-chg="reField" data-k="pro">' + prosOf(m.s).map(x => opt(x.id, x.name, x.id === e.pro)).join('') + '</select></div>' +
      '<div class="field"><label for="reR">Consultorio</label><select id="reR" class="inp" data-chg="reField" data-k="room">' + rooms(l).map(r => opt(r.id, r.name, r.id === e.room)).join('') + '</select></div></div>' +
      '<div class="row2"><div class="field"><label for="reD">Día</label><select id="reD" class="inp" data-chg="reField" data-k="dow">' + ORDER.map(d => opt(d, A.DOW[d].charAt(0).toUpperCase() + A.DOW[d].slice(1), d === e.dow)).join('') + '</select></div>' +
      '<div class="field"><label for="reW">Semanas</label><select id="reW" class="inp" data-chg="reField" data-k="wk">' + opt('', 'Todas las semanas', !e.wk) + opt(thisOdd ? 'odd' : 'even', 'Semana por medio (empieza esta)', e.wk === (thisOdd ? 'odd' : 'even')) + opt(thisOdd ? 'even' : 'odd', 'Semana por medio (empieza la próxima)', e.wk === (thisOdd ? 'even' : 'odd')) + '</select></div></div>' +
      '<div class="field"><span class="lbl">Horario en ese consultorio</span><label class="chk"><input type="radio" name="reH" data-chg="reHmode" value="all"' + (!e.h ? ' checked' : '') + '> <span>Todo su horario de ese día (' + esc(hrsTxt(ph)) + ')</span></label>' +
      '<label class="chk"><input type="radio" name="reH" data-chg="reHmode" value="part"' + (e.h ? ' checked' : '') + '> <span>Solo una parte</span></label>' +
      (e.h ? '<div class="row2"><div class="field"><label for="reF">Desde</label><input id="reF" class="inp" type="time" step="900" value="' + A.mm(e.h[0]) + '"></div><div class="field"><label for="reT">Hasta</label><input id="reT" class="inp" type="time" step="900" value="' + A.mm(e.h[1]) + '"></div></div>' : '') + '</div>' +
      (!ph.length && !e.h ? '<p class="hint">Ojo: ' + esc(p.name) + ' no tiene horario cargado ese día. Elegí «Solo una parte» para poner la hora, o cargale el horario en sus ajustes.</p>' : '') +
      '<div class="hint bad" id="reMsg">' + (m.warn ? esc(m.warn) : '') + '</div>',
      (e.id ? '<button class="btn danger" data-act="rotEDel">Quitar</button>' : '') + '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="rotESave">' + (m.warn ? 'Guardar igual' : 'Guardar') + '</button>');
  };
  const reRead = () => { const m = S.modal, e = m.e; if (e.h) { const f = toMin(($('#reF') || {}).value), t = toMin(($('#reT') || {}).value); if (f != null && t != null) e.h = [f, t]; } };
  A.chg.reField = el => { reRead(); const m = S.modal, k = el.getAttribute('data-k'); m.e[k] = k === 'dow' ? +el.value : (el.value || null); m.warn = null; A.renderModal(); };
  A.chg.reHmode = el => {
    reRead(); const m = S.modal, e = m.e;
    if (el.value === 'all') e.h = null;
    else { const ph = A.hoursFor(A.PRO(e.pro), dateIn(S._rotWs || weekStart(A.today()), e.dow)); e.h = ph.length ? [ph[0][0], ph[0][1]] : [9 * 60, 13 * 60]; }
    m.warn = null; A.renderModal();
  };
  A.acts.rotESave = () => {
    reRead(); const m = S.modal, e = m.e, l = sedeById(m.s), p = A.PRO(e.pro);
    if (e.h && e.h[1] <= e.h[0]) { $('#reMsg').textContent = 'La hora de fin tiene que ser después de la de inicio.'; return; }
    const key = dateIn(S._rotWs || weekStart(A.today()), e.dow);
    const k2 = [key, A.add(key, 7)]; /* revisa las dos paridades */
    const clash = rotOf(m.s).filter(f => f.id !== e.id && f.room === e.room && k2.some(k => applies(f, k) && applies(e, k) && overlap(hrsOf(f, k), hrsOf(e, k))))[0];
    const dup = rotOf(m.s).filter(f => f.id !== e.id && f.pro === e.pro && f.room !== e.room && k2.some(k => applies(f, k) && applies(e, k) && overlap(hrsOf(f, k), hrsOf(e, k))))[0];
    if ((clash || dup) && !m.warn) {
      m.warn = clash ? 'En ese horario ' + (roomById(l, e.room) || {}).name + ' ya lo usa ' + A.PRO(clash.pro).name + '.' : p.name + ' ya está en ' + (roomById(l, dup.room) || {}).name + ' a esa hora.';
      A.renderModal(); return;
    }
    const L = rotOf(m.s);
    if (!e.id) { e.id = uid('a'); L.push(e); } else { const i = L.findIndex(x => x.id === e.id); if (i >= 0) L[i] = e; else L.push(e); }
    S._rotDay = e.dow; S.modal = null; A.renderModal();
    saveR(p.name + ' en ' + (roomById(l, e.room) || {}).name + ' los ' + A.DOW[e.dow] + '.', l.name + ': ' + p.name + ' en ' + (roomById(l, e.room) || {}).name + ' los ' + A.DOW[e.dow] + '.');
  };
  A.acts.rotEDel = () => {
    const m = S.modal, L = rotOf(m.s), i = L.findIndex(x => x.id === m.e.id), p = A.PRO(m.e.pro); if (i >= 0) L.splice(i, 1);
    S.modal = null; A.renderModal(); saveR('Asignación quitada.', (sedeById(m.s) || {}).name + ': se quitó a ' + (p ? p.name : '') + ' de los ' + A.DOW[m.e.dow] + '.');
  };

  /* repartir solos: a cada uno que atiende y no tiene consultorio, el primero que esté libre en su horario */
  A.acts.rotAuto = () => {
    const sd = S._rotLoc, l = sedeById(sd), ws = S._rotWs || weekStart(A.today()); let n = 0, left = 0;
    ORDER.forEach(d => {
      const key = dateIn(ws, d);
      unassigned(sd, key).forEach(p => {
        const ph = A.hoursFor(p, key).map(r => [r[0], r[1]]);
        const r = rooms(l).filter(rm => !dayPlan(sd, key).list.some(e => e.room === rm.id && overlap(hrsOf(e, key), ph)))[0];
        if (r) { rotOf(sd).push({ id: uid('a'), room: r.id, pro: p.id, dow: d, h: null, wk: null }); n++; } else left++;
      });
    });
    saveR(n ? n + ' asignaci' + (n === 1 ? 'ón' : 'ones') + ' nueva' + (n === 1 ? '' : 's') + (left ? '. ' + left + ' no entra' + (left === 1 ? '' : 'n') + ': no queda consultorio libre en su horario.' : '.') : left ? 'No queda consultorio libre para ' + left + '.' : 'Ya están todos asignados.', n ? l.name + ': rotación repartida (' + n + ').' : null);
  };
  /* copiar un día a otro */
  A.acts.rotCopy = () => { S.modal = { type: 'rotCopy', s: S._rotLoc, from: S._rotDay }; A.renderModal(); };
  MF.rotCopy = m => A.modalShell('Copiar ' + A.DOW[m.from], '<p>Las asignaciones de los ' + esc(A.DOW[m.from]) + ' se copian a los días que marques (reemplazan lo que haya esos días).</p><div class="tree-chk">' + ORDER.filter(d => d !== m.from).map(d => '<label class="chk"><input type="checkbox" data-cd="' + d + '"> <span>' + esc(A.DOW[d].charAt(0).toUpperCase() + A.DOW[d].slice(1)) + '</span></label>').join('') + '</div><div class="hint bad" id="rcMsg"></div>',
    '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="rotCopyGo">Copiar</button>');
  A.acts.rotCopyGo = () => {
    const m = S.modal, ds = A.$$('[data-cd]').filter(c => c.checked).map(c => +c.getAttribute('data-cd'));
    if (!ds.length) { $('#rcMsg').textContent = 'Marcá al menos un día.'; return; }
    const R = rotAll(), src = rotOf(m.s).filter(e => e.dow === m.from);
    R[m.s] = rotOf(m.s).filter(e => ds.indexOf(e.dow) < 0).concat(...ds.map(d => src.map(e => Object.assign({}, e, { id: uid('a'), dow: d }))));
    S.modal = null; A.renderModal(); saveR('Copiado a ' + ds.length + ' día' + (ds.length === 1 ? '' : 's') + '.', (sedeById(m.s) || {}).name + ': rotación de los ' + A.DOW[m.from] + ' copiada.');
  };

  const css = document.createElement('style');
  css.textContent = '.blk .broom{display:inline-block;font-size:10.5px;font-weight:800;padding:0 5px;border-radius:6px;background:rgba(0,0,0,.08);margin-left:3px;letter-spacing:.02em;vertical-align:1px}' +
    '.tp-room{font-size:13.5px;font-weight:700;padding:4px 8px;border-radius:8px;background:color-mix(in srgb,var(--accent) 10%,var(--surface));align-self:flex-start}' +
    '.ec-rooms{display:flex;gap:4px;flex-wrap:wrap}.ec-room{border:1px dashed var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:3px 10px;font:600 13px inherit;cursor:pointer}.ec-room.on{border-style:solid;border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--surface))}.ec-room small{opacity:.7}' +
    '.tree-l3{list-style:none;margin:6px 0 4px 18px;padding:0 0 0 22px;border-left:2px solid var(--line);display:flex;flex-direction:column;gap:6px}.tree-l3>li{position:relative;display:flex;align-items:center;gap:8px}.tree-l3>li::before{content:"";position:absolute;left:-22px;top:20px;width:18px;border-top:2px solid var(--line)}' +
    '.tree-l2>li{flex-wrap:wrap}.tree-l2>li>.tree-row{flex:1 1 100%}.tree-l2>li>.tree-l3{flex:1 1 100%}.tree-node.room{flex:1;display:block;background:color-mix(in srgb,var(--accent) 5%,var(--surface))}.tree-node.room small{display:block}.tree-node.room.none{cursor:default;border-style:dashed}' +
    '.rot{border-top:5px solid var(--sc)}.rot-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:space-between}.rot-top h2{margin:0}' +
    '.rot-rooms{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:10px 0}.rot-rchip{padding:4px 10px;border-radius:999px;border:1px solid var(--line);font-weight:600;font-size:13.5px}' +
    '.rot-wk{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0;font-weight:700}' +
    '.rot-days{display:flex;gap:6px;overflow-x:auto;padding:4px 0 8px;scrollbar-width:thin}.rot-day{position:relative;flex:0 0 auto;min-width:58px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:12px;padding:6px 8px;display:flex;flex-direction:column;align-items:center;cursor:pointer;font:inherit}.rot-day small{font-size:11.5px;color:var(--ink-2)}.rot-day.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,var(--surface))}' +
    '.rot-day i{position:absolute;top:-6px;right:-6px;font-style:normal;font-size:11px;font-weight:800;background:#c0392b;color:#fff;border-radius:999px;min-width:18px;height:18px;display:grid;place-items:center;padding:0 4px}.rot-day i.miss{background:#d68910}.rot-day.bad{border-color:#c0392b}' +
    '.rot-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin:6px 0 10px}.rot-room{border:1px solid var(--line);border-radius:12px;padding:8px;display:flex;flex-direction:column;gap:6px;min-width:0}.rr-h{display:flex;align-items:center;justify-content:space-between;gap:6px}' +
    '.rot-e{all:unset;cursor:pointer;display:flex;gap:8px;align-items:flex-start;padding:6px 8px;border-radius:10px;border:1px solid var(--line);border-left:4px solid var(--pc);background:var(--surface)}.rot-e span{display:flex;flex-direction:column;min-width:0}.rot-e small{color:var(--ink-2);font-size:12.5px}.rot-e .stdot{margin-top:5px}.rot-e.bad{border-color:#c0392b;background:color-mix(in srgb,#c0392b 8%,var(--surface))}.rot-e.bad small{color:#a93226}' +
    '.rot-free{color:var(--ink-2);font-size:13.5px;padding:6px 2px}.rot-miss{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:8px;border-radius:10px;background:color-mix(in srgb,#d68910 10%,var(--surface));margin-bottom:8px}.rot-miss b{flex:1 1 100%;font-size:13.5px}' +
    '.rot-sum{display:none;margin-top:12px;overflow-x:auto}.rot-sum td{vertical-align:top;font-size:12.5px}.rot-sum td.bad{background:color-mix(in srgb,#c0392b 10%,transparent)}.rs-p{display:block;border-left:3px solid var(--pc);padding-left:5px;margin:2px 0;white-space:nowrap}.rs-p small{color:var(--ink-2)}' +
    '@media (min-width: 1000px){.rot-sum{display:block}}@media (max-width: 600px){.tree-row{flex-wrap:wrap}.tree-row>.tree-node{flex:1 1 100%}.tree-row>.btn{flex:1 1 40%}}' +
    '.rot-rl{display:flex;flex-direction:column;gap:6px;margin-bottom:8px}.rot-rr{display:flex;gap:6px;align-items:center}.rot-rr .inp{flex:1}';
  document.head.appendChild(css);
})();
