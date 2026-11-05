/* ===== 1.15: agenda que abre desde arriba, tira de días quieta y la app que vuelve siempre al inicio ===== */
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
  const AWAY_MS = 2 * 60 * 1000;
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
    if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS) backHome();
    hiddenAt = 0;
  });
  /* en el APK, además, el evento propio de Android al volver a la app */
  try {
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App && App.addListener) App.addListener('appStateChange', st => {
      if (!st.isActive) { hiddenAt = hiddenAt || Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt >= AWAY_MS) backHome();
      hiddenAt = 0;
    });
  } catch (e) { /* sin plugin: alcanza con visibilitychange */ }
})();
