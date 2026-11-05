/* ===== 1.15: agenda que abre desde arriba, tira de días quieta y la app que vuelve al inicio (1.16: después de 15 minutos, configurable) ===== */
(function () {
  'use strict';
  const A = window.App, $ = A.$, S = A.S;

  /* la agenda ya no salta sola a la hora actual (ni al entrar, ni al tocar «Hoy», ni después de un rato sin tocarla) */
  A.scrollToNow = () => {};

  /* cada vez que se entra a la agenda se ve desde arriba */
  let lastTab = null;
  const prevAfter = A.afterRefresh;
  A.afterRefresh = () => {
    if (prevAfter) prevAfter();
    if (S.tab === 'agenda' && lastTab !== 'agenda') {
      const g = $('#gridWrap'); if (g) g.scrollTop = 0;
      window.scrollTo(0, 0);
    }
    lastTab = S.tab;
  };

  /* al volver a abrir la app (después de cerrarla o de dejarla un rato en segundo plano) arranca en Inicio.
     Si había una ventana abierta (por ejemplo, un turno a medio cargar) se respeta para no perder lo escrito. */
  /* minutos en segundo plano antes de volver a Inicio (se cambia en Menú › Apariencia; 0 = nunca) */
  const AWAY_KEY = 'odontovoz.away';
  A.awayMin = () => { try { const v = localStorage.getItem(AWAY_KEY); return v == null ? 15 : Math.max(0, parseInt(v, 10) || 0); } catch (e) { return 15; } };
  const awayMs = () => A.awayMin() * 60 * 1000;
  let hiddenAt = 0;
  function backHome() {
    if (S.modal) return;
    if (A.stopOd) A.stopOd();
    S.panel = null; S.date = A.today(); S.tab = 'inicio';
    if (A.hideDrawer) A.hideDrawer();
    A.renderPanel(); A.refresh(); window.scrollTo(0, 0);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && A.awayMin() > 0 && Date.now() - hiddenAt >= awayMs()) backHome();
    hiddenAt = 0;
  });
  /* en el APK, además, el evento propio de Android al volver a la app */
  try {
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App && App.addListener) App.addListener('appStateChange', st => {
      if (!st.isActive) { hiddenAt = hiddenAt || Date.now(); return; }
      if (hiddenAt && A.awayMin() > 0 && Date.now() - hiddenAt >= awayMs()) backHome();
      hiddenAt = 0;
    });
  } catch (e) { /* sin plugin: alcanza con visibilitychange */ }

  /* Menú › Apariencia: cuánto tiempo en segundo plano antes de volver a Inicio */
  const MF = A.modalFns, prevAppear = MF.appear;
  MF.appear = m => {
    const h = prevAppear(m), cur = A.awayMin(), opts = [[5, '5 minutos'], [10, '10 minutos'], [15, '15 minutos'], [20, '20 minutos'], [30, '30 minutos'], [60, '1 hora'], [0, 'Nunca']];
    const blk = '<div class="opt"><div class="lbl">Volver a Inicio después de</div><select id="awaySel" data-chg="awaySet" aria-label="Tiempo en segundo plano antes de volver a Inicio">' + opts.map(o => '<option value="' + o[0] + '"' + (o[0] === cur ? ' selected' : '') + '>' + o[1] + ' en segundo plano</option>').join('') + '</select><div class="hint">Si salís de la app (por ejemplo, para contestar un WhatsApp) y volvés antes de ese tiempo, sigue donde estabas. Es una preferencia de este equipo.</div></div>';
    const i = h.indexOf('<div class="m-foot">'); return i > 0 ? h.slice(0, i).replace(/(<\/div>\s*)$/, blk + '$1') + h.slice(i) : h;
  };
  A.chg.awaySet = el => { try { localStorage.setItem(AWAY_KEY, String(parseInt(el.value, 10) || 0)); } catch (e) { /* nada */ } A.toast(el.value === '0' ? 'La app no vuelve sola a Inicio.' : 'Vuelve a Inicio después de ' + el.options[el.selectedIndex].text + '.'); };
})();
