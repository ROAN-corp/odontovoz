/* ===== 1.19: modo Empresa: varios consultorios con su personal, su caja y su agenda; inicio del dueño, estadísticas, liquidaciones, metas, stock, permisos con PIN y registro ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S, esc = A.esc, MF = A.modalFns, CL = A.cloud;
  const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }, set: (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const real = () => !!(CL && CL.session && !A.DEMO);
  const isEmp = () => !!(S.setup && S.setup.type === 'empresa');
  A.isEmp = isEmp;
  const pad = n => String(n).padStart(2, '0');
  const today = () => A.today();
  const monthOf = d => d.slice(0, 7);
  const curMonth = () => monthOf(today());
  const addMonth = (m, n) => { const [y, mo] = m.split('-').map(Number), d = new Date(y, mo - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); };
  const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
  const monthName = m => cap(A.MON[parseInt(m.slice(5), 10) - 1]) + ' ' + m.slice(0, 4);
  const monthShort = m => cap(A.MON[parseInt(m.slice(5), 10) - 1].slice(0, 3));
  const daysIn = m => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo, 0).getDate(); };
  const money = n => A.money(n);
  const kmoney = n => { const a = Math.abs(n); return (n < 0 ? '−' : '') + (a >= 1e6 ? '$' + (Math.round(a / 1e5) / 10).toString().replace('.', ',') + ' M' : a >= 1e4 ? '$' + Math.round(a / 1e3) + ' mil' : money(a)); };
  const num = v => { const n = parseInt(String(v || '').replace(/[^\d-]/g, ''), 10); return isNaN(n) ? 0 : n; };
  const COLORS = ['#0b6b6f', '#7b4fc4', '#c2571a', '#2f6fd1', '#a3326b'];
  const ROLES = [['dueno', 'Dueño'], ['admin', 'Administración'], ['recepcion', 'Recepción'], ['profesional', 'Profesional'], ['asistente', 'Asistente'], ['otro', 'Otro (limpieza, mantenimiento…)']];
  const RN = {}; ROLES.forEach(r => { RN[r[0]] = r[1]; });

  /* =====================================================================
     DATOS PROPIOS DEL MODO EMPRESA
       staff        personal y personas que entran con PIN (lo ven todos los equipos de la cuenta)
       empo         del dueño: sueldos, metas (el servidor no se lo deja leer a los equipos de un centro)
       caja:<sede>  egresos y cierres de cada centro
       stock        insumos de cada centro
       audit:<b>    registro de lo que se hace (uno por centro y uno del dueño)
     ===================================================================== */
  const EKEY = () => (A.KEY || 'odontovoz') + '.emp';
  const E = { staff: { people: [], cfg: { pinReq: false, idle: 10 } }, empo: { sal: {}, salMoves: [], goals: {} }, caja: {}, stock: {}, audit: {} };
  A.EMP = E;
  (function load() {
    try { const v = JSON.parse(LS.get(EKEY(), 'null')); if (v) { ['staff', 'empo', 'caja', 'stock', 'audit'].forEach(k => { if (v[k]) E[k] = v[k]; }); } } catch (e) { /* nada */ }
    E.staff.people = E.staff.people || []; E.staff.cfg = Object.assign({ pinReq: false, idle: 10 }, E.staff.cfg || {});
    E.empo.sal = E.empo.sal || {}; E.empo.salMoves = E.empo.salMoves || []; E.empo.goals = E.empo.goals || {};
  })();
  const persist = () => { if (A.noSave) return; try { LS.set(EKEY(), JSON.stringify(E)); } catch (e) { /* nada */ } };
  const saveNowPrev = A.saveNow;
  A.saveNow = () => { saveNowPrev(); persist(); };
  const save = () => { persist(); A.save(); };
  const cajaOf = sd => E.caja[sd] || (E.caja[sd] = { moves: [], closes: [] });
  const bucket = b => E.audit[b] || (E.audit[b] = []);

  /* sincronización con la nube: claves extra */
  const prevExtra = A.cloudExtra, prevKeys = A.cloudExtraKeys;
  A.cloudExtra = k => {
    if (k === 'staff') return { get: () => (E.staff.people.length || E.staff.cfg.pinReq ? E.staff : null), set: v => { E.staff = v || { people: [], cfg: {} }; E.staff.people = E.staff.people || []; E.staff.cfg = Object.assign({ pinReq: false, idle: 10 }, E.staff.cfg || {}); persist(); } };
    if (k === 'empo') return { get: () => (isEmp() || Object.keys(E.empo.sal).length ? E.empo : null), set: v => { E.empo = v || {}; E.empo.sal = E.empo.sal || {}; E.empo.salMoves = E.empo.salMoves || []; E.empo.goals = E.empo.goals || {}; persist(); } };
    if (k === 'stock') return { get: () => (Object.keys(E.stock).length ? E.stock : null), set: v => { E.stock = v || {}; persist(); } };
    if (/^caja:[A-Za-z0-9_-]+$/.test(k)) { const sd = k.slice(5); return { get: () => E.caja[sd] || null, set: v => { E.caja[sd] = v || { moves: [], closes: [] }; E.caja[sd].moves = E.caja[sd].moves || []; E.caja[sd].closes = E.caja[sd].closes || []; persist(); } }; }
    if (/^audit:[A-Za-z0-9_-]+$/.test(k)) { const b = k.slice(6); return { get: () => (E.audit[b] && E.audit[b].length ? E.audit[b] : null), set: v => { E.audit[b] = Array.isArray(v) ? v.slice(-1500) : []; persist(); } }; }
    return prevExtra ? prevExtra(k) : null;
  };
  A.cloudExtraKeys = () => ['staff', 'empo', 'stock'].concat(Object.keys(E.caja).map(s => 'caja:' + s), Object.keys(E.audit).map(b => 'audit:' + b), prevKeys ? prevKeys() : []);

  /* =====================================================================
     ALCANCE DEL EQUIPO: dueño ('todo') o un centro ('sede:<id>')
     ===================================================================== */
  const localScope = () => LS.get('odontovoz.empScope', 'todo');
  A.empScope = () => {
    if (!real()) return localScope();
    if (CL.devScope !== undefined) return CL.devScope;
    try { const v = JSON.parse(LS.get('odontovoz.scope', 'null')); return v ? v.s : null; } catch (e) { return null; }
  };
  const devSede = () => { const s = A.empScope(); return s && s.indexOf('sede:') === 0 ? s.slice(5) : null; };
  const devOwner = () => A.empScope() === 'todo';

  /* =====================================================================
     CONSULTORIOS (se usan los mismos «centros» de la cuenta: A.locs)
     ===================================================================== */
  const sedes = () => (A.locs ? A.locs() : []);
  const sedeById = id => sedes().filter(l => l.id === id)[0] || null;
  const sedeName = id => { const l = sedeById(id); return l ? l.name : 'Sin centro'; };
  const sedeColor = id => { const l = sedeById(id); return l ? l.color : '#8a9a9b'; };
  const firstSede = () => (sedes()[0] || {}).id || null;
  const proSedes = p => { const v = (p && Array.isArray(p.sedes) ? p.sedes : []).filter(id => sedeById(id)); return v.length ? v : (firstSede() ? [firstSede()] : []); };
  const mainSede = p => proSedes(p)[0] || null;
  A.empProSedes = proSedes;

  /* =====================================================================
     PERSONAS Y PERMISOS
     ===================================================================== */
  const people = () => E.staff.people.filter(p => p.active !== false);
  const personById = id => E.staff.people.filter(p => p.id === id)[0] || null;
  const pinOn = () => isEmp() && !(A.memberNow && A.memberNow()) && E.staff.cfg.pinReq && people().some(p => p.pin && p.role !== 'otro');
  let PERSON = null;
  (function () { try { const v = JSON.parse(LS.get('odontovoz.person', 'null')); if (v && v.id) PERSON = v; } catch (e) { /* nada */ } })();
  const curPerson = () => (PERSON && personById(PERSON.id)) || null;
  A.empPerson = curPerson;
  const roleNow = () => {
    /* persona del equipo con su propio usuario: manda su puesto (lo controla también el servidor) */
    const mb = A.memberNow ? A.memberNow() : null; if (mb && mb.role) return mb.role;
    const p = pinOn() ? curPerson() : null;
    if (p) return p.role;
    if (devOwner()) return 'dueno';
    return 'consultorio';
  };
  const PERM = {
    dueno: { emp: 1, all: 1, caja: 1, liq: 1, clin: 1, sal: 1 },
    admin: { emp: 1, all: 1, caja: 1, liq: 1, clin: 1, sal: 0 },
    consultorio: { emp: 0, all: 0, caja: 1, liq: 0, clin: 1, sal: 0 },
    recepcion: { emp: 0, all: 0, caja: 1, liq: 0, clin: 0, sal: 0 },
    profesional: { emp: 0, all: 0, caja: 0, liq: 0, clin: 1, sal: 0 },
    asistente: { emp: 0, all: 0, caja: 0, liq: 0, clin: 1, sal: 0 },
    otro: { emp: 0, all: 0, caja: 0, liq: 0, clin: 0, sal: 0 }
  };
  const perm = () => {
    const r = roleNow(), p = Object.assign({}, PERM[r] || PERM.consultorio);
    /* en un equipo de centro nadie ve los números de la empresa, aunque sea el dueño (el servidor tampoco se los manda) */
    if (devSede()) { p.emp = 0; p.all = 0; p.liq = 0; p.sal = 0; }
    return p;
  };
  A.empPerm = () => (isEmp() ? perm() : null);
  /* centro en el que se está trabajando ahora (null = todos) */
  const fixedSede = () => { if (devSede()) return devSede(); const p = pinOn() ? curPerson() : null; if (p && !perm().all) return p.sede || firstSede(); return null; };
  const curSede = () => { if (!isEmp()) return null; const f = fixedSede(); if (f) return f; const s = S.sede; return s && sedeById(s) ? s : null; };
  A.empSede = curSede;
  (function () { const v = LS.get('odontovoz.sedeSel', ''); if (v) S.sede = v; })();
  const setSede = id => { S.sede = id || null; LS.set('odontovoz.sedeSel', id || null); };
  A.empSetSede = setSede; A.empDevSede = () => devSede(); A.empPermAll = () => !!perm().all;

  /* registro (auditoría) */
  const whoName = () => { const p = pinOn() ? curPerson() : null; return p ? p.name : (A.deviceLabel ? A.deviceLabel() : 'Este equipo'); };
  const auditBucket = () => (devSede() ? devSede() : 'todo');
  const audit = (what, sd) => {
    if (!isEmp()) return;
    const l = bucket(auditBucket()); l.push({ id: A.uid(), t: new Date().toISOString(), who: whoName(), dev: A.deviceLabel ? A.deviceLabel() : '', sede: sd || curSede() || null, what: String(what).slice(0, 300) });
    if (l.length > 1500) l.splice(0, l.length - 1500);
    persist();
  };
  A.empAudit = audit;
  const jrPrev = A.onJournal;
  A.onJournal = e => { if (jrPrev) jrPrev(e); if (isEmp() && e && e.label) audit(e.label); };

  /* =====================================================================
     TURNOS, COBROS Y CAJAS POR CONSULTORIO
     ===================================================================== */
  const locOfPrev = A.locOf;
  A.locOf = a => {
    if (!isEmp()) return locOfPrev ? locOfPrev(a) : null;
    if (!a) return null; if (a.loc && sedeById(a.loc)) return a.loc;
    return mainSede(A.PRO(a.pro));
  };
  const sedeOfAppt = a => A.locOf(a);
  /* un turno nuevo queda en el centro donde se está trabajando (o en el del profesional) */
  const mutPrev = A.mutate;
  A.mutate = (keys, fn, msg) => mutPrev(keys, () => {
    const r = fn();
    if (isEmp()) (keys || []).forEach(k => { const l = A.S.days[k] || []; l.forEach(a => { if (!a.loc && a.type !== 'block') { const sd = curSede(), ps = proSedes(A.PRO(a.pro)); a.loc = sd && ps.indexOf(sd) >= 0 ? sd : ps[0] || sd || firstSede(); } }); });
    return r;
  }, msg);
  /* profesionales del centro actual */
  const vpPrev = A.visPros;
  A.visPros = () => {
    const l = vpPrev(); if (!isEmp()) return l;
    const sd = curSede(); if (!sd) return l;
    const f = l.filter(p => proSedes(p).indexOf(sd) >= 0);
    return f.length ? f : l;
  };
  /* en qué centro entró un cobro: el que se anotó, el del turno, el de un turno de ese día o el del profesional */
  const payLoc = (pid, e) => {
    if (e.loc && sedeById(e.loc)) return e.loc;
    if (e.apptId && A.apptById) { const a = A.apptById(e.apptId); if (a) return sedeOfAppt(a); }
    const ap = dayList(e.date).filter(a => a.pid === pid && a.type !== 'block' && a.status !== 'cancelado')[0];
    if (ap) return sedeOfAppt(ap);
    const pt = A.PAT(pid); return mainSede(A.PRO(e.pro || (pt && pt.pro)));
  };
  /* los cobros nuevos quedan anotados en el centro donde se cobraron */
  const touchPrev = A.touchPd;
  if (touchPrev) A.touchPd = pid => { if (isEmp() && curSede()) { const pd = A.S.pd[pid]; if (pd && pd.ledger) pd.ledger.forEach(e => { if (e.type === 'pago' && !e.loc && e.date === today()) e.loc = curSede(); }); } return touchPrev(pid); };
  A.empPayLoc = (pid, e) => payLoc(pid, e);
  const dayList = d => (A.S.days[d] || []);
  /* en qué centro se hizo una prestación: el turno de ese paciente ese día; si no, el del profesional */
  const cargoLoc = (pid, e) => {
    if (e.loc && sedeById(e.loc)) return e.loc;
    const ap = dayList(e.date).filter(a => a.pid === pid && a.type !== 'block' && a.status !== 'cancelado' && (!e.pro || a.pro === e.pro))[0];
    return ap ? sedeOfAppt(ap) : mainSede(A.PRO(e.pro));
  };
  A.empCargoLoc = cargoLoc;

  /* recorre las cuentas de todos los pacientes una sola vez */
  function ledgerScan(from, to, cb) {
    A.PATS.forEach(p => { const pd = A.S.pd[p.id] || (A.pd ? A.pd(p.id) : null); if (!pd || !pd.ledger) return; pd.ledger.forEach(e => { if (e.voided || e.anula || !e.date || e.date < from || e.date > to) return; cb(p, e, pd); }); });
  }
  /* turnos de un rango (sin inventar días en el modo de prueba, salvo los últimos 60) */
  function apptScan(from, to, cb) {
    const t = today(), lim = A.add(t, -60);
    let d = from; let guard = 0;
    while (d <= to && guard++ < 800) {
      const l = A.DEMO && d >= lim && d <= A.add(t, 14) ? A.day(d) : dayList(d);
      l.forEach(a => { if (a.type !== 'block') cb(a, d); });
      d = A.add(d, 1);
    }
  }
  /* números de un día por centro */
  function dayStats(d) {
    const out = {}; sedes().forEach(l => { out[l.id] = { ing: 0, egr: 0, cob: 0, appts: [], pros: {}, atend: 0, wait: 0, aus: 0, pend: 0, unpaid: 0, pm: {} }; });
    const z = out;
    (A.DEMO ? A.day(d) : dayList(d)).forEach(a => {
      if (a.type === 'block' || a.status === 'cancelado') return; const sd = sedeOfAppt(a), o = z[sd]; if (!o) return;
      o.appts.push(a); o.pros[a.pro] = (o.pros[a.pro] || 0) + 1;
      if (a.status === 'atendido') o.atend++; else if (a.status === 'ausente') o.aus++; else if (a.status === 'llego' || a.status === 'en-atencion') o.wait++; else o.pend++;
    });
    /* profesionales que atienden hoy aunque todavía no tengan turnos */
    A.PROS.forEach(p => { if (!A.hoursFor(p, d).length) return; proSedes(p).forEach(sd => { if (z[sd] && !(p.id in z[sd].pros)) z[sd].pros[p.id] = 0; }); });
    const paidPids = {};
    ledgerScan(d, d, (p, e) => { if (e.type !== 'pago') return; const sd = payLoc(p.id, e), o = z[sd]; if (!o) return; o.cob += e.amount; o.ing += e.amount; const m = e.method || 'Otro'; o.pm[m] = (o.pm[m] || 0) + e.amount; paidPids[p.id] = 1; });
    sedes().forEach(l => {
      const c = cajaOf(l.id), o = z[l.id];
      c.moves.forEach(m => { if (m.status === 'pendiente' || m.date !== d) return; if (m.type === 'ingreso') o.ing += m.amount; else o.egr += m.amount; });
      o.appts.forEach(a => { if (a.status === 'atendido' && a.pid && !paidPids[a.pid] && A.saldo && A.saldo(a.pid) > 0) o.unpaid++; });
    });
    if (devOwner() || !real()) E.empo.salMoves.forEach(m => { if (m.status === 'pagado' && m.date === d && z[m.loc]) z[m.loc].egr += m.amount; });
    return out;
  }
  A.empDayStats = dayStats;

  /* números de varios meses por centro (para el resumen, las estadísticas y el reporte) */
  function monthStats(m0, m1) {
    const from = m0 + '-01', to = m1 + '-' + pad(daysIn(m1)), out = {}, first = {}, t = today();
    const blank = () => ({ fact: 0, cob: 0, ing: 0, egr: 0, sal: 0, egrCat: {}, turnos: 0, atend: 0, aus: 0, canc: 0, nuevos: 0, mins: 0, cap: 0, pros: {}, cats: {}, budP: 0, budA: 0, budPn: 0, budAn: 0 });
    const get = (m, sd) => { const o = out[m] || (out[m] = {}); return o[sd] || (o[sd] = blank()); };
    ledgerScan(from, to, (p, e) => {
      const m = monthOf(e.date);
      if (e.type === 'pago') { const o = get(m, payLoc(p.id, e)); o.cob += e.amount; o.ing += e.amount; }
      else if (e.type === 'cargo') { const o = get(m, cargoLoc(p.id, e)), pr = e.pro || 'pr1', cat = A.catOf ? A.catOf({ desc: e.desc }) : 'otros'; o.fact += e.amount; (o.pros[pr] || (o.pros[pr] = { fact: 0, turnos: 0 })).fact += e.amount; o.cats[cat] = (o.cats[cat] || 0) + e.amount; }
    });
    A.PATS.forEach(p => { const pd = A.S.pd[p.id]; if (!pd || !pd.budgets) return; pd.budgets.forEach(b => { const d = b.date || b.created || ''; if (!d || d < from || d > to || b.status === 'borrador') return; const tot = b.total || (b.items || []).reduce((s, i) => s + (i.price || 0), 0); const sd = mainSede(A.PRO(b.pro || p.pro)), o = get(monthOf(d), sd); o.budP += tot; o.budPn++; if (b.status === 'aceptado') { o.budA += tot; o.budAn++; } }); });
    Object.keys(A.S.days).forEach(d => { (A.S.days[d] || []).forEach(a => { if (a.pid && a.type !== 'block' && a.status !== 'cancelado' && (!first[a.pid] || d < first[a.pid])) first[a.pid] = d; }); });
    apptScan(from, to, (a, d) => {
      if (a.pid && a.status !== 'cancelado' && (!first[a.pid] || d < first[a.pid])) first[a.pid] = d;
      const o = get(monthOf(d), sedeOfAppt(a)); if (a.status === 'cancelado') { o.canc++; return; }
      o.turnos++; if (a.status === 'atendido') o.atend++; if (a.status === 'ausente') o.aus++; if (d <= t) o.mins += a.dur || 0;
      const pr = o.pros[a.pro] || (o.pros[a.pro] = { fact: 0, turnos: 0 }); pr.turnos++;
    });
    /* pacientes nuevos: su primer turno registrado cae en ese mes */
    Object.keys(first).forEach(pid => { const d = first[pid]; if (d < from) return; const a = dayList(d).filter(x => x.pid === pid)[0]; const o = get(monthOf(d), a ? sedeOfAppt(a) : firstSede()); o.nuevos++; });
    /* horas disponibles de los profesionales (solo días que ya pasaron) */
    let d = from, g = 0;
    while (d <= to && d <= t && g++ < 800) { A.PROS.forEach(p => { const hrs = A.hoursFor(p, d); if (!hrs.length) return; const mins = hrs.reduce((s, r) => s + (r[1] - r[0]), 0), ps = proSedes(p); ps.forEach(sd => { get(monthOf(d), sd).cap += mins / ps.length; }); }); d = A.add(d, 1); }
    sedes().forEach(l => {
      cajaOf(l.id).moves.forEach(mv => { if (mv.status === 'pendiente' || mv.date < from || mv.date > to) return; const o = get(monthOf(mv.date), l.id); if (mv.type === 'ingreso') o.ing += mv.amount; else { o.egr += mv.amount; o.egrCat[mv.cat] = (o.egrCat[mv.cat] || 0) + mv.amount; } });
    });
    E.empo.salMoves.forEach(mv => { if (mv.status !== 'pagado' || mv.date < from || mv.date > to || !sedeById(mv.loc)) return; const o = get(monthOf(mv.date), mv.loc); o.egr += mv.amount; o.sal += mv.amount; o.egrCat.sueldos = (o.egrCat.sueldos || 0) + mv.amount; });
    /* gastos generales de la empresa (caja del dueño, sin los honorarios que ya se calculan aparte) */
    (S.cash && S.cash.moves || []).forEach(mv => { if (mv.status === 'pendiente' || mv.liq || mv.type !== 'egreso' || mv.date < from || mv.date > to) return; const o = get(monthOf(mv.date), '_gral'); o.egr += mv.amount; o.egrCat[mv.cat] = (o.egrCat[mv.cat] || 0) + mv.amount; });
    return out;
  }
  A.empMonthStats = monthStats;
  /* parte de los profesionales por centro en un mes (según porcentajes o módulo) */
  function profShare(m) {
    const out = {}; if (!A.liqCalc) return out;
    A.PROS.forEach(p => {
      let c; try { c = A.liqCalc(p.id, m); } catch (e) { return; }
      c.lines.forEach(ln => { const sd = cargoLoc(ln.pid, { date: ln.date, pro: p.id }); const o = out[sd] || (out[sd] = { dent: 0, prod: 0, pros: {} }); o.dent += ln.dent; o.prod += ln.amount; const q = o.pros[p.id] || (o.pros[p.id] = { dent: 0, prod: 0 }); q.dent += ln.dent; q.prod += ln.amount; });
      if (c.modFee) { const sd = mainSede(p), o = out[sd] || (out[sd] = { dent: 0, prod: 0, pros: {} }); o.dent -= c.modFee; const q = o.pros[p.id] || (o.pros[p.id] = { dent: 0, prod: 0 }); q.dent -= c.modFee; q.mod = c.modFee; }
    });
    return out;
  }
  A.empProfShare = profShare;

  /* =====================================================================
     ACTIVAR EL MODO EMPRESA
     ===================================================================== */
  const lim = () => (A.limits ? A.limits() : null);
  const empAllowed = () => { if (!real()) return true; const l = CL.lic; return !!l && (l.plan === 'empresa' || l.plan === 'red' || l.plan === 'prueba'); };
  const maxSedes = () => { const L = lim(); return L ? Math.max(1, Math.min(5, L.locs || 5)) : 5; };
  A.acts.empOn = () => {
    if (A.hideDrawer) A.hideDrawer();
    if (!empAllowed()) { S.modal = { type: 'empPlan' }; A.renderModal(); return; }
    const cur = sedes().map(l => l.name);
    const names = cur.length ? cur : [(S.setup && S.setup.clinic) || A.CLINIC || 'Centro 1'];
    while (names.length < 2) names.push('');
    S.modal = { type: 'empOn', names }; A.renderModal();
  };
  MF.empPlan = () => A.modalShell('Modo Empresa', '<p>El modo Empresa es para dueños de <b>2 a 5 centros</b>: cada centro con su personal, su agenda y su caja, y un inicio con el resumen de todos. Viene con el plan <b>Empresa</b>.</p>', '<button class="btn" data-act="closeModal">Ahora no</button><button class="btn primary" data-act="planOpen">Ver los planes</button>');
  MF.empOn = m => {
    const rows = m.names.map((n, i) => '<div class="emp-on-row"><span class="emp-dot" style="background:' + COLORS[i % 5] + '"></span><input class="inp" data-in="empOnName" data-i="' + i + '" value="' + esc(n) + '" placeholder="Nombre del centro ' + (i + 1) + '" aria-label="Centro ' + (i + 1) + '"></div>').join('');
    return A.modalShell('Activar el modo Empresa',
      '<p>Vas a manejar <b>varios centros</b> desde una sola cuenta. Los pacientes son de la empresa (una sola ficha por paciente) y cada centro tiene sus profesionales, su personal, su agenda y su caja.</p>' +
      '<h3 class="emp-h3">Tus centros</h3>' + rows +
      (m.names.length < maxSedes() ? '<button class="btn small" data-act="empOnAdd">+ Otro centro</button>' : '') +
      '<ul class="plain emp-list"><li>Este equipo queda como <b>equipo del dueño</b>: ve todos los centros y los números de la empresa.</li><li>Los demás equipos, la primera vez que se abran, eligen a qué centro pertenecen y solo ven ese.</li><li>Tus pacientes, turnos y profesionales se conservan. Después asignás cada profesional a su centro.</li></ul>' +
      '<div class="hint bad" id="eoMsg"></div>',
      '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="empOnGo">Activar</button>');
  };
  A.ins.empOnName = el => { S.modal.names[+el.getAttribute('data-i')] = el.value; };
  A.acts.empOnAdd = () => { if (S.modal.names.length < maxSedes()) S.modal.names.push(''); A.renderModal(); };
  A.acts.empOnGo = async () => {
    const m = S.modal, names = m.names.map(n => String(n || '').trim()).filter(Boolean), msg = $('#eoMsg');
    if (names.length < 2) { msg.textContent = 'Cargá al menos dos centros.'; return; }
    if (real()) {
      msg.textContent = 'Activando…';
      try {
        const r = await CL.api('/rest/v1/rpc/ov_empresa_on', { method: 'POST', body: {} });
        if (!r || !r.ok) { if (r && r.plan) { S.modal = { type: 'empPlan' }; A.renderModal(); return; } msg.textContent = (r && r.msg) || 'No se pudo activar.'; return; }
        CL.devScope = 'todo'; CL.empresaOn = true; LS.set('odontovoz.scope', JSON.stringify({ s: 'todo', e: true }));
      } catch (e) { msg.textContent = /could not find|schema cache/i.test(String(e.message)) ? 'El servidor todavía no tiene el modo Empresa. Avisale a soporte.' : (e.message || 'Sin conexión.'); return; }
    } else LS.set('odontovoz.empScope', 'todo');
    /* centros: se reusan los que ya existían (con sus códigos) y se suman los nuevos */
    const old = sedes().slice(), list = names.map((n, i) => { const o = old[i]; return Object.assign({}, o || { id: 'l' + A.uid() }, { name: n, color: (o && o.color) || COLORS[i % 5], kind: (o && o.kind) || 'propio' }); });
    A.CFG.locs = list;
    A.PROS.forEach(p => { if (!Array.isArray(p.sedes) || !p.sedes.filter(id => sedeById(id)).length) p.sedes = [list[0].id]; });
    if (A.DEMO) demoSeed();
    S.setup = Object.assign({}, S.setup || {}, { type: 'empresa' }); S.uimode = 'admin'; S.role = 'profesional';
    A.applySetup(); setSede(null); audit('Activó el modo Empresa con ' + list.length + ' centros.');
    S.modal = null; A.renderModal(); A.saveNow(); S.tab = 'empresa'; S.empTab = 'sedes'; A.refresh();
    A.toast('Modo Empresa activado. Ahora asigná cada profesional a su centro.');
  };
  /* datos de ejemplo para mirar el modo Empresa sin cuenta */
  function demoSeed() {
    const L = sedes(); if (L.length < 2) return;
    A.PROS.forEach((p, i) => { p.sedes = [L[i % L.length].id]; });
    const r = A.rng ? A.rng(4242) : Math.random, t = today();
    const EG = [['alquiler', 'Alquiler', 380000, 1], ['servicios', 'Luz, gas e internet', 64000, 1], ['insumos', 'Insumos', 45000, 0], ['bio', 'Esterilización', 18000, 0], ['lab', 'Laboratorio', 52000, 0]];
    L.forEach((l, li) => {
      const c = cajaOf(l.id); if (c.moves.length) return;
      for (let k = 75; k >= 0; k--) {
        const d = A.add(t, -k); if (A.dow(d) === 0) continue;
        EG.forEach(g => { if (g[3] ? d.slice(8) === '05' : r() < 0.18) c.moves.push({ id: A.uid(), date: d, type: 'egreso', cat: g[0], desc: g[1], amount: Math.round(g[2] * (0.7 + r() * 0.6) * (1 + li * 0.15) / 1000) * 1000, method: r() < 0.5 ? 'Efectivo' : 'Transferencia', status: 'pagado' }); });
        if (k > 0 && r() < 0.9) c.closes.push({ id: A.uid(), date: d, loc: l.id, open: 20000, exp: 0, counted: 0, diff: r() < 0.15 ? -Math.round(r() * 8) * 1000 : 0, by: 'Recepción', at: d + 'T20:00:00' });
      }
      E.stock[l.id] = [['Guantes de nitrilo (cajas)', 'cajas', 14, 10], ['Anestesia (cartuchos)', 'cartuchos', 38, 50], ['Composite A2', 'jeringas', 6, 4], ['Barbijos', 'cajas', 9, 6]].map(x => ({ id: A.uid(), name: x[0], unit: x[1], qty: Math.max(0, Math.round(x[2] * (0.6 + r() * 0.8))), min: x[3] }));
      E.empo.goals[l.id] = { fact: 4500000 + li * 1500000, turnos: 220 + li * 60, nuevos: 25 };
    });
    const P = [['Laura Gómez', 'recepcion', 0, 620000], ['Sofía Ruiz', 'recepcion', 1, 620000], ['Martín Díaz', 'admin', null, 850000], ['Paula Sosa', 'asistente', 0, 540000], ['Carla Núñez', 'recepcion', 2, 600000]];
    if (!E.staff.people.length) P.forEach(x => { const id = A.uid(), sd = x[2] == null ? null : (L[x[2] % L.length] || {}).id; E.staff.people.push({ id, name: x[0], role: x[1], sede: sd, phone: '', horario: 'Lun a vie · 8 a 16', active: true }); E.empo.sal[id] = { monto: x[3], dia: 5 }; });
  }
  /* dejar el modo Empresa */
  A.acts.empOff = async () => {
    if (!confirm('¿Dejar el modo Empresa? La cuenta vuelve a ser un centro odontológico. No se borra nada: centros, personal y cajas quedan guardados por si lo volvés a activar.')) return;
    if (real()) { try { const r = await CL.api('/rest/v1/rpc/ov_empresa_off', { method: 'POST', body: {} }); if (!r || !r.ok) { A.toast((r && r.msg) || 'No se pudo.'); return; } CL.empresaOn = false; } catch (e) { A.toast(e.message || 'Sin conexión.'); return; } }
    S.setup = Object.assign({}, S.setup, { type: 'centro' }); A.applySetup(); A.saveNow(); S.tab = 'inicio'; A.refresh(); A.toast('Volviste a centro odontológico.');
  };
  /* el tipo de cuenta suma «Empresa» */
  const acctTypePrev = MF.acctType;
  if (acctTypePrev) MF.acctType = m => {
    const h = acctTypePrev(m), card = '<button class="setup-card' + (m.t === 'empresa' ? ' on' : '') + '" data-act="acctTypeSel" data-t="empresa" aria-pressed="' + (m.t === 'empresa') + '"><b>Empresa</b><span>De 2 a 5 centros</span></button>';
    return h.replace(/(<div class="setup-grid">[\s\S]*?)(<\/div>)/, '$1' + card + '$2');
  };
  const typeGoPrev = A.acts.acctTypeGo;
  A.acts.acctTypeGo = (el, ev) => {
    const m = S.modal;
    if (m && m.t === 'empresa' && !isEmp()) { A.acts.empOn(); return; }
    if (m && isEmp() && m.t !== 'empresa') { S.modal = null; A.renderModal(); A.acts.empOff(); return; }
    if (m && m.t === 'empresa') { S.modal = null; A.renderModal(); return; }
    return typeGoPrev(el, ev);
  };
  const applyPrev = A.applySetup;
  A.applySetup = () => { applyPrev(); if (isEmp()) { S.mode = 'centro'; if (S.setup.clinic) A.CLINIC = S.setup.clinic; } };

  /* =====================================================================
     ESTE EQUIPO: ¿del dueño o de un centro?
     ===================================================================== */
  let whereAsked = false;
  const needWhere = () => isEmp() && real() && !(A.memberNow && A.memberNow()) && CL.devOk && CL.devScope === null && !whereAsked;
  MF.empWhere = m => A.modalShell('¿Dónde se usa este equipo?',
    '<p>Tu cuenta trabaja en modo Empresa. Elegí a qué centro pertenece este celular o compu: va a ver solo ese centro.</p><div class="setup-grid">' +
    sedes().map(l => '<button class="setup-card" data-act="empWhereGo" data-s="sede:' + esc(l.id) + '"><b><span class="emp-dot" style="background:' + esc(l.color) + '"></span> ' + esc(l.name) + '</b><span>' + esc(l.addr || 'Agenda, pacientes y caja de este centro') + '</span></button>').join('') +
    '<button class="setup-card" data-act="empWhereGo" data-s="todo"><b>Es del dueño o de la administración</b><span>Ve todos los centros. Lo tiene que habilitar el dueño desde su equipo.</span></button></div><div class="hint bad" id="ewMsg">' + esc(m.msg || '') + '</div>',
    '<button class="btn" data-act="empWhereLater">Más tarde</button>');
  A.acts.empWhereGo = async el => {
    const sc = el.getAttribute('data-s'), msg = $('#ewMsg');
    if (!real()) { LS.set('odontovoz.empScope', sc); S.modal = null; A.renderModal(); afterScope(); return; }
    msg.textContent = 'Guardando…';
    try {
      const r = await CL.api('/rest/v1/rpc/ov_device_scope', { method: 'POST', body: { p_id: A.devId(), p_scope: sc } });
      if (!r || !r.ok) { msg.textContent = (r && r.msg) || 'No se pudo.'; return; }
      CL.devScope = sc; LS.set('odontovoz.scope', JSON.stringify({ s: sc, e: true })); S.modal = null; A.renderModal(); audit('Este equipo quedó asignado a ' + (sc === 'todo' ? 'la empresa (dueño)' : sedeName(sc.slice(5))) + '.'); afterScope();
    } catch (e) { msg.textContent = e.message || 'Sin conexión.'; }
  };
  A.acts.empWhereLater = () => { whereAsked = true; S.modal = null; A.renderModal(); A.toast('Hasta que elijas, este equipo no ve los números de la empresa.'); };
  /* al quedar como equipo de un centro se borra la copia local de los datos del dueño */
  function afterScope() {
    const sd = devSede();
    if (sd) {
      if (S.cash) { S.cash.moves = []; S.cash.closes = []; }
      if (S.liq) { S.liq.paid = {}; S.liq.ded = {}; }
      E.empo = { sal: {}, salMoves: [], goals: {} };
      Object.keys(E.caja).forEach(k => { if (k !== sd) delete E.caja[k]; });
      Object.keys(E.audit).forEach(k => { if (k !== sd) delete E.audit[k]; });
      setSede(sd); persist(); A.saveNow();
    }
    S.tab = 'inicio'; A.refresh();
  }
  A.onScope = () => { if (isEmp()) afterScope(); };
  /* lo que un equipo de centro no sube (el servidor lo rechazaría) */
  const recPrev = A.recAllowed;
  A.recAllowed = (k, v) => {
    if (recPrev && !recPrev(k, v)) return false;
    if (!isEmp() && !CL.empresaOn) return true;
    const sc = A.empScope(); if (sc === 'todo') return true;
    if (k === 'liq' || k === 'empo' || k === 'cash' || k === 'audit:todo') return false;
    if (k.indexOf('caja:') === 0 || k.indexOf('audit:') === 0) { const sd = sc && sc.indexOf('sede:') === 0 ? sc.slice(5) : null; return !!sd && k.slice(k.indexOf(':') + 1) === sd; }
    return true;
  };

  /* =====================================================================
     PERSONAS CON PIN EN EL EQUIPO DEL CONSULTORIO
     ===================================================================== */
  const hex = b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
  async function pinHash(pin, salt) {
    const enc = new TextEncoder();
    try {
      if (window.crypto && crypto.subtle) {
        const key = await crypto.subtle.importKey('raw', enc.encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
        return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 120000, hash: 'SHA-256' }, key, 256));
      }
    } catch (e) { /* sigue abajo */ }
    let h = 2166136261; const s = salt + ':' + pin; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return 'f' + (h >>> 0).toString(16);
  }
  const newSalt = () => { const r = window.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(12)) : Array.from({ length: 12 }, () => Math.floor(Math.random() * 256)); return hex(r); };
  let lastAct = Date.now(), whoOpen = false;
  ['pointerdown', 'keydown'].forEach(ev => document.addEventListener(ev, () => { lastAct = Date.now(); }, true));
  /* quiénes pueden entrar en este equipo */
  const canHere = p => { if (!p || p.active === false || !p.pin || p.role === 'otro') return false; const sd = devSede(); if (!sd) return true; return p.role === 'dueno' || p.role === 'admin' || p.sede === sd || p.role === 'profesional'; };
  function needWho() {
    if (!pinOn() || S.modal && S.modal.type === 'empWho') return false;
    const p = curPerson(); if (!p || !canHere(p)) return true;
    const idle = (E.staff.cfg.idle || 10) * 60000; return idle > 0 && Date.now() - lastAct > idle;
  }
  MF.empWho = m => {
    const list = people().filter(canHere);
    if (m.pid) {
      const p = personById(m.pid);
      return '<div class="modal-scrim emp-who"><div class="modal" role="dialog" aria-modal="true" aria-label="PIN"><div class="m-head"><h2>Hola, ' + esc(p.name.split(' ')[0]) + '</h2></div><div class="m-body">' +
        '<p>Ingresá tu PIN.</p><input id="ewPin" class="inp emp-pin" type="password" inputmode="numeric" autocomplete="off" maxlength="8" data-in="empPinIn" aria-label="PIN"><div class="hint bad" id="ewpMsg">' + esc(m.msg || '') + '</div></div>' +
        '<div class="m-foot"><button class="btn" data-act="empWhoBack">Volver</button><button class="btn primary" data-act="empPinGo">Entrar</button></div></div></div>';
    }
    return '<div class="modal-scrim emp-who"><div class="modal" role="dialog" aria-modal="true" aria-label="¿Quién está usando el equipo?"><div class="m-head"><h2>¿Quién está usando el equipo?</h2></div><div class="m-body">' +
      (devSede() ? '<p class="hint">' + esc(sedeName(devSede())) + '</p>' : '') +
      '<div class="emp-people">' + list.map(p => '<button class="emp-person" data-act="empWhoPick" data-id="' + p.id + '"><span class="emp-av">' + esc(p.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()) + '</span><b>' + esc(p.name) + '</b><span>' + esc(RN[p.role] || p.role) + (p.sede ? ' · ' + esc(sedeName(p.sede)) : '') + '</span></button>').join('') + '</div>' +
      (list.length ? '' : '<p>No hay personas con PIN para este equipo. El dueño las carga en Empresa › Personal.</p>') + '</div></div></div>';
  };
  A.acts.empWhoPick = el => { S.modal = { type: 'empWho', pid: el.getAttribute('data-id') }; A.renderModal(); setTimeout(() => { const i = $('#ewPin'); if (i) i.focus(); }, 30); };
  A.acts.empWhoBack = () => { S.modal = { type: 'empWho' }; A.renderModal(); };
  A.ins.empPinIn = el => { if (el.value.length >= 4 && /^\d+$/.test(el.value)) { /* se puede tocar Entrar o seguir escribiendo */ } };
  let pinTries = 0;
  A.acts.empPinGo = async () => {
    const m = S.modal, p = personById(m.pid), v = ($('#ewPin') || {}).value || '';
    if (!p || !p.pin) return;
    if ((await pinHash(v, p.pin.s)) !== p.pin.h) { pinTries++; S.modal = { type: 'empWho', pid: m.pid, msg: pinTries >= 5 ? 'Demasiados intentos. Esperá un minuto.' : 'PIN incorrecto.' }; A.renderModal(); if (pinTries >= 5) setTimeout(() => { pinTries = 0; }, 60000); return; }
    pinTries = 0; PERSON = { id: p.id, at: Date.now() }; LS.set('odontovoz.person', JSON.stringify(PERSON)); lastAct = Date.now(); whoOpen = false;
    S.modal = null; A.renderModal(); applyPerson(); audit('Entró ' + p.name + '.'); S.tab = 'inicio'; A.refresh();
  };
  A.acts.empWhoOpen = () => { PERSON = null; LS.set('odontovoz.person', null); whoOpen = true; S.modal = { type: 'empWho' }; A.renderModal(); };
  /* lo que puede hacer la persona: se refleja en la pantalla */
  function applyPerson() {
    if (!isEmp()) return;
    const p = pinOn() ? curPerson() : null, pr = perm();
    if (p && p.role === 'profesional' && p.pro && A.PRO(p.pro)) { S.uimode = 'atencion'; S.me = p.pro; S.role = 'profesional'; }
    else if (p) { S.uimode = 'admin'; S.role = pr.clin ? 'profesional' : 'recepcion'; }
    else if (devSede()) { S.uimode = S.uimode || 'admin'; }
  }
  A.empApplyPerson = applyPerson;
  const TABOK = { inicio: 1, agenda: 1, pacientes: 1, ficha: 1 };
  const tabAllowed = t => { if (!isEmp()) return true; const p = perm(); if (TABOK[t]) return true; if (t === 'caja') return !!p.caja; if (t === 'liq') return !!p.liq; if (t === 'empresa') return !!p.emp; return true; };
  A.empTabAllowed = tabAllowed;

  /* =====================================================================
     PANTALLA: clases, título, aviso del centro y guardas de las secciones
     ===================================================================== */
  let salGenDone = '';
  const arPrev = A.afterRefresh;
  A.afterRefresh = () => {
    if (arPrev) arPrev();
    const b = document.body, on = isEmp(), p = on ? perm() : null;
    b.classList.toggle('emp-on', on); b.classList.toggle('emp-own', !!(p && p.emp));
    b.classList.toggle('emp-nocaja', !!(p && !p.caja)); b.classList.toggle('emp-noliq', !!(p && !p.liq)); b.classList.toggle('emp-pinon', on && pinOn());
    if (!on) { const c = $('#empChip'); if (c) c.remove(); return; }
    if (!tabAllowed(S.tab)) { S.tab = 'inicio'; setTimeout(() => A.refresh(), 0); return; }
    const sub = $('#abSub'), sd = curSede(); if (sub && S.tab !== 'inicio') sub.textContent = sd ? sedeName(sd) : 'Todos los centros';
    /* persona actual: un toque para cambiar */
    let chip = $('#empChip'); const per = pinOn() ? curPerson() : null;
    if (pinOn()) {
      if (!chip) { const t = document.querySelector('.ab-title'); if (t) { t.insertAdjacentHTML('afterend', '<button class="emp-chip" id="empChip" data-act="empWhoOpen" title="Cambiar de persona"></button>'); chip = $('#empChip'); } }
      if (chip) chip.innerHTML = '<span class="emp-av sm">' + esc(per ? per.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : '?') + '</span><span class="emp-chip-t">' + esc(per ? per.name.split(' ')[0] : 'Entrar') + '</span>';
    } else if (chip) chip.remove();
    if (needWhere() && !S.modal) { whereAsked = true; S.modal = { type: 'empWhere' }; A.renderModal(); return; }
    if (needWho() && (!S.modal || S.modal.type !== 'empWho')) { S.modal = { type: 'empWho' }; A.renderModal(); return; }
    /* sueldos del mes: se cargan solos como pendientes en el equipo del dueño */
    if ((devOwner() || !real()) && salGenDone !== curMonth()) { salGenDone = curMonth(); genSalaries(curMonth()); }
  };
  setInterval(() => { if (isEmp() && needWho() && !(S.modal && S.modal.type === 'empWho')) { S.modal = { type: 'empWho' }; A.renderModal(); } }, 20000);
  /* las ventanas de quién y dónde no se cierran solas */
  const rmPrev = A.renderModal;
  A.renderModal = () => { if (isEmp() && !S.modal && pinOn() && needWho()) S.modal = { type: 'empWho' }; return rmPrev(); };

  function genSalaries(m) {
    let n = 0;
    people().forEach(p => {
      const s = E.empo.sal[p.id]; if (!s || !(s.monto > 0)) return; const k = 'sal|' + m + '|' + p.id;
      if (E.empo.salMoves.some(x => x.key === k)) return;
      const day = Math.min(daysIn(m), Math.max(1, s.dia || 5));
      E.empo.salMoves.push({ id: A.uid(), key: k, date: m + '-' + pad(day), due: m + '-' + pad(day), type: 'egreso', cat: 'sueldos', desc: 'Sueldo ' + p.name + ' · ' + monthName(m), amount: s.monto, method: 'Transferencia', status: m < curMonth() ? 'pagado' : 'pendiente', loc: p.sede || firstSede(), person: p.id });
      n++;
    });
    if (n) save();
  }

  /* =====================================================================
     INICIO DEL DUEÑO: un recuadro por centro
     ===================================================================== */
  const inicioPrev = A.render.inicio;
  A.render.inicio = () => {
    if (!isEmp()) return inicioPrev();
    const p = perm();
    if (p.emp && !curSede()) return renderEmpHome();
    inicioPrev();
    const host = $('#view-inicio'), sd = curSede(); if (!host || !sd) return;
    host.insertAdjacentHTML('afterbegin', '<div class="emp-sedebar" style="--sc:' + esc(sedeColor(sd)) + '"><span class="emp-dot"></span><b>' + esc(sedeName(sd)) + '</b>' + (p.all ? '<button class="btn small" data-act="empSede" data-id="">← Todos los centros</button>' : '') + (!real() && devSede() ? '<button class="btn small" data-act="empTryScope" data-s="todo">Volver al equipo del dueño</button>' : '') + '</div>');
  };
  A.acts.empSede = el => { const id = el.getAttribute('data-id') || null; setSede(id); S.proSel = null; const go = el.getAttribute('data-go'); S.tab = go || (id ? S.tab : 'inicio'); A.refresh(); window.scrollTo(0, 0); };
  function warnings(sd, st, d) {
    const w = [], prev = prevWorkday(sd, d), c = cajaOf(sd);
    if (prev && !c.closes.some(x => x.date === prev)) w.push(['La caja del ' + A.fmtDMY(prev).slice(0, 5) + ' no se cerró.', 'caja']);
    if (st.unpaid) w.push([st.unpaid + ' atendido' + (st.unpaid > 1 ? 's' : '') + ' con saldo y sin cobro hoy.', 'agenda']);
    const low = (E.stock[sd] || []).filter(i => i.min > 0 && i.qty <= i.min); if (low.length) w.push(['Stock bajo: ' + low.slice(0, 2).map(i => i.name.split(' (')[0]).join(', ') + (low.length > 2 ? ' y ' + (low.length - 2) + ' más' : '') + '.', 'stock']);
    const venc = c.moves.filter(m => m.status === 'pendiente' && (m.due || m.date) <= d); if (venc.length) w.push([venc.length + ' pago' + (venc.length > 1 ? 's' : '') + ' pendiente' + (venc.length > 1 ? 's' : '') + ' vencido' + (venc.length > 1 ? 's' : '') + '.', 'caja']);
    if (!st.appts.length && !Object.keys(st.pros).length) w.push(['Sin actividad hoy.', '']);
    return w;
  }
  function prevWorkday(sd, d) {
    for (let i = 1; i <= 7; i++) { const k = A.add(d, -i); const had = dayList(k).some(a => a.type !== 'block' && a.status !== 'cancelado' && sedeOfAppt(a) === sd) || cajaOf(sd).moves.some(m => m.date === k); if (had) return k; }
    return null;
  }
  const bar = (v, max, col) => '<span class="emp-bar"><i style="width:' + Math.max(0, Math.min(100, max ? v / max * 100 : 0)) + '%;' + (col ? 'background:' + col : '') + '"></i></span>';
  function renderEmpHome() {
    const host = $('#view-inicio'); if (!host) return;
    const d = today(), st = dayStats(d), h = A.nowDate().getHours(), hi = h < 13 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
    const m = curMonth(), ms = monthStats(m, m)[m] || {}, L = sedes(), nowM = A.nowMin();
    let T = { ing: 0, egr: 0, turnos: 0, atend: 0, pros: 0, prod: 0, nPrac: 0, sinPrac: 0 };
    const CT = {}; L.forEach(l => { CT[l.id] = A.dayControl ? A.dayControl(d, l.id) : null; });
    L.forEach(l => { const o = st[l.id], c = CT[l.id]; T.ing += o.ing; T.egr += o.egr; T.turnos += o.appts.length; T.atend += o.atend; T.pros += Object.keys(o.pros).length; if (c) { T.prod += c.prod; T.nPrac += c.nPrac; T.sinPrac += c.sinPrac.length; } });
    const per = pinOn() ? curPerson() : null;
    let x = '<div class="emp-home"><div class="emp-hi"><div><h1>' + hi + (per ? ', ' + esc(per.name.split(' ')[0]) : '') + '</h1><p>' + esc(A.CLINIC) + ' · ' + esc(A.DOW ? A.DOW[A.dow(d)] : '') + ' ' + A.fmtDMY(d) + '</p></div><button class="btn small" data-act="tab" data-tab="empresa">Ver la empresa</button></div>';
    x += '<div class="emp-kpis"><div><span>Prácticas hoy</span><b>' + money(T.prod) + '</b><small>' + T.nPrac + ' realizadas' + (T.sinPrac ? ' · <span style="color:#a86f00">' + T.sinPrac + ' sin cargar</span>' : '') + '</small></div><div><span>Cobrado hoy</span><b>' + money(T.ing) + '</b></div><div><span>Gastado hoy</span><b>' + money(T.egr) + '</b></div><div class="' + (T.ing - T.egr < 0 ? 'neg' : 'pos') + '"><span>Saldo del día</span><b>' + money(T.ing - T.egr) + '</b></div><div><span>Turnos</span><b>' + T.atend + ' / ' + T.turnos + '</b><small>atendidos</small></div><div><span>Profesionales</span><b>' + T.pros + '</b><small>hoy</small></div></div>';
    x += '<div class="emp-cards">';
    L.forEach(l => {
      const o = st[l.id], prosIds = Object.keys(o.pros), g = E.empo.goals[l.id] || {}, mo = ms[l.id] || {};
      const next = o.appts.filter(a => a.status !== 'atendido' && a.status !== 'ausente' && a.start + (a.dur || 30) >= nowM).sort((a, b) => a.start - b.start).slice(0, 3);
      const w = warnings(l.id, o, d);
      x += '<section class="emp-card" style="--sc:' + esc(l.color) + '"><div class="ec-h"><span class="emp-dot"></span><div><b>' + esc(l.name) + '</b>' + (l.addr ? '<span>' + esc(l.addr) + '</span>' : '') + '</div><button class="btn small" data-act="empSede" data-id="' + esc(l.id) + '" data-go="agenda">Entrar</button></div>';
      const ct = CT[l.id];
      if (ct) x += '<div class="ec-prod"><div><span>Prácticas realizadas</span><b>' + money(ct.prod) + '</b><small>' + ct.nPrac + ' práctica' + (ct.nPrac === 1 ? '' : 's') + (ct.prod > ct.cob ? ' · ' + money(ct.prod - ct.cob) + ' sin cobrar' : '') + '</small></div>' + (Object.keys(ct.pros).filter(id => ct.pros[id].prod).length ? '<ul>' + Object.keys(ct.pros).filter(id => ct.pros[id].prod).sort((a, b) => ct.pros[b].prod - ct.pros[a].prod).map(id => '<li><span>' + esc(A.PRO(id).short || A.PRO(id).name) + '</span><span>' + ct.pros[id].n + ' · ' + money(ct.pros[id].prod) + '</span></li>').join('') + '</ul>' : '') + '</div>';
      if (ct && ct.sinPrac.length) w.unshift([ct.sinPrac.length + (ct.sinPrac.length > 1 ? ' atenciones' : ' atención') + ' sin práctica cargada (' + ct.sinPrac.slice(0, 2).map(z => A.PRO(z.pro).short || '').filter(Boolean).join(', ') + ').', 'caja']);
      x += '<div class="ec-money"><div><span>Ingresos</span><b>' + money(o.ing) + '</b></div><div><span>Egresos</span><b>' + money(o.egr) + '</b></div><div class="' + (o.ing - o.egr < 0 ? 'neg' : 'pos') + '"><span>Saldo</span><b>' + money(o.ing - o.egr) + '</b></div></div>';
      x += '<div class="ec-ag"><div class="ec-cnt"><span><b>' + o.appts.length + '</b> turnos</span><span class="ok"><b>' + o.atend + '</b> atendidos</span><span><b>' + (o.pend + o.wait) + '</b> por venir</span>' + (o.aus ? '<span class="bad"><b>' + o.aus + '</b> no vinieron</span>' : '') + '</div>' +
        (next.length ? '<ul class="ec-next">' + next.map(a => { const pt = a.pid && A.PAT(a.pid); return '<li><span class="mono">' + A.mm(a.start) + '</span><span>' + esc(pt ? pt.name : (a.name || 'Turno')) + '</span><span class="ec-pro">' + esc(A.PRO(a.pro).short || A.PRO(a.pro).name) + '</span></li>'; }).join('') + '</ul>' : '<p class="ec-none">' + (o.appts.length ? 'No quedan turnos por hoy.' : 'Sin turnos hoy.') + '</p>') + '</div>';
      x += '<div class="ec-pros">' + (prosIds.length ? prosIds.map(id => { const pr = A.PRO(id); return '<span class="ec-pr" style="--pc:' + esc(pr.color || l.color) + '">' + esc(pr.short || pr.name) + ' · ' + o.pros[id] + '</span>'; }).join('') : '<span class="hint">Sin profesionales hoy</span>') + '</div>';
      if (g.fact > 0) x += '<div class="ec-goal"><span>Meta de ' + esc(A.MON[parseInt(m.slice(5), 10) - 1].toLowerCase()) + ': ' + kmoney(mo.fact || 0) + ' de ' + kmoney(g.fact) + '</span>' + bar(mo.fact || 0, g.fact, l.color) + '</div>';
      if (w.length) x += '<ul class="ec-warn">' + w.map(z => '<li>' + esc(z[0]) + '</li>').join('') + '</ul>';
      x += '</section>';
    });
    x += '</div>';
    /* el mes, en una tabla corta */
    let fT = 0, cT = 0, eT = 0;
    x += '<section class="card emp-month"><h2>' + esc(monthName(m)) + ' hasta hoy</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Centro</th><th class="num">Facturado</th><th class="num">Cobrado</th><th class="num">Egresos</th><th class="num">Turnos</th></tr></thead><tbody>' +
      L.map(l => { const o = ms[l.id] || {}; fT += o.fact || 0; cT += o.cob || 0; eT += o.egr || 0; return '<tr><td><span class="emp-dot" style="background:' + esc(l.color) + '"></span> ' + esc(l.name) + '</td><td class="num">' + money(o.fact || 0) + '</td><td class="num">' + money(o.cob || 0) + '</td><td class="num">' + money(o.egr || 0) + '</td><td class="num">' + (o.turnos || 0) + '</td></tr>'; }).join('') +
      '<tr class="tot"><td><b>Total</b></td><td class="num"><b>' + money(fT) + '</b></td><td class="num"><b>' + money(cT) + '</b></td><td class="num"><b>' + money(eT) + '</b></td><td class="num"></td></tr></tbody></table></div>' +
      '<div class="row-btns"><button class="btn small" data-act="empGo" data-t="stats">Estadísticas</button><button class="btn small" data-act="empGo" data-t="liq">Liquidaciones</button><button class="btn small" data-act="empGo" data-t="report">Reporte del mes</button></div></section>';
    x += '</div>';
    host.innerHTML = x;
  }
  A.acts.empGo = el => { S.tab = 'empresa'; S.empTab = el.getAttribute('data-t'); A.refresh(); window.scrollTo(0, 0); };

  /* =====================================================================
     CAJA DE CADA CONSULTORIO: ingresos del día, egresos, cierre con arqueo
     ===================================================================== */
  const cajaPrev = A.render.caja;
  A.render.caja = () => {
    if (!isEmp() || S.cajaGral) return cajaPrev();
    const host = $('#view-caja'); if (!host) return;
    const sd = curSede(), p = perm();
    if (!sd && p.all) { host.innerHTML = cajaAll(); return; }
    host.innerHTML = cajaSede(sd || firstSede());
  };
  const EGC = () => (A.CASH_EG || [['insumos', 'Insumos'], ['alquiler', 'Alquiler'], ['servicios', 'Servicios'], ['sueldos', 'Sueldos'], ['otros', 'Otros']]);
  const catName = k => (A.cashCatName ? A.cashCatName(k) : k);
  const cdate = () => S.empCd || today();
  function cajaAll() {
    const d = cdate(), st = dayStats(d);
    let x = '<div class="emp-top"><h2>Caja de los centros</h2>' + dateNav() + '</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Centro</th><th class="num">Ingresos</th><th class="num">Egresos</th><th class="num">Saldo</th><th>Caja</th><th></th></tr></thead><tbody>';
    sedes().forEach(l => { const o = st[l.id], cl = cajaOf(l.id).closes.filter(c => c.date === d)[0]; x += '<tr><td><span class="emp-dot" style="background:' + esc(l.color) + '"></span> ' + esc(l.name) + '</td><td class="num">' + money(o.ing) + '</td><td class="num">' + money(o.egr) + '</td><td class="num">' + money(o.ing - o.egr) + '</td><td>' + (cl ? '<span class="chip ok">cerrada' + (cl.diff ? ' · ' + (cl.diff > 0 ? 'sobran ' : 'faltan ') + money(Math.abs(cl.diff)) : '') + '</span>' : d < today() ? '<span class="chip warn">sin cerrar</span>' : '<span class="chip">abierta</span>') + '</td><td><button class="btn small" data-act="empSede" data-id="' + esc(l.id) + '">Abrir</button></td></tr>'; });
    x += '</tbody></table></div><div class="row-btns"><button class="btn" data-act="empCajaGral">Caja general de la empresa</button></div><p class="hint">La caja general tiene los gastos de la empresa que no son de un centro (y los honorarios pagados desde Liquidaciones).</p>';
    return x;
  }
  A.acts.empCajaGral = () => { S.cajaGral = true; A.refresh(); const h = $('#view-caja'); if (h) h.insertAdjacentHTML('afterbegin', '<div class="emp-sedebar"><b>Caja general de la empresa</b><button class="btn small" data-act="empCajaBack">← Cajas de los centros</button></div>'); };
  A.acts.empCajaBack = () => { S.cajaGral = false; A.refresh(); };
  const tabPrev = A.acts.tab;
  A.acts.tab = el => { S.cajaGral = false; return tabPrev(el); };
  function dateNav() { const d = cdate(); return '<div class="emp-dnav"><button class="btn small" data-act="empCd" data-n="-1" aria-label="Día anterior">‹</button><input type="date" value="' + d + '" data-chg="empCdSet" aria-label="Día"><button class="btn small" data-act="empCd" data-n="1" aria-label="Día siguiente"' + (d >= today() ? ' disabled' : '') + '>›</button>' + (d !== today() ? '<button class="btn small" data-act="empCd" data-n="0">Hoy</button>' : '') + '</div>'; }
  A.acts.empCd = el => { const n = +el.getAttribute('data-n'); S.empCd = n ? A.add(cdate(), n) : today(); if (S.empCd > today()) S.empCd = today(); A.refresh(); };
  A.chg.empCdSet = el => { if (el.value) { S.empCd = el.value > today() ? today() : el.value; A.refresh(); } };
  function cajaSede(sd) {
    const d = cdate(), st = dayStats(d)[sd] || { ing: 0, egr: 0, cob: 0, pm: {} }, c = cajaOf(sd), cl = c.closes.filter(x => x.date === d)[0], p = perm();
    const egr = c.moves.filter(m => m.date === d && m.type === 'egreso' && m.status !== 'pendiente'), ing = c.moves.filter(m => m.date === d && m.type === 'ingreso' && m.status !== 'pendiente');
    const cobEf = st.pm.Efectivo || 0, inEf = ing.filter(m => m.method === 'Efectivo').reduce((s, m) => s + m.amount, 0), outEf = egr.filter(m => m.method === 'Efectivo').reduce((s, m) => s + m.amount, 0);
    const open = cl ? cl.open : (S.empOpen != null ? S.empOpen : lastCounted(sd, d)), exp = open + cobEf + inEf - outEf;
    let x = '<div class="emp-top"><h2><span class="emp-dot" style="background:' + esc(sedeColor(sd)) + '"></span> Caja · ' + esc(sedeName(sd)) + '</h2>' + dateNav() + '</div>';
    if (p.all) x += '<div class="row-btns"><button class="btn small" data-act="empSede" data-id="">← Todos los centros</button></div>';
    if (A.ctlCards) x += A.ctlCards(A.dayControl(d, sd), { closed: !!cl });
    x += '<div class="emp-kpis sm"><div><span>Cobros de pacientes</span><b>' + money(st.cob) + '</b></div><div><span>Otros ingresos</span><b>' + money(st.ing - st.cob) + '</b></div><div><span>Egresos</span><b>' + money(st.egr) + '</b></div><div class="' + (st.ing - st.egr < 0 ? 'neg' : 'pos') + '"><span>Saldo</span><b>' + money(st.ing - st.egr) + '</b></div></div>';
    x += '<div class="cols2"><section class="card"><h2>Cobros por medio de pago</h2>' + (Object.keys(st.pm).length ? '<table class="tbl"><tbody>' + Object.keys(st.pm).sort((a, b) => st.pm[b] - st.pm[a]).map(k => '<tr><td>' + esc(k) + '</td><td class="num">' + money(st.pm[k]) + '</td></tr>').join('') + '</tbody></table>' : '<p class="hint">Sin cobros este día.</p>') + '</section>';
    x += '<section class="card"><h2>Egresos e ingresos <span class="count">' + (egr.length + ing.length) + '</span></h2>' + (egr.length + ing.length ? '<ul class="emp-mv">' + ing.concat(egr).map(m => '<li><span><b>' + esc(m.desc || catName(m.cat)) + '</b><small>' + esc(catName(m.cat)) + ' · ' + esc(m.method || '') + (m.by ? ' · ' + esc(m.by) : '') + '</small></span><span class="num ' + (m.type === 'ingreso' ? 'pos' : '') + '">' + (m.type === 'ingreso' ? '+' : '−') + money(m.amount) + '</span>' + (cl ? '' : '<button class="kebab" data-act="empMvDel" data-sd="' + esc(sd) + '" data-id="' + m.id + '" aria-label="Quitar">✕</button>') + '</li>').join('') + '</ul>' : '<p class="hint">Todavía no hay movimientos.</p>') +
      (cl ? '' : '<div class="row-btns"><button class="btn small primary" data-act="empMvNew" data-sd="' + esc(sd) + '" data-t="egreso">+ Egreso</button><button class="btn small" data-act="empMvNew" data-sd="' + esc(sd) + '" data-t="ingreso">+ Otro ingreso</button></div>') + '</section></div>';
    x += '<section class="card"><h2>Cierre de caja</h2><table class="tbl"><tbody><tr><td>Efectivo inicial (cambio)</td><td class="num">' + (cl ? money(open) : '<input class="inp emp-num" inputmode="numeric" value="' + open + '" data-in="empOpen" aria-label="Efectivo inicial">') + '</td></tr><tr><td>Cobros en efectivo</td><td class="num">' + money(cobEf) + '</td></tr><tr><td>Otros ingresos en efectivo</td><td class="num">' + money(inEf) + '</td></tr><tr><td>Egresos en efectivo</td><td class="num">−' + money(outEf) + '</td></tr><tr><td><b>Efectivo que debería haber</b></td><td class="num"><b>' + money(exp) + '</b></td></tr></tbody></table>';
    if (cl) x += '<div class="seal"><b>Caja cerrada' + (cl.by ? ' por ' + esc(cl.by) : '') + '</b><span>Contado: ' + money(cl.counted) + ' · ' + (cl.diff === 0 ? 'sin diferencia' : (cl.diff > 0 ? 'sobran ' : 'faltan ') + money(Math.abs(cl.diff))) + (cl.note ? ' · ' + esc(cl.note) : '') + '</span></div>' + (p.emp || d === today() ? '<div class="row-btns"><button class="btn small" data-act="empClReopen" data-sd="' + esc(sd) + '">Reabrir</button></div>' : '');
    else x += '<div class="row2"><div class="field"><label for="empCount">Efectivo contado</label><input id="empCount" class="inp" inputmode="numeric" data-in="empCountIn" data-exp="' + exp + '" placeholder="Lo que hay en el cajón"></div><div class="field"><label for="empClNote">Observación</label><input id="empClNote" class="inp" placeholder="Opcional"></div></div><div class="hint" id="empClDiff"></div><div class="row-btns"><button class="btn primary" data-act="empClose" data-sd="' + esc(sd) + '" data-exp="' + exp + '" data-open="' + open + '">Cerrar la caja</button></div>';
    x += '</section>';
    /* últimos días */
    let rows = ''; for (let i = 0; i < 7; i++) { const k = A.add(d, -i), s2 = dayStats(k)[sd], c2 = c.closes.filter(z => z.date === k)[0]; if (!s2 || (!s2.ing && !s2.egr && !c2)) continue; rows += '<tr><td>' + A.fmtDMY(k) + '</td><td class="num">' + money(s2.ing) + '</td><td class="num">' + money(s2.egr) + '</td><td>' + (c2 ? (c2.diff ? '<span class="chip warn">' + (c2.diff > 0 ? '+' : '−') + money(Math.abs(c2.diff)) + '</span>' : '<span class="chip ok">ok</span>') : '<span class="chip">sin cerrar</span>') + '</td></tr>'; }
    if (rows) x += '<section class="card"><h2>Últimos días</h2><table class="tbl"><thead><tr><th>Día</th><th class="num">Ingresos</th><th class="num">Egresos</th><th>Cierre</th></tr></thead><tbody>' + rows + '</tbody></table></section>';
    const pend = c.moves.filter(m => m.status === 'pendiente');
    if (pend.length) x += '<section class="card"><h2>Pagos pendientes</h2><ul class="emp-mv">' + pend.map(m => '<li><span><b>' + esc(m.desc) + '</b><small>Vence ' + A.fmtDMY(m.due || m.date) + '</small></span><span class="num">' + money(m.amount) + '</span><button class="btn small" data-act="empMvPay" data-sd="' + esc(sd) + '" data-id="' + m.id + '">Pagado</button></li>').join('') + '</ul></section>';
    return x;
  }
  function lastCounted(sd, d) { const l = cajaOf(sd).closes.filter(c => c.date < d).sort((a, b) => (a.date < b.date ? 1 : -1))[0]; return l && l.keep != null ? l.keep : 20000; }
  A.ins.empOpen = el => { S.empOpen = num(el.value); };
  A.ins.empCountIn = el => { const exp = +el.getAttribute('data-exp'), v = num(el.value), o = $('#empClDiff'); if (!o) return; if (!el.value) { o.textContent = ''; return; } const df = v - exp; o.textContent = df === 0 ? 'Sin diferencia.' : (df > 0 ? 'Sobran ' : 'Faltan ') + money(Math.abs(df)) + '.'; o.className = 'hint' + (df ? ' bad' : ''); };
  A.acts.empClose = el => {
    const sd = el.getAttribute('data-sd'), exp = +el.getAttribute('data-exp'), open = +el.getAttribute('data-open'), cv = ($('#empCount') || {}).value;
    if (!cv) { A.toast('Escribí el efectivo contado.'); return; }
    const counted = num(cv), diff = counted - exp, d = cdate();
    cajaOf(sd).closes.push({ id: A.uid(), date: d, loc: sd, open, exp, counted, diff, keep: open, note: ($('#empClNote') || {}).value || '', by: whoName(), at: new Date().toISOString() });
    S.empOpen = null; audit('Cerró la caja del ' + A.fmtDMY(d) + ' de ' + sedeName(sd) + (diff ? ' (' + (diff > 0 ? 'sobran ' : 'faltan ') + money(Math.abs(diff)) + ')' : ' sin diferencia') + '.', sd); save(); A.refresh(); A.toast('Caja cerrada.');
  };
  A.acts.empClReopen = el => { const sd = el.getAttribute('data-sd'), d = cdate(), c = cajaOf(sd); c.closes = c.closes.filter(x => x.date !== d); audit('Reabrió la caja del ' + A.fmtDMY(d) + ' de ' + sedeName(sd) + '.', sd); save(); A.refresh(); };
  A.acts.empMvNew = el => { S.modal = { type: 'empMv', sd: el.getAttribute('data-sd'), t: el.getAttribute('data-t') }; A.renderModal(); };
  MF.empMv = m => {
    const cats = m.t === 'ingreso' ? (A.CASH_IN || [['oingreso', 'Otros ingresos']]) : EGC();
    return A.modalShell(m.t === 'ingreso' ? 'Otro ingreso · ' + sedeName(m.sd) : 'Egreso · ' + sedeName(m.sd),
      '<div class="field"><label for="emCat">Categoría</label><select id="emCat" class="inp">' + cats.map(c => '<option value="' + c[0] + '">' + esc(c[1]) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="emDesc">Detalle</label><input id="emDesc" class="inp" placeholder="' + (m.t === 'ingreso' ? 'Ej.: venta de cepillos' : 'Ej.: guantes, cadete, factura de luz') + '"></div>' +
      '<div class="row2"><div class="field"><label for="emAmt">Monto</label><input id="emAmt" class="inp" inputmode="numeric" placeholder="$"></div><div class="field"><label for="emMeth">Medio</label><select id="emMeth" class="inp">' + (A.METHODS || ['Efectivo', 'Transferencia']).map(x => '<option>' + esc(x) + '</option>').join('') + '</select></div></div>' +
      '<div class="row2"><div class="field"><label for="emDate">Fecha</label><input id="emDate" class="inp" type="date" value="' + cdate() + '"></div><div class="field"><label for="emSt">Estado</label><select id="emSt" class="inp"><option value="pagado">Pagado</option>' + (m.t === 'egreso' ? '<option value="pendiente">A pagar (pendiente)</option>' : '') + '</select></div></div><div class="hint bad" id="emMsg"></div>',
      '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="empMvSave">Guardar</button>');
  };
  A.acts.empMvSave = () => {
    const m = S.modal, amt = num($('#emAmt').value); if (!(amt > 0)) { $('#emMsg').textContent = 'Escribí el monto.'; return; }
    const st = $('#emSt').value, d = $('#emDate').value || today();
    const mv = { id: A.uid(), date: d, due: st === 'pendiente' ? d : undefined, type: m.t, cat: $('#emCat').value, desc: $('#emDesc').value.trim(), amount: amt, method: $('#emMeth').value, status: st, by: whoName() };
    cajaOf(m.sd).moves.push(mv); audit((m.t === 'ingreso' ? 'Ingreso' : 'Egreso') + ' en ' + sedeName(m.sd) + ': ' + (mv.desc || catName(mv.cat)) + ' ' + money(amt) + '.', m.sd);
    S.modal = null; A.renderModal(); save(); A.refresh(); A.toast('Guardado.');
  };
  A.acts.empMvDel = el => { const sd = el.getAttribute('data-sd'), c = cajaOf(sd), mv = c.moves.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!mv) return; c.moves = c.moves.filter(x => x !== mv); audit('Quitó ' + (mv.type === 'ingreso' ? 'el ingreso' : 'el egreso') + ' «' + (mv.desc || catName(mv.cat)) + '» de ' + money(mv.amount) + ' en ' + sedeName(sd) + '.', sd); save(); A.refresh(); A.toast('Movimiento quitado.', () => { c.moves.push(mv); save(); A.refresh(); }); };
  A.acts.empMvPay = el => { const sd = el.getAttribute('data-sd'), mv = cajaOf(sd).moves.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!mv) return; mv.status = 'pagado'; mv.date = today(); mv.by = whoName(); audit('Pagó «' + mv.desc + '» ' + money(mv.amount) + '.', sd); save(); A.refresh(); };

  /* =====================================================================
     SECCIÓN «EMPRESA» (solo el dueño y la administración)
     ===================================================================== */
  const ETABS = [['resumen', 'Resumen'], ['sedes', 'Centros'], ['personal', 'Personal'], ['liq', 'Liquidaciones'], ['stats', 'Estadísticas'], ['cobrar', 'Por cobrar'], ['metas', 'Metas'], ['stock', 'Stock'], ['equipos', 'Equipos'], ['registro', 'Registro'], ['report', 'Reporte']];
  const em = () => S.empM || curMonth();
  const monthNav = () => { const m = em(); return '<div class="emp-dnav"><button class="btn small" data-act="empM" data-n="-1" aria-label="Mes anterior">‹</button><b>' + esc(monthName(m)) + '</b><button class="btn small" data-act="empM" data-n="1" aria-label="Mes siguiente"' + (m >= curMonth() ? ' disabled' : '') + '>›</button></div>'; };
  A.acts.empM = el => { const n = +el.getAttribute('data-n'); S.empM = addMonth(em(), n); if (S.empM > curMonth()) S.empM = curMonth(); A.refresh(); };
  A.acts.empTab = el => { S.empTab = el.getAttribute('data-t'); A.refresh(); window.scrollTo(0, 0); };
  A.render.empresa = () => {
    const host = $('#view-empresa'); if (!host) return;
    if (!isEmp()) { host.innerHTML = '<section class="card"><h2>Modo Empresa</h2><p>Para manejar de 2 a 5 centros desde una sola cuenta.</p><button class="btn primary" data-act="empOn">Activar el modo Empresa</button></section>'; return; }
    const t = S.empTab || 'resumen', p = perm();
    let x = '<div class="emp-tabs" role="tablist">' + ETABS.filter(z => z[0] !== 'personal' || p.emp).map(z => '<button class="emp-t" role="tab" aria-selected="' + (t === z[0]) + '" data-act="empTab" data-t="' + z[0] + '">' + z[1] + '</button>').join('') + '</div>';
    const R = { resumen: tResumen, sedes: tSedes, personal: tPersonal, liq: tLiq, stats: tStats, cobrar: tCobrar, metas: tMetas, stock: tStock, equipos: tEquipos, registro: tRegistro, report: tReport }[t] || tResumen;
    x += '<div class="emp-body">' + R() + '</div>';
    host.innerHTML = x;
    if (t === 'equipos') loadDevices();
    const a = host.querySelector('.emp-t[aria-selected="true"]'); if (a && a.scrollIntoView) try { a.scrollIntoView({ block: 'nearest', inline: 'center' }); } catch (e) { /* nada */ }
  };

  /* ---------- Resumen del mes ---------- */
  function tResumen() {
    const m = em(), ms = monthStats(m, m)[m] || {}, ps = profShare(m), L = sedes(), gral = ms._gral || { egr: 0 };
    let T = { fact: 0, cob: 0, egr: 0, prof: 0, res: 0 };
    let x = '<div class="emp-top"><h2>Resumen</h2>' + monthNav() + '</div><div class="tbl-wrap"><table class="tbl emp-res"><thead><tr><th>Centro</th><th class="num">Facturado</th><th class="num">Cobrado</th><th class="num">A profesionales</th><th class="num">Egresos</th><th class="num">Le queda a la empresa</th></tr></thead><tbody>';
    L.forEach(l => { const o = ms[l.id] || {}, pr = (ps[l.id] || {}).dent || 0, res = (o.fact || 0) - pr - (o.egr || 0); T.fact += o.fact || 0; T.cob += o.cob || 0; T.egr += o.egr || 0; T.prof += pr; T.res += res; x += '<tr><td><span class="emp-dot" style="background:' + esc(l.color) + '"></span> ' + esc(l.name) + '</td><td class="num">' + money(o.fact || 0) + '</td><td class="num">' + money(o.cob || 0) + '</td><td class="num">' + money(pr) + '</td><td class="num">' + money(o.egr || 0) + '</td><td class="num ' + (res < 0 ? 'neg' : 'pos') + '"><b>' + money(res) + '</b></td></tr>'; });
    if (gral.egr) { T.egr += gral.egr; T.res -= gral.egr; x += '<tr><td>Gastos generales de la empresa</td><td></td><td></td><td></td><td class="num">' + money(gral.egr) + '</td><td class="num neg">−' + money(gral.egr) + '</td></tr>'; }
    x += '<tr class="tot"><td><b>Total</b></td><td class="num"><b>' + money(T.fact) + '</b></td><td class="num"><b>' + money(T.cob) + '</b></td><td class="num"><b>' + money(T.prof) + '</b></td><td class="num"><b>' + money(T.egr) + '</b></td><td class="num ' + (T.res < 0 ? 'neg' : 'pos') + '"><b>' + money(T.res) + '</b></td></tr></tbody></table></div>';
    x += '<p class="hint">«Le queda a la empresa» = lo facturado − la parte de los profesionales (según su porcentaje o el alquiler del módulo) − los egresos del centro, incluidos los sueldos pagados.</p>';
    x += '<div class="emp-mini">' + L.map(l => { const o = ms[l.id] || {}, occ = o.cap ? Math.round(o.mins / o.cap * 100) : 0; return '<div class="emp-mc" style="--sc:' + esc(l.color) + '"><b><span class="emp-dot"></span> ' + esc(l.name) + '</b><span>' + (o.turnos || 0) + ' turnos · ' + (o.atend || 0) + ' atendidos</span><span>Ocupación de la agenda: <b>' + occ + '%</b></span>' + bar(occ, 100, l.color) + '<span>Ausentes: ' + (o.turnos ? Math.round((o.aus || 0) / o.turnos * 100) : 0) + '% · nuevos: ' + (o.nuevos || 0) + '</span></div>'; }).join('') + '</div>';
    return x;
  }

  /* ---------- Centros y profesionales ---------- */
  function tSedes() {
    const L = sedes();
    let x = '<div class="emp-top"><h2>Centros</h2>' + (L.length < maxSedes() ? '<button class="btn small primary" data-act="empSedeEdit" data-id="">+ Centro</button>' : '') + '</div>' + (A.empTreeHTML ? A.empTreeHTML() : '') + '<div class="emp-sedes">';
    L.forEach(l => {
      const pros = A.PROS.filter(p => proSedes(p).indexOf(l.id) >= 0), staff = people().filter(p => p.sede === l.id);
      x += '<section class="card emp-sc" style="--sc:' + esc(l.color) + '"><div class="ec-h"><span class="emp-dot"></span><div><b>' + esc(l.name) + '</b><span>' + esc([l.addr, l.phone].filter(Boolean).join(' · ') || 'Sin dirección') + '</span></div><button class="btn small" data-act="empSedeEdit" data-id="' + esc(l.id) + '">Editar</button></div>' +
        '<h3 class="emp-h3">Profesionales (' + pros.length + ')</h3><div class="ec-pros">' + (pros.length ? pros.map(p => '<span class="ec-pr" style="--pc:' + esc(p.color || l.color) + '">' + esc(p.name) + '</span>').join('') : '<span class="hint">Ninguno todavía</span>') + '</div>' +
        '<h3 class="emp-h3">Personal (' + staff.length + ')</h3><div class="ec-pros">' + (staff.length ? staff.map(p => '<span class="ec-pr">' + esc(p.name) + ' · ' + esc(RN[p.role]) + '</span>').join('') : '<span class="hint">Nadie todavía</span>') + '</div>' +
        '<div class="row-btns"><button class="btn small" data-act="empSede" data-id="' + esc(l.id) + '" data-go="agenda">Ver agenda</button><button class="btn small" data-act="empSede" data-id="' + esc(l.id) + '" data-go="caja">Ver caja</button></div></section>';
    });
    x += '</div><section class="card"><h2>¿En qué centro atiende cada profesional?</h2><p class="hint">Tocá para marcar. Un profesional puede atender en más de uno; el primero que marques es su centro principal. Los horarios de cada uno se arman como siempre en «Centro, profesionales y horarios».</p><div class="tbl-wrap"><table class="tbl emp-assign"><thead><tr><th>Profesional</th>' + L.map(l => '<th class="c"><span class="emp-dot" style="background:' + esc(l.color) + '"></span> ' + esc(l.name) + '</th>').join('') + '</tr></thead><tbody>' +
      A.PROS.map(p => { const ps = proSedes(p); return '<tr><td>' + esc(p.name) + '</td>' + L.map(l => '<td class="c"><button class="emp-tg" aria-pressed="' + (ps.indexOf(l.id) >= 0) + '" data-act="empProSede" data-p="' + p.id + '" data-s="' + esc(l.id) + '" aria-label="' + esc(p.name + ' en ' + l.name) + '">' + (ps[0] === l.id ? '★' : ps.indexOf(l.id) >= 0 ? '✓' : '') + '</button></td>').join('') + '</tr>'; }).join('') + '</tbody></table></div></section>';
    x += '<section class="card"><h2>Ajustes del modo Empresa</h2><label class="chk"><input type="checkbox" data-chg="empPinReq"' + (E.staff.cfg.pinReq ? ' checked' : '') + '> <span>Pedir quién está usando el equipo (cada persona entra con su PIN)</span></label>' +
      '<div class="field" style="max-width:320px"><label for="empIdle">Volver a pedir el PIN después de</label><select id="empIdle" class="inp" data-chg="empIdle">' + [[5, '5 minutos sin usarlo'], [10, '10 minutos'], [20, '20 minutos'], [60, '1 hora'], [0, 'Nunca (solo al cambiar de persona)']].map(o => '<option value="' + o[0] + '"' + ((E.staff.cfg.idle == null ? 10 : E.staff.cfg.idle) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></div>' +
      '<div class="row-btns"><button class="btn small" data-act="empOff">Dejar el modo Empresa</button></div></section>';
    return x;
  }
  A.acts.empProSede = el => {
    const p = A.PROS.filter(z => z.id === el.getAttribute('data-p'))[0], sd = el.getAttribute('data-s'); if (!p) return;
    let ps = Array.isArray(p.sedes) ? p.sedes.filter(id => sedeById(id)) : [];
    if (ps.indexOf(sd) >= 0) { if (ps.length === 1) { A.toast('Cada profesional tiene que estar en al menos un centro.'); return; } ps = ps.filter(x => x !== sd); } else ps.push(sd);
    p.sedes = ps; audit(p.name + ': atiende en ' + ps.map(sedeName).join(', ') + '.'); A.save(); A.refresh();
  };
  A.chg.empPinReq = el => {
    if (el.checked && !people().some(p => p.pin && (p.role === 'dueno' || p.role === 'admin'))) { el.checked = false; A.toast('Primero cargá en Personal al menos un dueño o administrador con PIN, para no quedarte afuera.'); return; }
    E.staff.cfg.pinReq = el.checked; audit(el.checked ? 'Activó el ingreso con PIN.' : 'Desactivó el ingreso con PIN.'); save(); A.refresh();
  };
  A.chg.empIdle = el => { E.staff.cfg.idle = +el.value; save(); };
  A.acts.empSedeEdit = el => { const id = el.getAttribute('data-id'), l = id ? sedeById(id) : null; S.modal = { type: 'empSedeEd', id, f: Object.assign({ name: '', addr: '', phone: '', color: COLORS[sedes().length % 5] }, l || {}) }; A.renderModal(); };
  MF.empSedeEd = m => A.modalShell(m.id ? 'Editar centro' : 'Nuevo centro',
    '<div class="field"><label for="esN">Nombre</label><input id="esN" class="inp" value="' + esc(m.f.name) + '" placeholder="Ej.: Sede Centro"></div><div class="field"><label for="esA">Dirección</label><input id="esA" class="inp" value="' + esc(m.f.addr || '') + '"></div><div class="field"><label for="esP">Teléfono</label><input id="esP" class="inp" value="' + esc(m.f.phone || '') + '"></div>' +
    '<div class="field"><span class="lbl">Color</span><div class="row-btns">' + COLORS.concat(['#4d7c0f']).map(c => '<button class="emp-col" style="background:' + c + '" aria-pressed="' + (m.f.color === c) + '" data-act="empSedeCol" data-c="' + c + '" aria-label="Color"></button>').join('') + '</div></div><div class="hint bad" id="esMsg"></div>',
    (m.id && sedes().length > 2 ? '<button class="btn danger" data-act="empSedeDel">Quitar</button>' : '') + '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="empSedeSave">Guardar</button>');
  A.acts.empSedeCol = el => { S.modal.f.name = $('#esN').value; S.modal.f.addr = $('#esA').value; S.modal.f.phone = $('#esP').value; S.modal.f.color = el.getAttribute('data-c'); A.renderModal(); };
  A.acts.empSedeSave = () => {
    const m = S.modal, n = $('#esN').value.trim(); if (!n) { $('#esMsg').textContent = 'Escribí el nombre.'; return; }
    const f = { name: n, addr: $('#esA').value.trim(), phone: $('#esP').value.trim(), color: m.f.color };
    if (m.id) Object.assign(sedeById(m.id), f); else { if (sedes().length >= maxSedes()) { $('#esMsg').textContent = 'Tu plan llega hasta ' + maxSedes() + ' centros.'; return; } A.locs().push(Object.assign({ id: 'l' + A.uid(), kind: 'propio' }, f)); }
    audit((m.id ? 'Editó el centro ' : 'Agregó el centro ') + n + '.'); S.modal = null; A.renderModal(); A.save(); A.refresh();
  };
  A.acts.empSedeDel = () => {
    const m = S.modal, l = sedeById(m.id); if (!l) return;
    const used = Object.keys(A.S.days).some(d => (A.S.days[d] || []).some(a => a.loc === l.id && d >= today()));
    if (used) { $('#esMsg').textContent = 'Tiene turnos de hoy en adelante. Pasalos a otro centro antes de quitarlo.'; return; }
    if (!confirm('¿Quitar ' + l.name + '? Los turnos y cobros pasados quedan guardados.')) return;
    A.CFG.locs = sedes().filter(x => x.id !== l.id); A.PROS.forEach(p => { if (Array.isArray(p.sedes)) p.sedes = p.sedes.filter(x => x !== l.id); });
    audit('Quitó el centro ' + l.name + '.'); S.modal = null; A.renderModal(); A.save(); A.refresh();
  };

  /* ---------- Personal ---------- */
  function tPersonal() {
    const p = perm(), L = sedes();
    const list = E.staff.people.slice().sort((a, b) => (a.active === false) - (b.active === false) || (a.sede || '').localeCompare(b.sede || '') || a.name.localeCompare(b.name));
    let tot = 0;
    let x = '<div class="emp-top"><h2>Personal</h2><button class="btn small primary" data-act="empPerEdit" data-id="">+ Persona</button></div>';
    x += '<p class="hint">Secretarias, asistentes, administración y quien necesites. Cada persona puede tener un PIN para entrar en el equipo de su centro; los profesionales ya cargados también pueden tener su PIN.</p>';
    x += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nombre</th><th>Puesto</th><th>Centro</th><th>Horario</th>' + (p.sal ? '<th class="num">Sueldo</th>' : '') + '<th>PIN</th><th></th></tr></thead><tbody>' +
      list.map(z => { const s = E.empo.sal[z.id]; if (z.active !== false && s && s.monto) tot += s.monto; return '<tr' + (z.active === false ? ' class="off"' : '') + '><td><b>' + esc(z.name) + '</b>' + (z.phone ? '<div class="hint" style="margin:0">' + esc(z.phone) + '</div>' : '') + '</td><td>' + esc(RN[z.role] || z.role) + (z.role === 'profesional' && z.pro ? ' · ' + esc(A.PRO(z.pro).short || '') : '') + '</td><td>' + (z.sede ? '<span class="emp-dot" style="background:' + esc(sedeColor(z.sede)) + '"></span> ' + esc(sedeName(z.sede)) : 'Todos') + '</td><td>' + esc(z.horario || '') + '</td>' + (p.sal ? '<td class="num">' + (s && s.monto ? money(s.monto) : '—') + '</td>' : '') + '<td>' + (z.pin ? '<span class="chip ok">sí</span>' : '<span class="chip">no</span>') + '</td><td><button class="btn small" data-act="empPerEdit" data-id="' + z.id + '">Editar</button></td></tr>'; }).join('') +
      (p.sal && tot ? '<tr class="tot"><td colspan="4"><b>Sueldos por mes</b></td><td class="num"><b>' + money(tot) + '</b></td><td colspan="2"></td></tr>' : '') + '</tbody></table></div>';
    if (!list.length) x += '<p>Todavía no cargaste personal.</p>';
    if (p.sal) {
      const m = curMonth(), mv = E.empo.salMoves.filter(z => z.date.slice(0, 7) === m);
      x += '<section class="card"><h2>Sueldos de ' + esc(monthName(m)) + '</h2><p class="hint">Se cargan solos a principio de mes como pagos pendientes. Al marcarlos pagados, entran como egreso del centro de cada persona. Esta información la ve solo el dueño.</p>' +
        (mv.length ? '<ul class="emp-mv">' + mv.map(z => '<li><span><b>' + esc(z.desc) + '</b><small>' + esc(sedeName(z.loc)) + ' · ' + (z.status === 'pagado' ? 'pagado el ' + A.fmtDMY(z.paidAt || z.date) : 'vence ' + A.fmtDMY(z.due || z.date)) + '</small></span><span class="num">' + money(z.amount) + '</span>' + (z.status === 'pagado' ? '<button class="btn small" data-act="empSalUnpay" data-id="' + z.id + '">Deshacer</button>' : '<button class="btn small primary" data-act="empSalPay" data-id="' + z.id + '">Pagado</button>') + '</li>').join('') + '</ul>' : '<p class="hint">No hay sueldos cargados para este mes.</p>') + '</section>';
    }
    return x;
  }
  A.acts.empSalPay = el => { const z = E.empo.salMoves.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!z) return; z.status = 'pagado'; z.paidAt = today(); z.date = today(); audit('Pagó ' + z.desc + '.', z.loc); save(); A.refresh(); };
  A.acts.empSalUnpay = el => { const z = E.empo.salMoves.filter(x => x.id === el.getAttribute('data-id'))[0]; if (!z) return; z.status = 'pendiente'; z.date = z.due || z.date; delete z.paidAt; save(); A.refresh(); };
  A.acts.empPerEdit = el => { const id = el.getAttribute('data-id'), z = id ? personById(id) : null, s = (id && E.empo.sal[id]) || {}; S.modal = { type: 'empPer', id, f: Object.assign({ name: '', role: 'recepcion', sede: curSede() || firstSede(), phone: '', horario: '', active: true, pro: '' }, z || {}, { monto: s.monto || '', dia: s.dia || 5 }) }; A.renderModal(); };
  MF.empPer = m => {
    const f = m.f, p = perm();
    return A.modalShell(m.id ? 'Editar persona' : 'Nueva persona',
      '<div class="field"><label for="epN">Nombre y apellido</label><input id="epN" class="inp" value="' + esc(f.name) + '"></div>' +
      '<div class="row2"><div class="field"><label for="epR">Puesto</label><select id="epR" class="inp" data-chg="empPerRole">' + ROLES.filter(r => p.sal || r[0] !== 'dueno').map(r => '<option value="' + r[0] + '"' + (f.role === r[0] ? ' selected' : '') + '>' + esc(r[1]) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="epS">Centro</label><select id="epS" class="inp"><option value="">Todos</option>' + sedes().map(l => '<option value="' + esc(l.id) + '"' + (f.sede === l.id ? ' selected' : '') + '>' + esc(l.name) + '</option>').join('') + '</select></div></div>' +
      (f.role === 'profesional' ? '<div class="field"><label for="epPro">¿Qué profesional es?</label><select id="epPro" class="inp">' + A.PROS.map(z => '<option value="' + z.id + '"' + (f.pro === z.id ? ' selected' : '') + '>' + esc(z.name) + '</option>').join('') + '</select></div>' : '') +
      '<div class="row2"><div class="field"><label for="epT">Teléfono</label><input id="epT" class="inp" value="' + esc(f.phone || '') + '"></div><div class="field"><label for="epH">Horario</label><input id="epH" class="inp" value="' + esc(f.horario || '') + '" placeholder="Ej.: lun a vie · 8 a 14"></div></div>' +
      (p.sal ? '<div class="row2"><div class="field"><label for="epM">Sueldo mensual</label><input id="epM" class="inp" inputmode="numeric" value="' + esc(String(f.monto || '')) + '" placeholder="$ (opcional)"></div><div class="field"><label for="epD">Día de pago</label><input id="epD" class="inp" inputmode="numeric" value="' + esc(String(f.dia || 5)) + '"></div></div>' : '') +
      '<div class="field"><label for="epPin">' + (f.pin ? 'Cambiar el PIN (dejalo vacío para no cambiarlo)' : 'PIN para entrar (4 a 8 números)') + '</label><input id="epPin" class="inp" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password"></div>' +
      '<p class="hint">' + esc(roleHelp(f.role)) + '</p>' +
      (m.id ? '<label class="chk"><input type="checkbox" id="epAct"' + (f.active !== false ? ' checked' : '') + '> <span>Activo (si ya no trabaja, destildalo: queda en el registro)</span></label>' : '') + '<div class="hint bad" id="epMsg"></div>',
      '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="empPerSave">Guardar</button>');
  };
  const roleHelp = r => ({ dueno: 'Ve y maneja todo, en todos los centros.', admin: 'Ve todo, salvo los sueldos.', recepcion: 'Agenda, pacientes (sin la historia clínica) y caja de su centro.', profesional: 'Su agenda y la historia clínica de sus pacientes. No ve la caja.', asistente: 'Agenda e historia clínica. No ve la caja.', otro: 'No entra a la app; queda para el registro y los sueldos.' }[r] || '');
  A.chg.empPerRole = el => { const f = S.modal.f; f.name = $('#epN').value; f.sede = $('#epS').value; f.phone = $('#epT').value; f.horario = $('#epH').value; if ($('#epM')) { f.monto = $('#epM').value; f.dia = $('#epD').value; } f.role = el.value; if (f.role === 'profesional' && !f.pro) f.pro = (A.PROS[0] || {}).id; A.renderModal(); };
  A.acts.empPerSave = async () => {
    const m = S.modal, n = $('#epN').value.trim(), pin = $('#epPin').value.trim(), msg = $('#epMsg'); if (!n) { msg.textContent = 'Escribí el nombre.'; return; }
    if (pin && !/^\d{4,8}$/.test(pin)) { msg.textContent = 'El PIN tiene que tener de 4 a 8 números.'; return; }
    const role = $('#epR').value;
    if (pin && people().some(z => z.id !== m.id && z.pin && z.sede === ($('#epS').value || null))) { /* el PIN no tiene que ser único: se elige primero la persona */ }
    const z = m.id ? personById(m.id) : { id: A.uid(), active: true };
    Object.assign(z, { name: n, role, sede: $('#epS').value || null, phone: $('#epT').value.trim(), horario: $('#epH').value.trim(), pro: role === 'profesional' && $('#epPro') ? $('#epPro').value : null });
    if ($('#epAct')) z.active = $('#epAct').checked;
    if (pin) { const s = newSalt(); z.pin = { s, h: await pinHash(pin, s) }; }
    if (!m.id) E.staff.people.push(z);
    if ($('#epM')) { const mo = num($('#epM').value), dia = Math.min(28, Math.max(1, num($('#epD').value) || 5)); if (mo > 0) E.empo.sal[z.id] = { monto: mo, dia }; else delete E.empo.sal[z.id]; }
    audit((m.id ? 'Editó a ' : 'Sumó a ') + n + ' (' + (RN[role] || role) + ')' + (pin ? ', con PIN nuevo' : '') + '.');
    S.modal = null; A.renderModal(); salGenDone = ''; save(); A.refresh(); A.toast('Guardado.');
  };

  /* ---------- Liquidaciones de la empresa ---------- */
  function tLiq() {
    const m = em(), ps = profShare(m), L = sedes();
    let x = '<div class="emp-top"><h2>Liquidaciones</h2>' + monthNav() + '</div><p class="hint">Cuánto facturó cada profesional en cada centro, cuánto le corresponde (según su porcentaje o el alquiler del módulo) y cuánto le queda a la empresa. Para el detalle, las deducciones y marcar pagos, usá <button class="linkbtn" data-act="tab" data-tab="liq">Liquidaciones por profesional</button>.</p>';
    let G = { prod: 0, dent: 0 };
    L.forEach(l => {
      const o = ps[l.id] || { prod: 0, dent: 0, pros: {} }, ids = Object.keys(o.pros); G.prod += o.prod; G.dent += o.dent;
      x += '<section class="card"><h2><span class="emp-dot" style="background:' + esc(l.color) + '"></span> ' + esc(l.name) + '</h2>' + (ids.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Profesional</th><th class="num">Facturado</th><th class="num">Al profesional</th><th class="num">A la empresa</th></tr></thead><tbody>' +
        ids.map(id => { const q = o.pros[id], pr = A.PRO(id), paid = S.liq && S.liq.paid && S.liq.paid[A.liqKey ? A.liqKey(id, m) : m + '|' + id]; return '<tr><td>' + esc(pr.name) + (q.mod ? ' <span class="chip">módulo ' + money(q.mod) + '</span>' : '') + (paid ? ' <span class="chip ok">pagado</span>' : '') + '</td><td class="num">' + money(q.prod) + '</td><td class="num">' + money(q.dent) + '</td><td class="num">' + money(q.prod - q.dent) + '</td></tr>'; }).join('') +
        '<tr class="tot"><td><b>Total</b></td><td class="num"><b>' + money(o.prod) + '</b></td><td class="num"><b>' + money(o.dent) + '</b></td><td class="num"><b>' + money(o.prod - o.dent) + '</b></td></tr></tbody></table></div>' : '<p class="hint">Sin prestaciones cargadas este mes.</p>') + '</section>';
    });
    x += '<div class="emp-kpis sm"><div><span>Facturado total</span><b>' + money(G.prod) + '</b></div><div><span>A profesionales</span><b>' + money(G.dent) + '</b></div><div class="pos"><span>A la empresa</span><b>' + money(G.prod - G.dent) + '</b></div></div>';
    return x;
  }

  /* ---------- Estadísticas ---------- */
  function svgBars(months, series, fmt) {
    /* barras agrupadas por mes, un color por centro */
    const W = 640, H = 240, pl = 64, pb = 28, pt = 10, n = months.length, g = series.length || 1;
    let max = 0; series.forEach(s => s.v.forEach(v => { if (v > max) max = v; })); if (!max) max = 1;
    const step = (W - pl - 6) / n, bw = Math.max(3, Math.min(18, (step - 6) / g));
    let s = '<svg class="emp-chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gráfico">';
    for (let i = 0; i <= 4; i++) { const y = pt + (H - pt - pb) * (1 - i / 4); s += '<line x1="' + pl + '" x2="' + W + '" y1="' + y + '" y2="' + y + '" class="gl"/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end" class="ax">' + esc(fmt(max * i / 4)) + '</text>'; }
    months.forEach((m, i) => {
      const x0 = pl + i * step + (step - bw * g) / 2;
      series.forEach((se, j) => { const v = se.v[i] || 0, h = (H - pt - pb) * v / max; s += '<rect x="' + (x0 + j * bw) + '" y="' + (H - pb - h) + '" width="' + (bw - 1) + '" height="' + Math.max(0, h) + '" rx="2" fill="' + se.c + '"><title>' + esc(se.n + ' · ' + monthName(m) + ': ' + fmt(v)) + '</title></rect>'; });
      s += '<text x="' + (pl + i * step + step / 2) + '" y="' + (H - 8) + '" text-anchor="middle" class="ax">' + esc(monthShort(m)) + '</text>';
    });
    return s + '</svg>';
  }
  const legend = L => '<div class="emp-leg">' + L.map(l => '<span><i style="background:' + esc(l.color) + '"></i>' + esc(l.name) + '</span>').join('') + '</div>';
  function tStats() {
    const m1 = em(), n = S.empN || 12, m0 = addMonth(m1, -(n - 1)), ms = monthStats(m0, m1), L = sedes(), months = [];
    for (let i = 0; i < n; i++) months.push(addMonth(m0, i));
    const ser = f => L.map(l => ({ n: l.name, c: l.color, v: months.map(m => f((ms[m] || {})[l.id] || {})) }));
    const pctf = v => Math.round(v) + '%';
    let x = '<div class="emp-top"><h2>Estadísticas</h2><div class="emp-dnav"><select class="inp" data-chg="empN" aria-label="Período">' + [[6, 'Últimos 6 meses'], [12, 'Últimos 12 meses']].map(o => '<option value="' + o[0] + '"' + (n === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select>' + monthNav() + '</div></div>' + legend(L);
    const card = (t, sub, svg) => '<section class="card emp-st"><h2>' + t + '</h2>' + (sub ? '<p class="hint">' + sub + '</p>' : '') + svg + '</section>';
    x += '<div class="emp-stg">';
    x += card('Facturación', 'Prestaciones cargadas en cada centro.', svgBars(months, ser(o => o.fact || 0), kmoney));
    x += card('Resultado de caja', 'Cobrado más otros ingresos, menos egresos y sueldos.', svgBars(months, ser(o => Math.max(0, (o.ing || 0) - (o.egr || 0))), kmoney));
    x += card('Ocupación de la agenda', 'Horas con turno sobre las horas que atienden los profesionales.', svgBars(months, ser(o => (o.cap ? Math.min(100, o.mins / o.cap * 100) : 0)), pctf));
    x += card('Turnos atendidos', '', svgBars(months, ser(o => o.atend || 0), v => String(Math.round(v))));
    x += card('Ausentismo', 'Pacientes que no vinieron sobre el total de turnos.', svgBars(months, ser(o => (o.turnos ? (o.aus || 0) / o.turnos * 100 : 0)), pctf));
    x += card('Pacientes nuevos', '', svgBars(months, ser(o => o.nuevos || 0), v => String(Math.round(v))));
    x += '</div>';
    /* tabla del mes elegido */
    const cur = ms[m1] || {};
    x += '<section class="card"><h2>' + esc(monthName(m1)) + ' por centro</h2><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Centro</th><th class="num">Ticket promedio</th><th class="num">Ocupación</th><th class="num">Ausentismo</th><th class="num">Nuevos</th><th class="num">Presupuestos aceptados</th></tr></thead><tbody>' +
      L.map(l => { const o = cur[l.id] || {}; return '<tr><td><span class="emp-dot" style="background:' + esc(l.color) + '"></span> ' + esc(l.name) + '</td><td class="num">' + money(o.atend ? (o.fact || 0) / o.atend : 0) + '</td><td class="num">' + (o.cap ? Math.round(o.mins / o.cap * 100) : 0) + '%</td><td class="num">' + (o.turnos ? Math.round((o.aus || 0) / o.turnos * 100) : 0) + '%</td><td class="num">' + (o.nuevos || 0) + '</td><td class="num">' + (o.budPn ? (o.budAn || 0) + ' de ' + o.budPn + ' (' + Math.round((o.budA || 0) / (o.budP || 1) * 100) + '% del monto)' : '—') + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
    /* profesionales y prestaciones del mes */
    const pros = {}, cats = {}, egc = {};
    L.forEach(l => { const o = cur[l.id] || {}; Object.keys(o.pros || {}).forEach(id => { const q = pros[id] || (pros[id] = { fact: 0, turnos: 0 }); q.fact += o.pros[id].fact; q.turnos += o.pros[id].turnos; }); Object.keys(o.cats || {}).forEach(c => { cats[c] = (cats[c] || 0) + o.cats[c]; }); Object.keys(o.egrCat || {}).forEach(c => { egc[c] = (egc[c] || 0) + o.egrCat[c]; }); });
    Object.keys((cur._gral || {}).egrCat || {}).forEach(c => { egc[c] = (egc[c] || 0) + cur._gral.egrCat[c]; });
    const hbars = (obj, nameOf, fmt) => { const ks = Object.keys(obj).filter(k => obj[k] > 0).sort((a, b) => obj[b] - obj[a]).slice(0, 8), mx = ks.length ? obj[ks[0]] : 1; return ks.length ? '<ul class="emp-hb">' + ks.map(k => '<li><span>' + esc(nameOf(k)) + '</span>' + bar(obj[k], mx) + '<b>' + fmt(obj[k]) + '</b></li>').join('') + '</ul>' : '<p class="hint">Sin datos este mes.</p>'; };
    const pf = {}; Object.keys(pros).forEach(k => { pf[k] = pros[k].fact; });
    x += '<div class="cols2"><section class="card"><h2>Facturación por profesional</h2>' + hbars(pf, id => A.PRO(id).name, kmoney) + '</section><section class="card"><h2>Por tipo de prestación</h2>' + hbars(cats, c => (A.CAT_NAME && A.CAT_NAME[c]) || cap(String(c)), kmoney) + '</section></div>';
    x += '<section class="card"><h2>Gastos por categoría</h2>' + hbars(egc, catName, kmoney) + '</section>';
    return x;
  }
  A.chg.empN = el => { S.empN = +el.value; A.refresh(); };

  /* ---------- Por cobrar ---------- */
  function tCobrar() {
    const L = sedes(), by = {}; L.forEach(l => { by[l.id] = []; });
    A.PATS.forEach(p => {
      const pd = A.S.pd[p.id]; if (!pd || !pd.ledger || !pd.ledger.length) return; const s = A.saldo(p.id); if (s <= 0) return;
      let last = null; Object.keys(A.S.days).forEach(d => { (A.S.days[d] || []).forEach(a => { if (a.pid === p.id && a.type !== 'block' && a.status !== 'cancelado' && d <= today() && (!last || d > last.d)) last = { d, a }; }); });
      const sd = last ? sedeOfAppt(last.a) : mainSede(A.PRO(p.pro)); (by[sd] || (by[sd] = [])).push({ p, s, last: last ? last.d : null });
    });
    let tot = 0;
    let x = '<div class="emp-top"><h2>Por cobrar</h2></div><p class="hint">Pacientes con saldo a favor del centro, según su último turno. Tocá el nombre para abrir la cuenta.</p>';
    L.forEach(l => {
      const list = (by[l.id] || []).sort((a, b) => b.s - a.s), t = list.reduce((s, z) => s + z.s, 0); tot += t;
      x += '<section class="card"><h2><span class="emp-dot" style="background:' + esc(l.color) + '"></span> ' + esc(l.name) + ' <span class="count">' + money(t) + '</span></h2>' + (list.length ? '<ul class="emp-mv">' + list.slice(0, 25).map(z => '<li><span><button class="linkbtn" data-act="empPat" data-id="' + z.p.id + '"><b>' + esc(z.p.name) + '</b></button><small>' + (z.last ? 'Último turno ' + A.fmtDMY(z.last) : '') + (z.p.phone ? ' · ' + esc(z.p.phone) : '') + '</small></span><span class="num">' + money(z.s) + '</span></li>').join('') + '</ul>' + (list.length > 25 ? '<p class="hint">Y ' + (list.length - 25) + ' más.</p>' : '') : '<p class="hint">Nadie debe nada.</p>') + '</section>';
    });
    const pend = []; sedes().forEach(l => cajaOf(l.id).moves.forEach(mv => { if (mv.status === 'pendiente' && mv.type === 'ingreso') pend.push({ mv, l }); }));
    (S.cash && S.cash.moves || []).forEach(mv => { if (mv.status === 'pendiente' && mv.type === 'ingreso') pend.push({ mv, l: null }); });
    if (pend.length) x += '<section class="card"><h2>Obras sociales y otros ingresos a cobrar</h2><ul class="emp-mv">' + pend.map(z => '<li><span><b>' + esc(z.mv.desc || catName(z.mv.cat)) + '</b><small>' + esc(z.l ? z.l.name : 'Empresa') + ' · ' + A.fmtDMY(z.mv.due || z.mv.date) + '</small></span><span class="num">' + money(z.mv.amount) + '</span></li>').join('') + '</ul></section>';
    x += '<div class="emp-kpis sm"><div><span>Total de pacientes por cobrar</span><b>' + money(tot) + '</b></div></div>';
    return x;
  }
  A.acts.empPat = el => { const pid = el.getAttribute('data-id'); if (A.openFicha) A.openFicha(pid, 'cuenta'); else { S.tab = 'ficha'; S.fichaPid = pid; S.fichaTab = 'cuenta'; A.refresh(); } };

  /* ---------- Metas ---------- */
  function tMetas() {
    const m = em(), ms = monthStats(m, m)[m] || {}, L = sedes(), dIn = daysIn(m), dNow = m === curMonth() ? parseInt(today().slice(8), 10) : dIn, exp = dNow / dIn;
    let x = '<div class="emp-top"><h2>Metas del mes</h2>' + monthNav() + '</div><p class="hint">Metas mensuales de cada centro. La línea marca dónde deberías estar a esta altura del mes.</p><div class="emp-sedes">';
    L.forEach(l => {
      const g = E.empo.goals[l.id] || {}, o = ms[l.id] || {};
      const row = (lbl, k, v, fmt) => { const goal = g[k] || 0, pct = goal ? Math.round(v / goal * 100) : 0; return '<div class="emp-goal"><div class="eg-h"><span>' + lbl + '</span><b>' + fmt(v) + (goal ? ' de ' + fmt(goal) + ' · ' + pct + '%' : '') + '</b></div>' + (goal ? '<span class="emp-bar big"><i style="width:' + Math.min(100, pct) + '%;background:' + (v >= goal * exp ? 'var(--ok,#2e7d4f)' : '#c2571a') + '"></i><u style="left:' + Math.round(exp * 100) + '%"></u></span>' : '') + '<input class="inp emp-num" inputmode="numeric" placeholder="Meta" value="' + (goal || '') + '" data-chg="empGoal" data-s="' + esc(l.id) + '" data-k="' + k + '" aria-label="Meta de ' + lbl + '"></div>'; };
      x += '<section class="card emp-sc" style="--sc:' + esc(l.color) + '"><div class="ec-h"><span class="emp-dot"></span><div><b>' + esc(l.name) + '</b></div></div>' + row('Facturación', 'fact', o.fact || 0, kmoney) + row('Turnos atendidos', 'turnos', o.atend || 0, v => String(v)) + row('Pacientes nuevos', 'nuevos', o.nuevos || 0, v => String(v)) + '</section>';
    });
    return x + '</div>';
  }
  A.chg.empGoal = el => { const sd = el.getAttribute('data-s'), k = el.getAttribute('data-k'), g = E.empo.goals[sd] || (E.empo.goals[sd] = {}); g[k] = num(el.value); audit('Meta de ' + sedeName(sd) + ' (' + k + '): ' + g[k] + '.'); save(); A.refresh(); };

  /* ---------- Stock de insumos ---------- */
  function tStock() {
    const L = sedes(), p = perm(), only = !p.all ? curSede() : null;
    let x = '<div class="emp-top"><h2>Stock de insumos</h2></div><p class="hint">Cuando algo llega al mínimo, aparece el aviso en el inicio. Tocá − o + al usar o al reponer.</p><div class="emp-sedes">';
    L.filter(l => !only || l.id === only).forEach(l => {
      const list = E.stock[l.id] || [];
      x += '<section class="card emp-sc" style="--sc:' + esc(l.color) + '"><div class="ec-h"><span class="emp-dot"></span><div><b>' + esc(l.name) + '</b></div><button class="btn small" data-act="empStNew" data-s="' + esc(l.id) + '">+ Insumo</button></div>' +
        (list.length ? '<ul class="emp-stk">' + list.map(i => '<li class="' + (i.min > 0 && i.qty <= i.min ? 'low' : '') + '"><span><b>' + esc(i.name) + '</b><small>Mínimo ' + i.min + ' ' + esc(i.unit || '') + '</small></span><span class="emp-qty"><button class="btn small" data-act="empStQ" data-s="' + esc(l.id) + '" data-id="' + i.id + '" data-n="-1" aria-label="Uno menos">−</button><b>' + i.qty + '</b><button class="btn small" data-act="empStQ" data-s="' + esc(l.id) + '" data-id="' + i.id + '" data-n="1" aria-label="Uno más">+</button></span><button class="kebab" data-act="empStDel" data-s="' + esc(l.id) + '" data-id="' + i.id + '" aria-label="Quitar">✕</button></li>').join('') + '</ul>' : '<p class="hint">Sin insumos cargados.</p>') + '</section>';
    });
    return x + '</div>';
  }
  A.acts.empStNew = el => { S.modal = { type: 'empSt', sd: el.getAttribute('data-s') }; A.renderModal(); };
  MF.empSt = m => A.modalShell('Nuevo insumo · ' + sedeName(m.sd), '<div class="field"><label for="stN">Insumo</label><input id="stN" class="inp" placeholder="Ej.: guantes de nitrilo talle M"></div><div class="row2"><div class="field"><label for="stQ">Cantidad actual</label><input id="stQ" class="inp" inputmode="numeric"></div><div class="field"><label for="stM">Avisar cuando queden</label><input id="stM" class="inp" inputmode="numeric"></div></div><div class="field"><label for="stU">Unidad</label><input id="stU" class="inp" placeholder="cajas, cartuchos, unidades…"></div><div class="hint bad" id="stMsg"></div>', '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="empStSave">Guardar</button>');
  A.acts.empStSave = () => { const m = S.modal, n = $('#stN').value.trim(); if (!n) { $('#stMsg').textContent = 'Escribí el insumo.'; return; } (E.stock[m.sd] || (E.stock[m.sd] = [])).push({ id: A.uid(), name: n, unit: $('#stU').value.trim(), qty: num($('#stQ').value), min: num($('#stM').value) }); audit('Sumó el insumo ' + n + ' en ' + sedeName(m.sd) + '.', m.sd); S.modal = null; A.renderModal(); save(); A.refresh(); };
  A.acts.empStQ = el => { const sd = el.getAttribute('data-s'), i = (E.stock[sd] || []).filter(z => z.id === el.getAttribute('data-id'))[0]; if (!i) return; i.qty = Math.max(0, i.qty + (+el.getAttribute('data-n'))); i.at = new Date().toISOString(); save(); A.refresh(); };
  A.acts.empStDel = el => { const sd = el.getAttribute('data-s'), l = E.stock[sd] || [], i = l.filter(z => z.id === el.getAttribute('data-id'))[0]; if (!i) return; E.stock[sd] = l.filter(z => z !== i); audit('Quitó el insumo ' + i.name + ' de ' + sedeName(sd) + '.', sd); save(); A.refresh(); A.toast('Insumo quitado.', () => { E.stock[sd].push(i); save(); A.refresh(); }); };

  /* ---------- Equipos: a qué centro pertenece cada celular o compu ---------- */
  let DEV = null, devErr = '';
  async function loadDevices() {
    if (!real()) return;
    try { DEV = await CL.api('/rest/v1/rpc/ov_device_list', { method: 'POST', body: {} }); devErr = ''; } catch (e) { devErr = e.message || 'Sin conexión.'; }
    const h = $('#empDevs'); if (h && S.tab === 'empresa' && S.empTab === 'equipos') h.innerHTML = devHTML();
  }
  const scopeTxt = s => (s === 'todo' ? 'Dueño / administración' : s && s.indexOf('sede:') === 0 ? sedeName(s.slice(5)) : 'Sin asignar');
  function devHTML() {
    if (!real()) {
      const s = localScope();
      return '<p class="hint">Estás probando sin cuenta. Podés ver cómo se ve la app en el equipo de cada centro:</p><div class="row-btns">' + ['todo'].concat(sedes().map(l => 'sede:' + l.id)).map(v => '<button class="btn small' + (s === v ? ' primary' : '') + '" data-act="empTryScope" data-s="' + esc(v) + '">' + esc(scopeTxt(v)) + '</button>').join('') + '</div>';
    }
    if (devErr) return '<p class="hint bad">' + esc(devErr) + '</p>';
    if (!DEV) return '<p class="hint">Cargando…</p>';
    const opts = cur => '<option value="todo"' + (cur === 'todo' ? ' selected' : '') + '>Dueño / administración (ve todo)</option>' + sedes().map(l => '<option value="sede:' + esc(l.id) + '"' + (cur === 'sede:' + l.id ? ' selected' : '') + '>' + esc(l.name) + '</option>').join('') + (cur ? '' : '<option value="" selected>Sin asignar</option>');
    return '<ul class="emp-devs">' + (DEV.devices || []).map(d => '<li class="' + (d.scope ? '' : 'pend') + '"><span><b>' + esc(d.name || 'Equipo') + (d.id === DEV.me ? ' · este equipo' : '') + '</b><small>Último uso ' + (d.last_seen ? new Date(d.last_seen).toLocaleString('es-AR') : '—') + '</small></span>' + (devOwner() ? '<select class="inp" data-chg="empDevScope" data-id="' + esc(d.id) + '" aria-label="Centro del equipo">' + opts(d.scope) + '</select>' : '<span class="chip">' + esc(scopeTxt(d.scope)) + '</span>') + '</li>').join('') + '</ul><p class="hint">' + (DEV.devices || []).length + ' de ' + DEV.limit + ' equipos del plan. Para desconectar un equipo, usá Menú › Cuenta y equipos.</p>';
  }
  function tEquipos() {
    return '<div class="emp-top"><h2>Equipos</h2></div><p class="hint">Cada celular o compu pertenece a un centro y solo ve ese. Los equipos del dueño ven todo. Esto lo controla el servidor: un equipo de centro no puede leer los sueldos, las liquidaciones, las metas, la caja general ni la caja y el registro de los otros centros.</p><div id="empDevs">' + devHTML() + '</div>';
  }
  A.chg.empDevScope = async el => {
    const id = el.getAttribute('data-id'), sc = el.value || null; if (!sc) return;
    try {
      const r = await CL.api('/rest/v1/rpc/ov_device_scope', { method: 'POST', body: { p_id: id, p_scope: sc } });
      if (!r || !r.ok) { A.toast((r && r.msg) || 'No se pudo.'); loadDevices(); return; }
      audit('Asignó un equipo a ' + scopeTxt(sc) + '.'); A.toast('Listo.'); if (DEV && id === DEV.me) { CL.devScope = sc; afterScope(); } loadDevices();
    } catch (e) { A.toast(e.message || 'Sin conexión.'); }
  };
  A.acts.empTryScope = el => { LS.set('odontovoz.empScope', el.getAttribute('data-s')); const sd = devSede(); setSede(sd); S.tab = 'inicio'; A.refresh(); A.toast(sd ? 'Así se ve en el equipo de ' + sedeName(sd) + '. Para volver, tocá «Volver al equipo del dueño» arriba del inicio.' : 'Volviste al equipo del dueño.'); };

  /* ---------- Registro de lo que se hizo ---------- */
  function tRegistro() {
    const all = []; Object.keys(E.audit).forEach(b => E.audit[b].forEach(e => all.push(e)));
    all.sort((a, b) => (a.t < b.t ? 1 : -1));
    const f = S.empAuF || '', q = A.norm ? A.norm(S.empAuQ || '') : (S.empAuQ || '').toLowerCase();
    const list = all.filter(e => (!f || e.sede === f) && (!q || (A.norm ? A.norm(e.what + ' ' + e.who) : (e.what + ' ' + e.who).toLowerCase()).indexOf(q) >= 0)).slice(0, 300);
    let x = '<div class="emp-top"><h2>Registro</h2></div><p class="hint">Quién hizo cada cosa, desde qué equipo y cuándo. No se puede borrar desde la app.</p><div class="row2"><div class="field"><label for="auF">Centro</label><select id="auF" class="inp" data-chg="empAuF"><option value="">Todos</option>' + sedes().map(l => '<option value="' + esc(l.id) + '"' + (f === l.id ? ' selected' : '') + '>' + esc(l.name) + '</option>').join('') + '</select></div><div class="field"><label for="auQ">Buscar</label><input id="auQ" class="inp" value="' + esc(S.empAuQ || '') + '" data-chg="empAuQ" placeholder="Nombre, paciente, «caja»…"></div></div>';
    let lastDay = '';
    x += list.length ? '<ul class="emp-log">' + list.map(e => { const d = e.t.slice(0, 10), h = d !== lastDay ? '<li class="day">' + A.fmtDMY(d) + '</li>' : ''; lastDay = d; return h + '<li><span class="mono">' + new Date(e.t).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + '</span><span><b>' + esc(e.who) + '</b> ' + esc(e.what) + '<small>' + esc([e.sede ? sedeName(e.sede) : '', e.dev].filter(Boolean).join(' · ')) + '</small></span></li>'; }).join('') + '</ul>' : '<p class="hint">Todavía no hay movimientos registrados.</p>';
    return x;
  }
  A.chg.empAuF = el => { S.empAuF = el.value; A.refresh(); };
  A.chg.empAuQ = el => { S.empAuQ = el.value; A.refresh(); };

  /* ---------- Reporte mensual para el contador ---------- */
  function tReport() {
    const m = em();
    return '<div class="emp-top"><h2>Reporte del mes</h2>' + monthNav() + '</div><section class="card"><p>Ingresos, egresos, sueldos y liquidaciones de <b>' + esc(monthName(m)) + '</b>, por centro y en total. Sirve para el contador y para guardar.</p><div class="row-btns"><button class="btn primary" data-act="empRepPdf">Descargar PDF</button><button class="btn" data-act="empRepCsv">Descargar Excel</button></div><p class="hint">El Excel se descarga en formato CSV, que se abre con Excel o Google Sheets.</p></section>';
  }
  function repData(m) {
    const ms = monthStats(m, m)[m] || {}, ps = profShare(m), L = sedes(), rows = [];
    L.forEach(l => { const o = ms[l.id] || {}, pr = (ps[l.id] || {}).dent || 0; rows.push({ l, o, pr, res: (o.fact || 0) - pr - (o.egr || 0) }); });
    const moves = []; L.forEach(l => cajaOf(l.id).moves.forEach(mv => { if (mv.status !== 'pendiente' && mv.date.slice(0, 7) === m) moves.push({ sede: l.name, mv }); }));
    E.empo.salMoves.forEach(mv => { if (mv.status === 'pagado' && mv.date.slice(0, 7) === m) moves.push({ sede: sedeName(mv.loc), mv }); });
    (S.cash && S.cash.moves || []).forEach(mv => { if (mv.status !== 'pendiente' && mv.date.slice(0, 7) === m) moves.push({ sede: 'Empresa (general)', mv }); });
    moves.sort((a, b) => (a.mv.date < b.mv.date ? -1 : 1));
    return { ms, ps, rows, moves, gral: (ms._gral || {}).egr || 0 };
  }
  A.acts.empRepPdf = () => {
    const m = em(), D = repData(m), o = A.pdfDoc_ && A.pdfDoc_('Reporte de ' + monthName(m)); if (!o) return;
    o.head('Reporte mensual · ' + monthName(m), A.CLINIC + ' · ' + sedes().length + ' centros');
    o.h('Resultado por centro');
    let T = [0, 0, 0, 0, 0];
    o.table([{ h: 'Centro', w: 40 }, { h: 'Facturado', w: 24, a: 'r' }, { h: 'Cobrado', w: 24, a: 'r' }, { h: 'A profesionales', w: 26, a: 'r' }, { h: 'Egresos', w: 24, a: 'r' }, { h: 'Resultado', w: 26, a: 'r' }],
      D.rows.map(r => { T[0] += r.o.fact || 0; T[1] += r.o.cob || 0; T[2] += r.pr; T[3] += r.o.egr || 0; T[4] += r.res; return [r.l.name, money(r.o.fact || 0), money(r.o.cob || 0), money(r.pr), money(r.o.egr || 0), money(r.res)]; })
        .concat(D.gral ? [['Gastos generales', '', '', '', money(D.gral), '−' + money(D.gral)]] : [])
        .concat([{ c: ['Total', money(T[0]), money(T[1]), money(T[2]), money(T[3] + D.gral), money(T[4] - D.gral)], bold: true }]));
    o.h('Liquidaciones de los profesionales');
    const lr = []; sedes().forEach(l => { const q = D.ps[l.id]; if (!q) return; Object.keys(q.pros).forEach(id => lr.push([l.name, A.PRO(id).name, money(q.pros[id].prod), money(q.pros[id].dent), money(q.pros[id].prod - q.pros[id].dent)])); });
    if (lr.length) o.table([{ h: 'Centro', w: 34 }, { h: 'Profesional', w: 44 }, { h: 'Facturado', w: 26, a: 'r' }, { h: 'Al profesional', w: 28, a: 'r' }, { h: 'A la empresa', w: 28, a: 'r' }], lr); else o.p('Sin prestaciones cargadas.');
    o.h('Egresos e ingresos de caja');
    if (D.moves.length) o.table([{ h: 'Fecha', w: 18 }, { h: 'Centro', w: 30 }, { h: 'Categoría', w: 32 }, { h: 'Detalle', w: 56 }, { h: 'Monto', w: 24, a: 'r' }], D.moves.map(z => [A.fmtDMY(z.mv.date), z.sede, catName(z.mv.cat), z.mv.desc || '', (z.mv.type === 'ingreso' ? '+' : '−') + money(z.mv.amount)])); else o.p('Sin movimientos.');
    o.p('Facturado: prestaciones cargadas en el mes. A profesionales: según su porcentaje o el alquiler del módulo. Egresos: gastos y sueldos pagados de cada centro.', 8);
    audit('Descargó el reporte de ' + monthName(m) + ' (PDF).');
    o.finish('reporte-' + m + '.pdf');
  };
  A.acts.empRepCsv = () => {
    const m = em(), D = repData(m), q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"', n = v => String(Math.round(v || 0));
    const L = [['Reporte mensual', monthName(m), A.CLINIC], [], ['Centro', 'Facturado', 'Cobrado', 'A profesionales', 'Egresos', 'Resultado']];
    D.rows.forEach(r => L.push([r.l.name, n(r.o.fact), n(r.o.cob), n(r.pr), n(r.o.egr), n(r.res)]));
    if (D.gral) L.push(['Gastos generales', '', '', '', n(D.gral), n(-D.gral)]);
    L.push([], ['Liquidaciones'], ['Centro', 'Profesional', 'Facturado', 'Al profesional', 'A la empresa']);
    sedes().forEach(l => { const p = D.ps[l.id]; if (!p) return; Object.keys(p.pros).forEach(id => L.push([l.name, A.PRO(id).name, n(p.pros[id].prod), n(p.pros[id].dent), n(p.pros[id].prod - p.pros[id].dent)])); });
    L.push([], ['Movimientos de caja'], ['Fecha', 'Centro', 'Tipo', 'Categoría', 'Detalle', 'Medio', 'Monto']);
    D.moves.forEach(z => L.push([z.mv.date, z.sede, z.mv.type, catName(z.mv.cat), z.mv.desc || '', z.mv.method || '', n(z.mv.type === 'ingreso' ? z.mv.amount : -z.mv.amount)]));
    const csv = '﻿' + L.map(r => r.map(q).join(';')).join('\r\n'), blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    audit('Descargó el reporte de ' + monthName(m) + ' (Excel).');
    if (A.saveFile) A.saveFile('reporte-' + m + '.csv', blob); else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'reporte-' + m + '.csv'; a.click(); }
  };

  /* menú: activar el modo Empresa */
  function menuEntry() {
    const sec = document.querySelector('.dr-sec .acct-type'); if (!sec || $('#empMenuBtn')) return;
    sec.insertAdjacentHTML('afterend', '<button class="dnav only-noemp" id="empMenuBtn" data-act="empOn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-5h6v5"/></svg><span class="t">Modo Empresa (varios centros)</span></button>');
  }
  menuEntry();

  /* voz: «abrí la empresa», «centro norte» */
  const execPrev = A.cmd && A.cmd.exec;
  if (execPrev) A.cmd.exec = (text, opts) => {
    if (isEmp()) {
      const n = A.norm ? A.norm(String(text || '')) : String(text || '').toLowerCase();
      if (/^(?:abr[ií]|abrir|mostr[aá](?:me)?|ver|ir a)?\s*(?:la )?empresa$/.test(n) && perm().emp) { S.tab = 'empresa'; A.refresh(); return { ok: true, msg: 'Empresa.' }; }
      const mm = n.match(/^(?:abr[ií]|ver|ir a|cambi[aá] a)?\s*(?:el )?(?:centro|sede)\s+(.+)$/);
      if (mm && perm().all) { const q = mm[1].trim(), l = sedes().filter(z => (A.norm ? A.norm(z.name) : z.name.toLowerCase()).indexOf(q) >= 0)[0]; if (l) { setSede(l.id); A.refresh(); return { ok: true, msg: 'Centro ' + l.name + '.' }; } }
      if (/^(?:todos los centros|toda la empresa)$/.test(n) && perm().all) { setSede(null); A.refresh(); return { ok: true, msg: 'Todos los centros.' }; }
    }
    return execPrev(text, opts);
  };

  /* =====================================================================
     ESTILOS
     ===================================================================== */
  const css = document.createElement('style');
  css.textContent = [
    '.only-emp{display:none!important}body.emp-own .only-emp{display:flex!important}body.emp-on .only-noemp{display:none!important}',
    'body.emp-on.emp-nocaja [data-tab="caja"],body.emp-on.emp-noliq [data-tab="liq"]{display:none!important}',
    'body.emp-pinon .seg[aria-label="Ver como"]{display:none!important}',
    '.emp-dot{display:inline-block;width:11px;height:11px;border-radius:50%;background:var(--sc,var(--accent));flex:0 0 auto;vertical-align:middle}',
    '.emp-chip{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:3px 10px 3px 3px;font:600 13px inherit;cursor:pointer;margin-left:6px;max-width:150px}.emp-chip-t{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.emp-av{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--accent);color:#fff;font-weight:800;font-size:15px;flex:0 0 auto}.emp-av.sm{width:26px;height:26px;font-size:11px}',
    '.emp-home{display:flex;flex-direction:column;gap:14px}.emp-hi{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap}.emp-hi h1{margin:0;font-size:24px}.emp-hi p{margin:2px 0 0;color:var(--ink-2)}',
    '.emp-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}.emp-kpis>div{background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;min-width:0}.emp-kpis span{font-size:12.5px;color:var(--ink-2)}.emp-kpis b{font-size:20px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.emp-kpis small{font-size:12px;color:var(--ink-2)}.emp-kpis.sm b{font-size:17px}.emp-kpis .pos b,.num.pos,.pos>b{color:var(--ok,#2e7d4f)}.emp-kpis .neg b,.num.neg,.neg>b{color:var(--st-no,#c0392b)}',
    '.emp-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:12px}',
    '.emp-card{background:var(--surface);border:1px solid var(--line);border-top:5px solid var(--sc);border-radius:16px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;min-width:0}',
    '.ec-h{display:flex;align-items:center;gap:10px}.ec-h>div{flex:1;min-width:0;display:flex;flex-direction:column}.ec-h b{font-size:17px}.ec-h span:not(.emp-dot){font-size:12.5px;color:var(--ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ec-money{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;background:color-mix(in srgb,var(--sc) 7%,var(--surface));border-radius:12px;padding:8px}.ec-money div{display:flex;flex-direction:column;min-width:0}.ec-money span{font-size:12px;color:var(--ink-2)}.ec-money b{font-size:15px;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.ec-cnt{display:flex;flex-wrap:wrap;gap:4px 12px;font-size:13.5px;color:var(--ink-2)}.ec-cnt b{color:var(--ink);font-size:15px}.ec-cnt .ok b{color:var(--ok,#2e7d4f)}.ec-cnt .bad b{color:var(--st-no,#c0392b)}',
    '.ec-next{list-style:none;margin:6px 0 0;padding:0;display:flex;flex-direction:column;gap:3px}.ec-next li{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:8px;font-size:14px;align-items:baseline}.ec-next li span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ec-pro{color:var(--ink-2);font-size:12.5px}.ec-none{margin:6px 0 0;color:var(--ink-2);font-size:14px}',
    '.ec-pros{display:flex;flex-wrap:wrap;gap:5px}.ec-pr{font-size:12.5px;border-radius:999px;padding:2px 9px;background:color-mix(in srgb,var(--pc,var(--accent)) 12%,var(--surface));border:1px solid color-mix(in srgb,var(--pc,var(--accent)) 35%,transparent)}',
    '.ec-goal{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--ink-2)}',
    '.ec-prod{border:1px solid color-mix(in srgb,var(--sc) 30%,var(--line));border-radius:12px;padding:8px 10px;display:flex;flex-direction:column;gap:4px}.ec-prod>div{display:flex;flex-direction:column}.ec-prod span{font-size:12px;color:var(--ink-2)}.ec-prod b{font-size:17px;font-variant-numeric:tabular-nums}.ec-prod small{font-size:12.5px;color:var(--ink-2)}.ec-prod ul{list-style:none;margin:2px 0 0;padding:0;display:flex;flex-direction:column;gap:2px}.ec-prod li{display:flex;justify-content:space-between;gap:8px;font-size:13.5px}.ec-prod li span{color:var(--ink);font-size:13.5px}',
    '.emp-bar{display:block;position:relative;height:7px;border-radius:99px;background:color-mix(in srgb,var(--ink) 9%,transparent);overflow:visible;min-width:40px}.emp-bar i{display:block;height:100%;border-radius:99px;background:var(--accent)}.emp-bar.big{height:12px}.emp-bar u{position:absolute;top:-3px;bottom:-3px;width:2px;background:var(--ink);opacity:.5}',
    '.ec-warn{list-style:none;margin:0;padding:8px 10px;border-radius:10px;background:color-mix(in srgb,#d49a1f 13%,var(--surface));font-size:13.5px;display:flex;flex-direction:column;gap:3px}.ec-warn li::before{content:"⚠ ";color:#a86f00}',
    '.emp-sedebar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;border:1px solid var(--line);border-left:5px solid var(--sc,var(--accent));border-radius:12px;padding:8px 12px;margin-bottom:12px;background:var(--surface)}.emp-sedebar b{flex:1}',
    '.emp-tabs{display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none;position:sticky;top:0;z-index:3;background:var(--bg)}.emp-t{flex:0 0 auto;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:999px;padding:7px 14px;font:600 14px inherit;cursor:pointer}.emp-t[aria-selected="true"]{background:var(--accent);border-color:var(--accent);color:#fff}',
    '.emp-top{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:4px 0 10px}.emp-top h2{margin:0;display:flex;align-items:center;gap:8px}',
    '.emp-dnav{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.emp-dnav b{min-width:120px;text-align:center}.emp-dnav input,.emp-dnav select{min-height:36px}',
    '.emp-sedes{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px;margin-bottom:12px}.emp-sc{border-top:5px solid var(--sc)}.emp-h3{font-size:14px;margin:12px 0 6px;color:var(--ink-2)}',
    '.emp-assign td.c,.emp-assign th.c{text-align:center}.emp-tg{width:38px;height:34px;border-radius:9px;border:1px solid var(--line);background:var(--surface);font-weight:800;cursor:pointer;color:var(--accent)}.emp-tg[aria-pressed="true"]{background:color-mix(in srgb,var(--accent) 14%,var(--surface));border-color:var(--accent)}',
    '.emp-col{width:32px;height:32px;border-radius:50%;border:3px solid transparent;cursor:pointer}.emp-col[aria-pressed="true"]{border-color:var(--ink)}',
    '.emp-mv{list-style:none;margin:0;padding:0}.emp-mv li{display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--line)}.emp-mv li:first-child{border-top:0}.emp-mv li>span:first-child{flex:1;min-width:0;display:flex;flex-direction:column}.emp-mv small{color:var(--ink-2);font-size:12.5px}.emp-mv .num{font-variant-numeric:tabular-nums;white-space:nowrap}',
    '.emp-num{max-width:140px;text-align:right}.tbl tr.tot td{border-top:2px solid var(--line)}.tbl tr.off td{opacity:.55}.tbl-wrap{overflow-x:auto}',
    '.emp-mini{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-top:10px}.emp-mc{border:1px solid var(--line);border-left:5px solid var(--sc);border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:4px;font-size:13.5px;background:var(--surface)}',
    '.emp-stg{display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:12px}@media (max-width:520px){.emp-stg{grid-template-columns:1fr}}.emp-chart{width:100%;height:auto;display:block}.emp-chart .gl{stroke:var(--line);stroke-width:1}.emp-chart .ax{font-size:14px;fill:var(--ink-2)}',
    '.emp-leg{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 10px;font-size:13.5px}.emp-leg span{display:flex;align-items:center;gap:6px}.emp-leg i{width:12px;height:12px;border-radius:3px;display:inline-block}',
    '.emp-hb{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}.emp-hb li{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(60px,2fr) auto;gap:10px;align-items:center;font-size:13.5px}.emp-hb li span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.emp-hb b{font-variant-numeric:tabular-nums}',
    '.emp-goal{display:flex;flex-direction:column;gap:5px;padding:8px 0;border-top:1px solid var(--line)}.eg-h{display:flex;justify-content:space-between;gap:8px;font-size:14px;flex-wrap:wrap}',
    '.emp-stk{list-style:none;margin:0;padding:0}.emp-stk li{display:flex;align-items:center;gap:8px;padding:7px 0;border-top:1px solid var(--line)}.emp-stk li>span:first-child{flex:1;min-width:0;display:flex;flex-direction:column}.emp-stk small{font-size:12px;color:var(--ink-2)}.emp-stk li.low b{color:var(--st-no,#c0392b)}.emp-qty{display:flex;align-items:center;gap:6px}.emp-qty b{min-width:30px;text-align:center;font-size:16px}',
    '.emp-devs{list-style:none;margin:0;padding:0}.emp-devs li{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:9px 0;border-top:1px solid var(--line)}.emp-devs li>span:first-child{flex:1;min-width:180px;display:flex;flex-direction:column}.emp-devs small{color:var(--ink-2);font-size:12.5px}.emp-devs li.pend{background:color-mix(in srgb,#d49a1f 10%,transparent)}.emp-devs select{max-width:260px}',
    '.emp-log{list-style:none;margin:0;padding:0}.emp-log li{display:grid;grid-template-columns:52px minmax(0,1fr);gap:8px;padding:6px 0;border-top:1px solid var(--line);font-size:14px}.emp-log li.day{display:block;font-weight:700;color:var(--ink-2);border-top:0;padding-top:12px}.emp-log small{display:block;color:var(--ink-2);font-size:12px}',
    '.emp-people{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.emp-person{display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 8px;border:1px solid var(--line);border-radius:14px;background:var(--surface);color:var(--ink);cursor:pointer;font:inherit;text-align:center}.emp-person span:last-child{font-size:12.5px;color:var(--ink-2)}',
    '.emp-pin{font-size:28px;letter-spacing:.4em;text-align:center;max-width:220px}',
    '.emp-on-row{display:flex;align-items:center;gap:10px;margin-bottom:8px}.emp-on-row .inp{flex:1}.emp-list{margin:12px 0 0;padding-left:18px;font-size:14px;color:var(--ink-2)}',
    '.linkbtn{all:unset;color:var(--accent);cursor:pointer;text-decoration:underline}.linkbtn b{color:var(--ink)}',
    '@media (max-width:640px){.emp-cards{grid-template-columns:1fr}.emp-hi h1{font-size:21px}.emp-kpis{grid-template-columns:repeat(2,1fr)}.emp-kpis>div:nth-child(5){grid-column:span 2}.emp-sedes{grid-template-columns:1fr}.emp-chip-t{display:none}.emp-chip{padding:3px}}'
  ].join('');
  document.head.appendChild(css);
})();
