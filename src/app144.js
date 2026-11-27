/* ===== 1.60: enviar un PDF por WhatsApp: en el teléfono se comparte el archivo; en la PC se ofrece compartirlo con la app de WhatsApp instalada o abrir el chat y adjuntarlo; botón en el presupuesto, el plan y los documentos firmados ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc;
  if (!A.acts || !A.saveFile) return;
  const mobile = () => /android|iphone|ipad|ipod/i.test(navigator.userAgent || '');
  let pend = null;
  const mkFile = (blob, name) => { try { return typeof File === 'function' ? new File([blob], name, { type: 'application/pdf' }) : null; } catch (e) { return null; } };
  const canShare = f => { try { return !!(f && navigator.share && navigator.canShare && navigator.canShare({ files: [f] })); } catch (e) { return false; } };
  const pdfOf = async fn => { let got = null; const sv = A.saveFile; A.saveFile = (n, b) => { got = { name: n, blob: b }; return Promise.resolve(true); }; try { await fn(); } finally { A.saveFile = sv; } return got; };
  const openChat = (pid, text) => { const pat = A.PAT(pid), link = A.waLink && pat ? A.waLink(pat.phone, text) : ''; if (link) { if (A.waOpen) A.waOpen(link); else window.open(link, '_blank', 'noopener'); return true; } return false; };
  /* arma el envío de un PDF: { pid, blob, name, text, title } */
  A.waSendFile = async o => {
    const pat = A.PAT(o.pid) || {}, file = mkFile(o.blob, o.name);
    if (window.OV_NATIVE) { A.saveFile(o.name, o.blob); return; }          /* app del teléfono: menú de compartir con el archivo */
    if (canShare(file) && mobile()) { try { await navigator.share({ files: [file], text: o.text, title: o.title }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    pend = { o, file, can: canShare(file) };
    S.modal = { type: 'waPc', pid: o.pid, name: o.name, can: pend.can, phone: !!(pat.phone && A.waLink && A.waLink(pat.phone, 'x')), who: pat.first || pat.name || 'el paciente' };
    A.renderModal();
  };
  MF.waPc = m => {
    const body = '<p class="m-lead">WhatsApp no deja adjuntar un archivo solo desde un link: en la computadora hay que elegir cómo mandarlo.</p>' +
      (m.can ? '<button class="btn primary big" data-act="waPcShare" style="width:100%;margin-bottom:8px">Compartir con WhatsApp (app de la compu)</button><p class="hint" style="margin:0 0 12px">Se abre el menú de Windows o Mac: elegí WhatsApp y el chat de ' + esc(m.who) + '. El archivo va adjunto.</p>' : '') +
      '<button class="btn' + (m.can ? '' : ' primary') + ' big" data-act="waPcChat" style="width:100%;margin-bottom:8px">Abrir el chat y adjuntar el PDF</button><p class="hint" style="margin:0">' + (m.phone ? 'Se descarga el PDF y se abre el chat de ' + esc(m.who) + ' con el mensaje escrito: tocá el clip y elegí el archivo (o arrastralo al chat).' : 'Este paciente no tiene celular cargado: se descarga el PDF para mandarlo a mano.') + '</p>';
    return A.modalShell('Enviar por WhatsApp', body, '<button class="btn" data-act="closeModal">Cerrar</button>');
  };
  A.acts.waPcShare = async () => {
    if (!pend) return; try { await navigator.share({ files: [pend.file], text: pend.o.text, title: pend.o.title }); S.modal = null; A.renderModal(); } catch (e) { if (!(e && e.name === 'AbortError')) A.toast('No se pudo abrir el menú de compartir: usá «Abrir el chat y adjuntar el PDF».'); }
  };
  A.acts.waPcChat = async () => {
    if (!pend) return; const o = pend.o; await A.saveFile(o.name, o.blob);
    const ok = openChat(o.pid, o.text); S.modal = null; A.renderModal();
    A.toast(ok ? 'Se descargó el PDF y se abrió el chat: adjuntalo con el clip.' : 'Se descargó el PDF. El paciente no tiene celular cargado: mandalo a mano.');
  };

  /* plan de tratamiento y documentos firmados usan lo mismo */
  const tpPrev = A.acts.tpWa;
  if (tpPrev && A.tpWaPdf) A.acts.tpWa = async () => { const r = await A.tpWaPdf(); if (r) A.waSendFile(r); };
  const docPrev = A.acts.docWa;
  if (docPrev) A.acts.docWa = async el => {
    const pid = S.modal && S.modal.pid, pd = A.pd(pid), d = pd.docs.filter(x => x.id === el.getAttribute('data-id'))[0], pat = A.PAT(pid); if (!d || !pat) return;
    const got = await pdfOf(() => A.pdfOfDoc(pid, d)); if (!got) { A.toast('No se pudo armar el PDF.'); return; }
    A.waSendFile({ pid, blob: got.blob, name: got.name, title: d.title, text: 'Hola ' + (pat.first || pat.name) + ', te envío tu documento firmado: ' + d.title + ' (PDF adjunto).\n' + (A.CLINIC || '') });
  };

  /* presupuesto: botón «Enviar por WhatsApp» en la vista previa */
  const BTN = '<button class="btn" data-act="pdfBudget"';
  const bvPrev = MF.budgetView;
  MF.budgetView = function (m) {
    const h = bvPrev.apply(this, arguments); if (typeof h !== 'string' || h.indexOf(BTN) < 0) return h;
    const bid = m && m.bid; return h.replace(BTN, '<button class="btn primary" data-act="budgetWa" data-id="' + esc(bid) + '">Enviar por WhatsApp</button>' + BTN);
  };
  A.acts.budgetWa = async el => {
    const pid = S.modal && S.modal.pid, pd = A.pd(pid), b = (pd.budgets || []).filter(x => x.id === el.getAttribute('data-id'))[0], pat = A.PAT(pid); if (!b || !pat) return;
    const got = await pdfOf(() => A.acts.pdfBudget({ getAttribute: () => b.id })); if (!got) { A.toast('No se pudo armar el PDF del presupuesto.'); return; }
    const valid = b.validUntil || b.valid || '';
    A.waSendFile({ pid, blob: got.blob, name: got.name, title: 'Presupuesto ' + b.num, text: 'Hola ' + (pat.first || pat.name) + ', te envío el presupuesto N.º ' + b.num + ' (PDF adjunto).' + (valid && A.fmtDMY ? ' Válido hasta el ' + A.fmtDMY(valid) + '.' : '') + '\n' + (A.CLINIC || '') });
  };
})();
