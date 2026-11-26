/* ===== 1.46: «Prácticas de hoy»: tilde «Cobrar» por práctica (destildar = se hizo pero no se cobra, con motivo para la secretaría) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc;
  const money = n => A.money(Math.round(n || 0));
  const charged = it => it.on && !it.free && !(it.os && it.os.mode === 'free');

  /* el tilde de cada práctica pasa de «incluir» a «cobrar»; para sacar una que no se hizo hay un botón aparte */
  const prev = MF.pracOk;
  if (prev) MF.pracOk = function (m) {
    let h = prev.apply(this, arguments); if (typeof h !== 'string' || !m || !m.items) return h;
    /* primera pantalla («¿Quién cobra?»): cada práctica con su tilde «Cobrar» y, si se destilda, el motivo */
    if (h.indexOf('class="pw-list"') >= 0) {
      const on = m.items.map((it, i) => ({ it, i })).filter(x => x.it.on);
      const ul = '<ul class="pw-list pw-cobl">' + on.map(x => {
        const it = x.it, ok = charged(it), os = it.os && !ok ? '' : '';
        return '<li class="pw-it' + (ok ? '' : ' pw-nc') + '"><label class="pw-ck"><input type="checkbox" data-chg="poCob" data-i="' + x.i + '"' + (ok ? ' checked' : '') + ' aria-label="Se cobra ' + esc(it.label) + '"><span>Cobrar</span></label>' +
          '<span class="pw-l">' + esc(it.label) + (ok ? '' : '<input class="pw-why" data-in="poWhy" data-i="' + x.i + '" value="' + esc(it.why || '') + '" placeholder="¿Por qué no se cobra? (lo lee la secretaría)" aria-label="Motivo por el que no se cobra ' + esc(it.label) + '">') + '</span>' +
          '<b>' + (ok ? (it.os && !(it.pay > 0) ? '<small>' + esc(it.os.sigla || 'obra social') + '</small>' : money(it.pay)) : '<small>No se cobra</small>') + '</b></li>' + os;
      }).join('') + '</ul><p class="po-cobhint">Tildá lo que se cobra. <b>Destildá lo que hiciste pero no querés cobrar</b> (por ejemplo la consulta): queda en la historia clínica y escribís el motivo para la secretaría.</p>';
      h = h.replace(/<ul class="pw-list">[\s\S]*?<\/ul>/, ul);
      if (on.length && !on.some(x => x.it.os) && on.every(x => !(+x.it.pay > 0))) h = h.replace(/<h3 class="pw-q">[\s\S]*?<\/button><\/div><div class="pw-more">/, '<div class="pw-btns pw-one"><button class="pw-b primary" data-act="pwFree"><b>Guardar · no se cobra nada</b><small>Queda en la historia clínica con el motivo</small></button></div><div class="pw-more">');
      return h;
    }
    h = h.replace(/<label class="po-chk"><input type="checkbox" data-chg="poOn" data-i="(\d+)"[^>]*><\/label>/g, (all, i) => {
      const it = m.items[+i]; if (!it) return all;
      if (!it.on) return '<span class="po-chk po-cob"><button type="button" class="po-back" data-act="poBack" data-i="' + i + '">Volver a sumar</button></span>';
      return '<span class="po-chk po-cob"><label><input type="checkbox" data-chg="poCob" data-i="' + i + '"' + (charged(it) ? ' checked' : '') + ' aria-label="Se cobra ' + esc(it.label) + '"><span>Cobrar</span></label>' +
        '<button type="button" class="po-quit" data-act="poDrop" data-i="' + i + '" title="No la hice: sacarla de la lista" aria-label="Sacar ' + esc(it.label) + ' de la lista">✕</button></span>';
    });
    h = h.replace('<ul class="po-list">', '<p class="po-cobhint">Tildá lo que se cobra. <b>Destildá lo que hiciste pero no querés cobrar</b> (por ejemplo la consulta): queda registrado en la historia clínica, no se cobra y escribís el motivo para que lo lea la secretaría. La ✕ saca lo que no hiciste.</p><ul class="po-list">');
    /* si todo lo que queda es sin cobro, no tiene sentido «Cobrar $0 →» */
    const on = m.items.filter(i => i.on);
    if (on.length && !on.some(i => i.os) && on.every(i => !(+i.pay > 0))) h = h.replace(/<button class="btn" data-act="poGo" data-k="later">Cobrar después<\/button><button class="btn primary" data-act="poWho">[^<]*<\/button>/, '<button class="btn primary" data-act="poGo" data-k="later">Guardar · no se cobra nada</button>');
    return h;
  };
  const el = (i, v) => ({ getAttribute: () => String(i), value: v });
  A.chg.poCob = e => {
    const i = +e.getAttribute('data-i'), m = S.modal, it = m && m.items && m.items[i]; if (!it) return;
    if (e.checked) {
      if (it.os && it.os.mode === 'free') A.chg.poCm(el(i, it.os._prev && it.os._prev !== 'free' ? it.os._prev : (it.os.cos > 0 ? 'cos' : 'none')));
      else A.chg.poFree(el(i, ''));
    } else {
      if (it.os) { if (it.os.mode !== 'free') it.os._prev = it.os.mode; A.chg.poCm(el(i, 'free')); }
      else A.chg.poFree(el(i, '1'));
      const n = document.querySelector('[data-in="poWhy"][data-i="' + i + '"]'); if (n) { n.focus(); try { n.scrollIntoView({ block: 'center' }); } catch (x) { /* nada */ } }
    }
  };
  A.acts.pwFree = () => {
    const m = S.modal; if (!m) return; m.who = 'pro';
    A.acts.poGo({ getAttribute: x => (x === 'data-k' ? 'later' : null), dataset: { k: 'later' } });
  };
  A.acts.poDrop = e => { const m = S.modal, it = m && m.items && m.items[+e.getAttribute('data-i')]; if (!it) return; it.on = false; A.renderModal(); };
  A.acts.poBack = e => { const m = S.modal, it = m && m.items && m.items[+e.getAttribute('data-i')]; if (!it) return; it.on = true; A.renderModal(); };

  /* en «Para cobrar»: lo que el profesional dejó sin cobrar en esa visita, con su motivo */
  const pcPrev = A.pcHTML;
  if (pcPrev) A.pcHTML = function () {
    const h = pcPrev.apply(this, arguments); if (typeof h !== 'string' || h.indexOf('pc-it') < 0) return h;
    let L = []; try { L = A.pcList(); } catch (x) { return h; }
    return h.replace(/<li class="pc-it">([\s\S]*?)<\/li>/g, (all, inner) => {
      const pid = (inner.match(/data-pid="([^"]+)"/) || [])[1], it = L.filter(x => x.pid === pid)[0], pd = pid && A.S.pd[pid]; if (!it || !pd) return all;
      const ds = {}; it.items.forEach(e => { ds[e.date] = 1; });
      const fr = (pd.ledger || []).filter(e => e.type === 'cargo' && e.free && !e.voided && ds[e.date]);
      if (!fr.length) return all;
      const txt = fr.map(e => esc(String(e.desc || '').split(' · ')[0]) + (e.freeWhy ? ' (' + esc(e.freeWhy) + ')' : '')).join(' · ');
      return all.replace('</li>', '<div class="pc-free"><b>No se cobra:</b> ' + txt + '</div></li>');
    });
  };

  const css = document.createElement('style'); css.id = 'ovApp129';
  css.textContent = '.pw-cobl li.pw-it{display:flex;flex-wrap:nowrap;align-items:flex-start;gap:10px}.pw-ck{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;font-weight:600;color:var(--ink-2);cursor:pointer;min-width:46px}.pw-l{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}.pw-why{width:100%;box-sizing:border-box;font:inherit;padding:8px 10px;border:1px solid var(--warn);border-radius:8px;background:var(--surface);color:var(--ink)}.pw-nc .pw-l{color:var(--ink-2)}.pw-one{grid-template-columns:1fr!important}.po-cob{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:52px}.po-cob label{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;font-weight:600;color:var(--ink-2);cursor:pointer}.po-quit{border:0;background:transparent;color:var(--ink-2);font-size:13px;line-height:1;padding:4px 8px;border-radius:8px;cursor:pointer}.po-quit:hover{background:var(--surface-2);color:var(--red)}.po-back{border:1px solid var(--line);background:var(--surface);color:var(--accent);border-radius:8px;font-size:11px;padding:5px 7px;cursor:pointer}.po-cobhint{margin:6px 0 8px;font-size:12.5px;line-height:1.4;color:var(--ink-2)}.pc-free{flex-basis:100%;width:100%;margin:6px 0 0;padding:6px 10px;border-left:3px solid var(--warn);background:var(--surface-2);border-radius:6px;font-size:12.5px;line-height:1.35}.pc-it{flex-wrap:wrap}';
  document.head.appendChild(css);
})();
