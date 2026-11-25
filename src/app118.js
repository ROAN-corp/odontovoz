/* ===== 1.33: planes de tratamiento en PDF (hechos fuera de la aplicación) dentro de «Plan y presupuesto» ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.render || !A.render.planTab || !A.media) return;
  const MAXMB = 20;
  const list = pid => { const pd = A.pd(pid); return pd.planPdfs || (pd.planPdfs = []); };
  const mb = n => (n / 1048576 >= 1 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');
  const dmy = d => (A.fmtDMY ? A.fmtDMY(d) : d);
  const cardHTML = pid => {
    const L = list(pid).slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return '<section class="card pf-card" id="pfCard"><div class="pf-h"><div><h2>Plan de tratamiento en PDF <span class="count">' + L.length + '</span></h2><p class="hint" style="margin:2px 0 0">Para los planes que armás fuera de la aplicación (por ejemplo, ortodoncia): subí el PDF y queda en la ficha del paciente.</p></div>' +
      '<div class="pf-up"><input id="pfT" placeholder="Nombre (ej.: Plan de ortodoncia)" aria-label="Nombre del plan"><label class="btn primary filebtn">+ Subir PDF<input type="file" accept="application/pdf,.pdf" multiple hidden data-chg="pfFile"></label></div></div><div class="hint bad" id="pfMsg"></div>' +
      (L.length ? '<ul class="pf-list">' + L.map(x => '<li><span class="pf-ic" aria-hidden="true">📄</span><div class="pf-t"><b>' + esc(x.title || x.name) + '</b><small>' + dmy(x.date) + ' · ' + mb(x.size || 0) + (x.by ? ' · ' + esc(x.by) : '') + (x.title && x.title !== x.name ? ' · ' + esc(x.name) : '') + '</small></div><div class="pf-b"><button class="btn small" data-act="pfOpen" data-id="' + esc(x.id) + '">Abrir</button><button class="btn small" data-act="pfDl" data-id="' + esc(x.id) + '">Descargar</button><button class="btn small" data-act="pfRen" data-id="' + esc(x.id) + '" aria-label="Cambiar nombre">✎</button><button class="btn small danger" data-act="pfDel" data-id="' + esc(x.id) + '" aria-label="Quitar">✕</button></div></li>').join('') + '</ul>' : '<div class="empty">Todavía no subiste ningún PDF.</div>') + '</section>';
  };
  const prev = A.render.planTab;
  A.render.planTab = pid => cardHTML(pid) + prev(pid);
  const find = id => list(S.fichaPid).filter(x => x.id === id)[0];
  const blobOf = async x => { const d = await A.media.get(x.id); if (!d) return null; return (await fetch(d)).blob(); };
  A.chg.pfFile = async el => {
    const pid = S.fichaPid, files = Array.prototype.slice.call(el.files || []), msg = $('#pfMsg'), t = (($('#pfT') || {}).value || '').trim(); if (!files.length) return; let n = 0;
    for (const f of files) {
      if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) { if (msg) msg.textContent = '«' + f.name + '» no es un PDF.'; continue; }
      if (f.size > MAXMB * 1048576) { if (msg) msg.textContent = '«' + f.name + '» pesa más de ' + MAXMB + ' MB: comprimilo y probá de nuevo.'; continue; }
      try {
        const data = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(f); });
        const id = A.uid(); await A.media.put(id, data);
        list(pid).push({ id, name: f.name, title: files.length === 1 ? t : '', date: A.today(), size: f.size, by: (A.actor && A.actor().who) || '' }); n++;
        if (A.alog) A.alog(pid, 'plan', 'Subió el plan de tratamiento en PDF: ' + (t || f.name));
      } catch (e) { if (msg) msg.textContent = 'No se pudo guardar «' + f.name + '».'; }
    }
    el.value = ''; if (n) { A.touchPd(pid); A.refresh(); A.toast(n + (n === 1 ? ' PDF guardado' : ' PDF guardados') + ' en el plan de tratamiento.'); }
  };
  A.acts.pfOpen = async el => {
    const x = find(el.getAttribute('data-id')); if (!x) return; const b = await blobOf(x); if (!b) { A.toast('No encontré el archivo en este equipo. Probá de nuevo con internet.'); return; }
    const u = URL.createObjectURL(b), w = window.open(u, '_blank'); if (!w && A.saveFile) A.saveFile(x.name, b); setTimeout(() => URL.revokeObjectURL(u), 60000);
  };
  A.acts.pfDl = async el => { const x = find(el.getAttribute('data-id')); if (!x) return; const b = await blobOf(x); if (!b) { A.toast('No encontré el archivo en este equipo.'); return; } if (A.saveFile) A.saveFile(x.name, b); };
  A.acts.pfRen = el => { const x = find(el.getAttribute('data-id')); if (!x) return; const v = window.prompt('Nombre del plan:', x.title || x.name); if (v == null) return; x.title = v.trim(); A.touchPd(S.fichaPid); A.refresh(); };
  A.acts.pfDel = el => {
    const x = find(el.getAttribute('data-id')); if (!x || !window.confirm('¿Quitar «' + (x.title || x.name) + '» del plan de tratamiento?')) return;
    const pd = A.pd(S.fichaPid); pd.planPdfs = pd.planPdfs.filter(y => y.id !== x.id); try { A.media.del(x.id); } catch (e) { /* nada */ } A.touchPd(S.fichaPid);
    if (A.alog) A.alog(S.fichaPid, 'plan', 'Quitó el plan de tratamiento en PDF: ' + (x.title || x.name)); A.refresh(); A.toast('PDF quitado.');
  };
  const css = document.createElement('style');
  css.textContent = '.pf-h{display:flex;gap:12px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}.pf-h h2{margin:0}.pf-up{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.pf-up input{border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:10px;padding:9px 10px;font:inherit;min-width:200px}' +
    '.pf-list{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}.pf-list li{display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:12px;padding:8px 10px;background:var(--surface);flex-wrap:wrap}.pf-ic{font-size:1.5rem}.pf-t{flex:1;min-width:150px;display:flex;flex-direction:column}.pf-t small{color:var(--ink-2);font-size:.76rem;word-break:break-all}.pf-b{display:flex;gap:6px;flex-wrap:wrap}';
  document.body.appendChild(css);
})();
