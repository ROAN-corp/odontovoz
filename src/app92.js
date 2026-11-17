/* ===== 1.10: planes a la vista (lista de obras sociales, aranceles por plan, plan al cobrar) y ventana de actualización ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const LSg = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  const LSs = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } };
  const payOf = it => { const q = it.qty || 1; if (it.free) return 0; if (!it.os) return it.price || 0; const md = it.os.mode || 'cos'; if (md === 'none' || md === 'free') return 0; if (md === 'part') return it.price || 0; if (md === 'dif') return it.os.cov > 0 ? Math.max(0, (it.price || 0) - it.os.cov * q) : (it.pay || 0); return (it.os.cos || 0) * q; };
  const baseOs = p => { const o = A.osOf ? A.osOf(p) : null; return o && o.base ? o.base : o; };

  /* =====================================================================
     1. LISTA DE OBRAS SOCIALES: cada una muestra sus planes
     ===================================================================== */
  const listPrev = MF.osList;
  if (listPrev) MF.osList = m => {
    const h = listPrev(m); if (typeof h !== 'string' || !A.osPlans) return h;
    return h.replace(/(<button class="os-row[^"]*" data-act="osEdit" data-id="([^"]+)"><span class="os-n"><b>[^<]*<\/b><small>[^<]*<\/small>)/g, (all, pre, id) => {
      const o = A.osById(id), L = o ? A.osPlans(o).filter(p => !p.txt) : [];
      return L.length ? pre + '<small class="osl-pl">Planes: ' + L.map(p => esc(p.name)).join(' · ') + '</small>' : pre;
    });
  };

  /* =====================================================================
     2. EN LA OBRA SOCIAL: pestañas «General · 604 · 1000» arriba de los aranceles
     ===================================================================== */
  const edPrev = MF.osEdit;
  if (edPrev) MF.osEdit = m => {
    const h = edPrev(m), o = A.osById(m.id); if (typeof h !== 'string' || !o || !(o.pl || []).length) return h;
    const tabs = '<div class="osp-tabs" role="tablist" aria-label="Ver aranceles de"><span>Ver aranceles de:</span><button class="pl-chip on" role="tab" aria-selected="true">General</button>' +
      o.pl.map(pl => '<button class="pl-chip" role="tab" aria-selected="false" data-act="ospEd" data-os="' + esc(o.id) + '" data-pl="' + esc(pl.id) + '">' + esc(pl.name) + '</button>').join('') + '</div>';
    return h.replace('<div class="block"><h3>Aranceles por práctica <small>(tabla general)</small></h3>', x => x + tabs);
  };
  /* la ventana de un plan: pestañas para saltar a otro plan o volver a la general */
  const plPrev = MF.ospEd;
  if (plPrev) MF.ospEd = m => {
    const h = plPrev(m), o = A.osById(m.os); if (typeof h !== 'string' || !o) return h;
    const tabs = '<div class="osp-tabs"><span>Ver aranceles de:</span><button class="pl-chip" data-act="ospBack">General</button>' +
      (o.pl || []).map(pl => '<button class="pl-chip' + (pl.id === m.pl ? ' on' : '') + '" data-act="ospGoPl" data-pl="' + esc(pl.id) + '">' + esc(pl.name) + '</button>').join('') + '</div>';
    return h.replace(/(<div class="field"><label for="ospName">)/, tabs + '$1');
  };
  A.acts.ospGoPl = el => { const m = S.modal; if (!m || m.type !== 'ospEd') return; m.pl = el.getAttribute('data-pl'); m.fresh = false; m.delAsk = 0; A.renderModal(); };

  /* =====================================================================
     3. AL COBRAR: si la obra social tiene planes, se elige el del paciente con un toque
        (queda guardado en la ficha y los importes se recalculan)
     ===================================================================== */
  const planBar = m => {
    const p = A.PAT(m.pid); if (!p) return '';
    const o = baseOs(p), L = o && A.osPlans ? A.osPlans(o).filter(x => !x.txt) : []; if (!L.length) return '';
    const cur = A.osPlanFor(o, p.plan);
    return '<div class="po-plan"><span>Plan de ' + esc(o.sigla) + ':</span>' +
      '<button type="button" class="pl-chip' + (!cur ? ' on' : '') + '" data-act="poPlan" data-pl="">' + (p.plan && !cur ? esc(p.plan) + ' (general)' : 'General') + '</button>' +
      L.map(x => '<button type="button" class="pl-chip' + (cur === x ? ' on' : '') + '" data-act="poPlan" data-pl="' + esc(x.name) + '">' + esc(x.name) + '</button>').join('') +
      (!cur ? '<small>¿Qué plan tiene? Tocalo y se usan sus valores.</small>' : '') + '</div>';
  };
  const okPrev = MF.pracOk;
  if (okPrev) MF.pracOk = m => {
    const h = okPrev(m); if (typeof h !== 'string' || !m || !m.pid) return h;
    const bar = planBar(m); if (!bar) return h;
    let done = false;
    const out = h.replace(/(<p class="po-who">[\s\S]*?<\/p>|<ul class="pw-list">)/, x => { done = true; return /^<ul/.test(x) ? bar + x : x + bar; });
    return done ? out : h;
  };
  A.acts.poPlan = el => {
    const m = S.modal; if (!m || m.type !== 'pracOk') return;
    const p = A.PAT(m.pid); if (!p) return;
    const nv = el.getAttribute('data-pl') || '';
    if (!nv && p.plan && !A.osPlanFor(baseOs(p), p.plan)) return;
    p.plan = nv; const pd = A.pd(m.pid); if (pd && pd.prof) pd.prof.plan = nv;
    if (A.touchPd) A.touchPd(m.pid); A.save();
    /* recalcular con los valores del plan: se vuelve a leer lo que anotó y se respetan las prácticas destildadas */
    if (m.txt) {
      try {
        const fresh = A.pracParse(m.txt, m.pid) || [];
        if (fresh.length === m.items.length) {
          fresh.forEach((it, i) => { const old = m.items[i]; it.on = old.on; it.free = old.free; it.why = old.why; if (old.os && it.os && old.os.mode) { it.os.mode = old.os.mode; it.pay = payOf(it); } });
          m.items = fresh;
        } else {
          const extra = m.items.slice(fresh.length); m.items = fresh.concat(extra.filter(i => !i.os || !i.a));
        }
      } catch (e) { if (A.logError) A.logError('poPlan', e); }
    }
    A.renderModal();
    A.toast(nv ? 'Plan ' + nv + ' guardado en la ficha. Importes actualizados.' : 'Se usan los valores generales.');
  };

  /* =====================================================================
     4. VENTANA DE ACTUALIZACIÓN
        Web: cuando el navegador ya bajó la versión nueva (aparece .upd-bar), se avisa con una ventana.
        APK: se compara con la versión publicada al abrir y al volver a la app (cada 30 min como mucho).
        «Más tarde» la esconde 12 horas para esa versión.
     ===================================================================== */
  const APK_URL = 'https://github.com/ROAN-corp/odontovoz/releases/latest/download/OdontoVoz.apk';
  const WEB_SW = 'https://odontovoz.com.ar/app/sw.js';
  const native = () => !!(window.OV_NATIVE || (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()));
  const cmpV = (a, b) => { const x = String(a || '').split('.').map(Number), y = String(b || '').split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d; } return 0; };
  const snoozed = v => { const t = +LSg('odontovoz.updLater.' + v, 0); return t && Date.now() - t < 12 * 3600000; };
  function pop(o) {
    if ($('#updPop') || snoozed(o.v)) return;
    const d = document.createElement('div'); d.id = 'updPop'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-labelledby', 'updPopT');
    d.innerHTML = '<div class="up-card"><div class="up-ic" aria-hidden="true">↻</div><h2 id="updPopT">Hay una versión nueva de OdontoVoz' + (o.name ? ' <span>(' + esc(o.name) + ')</span>' : '') + '</h2>' +
      '<p>' + esc(o.txt) + '</p><div class="up-b"><button type="button" class="btn primary" id="updGo">' + esc(o.btn) + '</button><button type="button" class="btn ghost" id="updLater">Más tarde</button></div>' +
      '<small>Tus datos no se tocan. Mientras tanto podés seguir usando esta versión.</small></div>';
    document.body.appendChild(d);
    d.querySelector('#updGo').onclick = () => { try { A.saveNow && A.saveNow(); } catch (e) { /* nada */ } o.go(); if (o.keep !== true) d.remove(); };
    d.querySelector('#updLater').onclick = () => { LSs('odontovoz.updLater.' + o.v, Date.now()); d.remove(); };
    setTimeout(() => { const b = d.querySelector('#updGo'); if (b) b.focus(); }, 50);
  }
  A.updPop = pop;
  /* web */
  function webCheck() {
    if (native()) return; const bar = $('.upd-bar'); if (!bar) return;
    pop({ v: 'web', txt: 'Ya está lista para usar. Tocá «Actualizar» y la app se recarga en unos segundos.', btn: 'Actualizar', go: () => { const b = $('.upd-bar button'); if (b) b.click(); else location.reload(); }, keep: true });
  }
  if (window.MutationObserver) new MutationObserver(webCheck).observe(document.body, { childList: true });
  setTimeout(webCheck, 1500);
  /* al volver a la app, el navegador busca si hay versión nueva */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (!native() && navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(r => { if (r) r.update().catch(() => {}); }).catch(() => {});
    if (native()) apkCheck();
  });
  /* APK */
  async function apkCheck(force) {
    if (!native()) return;
    const last = +LSg('odontovoz.updChk', 0); if (!force && Date.now() - last < 30 * 60000) return;
    LSs('odontovoz.updChk', Date.now());
    try {
      const t = await fetch(WEB_SW + '?t=' + Date.now(), { cache: 'no-store' }).then(r => r.text());
      const mv = /odontovoz-(\d+\.\d+(?:\.\d+)?)/.exec(t); if (!mv) return;
      const nv = mv[1], nm = (/NAME = '([^']+)'/.exec(t) || [])[1] || '';
      if (cmpV(nv, A.VBUILD || A.VERSION) > 0) pop({ v: 'apk' + nv, name: nm, txt: 'Tocá «Descargar», bajá el archivo e instalalo encima de la que tenés (si el celular pregunta, aceptá instalar).', btn: 'Descargar', go: () => { if (A.acts.nfUrl) A.acts.nfUrl({ getAttribute: () => APK_URL }); else window.open(APK_URL, '_system'); } });
    } catch (e) { /* sin conexión */ }
  }
  A.updCheck = () => apkCheck(true);
  setTimeout(() => apkCheck(), 4000);

  const css = document.createElement('style');
  css.textContent = '.osl-pl{display:block;color:var(--accent);font-size:.8rem;font-weight:600}' +
    '.osp-tabs{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0 10px}.osp-tabs>span{color:var(--ink-2);font-size:.85rem;margin-right:2px}' +
    '.po-plan{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0 10px;padding:8px 10px;border:1px dashed var(--line);border-radius:12px}.po-plan>span{font-weight:600;font-size:.9rem;margin-right:2px}.po-plan small{width:100%;color:var(--ink-2)}' +
    '#updPop{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '#updPop .up-card{background:var(--surface);color:var(--ink);border-radius:18px;max-width:380px;width:100%;padding:22px 20px;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,.3)}' +
    '#updPop .up-ic{width:52px;height:52px;margin:0 auto 8px;border-radius:50%;background:var(--accent-soft);color:var(--accent);font-size:28px;line-height:52px;font-weight:700}' +
    '#updPop h2{font-size:1.15rem;margin:4px 0 8px}#updPop h2 span{color:var(--ink-2);font-weight:500;font-size:.95rem}#updPop p{margin:0 0 14px;color:var(--ink-2)}' +
    '#updPop .up-b{display:flex;flex-direction:column;gap:8px}#updPop .up-b .btn{width:100%;padding:12px;font-size:1rem}#updPop small{display:block;margin-top:10px;color:var(--ink-2);font-size:.8rem}';
  document.head.appendChild(css);
})();
