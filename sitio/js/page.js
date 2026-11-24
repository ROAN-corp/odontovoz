/* Comportamiento compartido del sitio: planes, contacto, versión del APK, pestañas de instalación. */
(function () {
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const WA = [].concat(CONTACTO.whatsapp || []).filter(Boolean);
  const contactLink = (plan) => {
    if (WA.length) return 'https://wa.me/' + WA[0].replace(/\D/g, '') + '?text=' + encodeURIComponent(plan ? 'Hola, quiero el plan ' + plan + ' de OdontoVoz.' : 'Hola, quiero hacer una consulta sobre OdontoVoz.');
    if (CONTACTO.email) return 'mailto:' + CONTACTO.email + '?subject=' + encodeURIComponent(plan ? 'Plan ' + plan + ' de OdontoVoz' : 'Consulta sobre OdontoVoz');
    return '/contacto/';
  };
  const pesos = n => '$' + Math.round(n).toLocaleString('es-AR');
  const usd = n => 'USD ' + (Math.round(n * 100) / 100).toLocaleString('es-AR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const item = t => esc(t).replace(/\{(\d+)\}/g, (m, n) => usd(+n) + ' (≈ ' + pesos(+n * window.OV_DOLAR) + ') por mes');
  const precio = p => !p.usd ? '<p class="price">Gratis <small>' + esc(p.por || '') + '</small></p>' : '<p class="price">' + usd(p.usd) + ' <small>por mes · ≈ ' + pesos(p.usd * window.OV_DOLAR) + '</small></p>';
  const plansEl = document.getElementById('plans');
  const NOTA = () => 'Todos los planes traen todas las funciones. Precios en dólares estadounidenses con su equivalente en pesos argentinos (USD 1 = $' + window.OV_DOLAR.toLocaleString('es-AR') + ', dólar oficial' + (window.OV_DOLAR_FECHA ? ' al ' + window.OV_DOLAR_FECHA.split('-').reverse().join('/') : '') + '), IVA incluido. En Argentina se cobra en pesos y el valor se actualiza cada lunes con el dólar oficial. Abono mensual, sin permanencia: podés cambiar de plan o sumar y quitar consultorios mes a mes. Todos empiezan con la prueba gratis. (Consultá por descuentos disponibles.)';
  const renderPlans = () => {
    if (plansEl) plansEl.innerHTML = PLANES.map(p => '<article id="plan-' + p.nombre.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '" class="plan' + (p.destacado ? ' star' : '') + '"><h3>' + esc(p.nombre) + '</h3><p class="who">' + esc(p.quien) + '</p>' + precio(p) + '<ul>' + p.items.map(i => '<li>' + item(i) + '</li>').join('') + '</ul><a class="btn ' + (p.destacado ? '' : 'teal') + '" href="' + esc(p.link || contactLink(p.nombre)) + '">' + esc(p.link || WA.length || CONTACTO.email ? p.boton : 'Probar gratis') + '</a></article>').join('');
    const nt = document.getElementById('plansNote'); if (nt) nt.textContent = NOTA();
    const dn = document.getElementById('dolarNote'); if (dn) dn.textContent = 'Los precios en pesos se calculan con el dólar oficial (USD 1 = $' + window.OV_DOLAR.toLocaleString('es-AR') + ') y se actualizan cada lunes.';
    document.querySelectorAll('[data-usd]').forEach(el => { el.textContent = '≈ $' + Math.round(+el.getAttribute('data-usd') * window.OV_DOLAR).toLocaleString('es-AR') + ' por mes'; });
  };
  renderPlans();
  /* dólar oficial: lo publica la web cada lunes en /dolar.json */
  fetch('/dolar.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).then(d => { if (d && d.usd > 500 && d.usd < 100000) { window.OV_DOLAR = +d.usd; window.OV_DOLAR_FECHA = d.fecha || ''; renderPlans(); } }).catch(() => {});
  /* tarjetas de la página de contacto, con los datos de datos.js */
  const cc = document.getElementById('contactCards');
  if (cc) cc.innerHTML = WA.map((n, i) => '<a class="card-l" href="' + esc('https://wa.me/' + n.replace(/\D/g, '') + '?text=' + encodeURIComponent('Hola, quiero hacer una consulta sobre OdontoVoz.')) + '" target="_blank" rel="noopener"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg></span><b>WhatsApp · ' + esc((CONTACTO.nombres || [])[i] || '') + '</b><span>+' + esc(n.replace(/^(54)(9)(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3 $4-$5')) + '</span><em>Escribir →</em></a>').join('') + (CONTACTO.email ? '<a class="card-l" href="' + esc('mailto:' + CONTACTO.email + '?subject=' + encodeURIComponent('Consulta sobre OdontoVoz')) + '"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></span><b>Correo</b><span>' + esc(CONTACTO.email) + '</span><em>Enviar un mail →</em></a>' : '');
  const cf = document.getElementById('contactFoot'); if (cf && (WA.length || CONTACTO.email)) cf.innerHTML = '<a href="' + esc(contactLink('')) + '">Contacto</a>' + WA.map((n, i) => ' · <a href="https://wa.me/' + esc(n.replace(/\D/g, '')) + '">WhatsApp ' + esc((CONTACTO.nombres || [])[i] || '') + ' ' + esc(n.replace(/^549/, '').replace(/^(\d{4})(\d{6})$/, '$1 $2')) + '</a>').join('');

  const wf = document.getElementById('waFinal'); if (wf && (WA.length || CONTACTO.email)) wf.href = contactLink('');
  /* el video del recorrido arranca solo cuando aparece en pantalla */
  const vq = document.getElementById('vidQhh');
  if (vq && 'IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) vq.play().catch(() => {}); else vq.pause(); }), { threshold: .5 }).observe(vq);
  /* versión del APK desde GitHub */
  if (document.getElementById('apkMeta')) fetch('https://api.github.com/repos/ROAN-corp/odontovoz/releases/latest').then(r => r.ok ? r.json() : null).then(d => {
    if (!d) return;
    const a = (d.assets || []).filter(x => x.name === 'OdontoVoz.apk')[0];
    const v = String(d.tag_name || '').replace(/^v/, '').split('.').slice(0, 2).join('.');
    const f = new Date(d.published_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
    const am = document.getElementById('apkMeta'); if (am) am.innerHTML = '<b>Versión ' + esc(v) + '</b>, publicada el ' + esc(f) + (a ? ' · ' + (a.size / 1048576).toFixed(1).replace('.', ',') + ' MB' : '');
  }).catch(() => {});

  /* el video no arranca solo si la persona pidió menos movimiento */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.querySelectorAll('.reel video').forEach(v => { v.removeAttribute('autoplay'); v.pause(); v.controls = true; });
  /* pestañas de instalación */
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  const sel = t => { tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute('aria-controls')).hidden = !on; }); const v = document.getElementById('vidIos'); if (v) { if (!document.getElementById('p-ios').hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches) { v.play().catch(() => {}); } else v.pause(); } };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => sel(t));
    t.addEventListener('keydown', e => { const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return; const n = tabs[(i + d + tabs.length) % tabs.length]; sel(n); n.focus(); });
  });
  if (/android/i.test(navigator.userAgent) && /samsung|sm-/i.test(navigator.userAgent)) { /* Samsung: se avisa del Bloqueador automático */ (document.querySelector('#p-and .aside') || { insertAdjacentHTML() {} }).insertAdjacentHTML('beforeend', '<p><b>Tenés un Samsung:</b> si no te deja instalar, mirá la pestaña «Si tu celular la bloquea».</p>'); }
  if (/iphone|ipad/i.test(navigator.userAgent)) sel(document.getElementById('tb-ios'));
  document.querySelectorAll('a[data-tab]').forEach(a => a.addEventListener('click', () => { const t = document.getElementById(a.getAttribute('data-tab')); if (t) sel(t); }));
  /* en iPhone, el botón de la portada lleva directo a cómo agregarla */
  { const st = document.getElementById('stDl'); if (/iphone|ipad|macintosh.*mobile/i.test(navigator.userAgent) && st) { st.href = '#instalar'; st.textContent = 'Instalar en iPhone'; st.addEventListener('click', () => sel(document.getElementById('tb-ios'))); } else if (st && !/android/i.test(navigator.userAgent)) { st.href = 'app/'; st.textContent = 'Abrir la app'; } }
  if (/iphone|ipad/i.test(navigator.userAgent)) { const d = document.querySelector('.hero .cta .btn.line'); if (d) { d.href = '#instalar'; d.lastChild.textContent = ' Instalar en el iPhone'; d.addEventListener('click', () => sel(document.getElementById('tb-ios'))); } }

})();
