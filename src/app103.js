/* ===== 1.20: foto del paciente en el buscador y la lista (se carga tocando la cara), nombre de fase completo en el plan y «Ficha completa» con textura ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, $ = q => document.querySelector(q);

  /* ---------- foto chiquita (solo si el paciente la autorizó; si no, iniciales) ---------- */
  const pdOf = pid => (S.pd && S.pd[pid]) || {};
  function avSm(pid, cls) {
    const p = A.PAT(pid); if (!p) return '';
    const pd = pdOf(pid), ini = ((p.first || '?').charAt(0) + (p.last || '').charAt(0)).toUpperCase();
    return pd.avatar && pd.photoOK ? '<img class="avatar ' + cls + '" alt="" src="' + esc(pd.avatar) + '">' : '<span class="avatar ini ' + cls + '" aria-hidden="true">' + esc(ini) + '</span>';
  }
  A.avatarSm = avSm;

  /* la foto de la ficha resumida y de la ficha completa se toca para cambiarla */
  const avPrev = A.avatarHTML;
  if (avPrev) A.avatarHTML = pid => '<button type="button" class="av-btn" data-act="avEdit" data-pid="' + esc(pid) + '" aria-label="Foto del paciente: tocá para cambiarla" title="Foto del paciente">' + avPrev(pid) + '</button>';

  function deco() {
    document.querySelectorAll('.res[data-pid]:not(.has-pav)').forEach(r => {
      const pid = r.getAttribute('data-pid'); if (!A.PAT(pid)) return;
      r.classList.add('has-pav'); r.insertAdjacentHTML('afterbegin', avSm(pid, 'av-sm'));
    });
    document.querySelectorAll('.prow[data-pid]:not(.has-pav)').forEach(r => {
      const pid = r.getAttribute('data-pid'), first = r.firstElementChild; if (!A.PAT(pid) || !first) return;
      r.classList.add('has-pav'); first.classList.add('pav-in'); first.insertAdjacentHTML('afterbegin', avSm(pid, 'av-md'));
    });
    const fh = $('.fh'), pid = S.fichaPid;
    if (fh && pid && A.PAT(pid) && !fh.querySelector('.av-btn')) {
      const nameBox = [].slice.call(fh.children).filter(c => c.querySelector && c.querySelector('h1'))[0];
      if (nameBox) nameBox.insertAdjacentHTML('beforebegin', A.avatarHTML(pid));
    }
  }
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; try { deco(); } catch (e) { /* nada */ } }); };
  try { new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); } catch (e) { /* nada */ }

  /* ---------- ventana para la foto ---------- */
  A.acts.avEdit = (el, ev) => {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    const pid = (el && el.getAttribute && el.getAttribute('data-pid')) || S.fichaPid; if (!A.PAT(pid)) return;
    S.modal = { type: 'avEdit', pid, back: S.modal || null }; A.renderModal();
  };
  A.modalFns.avEdit = () => {
    const m = S.modal, p = A.PAT(m.pid), pd = A.pd(m.pid), ok = !!pd.photoOK, has = !!pd.avatar;
    const big = has && ok ? '<img class="avatar av-big" alt="Foto de ' + esc(p.name) + '" src="' + esc(pd.avatar) + '">' : '<span class="avatar ini av-big" aria-hidden="true">' + esc(((p.first || '?').charAt(0) + (p.last || '').charAt(0)).toUpperCase()) + '</span>';
    return A.modalShell('Foto de ' + p.name,
      '<div class="av-ed">' + big +
      '<label class="chk"><input type="checkbox" data-chg="avOK" data-pid="' + esc(m.pid) + '"' + (ok ? ' checked' : '') + '> El paciente autoriza usar su foto para identificarlo en la ficha' + (pd.photoConsent ? ' <span class="hint" style="margin:0">(desde ' + A.fmtDMY(pd.photoConsent) + ')</span>' : '') + '</label>' +
      (ok ? '<div class="row-btns av-row">' +
        '<label class="btn primary av-pick">Sacar foto<input type="file" accept="image/*" capture="user" data-chg="avFile" data-pid="' + esc(m.pid) + '"></label>' +
        '<label class="btn av-pick">Elegir de la galería<input type="file" accept="image/*" data-chg="avFile" data-pid="' + esc(m.pid) + '"></label>' +
        (has ? '<button class="btn ghost danger" data-act="avDel" data-pid="' + esc(m.pid) + '">Quitar foto</button>' : '') + '</div>' +
        '<p class="hint" style="margin:0">Se guarda chiquita (cuadrada, centrada en la cara). Aparece en el buscador, la lista de pacientes y la ficha.</p>'
        : '<p class="hint" style="margin:0">Tildá la autorización para poder cargar la foto. Es opcional.</p>') +
      '<p class="hint" id="avMsg" style="margin:0" role="status"></p></div>',
      '<button class="btn primary" data-act="avDone">Listo</button>');
  };
  const done = () => { const b = S.modal && S.modal.back; S.modal = b || null; A.renderModal(); A.refresh(); if (S.panel && A.renderPanel) A.renderPanel(); };
  A.acts.avDone = done;
  A.chg.avOK = el => {
    const pid = el.getAttribute('data-pid'), pd = A.pd(pid);
    pd.photoOK = el.checked; pd.photoConsent = el.checked ? A.today() : null; A.touchPd(pid); A.renderModal();
  };
  A.acts.avDel = el => {
    const pid = el.getAttribute('data-pid'), pd = A.pd(pid); delete pd.avatar; A.touchPd(pid); A.renderModal(); A.toast('Foto quitada.');
  };
  A.chg.avFile = el => {
    const pid = el.getAttribute('data-pid'), f = el.files && el.files[0], msg = $('#avMsg'); if (!f) return;
    if (!/^image\//.test(f.type)) { if (msg) msg.textContent = 'Ese archivo no es una imagen.'; return; }
    if (msg) msg.textContent = 'Preparando la foto…';
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      try {
        const s = Math.min(im.naturalWidth, im.naturalHeight), sx = (im.naturalWidth - s) / 2, sy = Math.max(0, (im.naturalHeight - s) / 2 - s * 0.06), N = 256;
        const c = document.createElement('canvas'); c.width = N; c.height = N;
        const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(im, sx, sy, s, s, 0, 0, N, N);
        const pd = A.pd(pid); pd.avatar = c.toDataURL('image/jpeg', 0.82); A.touchPd(pid);
        URL.revokeObjectURL(url); A.renderModal(); A.toast('Foto del paciente guardada.');
      } catch (e) { if (msg) msg.textContent = 'No se pudo leer la foto. Probá con otra.'; }
    };
    im.onerror = () => { URL.revokeObjectURL(url); if (msg) msg.textContent = 'No se pudo abrir la imagen. Probá con otra (JPG o PNG).'; };
    im.src = url;
  };

  /* ---------- estilos (al final del body para ganarle a los base) ---------- */
  const CAM = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 8h3l2-3h6l2 3h3v11H4z'/%3E%3Ccircle cx='12' cy='13' r='3.5'/%3E%3C/svg%3E\")";
  const css = document.createElement('style');
  css.id = 'ovApp103';
  css.textContent = [
    '.avatar.av-sm { width: 36px; height: 36px; font-size: 13px; }',
    '.avatar.av-md { width: 42px; height: 42px; font-size: 15px; }',
    '.avatar.av-big { width: 128px; height: 128px; font-size: 44px; box-shadow: 0 0 0 4px var(--surface), 0 0 0 5px var(--line), 0 12px 28px -10px var(--accent-glow, rgba(0,0,0,.3)); }',
    '.res.has-pav { grid-template-columns: 36px minmax(0, 1fr) auto; column-gap: 10px; }',
    '.res.has-pav > .avatar { grid-column: 1; grid-row: 1 / span 2; align-self: center; }',
    '.res.has-pav > b { grid-column: 2; grid-row: 1; } .res.has-pav > .sub { grid-column: 2; grid-row: 2; } .res.has-pav > .side { grid-column: 3; grid-row: 1 / span 2; }',
    '.prow .pav-in { display: grid !important; grid-template-columns: 42px minmax(0, 1fr); column-gap: 12px; align-items: center; min-width: 0; }',
    '.prow .pav-in > .avatar { grid-column: 1; grid-row: 1 / span 2; }',
    '.prow .pav-in > :not(.avatar) { grid-column: 2; min-width: 0; }',
    '.av-btn { position: relative; border: 0; padding: 0; background: none; border-radius: 50%; cursor: pointer; flex: none; line-height: 0; }',
    '.av-btn::after { content: ""; position: absolute; right: -3px; bottom: -3px; width: 20px; height: 20px; border-radius: 50%; background: var(--accent) ' + CAM + ' center / 12px no-repeat; border: 2px solid var(--surface); opacity: .92; transition: transform .15s; }',
    '.av-btn:hover::after { transform: scale(1.1); }',
    '.av-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }',
    '.fh .av-btn { align-self: center; } .fh .av-btn .avatar { width: 58px; height: 58px; font-size: 20px; }',
    '.av-ed { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; padding: 6px 0; }',
    '.av-ed .chk { text-align: left; }',
    '.av-row { justify-content: center; flex-wrap: wrap; gap: 8px; }',
    '.av-pick { position: relative; overflow: hidden; cursor: pointer; } .av-pick input { position: absolute; inset: 0; opacity: 0; cursor: pointer; font-size: 0; }',
    /* «Ficha completa» con la misma textura que los botones principales */
    '#panelHost .fc-btn, #panelHost .fc-btn.fc-big { background: linear-gradient(180deg, var(--accent-2, var(--accent)), var(--accent)); color: var(--accent-ink); border-color: transparent; box-shadow: 0 1px 0 rgba(255, 255, 255, .2) inset, 0 1px 2px var(--accent-glow, rgba(0,0,0,.2)), 0 8px 18px -8px var(--accent-glow, rgba(0,0,0,.3)); font-weight: 650; transition: filter .18s, transform .12s; }',
    '#panelHost .fc-btn:hover { filter: brightness(1.06); } #panelHost .fc-btn:active { transform: translateY(1px) scale(.985); }',
    /* plan de tratamiento: el nombre de la fase en su propia línea, sin cortarse */
    '.tp-phases .tp-phh .tp-phn { flex: 1 1 100%; width: 100%; }',
    '.tp-phases .tp-phh .tp-pha { margin-left: auto; }'
  ].join('\n');
  document.body.appendChild(css);
  later();
})();
