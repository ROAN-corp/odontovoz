/* ===== 1.51: «Mis datos profesionales»: cada profesional del equipo carga su matrícula, sello y firma desde su usuario (sin pasárselos a nadie) ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, CL = A.cloud, MF = A.modalFns, esc = A.esc;
  if (!A.credBlockHTML || !A.matsBlockHTML) return;
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* nada */ } } };
  const copy = o => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const isMem = () => !!(A.isMember && A.isMember());
  const bossDev = () => !isMem() || (A.mbRole && A.mbRole() === 'admin') || (A.isSocio && A.isSocio());
  const myId = () => (isMem() && A.mbPro ? A.mbPro() : null);

  /* los datos de cada profesional (pf:<id>) viajan por la nube como un registro propio */
  let PF = null, PFK = '';
  const key = () => 'odontovoz.pf.v1.' + ((A.ownerId && A.ownerId()) || 'x');
  const load = () => { const k = key(); if (PF && PFK === k) return PF; PFK = k; try { PF = JSON.parse(LS.get(k, '{}')) || {}; } catch (e) { PF = {}; } return PF; };
  const store = () => { load(); LS.set(PFK, JSON.stringify(PF)); };
  const xPrev = A.cloudExtra, kPrev = A.cloudExtraKeys;
  A.cloudExtra = k => /^pf:/.test(String(k)) ? {
    get: () => load()[k.slice(3)] || null,
    set: v => { if (v && typeof v === 'object') { load()[k.slice(3)] = v; store(); setTimeout(() => sync(), 600); } }
  } : (xPrev ? xPrev(k) : null);
  A.cloudExtraKeys = () => (A.PROS || []).concat(A.PROS_OLD || []).map(p => 'pf:' + p.id).concat(kPrev ? kPrev() : []);

  /* el dueño recibe los datos en la ficha del profesional; el profesional los ve en su equipo sin tocar la lista del dueño */
  const def = (o, k, v) => { try { Object.defineProperty(o, k, { value: v, writable: true, configurable: true, enumerable: false }); } catch (e) { /* nada */ } };
  function sync() {
    const D = load(); let changed = false;
    (A.PROS || []).forEach(p => {
      const d = D[p.id]; if (!d) return;
      if (bossDev()) {
        if ((d.upd || '') > (p.pfAt || '')) {
          if (d.spec) p.spec = d.spec; if (Array.isArray(d.mats)) { p.mats = copy(d.mats); p.mat = d.mat || ''; } if (d.cred) p.cred = copy(d.cred);
          p.pfAt = d.upd; changed = true;
          if (A.nfAdd && d.by) A.nfAdd({ id: 'pf:' + p.id + ':' + d.upd, k: 'info', t: p.name + ' actualizó sus datos profesionales', b: 'Matrícula, sello y firma: ya están en su ficha de profesional.', act: '', args: {} });
        }
      } else if (p.id === myId()) {
        ['spec', 'mats', 'mat', 'cred'].forEach(k => { if (d[k] != null) def(p, k, copy(d[k])); });
      }
    });
    if (changed) { A.save(); if (A.refresh) A.refresh(); }
  }
  const arPrev = A.afterRefresh;
  A.afterRefresh = function () { const r = arPrev ? arPrev.apply(this, arguments) : undefined; setTimeout(sync, 1500); return r; };

  /* mientras está abierta la ventana, se edita una copia (la lista de profesionales es del dueño y el servidor no deja cambiarla) */
  let proxy = null;
  const active = () => (S.modal && S.modal.type === 'myPro' ? proxy : null);
  const proPrev = A.PRO;
  A.PRO = function (id) { const p = active(); return p && p.id === id ? p : proPrev.apply(this, arguments); };

  A.acts.myProOpen = () => {
    const id = myId(), real = id && proPrev(id);
    if (!real) { A.toast('Tu usuario todavía no está asignado a un profesional. Pedile al dueño que lo asigne en Usuarios del equipo.'); return; }
    const d = load()[id] || {};
    proxy = { id: real.id, name: real.name, spec: d.spec || real.spec || '', mats: copy(d.mats != null ? d.mats : real.mats), mat: d.mat != null ? d.mat : real.mat, cred: copy(d.cred != null ? d.cred : real.cred) };
    if (A.hideDrawer) A.hideDrawer(); S.modal = { type: 'myPro', id }; A.renderModal();
  };
  MF.myPro = m => {
    const p = proxy; if (!p) return '';
    const b = '<p class="m-lead">Estos datos son tuyos: los cargás una sola vez y quedan vinculados a tu usuario. El dueño del consultorio los recibe en su cuenta, así no tenés que mandárselos por mensaje. Si cambia algo (por ejemplo un número de matrícula), lo actualizás acá.</p>' +
      '<div class="field"><label>Nombre</label><div class="mp-name">' + esc(p.name) + '</div><div class="hint">Si hay que corregir el nombre, pedíselo al dueño.</div></div>' +
      A.specFieldHTML(p, m._specOtra === p.id) + A.matsBlockHTML(p) + A.credBlockHTML(p.id) + A.extraCredHTML(p) +
      '<div class="hint">Todo se guarda solo. Estos datos los ven únicamente vos y el dueño o la administración.</div>';
    return A.modalShell('Mis datos profesionales', b, '<button class="btn primary" data-act="closeModal">Listo</button>', true);
  };

  /* después de cada cambio, se guarda tu registro */
  function pfSave() {
    const id = S.modal && S.modal.id, p = proxy; if (!p || !id) return;
    const who = (A.actor && A.actor().who) || '';
    load()[id] = { spec: p.spec || '', mats: copy(p.mats) || [], mat: p.mat || '', cred: copy(p.cred) || null, upd: new Date().toISOString(), by: who };
    store(); const real = proPrev(id); if (real) ['spec', 'mats', 'mat', 'cred'].forEach(k => { const v = load()[id][k]; if (v != null) def(real, k, copy(v)); });
    if (A.save) A.save();
  }
  const hook = (obj, name) => {
    const prev = obj[name]; if (!prev) return;
    obj[name] = function () { const r = prev.apply(this, arguments); const fin = () => { if (active()) pfSave(); }; if (r && typeof r.then === 'function') return r.then(v => { fin(); return v; }); fin(); return r; };
  };
  ['matSet', 'specSel', 'cfgPro', 'credFile', 'credFile2'].forEach(k => hook(A.chg, k));
  ['matAdd', 'matDel', 'credDel', 'credDel2'].forEach(k => hook(A.acts, k));

  /* el acceso: en Cuenta, dentro de «Tu puesto» */
  const acctPrev = MF.acct;
  if (acctPrev) MF.acct = function () {
    let h = acctPrev.apply(this, arguments); if (typeof h !== 'string' || !myId()) return h;
    const blk = '<div class="block mp-block"><h3>Mis datos profesionales</h3><div class="hint" style="margin:0 0 6px">Cargá tu matrícula, tu sello y tu firma una sola vez, desde acá. No hace falta mandárselos a nadie.</div><div class="row-btns"><button class="btn small primary" data-act="myProOpen">Completar mis datos</button></div></div>';
    const k = '<div class="block mb-block">'; return h.indexOf(k) >= 0 ? h.replace(k, blk + k) : h;
  };

  const css = document.createElement('style'); css.id = 'ovApp134';
  css.textContent = '.mp-name{padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2);font-weight:600}.mp-block{margin:0 0 12px}';
  document.head.appendChild(css);
})();
