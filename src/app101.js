/* ===== 1.18: importes con centavos en todos lados (teclado con coma en el celular) ===== */
(function () {
  'use strict';
  /* los campos de plata y cantidades pasan a teclado decimal; los de DNI, teléfono, PIN, pieza, fecha o edad quedan numéricos */
  const KEEP = /dni|phone|tel|pin|tooth|pieza|birth|age|edad|year|anio|cuit|code|codigo/i;
  function fix() {
    document.querySelectorAll('input[inputmode="numeric"]').forEach(i => {
      const tag = (i.id || '') + ' ' + (i.name || '') + ' ' + (i.getAttribute('data-in') || '') + ' ' + (i.getAttribute('data-chg') || '') + ' ' + (i.getAttribute('data-k') || '') + ' ' + (i.getAttribute('aria-label') || '');
      if (KEEP.test(tag)) return;
      i.setAttribute('inputmode', 'decimal');
    });
  }
  let raf = 0;
  try { new MutationObserver(() => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; fix(); }); }).observe(document.body, { childList: true, subtree: true }); } catch (e) { /* nada */ }
  fix();
})();
