/* Menú lateral del sitio: se abre desde el botón de la barra de arriba en celular y tablet. */
(function () {
  var side = document.getElementById('side'), burger = document.getElementById('burger'), scrim = document.getElementById('scrim'), close = document.getElementById('sideX');
  if (!side || !burger) return;
  function set(open) {
    side.classList.toggle('open', open); scrim.hidden = !open; burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) { var a = side.querySelector('a[aria-current="page"]') || side.querySelector('a.it'); if (a) a.focus(); } else if (document.activeElement && side.contains(document.activeElement)) burger.focus();
  }
  burger.addEventListener('click', function () { set(!side.classList.contains('open')); });
  scrim.addEventListener('click', function () { set(false); });
  if (close) close.addEventListener('click', function () { set(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && side.classList.contains('open')) set(false); });
  side.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) set(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 1020) set(false); });
})();
