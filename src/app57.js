/* ===== 1.46: «Cómo cuidamos tus datos» (tres copias, registro de cambios) + sugerencia amable de una copia propia por mes ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, CL = A.cloud;
  const real = () => !!(CL && CL.session && !A.DEMO);
  const boss = () => !A.isMember || !A.isMember() || (A.mbRole && A.mbRole() === 'admin');
  const days = k => { if (!k) return 9999; const d = new Date(k + 'T12:00:00'); return Math.floor((Date.now() - d.getTime()) / 864e5); };

  const css = document.createElement('style');
  css.textContent = '.care{border:1px solid var(--line,#dfe3ea);border-radius:14px;padding:14px 16px;margin:0 0 14px;background:var(--card,#fff)}' +
    '.care h3{margin:0 0 4px;font-size:1.05rem}.care .care-sub{margin:0 0 10px;color:var(--muted,#667);font-size:.92rem}' +
    '.care ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}' +
    '.care li{display:flex;gap:10px;align-items:flex-start;font-size:.93rem;line-height:1.35}' +
    '.care li .ci{flex:0 0 30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--soft,#eef3fb);font-size:16px}' +
    '.care li b{display:block}.care .care-own{margin-top:12px;padding:10px 12px;border-radius:10px;background:var(--soft,#eef3fb);font-size:.92rem;line-height:1.4}' +
    '.care .care-own .row-btns{margin-top:8px}';
  document.head.appendChild(css);

  A.dataCareHTML = () => {
    if (!real()) {
      return '<div class="cfg-lead">Tus datos viven en este navegador, en este dispositivo. Una copia de seguridad es un archivo que podés guardar, mandarte por mail o llevar a otra computadora o celular. Con una cuenta en la nube, además, se guardan solos y se respaldan en tres lugares.</div>';
    }
    const last = A.CFG.lastBackup;
    return '<div class="care"><h3>Cómo cuidamos tus datos</h3><p class="care-sub">Las historias clínicas se guardan como mínimo 10 años. Para eso no dependemos de un solo lugar:</p><ul>' +
      '<li><span class="ci">☁️</span><span><b>En la nube, al instante</b>Cada cambio se guarda en el servidor y en tus equipos. El servidor hace además copias diarias.</span></li>' +
      '<li><span class="ci">🔒</span><span><b>Una copia cifrada cada noche, en otra empresa</b>Se guarda en un segundo proveedor, cifrada con una clave que solo tenemos nosotros. Una por año se conserva por lo menos 10 años. Todas las noches comprobamos que se pueda restaurar.</span></li>' +
      '<li><span class="ci">💽</span><span><b>Una copia en un disco nuestro</b>Fuera de internet, por si fallara todo lo demás.</span></li>' +
      '<li><span class="ci">📝</span><span><b>Nada se pierde por error</b>Queda registrado quién cargó o cambió cada cosa, con la versión anterior. Las evoluciones se anulan, no se borran.</span></li>' +
      '</ul>' +
      (boss() ? '<div class="care-own"><b>Tu copia, en tus manos (opcional)</b><br>No hace falta para que tus datos estén seguros. Pero como responsable de las historias clínicas de tu consultorio, te sugerimos bajar una copia una vez por mes y guardarla en tu compu o en un pendrive: así tenés todo, siempre, sin depender de nadie.' +
        '<div class="row-btns"><button class="btn small primary" data-act="cfgBackup">Descargar mi copia</button><span class="hint">' + (last ? 'Última: ' + A.fmtDMY(last) : 'Todavía no bajaste ninguna') + '</span></div></div>' : '') +
      '</div>';
  };

  /* Sugerencia mensual: solo a la casilla de avisos (sin carteles), al dueño o administrador, si hace más de 30 días que no baja una copia. */
  let done = false;
  const remind = () => {
    if (done || !real() || !boss() || !A.nfAdd) return;
    done = true;
    if (days(A.CFG.lastBackup) < 30) return;
    const mo = A.today().slice(0, 7);
    A.nfAdd({ id: 'bk:' + mo, k: 'info', t: 'Tu copia del mes (opcional)', b: 'Tus datos ya están respaldados en tres lugares. Si querés tener además tu propia copia, bajala desde Ajustes › Copia de seguridad.', act: 'cfgOpen', args: { t: 'datos' } });
  };
  const prev = A.afterRefresh;
  A.afterRefresh = function () { const r = prev && prev.apply(this, arguments); try { setTimeout(remind, 4000); } catch (e) { /* nada */ } return r; };
})();
