/* OdontoVoz · Asistente de mudanza (gratis)
   Se usa desde la barra de favoritos, con la sesión abierta en el sistema anterior (Bilog, Dentalink u otro).
   Junta los pacientes, turnos y evoluciones que el sistema va mostrando (lee lo que la propia página recibe y las tablas que se ven),
   puede recorrer todas las páginas de un listado y baja un archivo para importar en OdontoVoz › Ajustes › Mudanza desde otro sistema.
   Todo pasa en este navegador: no se manda nada a ningún servidor. */
(function () {
  if (window.__ovMud) { window.__ovMud.show(); return; }
  var M = window.__ovMud = { pats: {}, appts: {}, notes: {}, lists: [], busy: false };
  var N = function (s) { return String(s == null ? '' : s).replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); };
  var count = function (o) { return Object.keys(o).length; };

  /* ---------- reconocer qué es cada registro ---------- */
  var K = {
    name: /^(nombre|nombres|apellido|apellidos|name|first name|last name|firstname|lastname|nombre completo|apellido y nombre|apellido nombre|paciente|razon social|full name)$/,
    pid: /^(dni|documento|nro documento|numero documento|n documento|doc|nro doc|rut|cuil|cuit|num documento|documento numero|identificacion)$/,
    contact: /(telefono|celular|movil|whatsapp|email|mail|correo|fecha nac|nacimiento|obra social|cobertura|prepaga|afiliado|domicilio|direccion|historia clinica|nro hc|hc)/,
    date: /^(fecha|date|dia|fecha turno|fecha cita|start|inicio|desde|fecha hora|fecha inicio|start date|datetime|start time)$/,
    time: /^(hora|time|hora inicio|hora desde|start|inicio|desde|hora turno|start time)$/,
    who: /(paciente|patient|nombre|apellido|dni|documento|id paciente)/,
    text: /^(evolucion|evoluciones|observacion|observaciones|descripcion|detalle|texto|nota|notas|comentario|comentarios|anotacion|diagnostico|tratamiento realizado|procedimiento|prestacion|practica|indicaciones)$/,
    drop: /(password|clave|token|hash|secret)/
  };
  function keysOf(o) { return Object.keys(o).map(N); }
  function kind(o) {
    var ks = keysOf(o), has = function (re) { return ks.some(function (k) { return re.test(k); }); };
    var hasName = has(K.name), hasPid = has(K.pid), hasContact = has(K.contact), hasDate = has(K.date), hasTime = has(K.time), hasText = has(K.text);
    if (hasDate && (hasTime || ks.some(function (k) { return /hora|time/.test(k); })) && (has(K.who) || ks.some(function (k) { return /paciente|patient/.test(k); }))) return 'appt';
    if (hasText && hasDate) return 'note';
    if (hasName && (hasPid || hasContact)) return 'pat';
    return '';
  }
  function flat(o, depth) {   // un nivel de objetos anidados: {obra_social:{nombre:'OSDE'}} → obra_social: 'OSDE'; {paciente:{...}} → paciente_*
    var r = {};
    Object.keys(o).forEach(function (k) {
      if (K.drop.test(N(k))) return;
      var v = o[k];
      if (v == null) return;
      if (typeof v === 'object' && !Array.isArray(v)) {
        var nm = v.nombre || v.name || v.descripcion || v.description || v.label || v.titulo;
        if (depth < 1 && /paciente|patient/.test(N(k))) { var f = flat(v, depth + 1); Object.keys(f).forEach(function (kk) { r[k + '_' + kk] = f[kk]; }); }
        else if (depth < 1 && /profesional|doctor|odontologo|medico|prestador|dentista|usuario/.test(N(k))) r[k] = [v.apellido, v.nombre || v.name].filter(Boolean).join(', ') || nm || '';
        else if (typeof nm === 'string') r[k] = nm;
        return;
      }
      if (Array.isArray(v)) return;
      r[k] = typeof v === 'string' ? v.slice(0, 4000) : v;
    });
    return r;
  }
  var idOf = function (o, t) {
    var ks = Object.keys(o), g = function (re) { for (var i = 0; i < ks.length; i++) if (re.test(N(ks[i])) && o[ks[i]] != null && o[ks[i]] !== '') return String(o[ks[i]]); return ''; };
    if (t === 'pat') return g(K.pid) || g(/^(id|id paciente|codigo|nro hc|historia clinica)$/) || N(g(/^(apellido|apellidos|last name)$/) + ' ' + g(/^(nombre|nombres|first name|name|nombre completo|paciente)$/));
    if (t === 'appt') return g(/^(id|id turno|id cita|codigo)$/) || (g(K.date) + '|' + g(K.time) + '|' + g(K.who));
    return g(/^(id|id evolucion|codigo)$/) || (g(K.date) + '|' + g(K.text).slice(0, 60) + '|' + g(K.who));
  };
  function add(o, from) {
    var t = kind(o); if (!t) return 0;
    var f = flat(o, 0), id = idOf(f, t); if (!id) return 0;
    var bag = t === 'pat' ? M.pats : t === 'appt' ? M.appts : M.notes;
    var isNew = !bag[id]; bag[id] = Object.assign(bag[id] || {}, f); return isNew ? 1 : 0;
  }
  function walk(x, depth) {   // busca listas de registros en cualquier respuesta
    if (!x || depth > 6) return 0;
    var n = 0;
    if (Array.isArray(x)) { x.forEach(function (it) { if (it && typeof it === 'object' && !Array.isArray(it)) { n += add(it); n += walkChildren(it, depth); } else n += walk(it, depth + 1); }); return n; }
    if (typeof x === 'object') { n += add(x); n += walkChildren(x, depth); }
    return n;
  }
  function walkChildren(o, depth) { var n = 0; Object.keys(o).forEach(function (k) { var v = o[k]; if (v && typeof v === 'object') n += walk(v, depth + 1); }); return n; }

  /* ---------- escuchar lo que la página recibe ---------- */
  function seen(url, text, method) {
    if (!text || text.length < 2 || !/^[\s]*[\[{]/.test(text)) return;
    var j; try { j = JSON.parse(text); } catch (e) { return; }
    var before = count(M.pats) + count(M.appts) + count(M.notes), got = walk(j, 0);
    if (got || count(M.pats) + count(M.appts) + count(M.notes) > before) M.lists.push({ url: url, method: method || 'GET', got: got, at: Date.now() });
    paint();
  }
  var of = window.fetch;
  if (of) window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '', method = (init && init.method) || (input && input.method) || 'GET';
    return of.apply(this, arguments).then(function (res) { try { res.clone().text().then(function (t) { seen(url, t, method); }); } catch (e) { } return res; });
  };
  var XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, u) { this.__ov = { m: m, u: u }; return XO.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    var x = this; x.addEventListener('load', function () { try { var t = (x.responseType === '' || x.responseType === 'text') ? x.responseText : x.responseType === 'json' ? JSON.stringify(x.response) : ''; seen(x.__ov && x.__ov.u, t, x.__ov && x.__ov.m); } catch (e) { } });
    return XS.apply(this, arguments);
  };

  /* ---------- leer las tablas que se ven en pantalla ---------- */
  function tables(doc) {
    var n = 0;
    Array.prototype.forEach.call((doc || document).querySelectorAll('table'), function (tb) {
      var rows = Array.prototype.filter.call(tb.querySelectorAll('tr'), function (r) { return r.cells.length > 1; });
      if (rows.length < 2) return;
      var head = Array.prototype.map.call(rows[0].cells, function (c) { return c.textContent.trim(); });
      if (head.filter(Boolean).length < 2) return;
      rows.slice(1).forEach(function (r) { var o = {}; Array.prototype.forEach.call(r.cells, function (c, i) { if (head[i]) o[head[i]] = c.textContent.trim(); }); n += add(o, 'tabla'); });
    });
    Array.prototype.forEach.call((doc || document).querySelectorAll('iframe'), function (f) { try { if (f.contentDocument) n += tables(f.contentDocument); } catch (e) { } });
    return n;
  }

  /* ---------- recorrer todas las páginas del último listado ---------- */
  var PAGE = /^(page|pagina|pag|p|nropagina|numpage|pagenumber|page number|current page)$/i, OFF = /^(offset|start|skip|desde|inicio|from|first)$/i, SIZE = /^(limit|per page|perpage|per_page|size|pagesize|page size|cantidad|length|rows|take|max|registros)$/i;
  function nextUrls(u) {
    var url; try { url = new URL(u, location.href); } catch (e) { return null; }
    var p = null, o = null, s = null;
    url.searchParams.forEach(function (v, k) { var kk = k.replace(/[_\-\[\]]/g, ' ').trim(); if (PAGE.test(kk)) p = k; else if (OFF.test(kk)) o = k; else if (SIZE.test(kk)) s = k; });
    return { url: url, p: p, o: o, s: s };
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function crawl() {
    if (M.busy) return; var L = M.lists.filter(function (l) { return /get/i.test(l.method); }).sort(function (a, b) { return b.at - a.at; })[0];   // el último listado que se abrió
    if (!L) { say('Primero abrí el listado de pacientes (o la agenda) del sistema y pasá a la página 2, así aprendo cómo pide las páginas.'); return; }
    var nx = nextUrls(L.url); if (!nx || (!nx.p && !nx.o)) { say('Ese listado no muestra cómo pide las páginas. Probá pasar de página en el sistema, o usá «Leer la tabla» en cada página.'); return; }
    M.busy = true; M.stop = false; var url = nx.url, step = 0, empty = 0, size = nx.s ? +url.searchParams.get(nx.s) || 50 : 50;
    if (nx.s && size < 200) { url.searchParams.set(nx.s, '200'); size = 200; }
    var start = nx.p ? (+url.searchParams.get(nx.p) || 1) : (+url.searchParams.get(nx.o) || 0);
    if (nx.p) start = 1; else start = 0;
    for (var i = 0; i < 3000 && !M.stop; i++) {
      if (nx.p) url.searchParams.set(nx.p, String(start + i)); else url.searchParams.set(nx.o, String(start + i * size));
      say('Leyendo la página ' + (i + 1) + '… (podés seguir usando la compu; tocá Frenar para cortar)');
      var got = 0;
      try { var r = await of.call(window, url.toString(), { credentials: 'include', headers: { Accept: 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest' } }); var t = await r.text(); var j = JSON.parse(t); got = walk(j, 0); } catch (e) { got = 0; }
      paint();
      if (!got) { if (++empty >= 2) break; } else empty = 0;
      await sleep(350 + Math.random() * 250);   // de a poco, sin apurar al sistema
    }
    M.busy = false; say('Listo: recorrí ' + (i) + ' páginas. Si hay otro listado (agenda, evoluciones), abrilo, pasá a la página 2 y volvé a tocar «Traer todas las páginas».');
  }

  /* ---------- archivo para OdontoVoz ---------- */
  function download() {
    var data = { app: 'odontovoz-mudanza', v: 1, source: location.host, at: new Date().toISOString(),
      patients: Object.keys(M.pats).map(function (k) { return M.pats[k]; }), appts: Object.keys(M.appts).map(function (k) { return M.appts[k]; }), notes: Object.keys(M.notes).map(function (k) { return M.notes[k]; }) };
    var b = new Blob([JSON.stringify(data)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'mudanza-odontovoz-' + location.host.replace(/[^a-z0-9]+/gi, '-') + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    say('Bajé el archivo. Ahora en OdontoVoz: Ajustes › Mudanza desde otro sistema › Elegir archivo.');
  }
  M.data = function () { return { patients: Object.keys(M.pats).map(function (k) { return M.pats[k]; }), appts: Object.keys(M.appts).map(function (k) { return M.appts[k]; }), notes: Object.keys(M.notes).map(function (k) { return M.notes[k]; }) }; };
  M.tables = tables; M.crawl = crawl; M.download = download; M.walk = walk;

  /* ---------- panel ---------- */
  var box = document.createElement('div');
  box.id = 'ovMud';
  box.setAttribute('style', 'position:fixed;right:16px;bottom:16px;z-index:2147483647;width:320px;max-width:calc(100vw - 32px);background:#fff;color:#0f2b2c;border:2px solid #0b6b6f;border-radius:16px;box-shadow:0 18px 50px -12px rgba(0,0,0,.45);font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:14px');
  box.innerHTML = '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px"><b style="font-size:15px;flex:1">Mudanza a OdontoVoz</b><button data-ov="x" title="Cerrar" style="border:0;background:none;font-size:20px;cursor:pointer;color:#0f2b2c">×</button></div>' +
    '<div data-ov="n" style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;text-align:center;margin-bottom:8px"></div>' +
    '<div data-ov="m" style="font-size:12.5px;color:#4a5f60;min-height:34px;margin-bottom:8px">Abrí el listado de pacientes del sistema y pasá de página: voy juntando lo que aparece.</div>' +
    '<div style="display:grid;gap:6px">' +
    '<button data-ov="all" style="padding:10px;border-radius:10px;border:1px solid #0b6b6f;background:#e6f4f3;color:#0b4f52;font-weight:700;cursor:pointer">Traer todas las páginas</button>' +
    '<button data-ov="tab" style="padding:8px;border-radius:10px;border:1px solid #c9d6d6;background:#fff;cursor:pointer">Leer la tabla de esta pantalla</button>' +
    '<button data-ov="stop" style="padding:8px;border-radius:10px;border:1px solid #c9d6d6;background:#fff;cursor:pointer">Frenar</button>' +
    '<button data-ov="dl" style="padding:10px;border-radius:10px;border:0;background:#0b6b6f;color:#fff;font-weight:700;cursor:pointer">Bajar archivo para OdontoVoz</button></div>' +
    '<div style="font-size:11.5px;color:#6b7c7d;margin-top:8px">Todo queda en esta compu. No se manda nada a ningún lado.</div>';
  document.body.appendChild(box);
  function say(t) { box.querySelector('[data-ov=m]').textContent = t; }
  function paint() { box.querySelector('[data-ov=n]').innerHTML = [['Pacientes', count(M.pats)], ['Turnos', count(M.appts)], ['Evoluciones', count(M.notes)]].map(function (x) { return '<div style="background:#f2f7f7;border-radius:10px;padding:6px 2px"><b style="display:block;font-size:18px">' + x[1].toLocaleString('es-AR') + '</b><span style="font-size:11.5px">' + x[0] + '</span></div>'; }).join(''); }
  M.say = say;
  M.show = function () { box.style.display = ''; paint(); };
  box.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-ov]'); if (!b) return; var k = b.getAttribute('data-ov');
    if (k === 'x') box.style.display = 'none';
    if (k === 'tab') { var n = tables(); paint(); say(n ? 'Sumé ' + n + ' registros de la tabla. Pasá de página y volvé a tocar, o probá «Traer todas las páginas».' : 'No encontré una tabla de pacientes, turnos o evoluciones en esta pantalla.'); }
    if (k === 'all') crawl();
    if (k === 'stop') { M.stop = true; say('Frenado.'); }
    if (k === 'dl') download();
  });
  paint();
  var n0 = tables(); if (n0) { paint(); say('Ya encontré ' + n0 + ' registros en esta pantalla. Seguí navegando o tocá «Traer todas las páginas».'); }
})();
