/* ===== 1.4: Navi conversa: cuántos turnos y lugares hay un día, «¿y el viernes?», pedidos encadenados, pantallas del menú y pregunta lo que falta ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, C = window.OVCmd;
  const NV = A.navi = { last: null, pending: null };
  const plural = (n, s, p) => n + ' ' + (n === 1 ? s : (p || s + 's'));
  const dayTxt = d => d === A.today() ? 'hoy' : (d === A.add(A.today(), 1) ? 'mañana' : 'el ' + A.fmtLong(d));
  const Cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const pros = () => {
    let L = (A.visPros ? A.visPros() : A.PROS) || [];
    try { const mb = A.memberNow && A.memberNow(); if (A.myProOnly && A.myProOnly() && mb && mb.pro) L = L.filter(p => p.id === mb.pro); } catch (e) { /* nada */ }
    return L;
  };
  const appts = d => { const ids = pros().map(p => p.id); let L = A.day(d).filter(a => a.type !== 'block' && a.status !== 'cancelado' && ids.indexOf(a.pro) >= 0); if (A.locKeep) try { L = L.filter(a => A.locKeep(a)); } catch (e) { /* nada */ } return L.sort((a, b) => a.start - b.start); };
  const free = d => { let out = []; pros().forEach(p => { (A.freeSlots ? A.freeSlots(p, d) : []).forEach(t => out.push({ t, pro: p })); }); return out.sort((a, b) => a.t - b.t); };
  const times = L => { const u = []; L.forEach(x => { const s = A.mm(x.t); if (u.indexOf(s) < 0) u.push(s); }); return u.length <= 3 ? u.join(', ').replace(/, ([^,]*)$/, ' y $1') : u.slice(0, 3).join(', ') + ' y ' + (u.length - 3) + ' más'; };
  const goAgenda = d => { S.date = d; S.tab = 'agenda'; if (S.modal && S.modal.type !== 'setup') S.modal = null; A.renderModal && A.renderModal(); A.refresh(); };

  function dayCount(r) {
    const d = r.date || A.today(), L = appts(d), closed = !pros().some(p => (A.hoursFor(p, d) || []).length);
    NV.last = { intent: 'dayCount', date: d };
    if (!L.length) return closed ? Cap(dayTxt(d)) + ' no atendés.' : Cap(dayTxt(d)) + ' no tenés turnos.';
    const done = L.filter(a => a.status === 'atendido').length;
    return Cap(dayTxt(d)) + ' tenés ' + plural(L.length, 'turno') + ', de ' + A.mm(L[0].start) + ' a ' + A.mm(L[L.length - 1].start) + (done ? ' (' + done + ' ya atendido' + (done > 1 ? 's' : '') + ')' : '') + '.';
  }
  function dayFree(r) {
    const d = r.date || A.today(), F = free(d), n = F.length;
    NV.last = { intent: 'dayFree', date: d, add: r.add };
    if (d < A.today()) return 'Ese día ya pasó.';
    if (!n) {
      const closed = !pros().some(p => (A.hoursFor(p, d) || []).length);
      return closed ? Cap(dayTxt(d)) + ' no atendés.' : (r.add ? 'No, ' + dayTxt(d) + ' está completo. Se puede dar como sobreturno.' : Cap(dayTxt(d)) + ' no te quedan turnos libres.');
    }
    let msg = (r.add ? 'Sí, ' + dayTxt(d) + ' te ' + (n === 1 ? 'queda ' : 'quedan ') : Cap(dayTxt(d)) + ' tenés ') + plural(n, 'turno libre', 'turnos libres') + ': ' + times(F) + '.';
    if (r.ask) { NV.pending = { date: d, start: F[0].t, pro: F[0].pro, at: Date.now() }; msg += ' ¿A quién agendo a las ' + A.mm(F[0].t) + '?'; }
    return msg;
  }
  function screen(r) {
    const fn = A.acts[r.act]; if (!fn) return null;
    if (A.hideDrawer) try { A.hideDrawer(); } catch (e) { /* nada */ }
    const el = { getAttribute: k => (k === 'data-tab' || k === 'data-t' ? r.sub : null), dataset: {}, closest: () => null };
    fn(el);
    const NAMES = { stkOpen: 'Stock de insumos', waOpen: 'Autogestión por WhatsApp', labAllOpen: 'Laboratorio', jrOpen: 'Cambios de hoy', planOpen: 'Mi plan', assistOpen: 'Asistente de voz', catalogOpen: 'Prácticas y aranceles', osOpen: 'Obras sociales', notifOpen: 'Avisos y sonidos', nfToggle: 'Avisos', importOpen: 'Mudanza', hcpOpen: 'Historias de papel', appearOpen: 'Apariencia', hcxOpen: 'Descargar historias clínicas', archOpen: 'Pacientes archivados', newsOpen: 'Novedades', fbOpen: 'Sugerencias', supportOpen: 'Soporte', tutVid: 'Videos tutoriales', plOpen: 'Cambiar de lugar', costOpen: 'Costos', myLiq: 'Tu liquidación', modeOpen: 'Modo prueba y uso real' };
    return r.act === 'cfgOpen' ? (r.sub === 'datos' ? 'Copia de seguridad.' : 'Centro, profesionales y horarios.') : (NAMES[r.act] || 'Listo') + '.';
  }

  /* lo que entiende esta capa; null = que siga el intérprete de siempre */
  function own(r, exec) {
    if (!r) return null;
    if (r.intent === 'dayCount') { if (r.dated) goAgenda(r.date); return { ok: true, msg: dayCount(r) }; }
    if (r.intent === 'dayFree') return { ok: true, msg: dayFree(r) };
    if (r.intent === 'screen') { const m = screen(r); return m ? { ok: true, msg: m } : null; }
    if (r.intent === 'follow') {
      const L = NV.last || { intent: S.tab === 'agenda' ? 'nav' : 'dayCount' };
      if (L.intent === 'dayFree') return { ok: true, msg: dayFree({ date: r.date }) };
      if (L.intent === 'nav') { goAgenda(r.date); NV.last = { intent: 'nav', date: r.date }; return { ok: true, msg: 'Agenda de ' + (r.date === A.today() ? 'hoy' : A.fmtLong(r.date)) + '.' }; }
      if (S.tab === 'agenda') goAgenda(r.date);
      return { ok: true, msg: dayCount({ date: r.date }) };
    }
    if (r.intent === 'multi') {
      const out = []; let okAll = true;
      r.steps.forEach(st => {
        let x = own(st, exec);
        if (!x) x = exec(st.text);
        if (st.intent === 'nav' && st.date) NV.last = { intent: 'nav', date: st.date };
        if (x && x.msg) out.push(/[.?!]$/.test(x.msg) ? x.msg : x.msg + '.');
        if (!x || !x.ok) okAll = false;
      });
      return { ok: okAll, msg: out.join(' ') };
    }
    return null;
  }

  const execPrev = A.cmd.exec;
  A.cmd.exec = function (text, o) {
    const run = t => execPrev.call(this, t, o);
    let r = null; try { r = C.parse(text, { today: A.today(), pros: A.PROS }); } catch (e) { r = null; }
    /* respuesta a «¿A quién agendo?» */
    const P = NV.pending;
    if (P && Date.now() - P.at < 90000) {
      if (r && /^(?:cancel|back|undo)$/.test(r.intent)) { NV.pending = null; return { ok: true, msg: 'Listo, no agendo a nadie.' }; }
      if (!r || r.intent === 'unknown' || r.intent === 'openPat') {
        NV.pending = null;
        const name = String(text || '').replace(/^\s*(?:a|al|a la|agenda(?:me|le)?(?: a)?|anota(?:me|le)?(?: a)?|pone(?:me|le)?(?: a)?|que venga|es|se llama)\s+/i, '').replace(/[.?!]+$/, '').trim();
        const d = A.parse(P.date), MON = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const pro = P.pro && pros().length > 1 ? ' con ' + (P.pro.short || P.pro.name) : '';
        return run('agendá a ' + name + ' el ' + d.getDate() + ' de ' + MON[d.getMonth()] + ' a las ' + A.mm(P.start) + pro);
      }
      NV.pending = null;
    }
    if (r && r.intent === 'nav' && r.tab === 'agenda' && r.date) NV.last = { intent: 'nav', date: r.date };
    let x = null; try { x = own(r, run); } catch (e) { if (A.logError) A.logError('navi', e); x = null; }
    return x || run(text);
  };
})();
