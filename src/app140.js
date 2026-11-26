/* ===== 1.55: solapa Escaneos 3D: adjuntar escaneos intraorales y diseños (STL, PLY, OBJ) a la historia clínica y verlos girando, acercando y moviendo ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, MF = A.modalFns, esc = A.esc, $ = q => document.querySelector(q);
  if (!A.render || !A.media) return;
  const dmy = d => (A.fmtDMY ? A.fmtDMY(d) : d);
  const MAXMB = 60;
  const KINDS = ['Arcada superior', 'Arcada inferior', 'Ambas arcadas + mordida', 'Preparación / muñón', 'Diseño CAD (corona, puente, guía…)', 'Modelo de estudio', 'Otro'];
  const list = pid => { const pd = A.pd(pid); return pd.scans || (pd.scans = []); };
  const byId = (pid, id) => list(pid).filter(x => x.id === id)[0];
  const mb = n => (n / 1048576 < 10 ? (n / 1048576).toFixed(1) : Math.round(n / 1048576)).toString().replace('.', ',') + ' MB';

  /* ---------- lectura de archivos 3D ---------- */
  const TYPES = { char: 1, uchar: 1, int8: 1, uint8: 1, short: 2, ushort: 2, int16: 2, uint16: 2, int: 4, uint: 4, int32: 4, uint32: 4, float: 4, float32: 4, double: 8, float64: 8 };
  function rd(dv, o, t, le) { switch (t) { case 'char': case 'int8': return dv.getInt8(o); case 'uchar': case 'uint8': return dv.getUint8(o); case 'short': case 'int16': return dv.getInt16(o, le); case 'ushort': case 'uint16': return dv.getUint16(o, le); case 'int': case 'int32': return dv.getInt32(o, le); case 'uint': case 'uint32': return dv.getUint32(o, le); case 'float': case 'float32': return dv.getFloat32(o, le); default: return dv.getFloat64(o, le); } }
  /* vértices (x,y,z[,r,g,b]) e índices de triángulos → malla sin índices con normales suaves */
  function build(V, C, tris) {
    const nv = V.length / 3, N = new Float32Array(nv * 3);
    for (let i = 0; i < tris.length; i += 3) {
      const a = tris[i] * 3, b = tris[i + 1] * 3, c = tris[i + 2] * 3, ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2], nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      [a, b, c].forEach(k => { N[k] += nx; N[k + 1] += ny; N[k + 2] += nz; });
    }
    for (let i = 0; i < nv; i++) { const l = Math.hypot(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]) || 1; N[i * 3] /= l; N[i * 3 + 1] /= l; N[i * 3 + 2] /= l; }
    const n = tris.length, pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), col = C ? new Float32Array(n * 3) : null;
    for (let i = 0; i < n; i++) { const k = tris[i] * 3; pos[i * 3] = V[k]; pos[i * 3 + 1] = V[k + 1]; pos[i * 3 + 2] = V[k + 2]; nrm[i * 3] = N[k]; nrm[i * 3 + 1] = N[k + 1]; nrm[i * 3 + 2] = N[k + 2]; if (col) { col[i * 3] = C[k]; col[i * 3 + 1] = C[k + 1]; col[i * 3 + 2] = C[k + 2]; } }
    return { pos, nrm, col, n };
  }
  function parseSTL(buf) {
    const dv = new DataView(buf), cnt = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0;
    if (84 + cnt * 50 === buf.byteLength && cnt > 0) {
      const pos = new Float32Array(cnt * 9), nrm = new Float32Array(cnt * 9);
      for (let t = 0; t < cnt; t++) {
        const o = 84 + t * 50; for (let v = 0; v < 3; v++) for (let k = 0; k < 3; k++) pos[t * 9 + v * 3 + k] = dv.getFloat32(o + 12 + v * 12 + k * 4, true);
        const a = t * 9, ux = pos[a + 3] - pos[a], uy = pos[a + 4] - pos[a + 1], uz = pos[a + 5] - pos[a + 2], vx = pos[a + 6] - pos[a], vy = pos[a + 7] - pos[a + 1], vz = pos[a + 8] - pos[a + 2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        for (let v = 0; v < 3; v++) { nrm[a + v * 3] = nx; nrm[a + v * 3 + 1] = ny; nrm[a + v * 3 + 2] = nz; }
      }
      return { pos, nrm, col: null, n: cnt * 3 };
    }
    const txt = new TextDecoder().decode(buf), re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g, V = []; let m;
    while ((m = re.exec(txt))) V.push(+m[1], +m[2], +m[3]);
    if (V.length < 9) throw new Error('stl');
    const tris = new Uint32Array(Math.floor(V.length / 9) * 3).map((_, i) => i), Vf = new Float32Array(V.slice(0, tris.length * 3));
    return build(Vf, null, tris);
  }
  function parsePLY(buf) {
    const u8 = new Uint8Array(buf); let hEnd = -1; const head = new TextDecoder().decode(u8.subarray(0, Math.min(u8.length, 20000))), i0 = head.indexOf('end_header'); if (i0 < 0) throw new Error('ply');
    hEnd = i0 + 'end_header'.length; while (u8[hEnd] === 13 || u8[hEnd] === 10) { hEnd++; if (u8[hEnd - 1] === 10) break; }
    const lines = head.slice(0, i0).split(/\r?\n/), els = []; let fmt = 'ascii';
    lines.forEach(l => { const p = l.trim().split(/\s+/); if (p[0] === 'format') fmt = p[1]; else if (p[0] === 'element') els.push({ name: p[1], n: +p[2], props: [] }); else if (p[0] === 'property' && els.length) els[els.length - 1].props.push(p[1] === 'list' ? { list: true, ct: p[2], it: p[3], name: p[4] } : { t: p[1], name: p[2] }); });
    const ve = els.filter(e => e.name === 'vertex')[0], fe = els.filter(e => e.name === 'face')[0]; if (!ve) throw new Error('ply');
    const V = new Float32Array(ve.n * 3), hasC = ve.props.some(p => p.name === 'red'), C = hasC ? new Float32Array(ve.n * 3) : null, tris = [];
    if (fmt === 'ascii') {
      const tk = new TextDecoder().decode(u8.subarray(hEnd)).split(/\s+/).filter(Boolean); let q = 0;
      for (const e of els) for (let i = 0; i < e.n; i++) { if (e === ve) { e.props.forEach(p => { const v = +tk[q++]; if (p.name === 'x') V[i * 3] = v; else if (p.name === 'y') V[i * 3 + 1] = v; else if (p.name === 'z') V[i * 3 + 2] = v; else if (C && p.name === 'red') C[i * 3] = v / 255; else if (C && p.name === 'green') C[i * 3 + 1] = v / 255; else if (C && p.name === 'blue') C[i * 3 + 2] = v / 255; }); }
        else { e.props.forEach(p => { if (p.list) { const c = +tk[q++], idx = []; for (let k = 0; k < c; k++) idx.push(+tk[q++]); if (e === fe && /vertex_ind/.test(p.name)) for (let k = 1; k + 1 < idx.length; k++) tris.push(idx[0], idx[k], idx[k + 1]); } else q++; }); } }
    } else {
      const le = fmt === 'binary_little_endian', dv = new DataView(buf); let o = hEnd;
      for (const e of els) for (let i = 0; i < e.n; i++) { for (const p of e.props) {
        if (p.list) { const c = rd(dv, o, p.ct, le); o += TYPES[p.ct]; const idx = []; for (let k = 0; k < c; k++) { idx.push(rd(dv, o, p.it, le)); o += TYPES[p.it]; } if (e === fe && /vertex_ind/.test(p.name)) for (let k = 1; k + 1 < idx.length; k++) tris.push(idx[0], idx[k], idx[k + 1]); }
        else { if (e === ve) { const v = rd(dv, o, p.t, le); if (p.name === 'x') V[i * 3] = v; else if (p.name === 'y') V[i * 3 + 1] = v; else if (p.name === 'z') V[i * 3 + 2] = v; else if (C && p.name === 'red') C[i * 3] = v / 255; else if (C && p.name === 'green') C[i * 3 + 1] = v / 255; else if (C && p.name === 'blue') C[i * 3 + 2] = v / 255; } o += TYPES[p.t] || 4; } } }
    }
    if (!tris.length) throw new Error('ply');
    return build(V, C, new Uint32Array(tris));
  }
  function parseOBJ(buf) {
    const lines = new TextDecoder().decode(buf).split(/\r?\n/), V = [], Cc = [], tris = []; let hasC = false;
    for (const l of lines) {
      if (l.charCodeAt(0) === 118 && l.charCodeAt(1) === 32) { const p = l.trim().split(/\s+/); V.push(+p[1], +p[2], +p[3]); if (p.length >= 7) { hasC = true; Cc.push(+p[4], +p[5], +p[6]); } else Cc.push(0.9, 0.88, 0.8); }
      else if (l.charCodeAt(0) === 102 && l.charCodeAt(1) === 32) { const p = l.trim().split(/\s+/).slice(1).map(s => { let k = parseInt(s.split('/')[0], 10); return k < 0 ? V.length / 3 + k : k - 1; }); for (let k = 1; k + 1 < p.length; k++) tris.push(p[0], p[k], p[k + 1]); }
    }
    if (!tris.length) throw new Error('obj');
    return build(new Float32Array(V), hasC ? new Float32Array(Cc) : null, new Uint32Array(tris));
  }
  function parse3D(buf, name) {
    const ext = String(name).toLowerCase().replace(/^.*\./, ''), g = ext === 'ply' ? parsePLY(buf) : ext === 'obj' ? parseOBJ(buf) : parseSTL(buf);
    const p = g.pos; let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < p.length; i += 3) for (let k = 0; k < 3; k++) { const v = p[i + k]; if (v < mn[k]) mn[k] = v; if (v > mx[k]) mx[k] = v; }
    const c = [0, 1, 2].map(k => (mn[k] + mx[k]) / 2), dims = [0, 1, 2].map(k => mx[k] - mn[k]), s = 2 / (Math.max(dims[0], dims[1], dims[2]) || 1);
    for (let i = 0; i < p.length; i += 3) { p[i] = (p[i] - c[0]) * s; p[i + 1] = (p[i + 1] - c[1]) * s; p[i + 2] = (p[i + 2] - c[2]) * s; }
    g.dims = dims; g.tris = g.n / 3; return g;
  }
  A.scan3dParse = parse3D;

  /* ---------- visor WebGL: girar, acercar y mover ---------- */
  const VS = 'attribute vec3 aP;attribute vec3 aN;attribute vec3 aC;uniform mat4 uMV;uniform mat4 uPr;varying vec3 vN;varying vec3 vC;void main(){vN=mat3(uMV)*aN;vC=aC;gl_Position=uPr*uMV*vec4(aP,1.0);}';
  const FS = 'precision mediump float;varying vec3 vN;varying vec3 vC;uniform float uSh;void main(){vec3 n=normalize(vN);if(!gl_FrontFacing)n=-n;float d=max(dot(n,vec3(0.0,0.0,1.0)),0.0);float f=max(dot(n,normalize(vec3(0.4,0.8,0.5))),0.0);float s=pow(max(dot(n,normalize(vec3(0.2,0.3,1.0))),0.0),24.0)*0.25;vec3 c=vC*(0.28+0.5*d+0.32*f)*uSh+vec3(s);gl_FragColor=vec4(c,1.0);}';
  const mul = (a, b) => { const o = new Float32Array(16); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s; } return o; };
  const rotX = a => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
  const rotY = a => { const c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
  const trans = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
  function persp(f, a, n, fa) { const t = 1 / Math.tan(f / 2); return new Float32Array([t / a, 0, 0, 0, 0, t, 0, 0, 0, 0, (fa + n) / (n - fa), -1, 0, 0, 2 * fa * n / (n - fa), 0]); }
  function viewer(cv, g) {
    const gl = cv.getContext('webgl', { antialias: true, preserveDrawingBuffer: true }) || cv.getContext('experimental-webgl', { preserveDrawingBuffer: true }); if (!gl) throw new Error('webgl');
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error('shader'); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
    const buf = (arr, name) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW); const l = gl.getAttribLocation(pr, name); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 3, gl.FLOAT, false, 0, 0); };
    buf(g.pos, 'aP'); buf(g.nrm, 'aN'); const col = g.col || (() => { const c = new Float32Array(g.n * 3); for (let i = 0; i < g.n; i++) { c[i * 3] = 0.93; c[i * 3 + 1] = 0.9; c[i * 3 + 2] = 0.82; } return c; })(); buf(col, 'aC');
    const uMV = gl.getUniformLocation(pr, 'uMV'), uPr = gl.getUniformLocation(pr, 'uPr'), uSh = gl.getUniformLocation(pr, 'uSh');
    const V = { yaw: 0, pitch: 0, dist: 3.2, tx: 0, ty: 0, auto: false, dark: true }; let raf = 0, dirty = true;
    const draw = () => {
      const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1); if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      gl.viewport(0, 0, cv.width, cv.height); const bg = V.dark ? [0.06, 0.13, 0.15] : [0.93, 0.95, 0.96]; gl.clearColor(bg[0], bg[1], bg[2], 1); gl.enable(gl.DEPTH_TEST); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const mv = mul(trans(V.tx, V.ty, -V.dist), mul(rotX(V.pitch), rotY(V.yaw))); gl.uniformMatrix4fv(uMV, false, mv); gl.uniformMatrix4fv(uPr, false, persp(0.62, cv.width / Math.max(1, cv.height), 0.05, 50)); gl.uniform1f(uSh, 1);
      gl.drawArrays(gl.TRIANGLES, 0, g.n); dirty = false;
    };
    const loop = () => { if (!document.body.contains(cv)) { cancelAnimationFrame(raf); return; } if (V.auto) { V.yaw += 0.01; dirty = true; } if (dirty) draw(); raf = requestAnimationFrame(loop); };
    loop();
    /* mouse y táctil */
    const P = {}; let last = null; const clampP = () => { V.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, V.pitch)); };
    cv.addEventListener('contextmenu', e => e.preventDefault());
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); P[e.pointerId] = { x: e.clientX, y: e.clientY, b: e.button, sh: e.shiftKey }; last = null; V.auto = false; });
    cv.addEventListener('pointermove', e => {
      const p = P[e.pointerId]; if (!p) return; const ids = Object.keys(P);
      if (ids.length === 2) { const q = P[ids.filter(k => +k !== e.pointerId)[0]], d0 = Math.hypot(p.x - q.x, p.y - q.y), cx0 = (p.x + q.x) / 2, cy0 = (p.y + q.y) / 2; p.x = e.clientX; p.y = e.clientY; const d1 = Math.hypot(p.x - q.x, p.y - q.y), cx1 = (p.x + q.x) / 2, cy1 = (p.y + q.y) / 2; if (d0 > 5) V.dist = Math.max(0.6, Math.min(12, V.dist * d0 / d1)); V.tx += (cx1 - cx0) * V.dist / cv.clientHeight * 1.1; V.ty -= (cy1 - cy0) * V.dist / cv.clientHeight * 1.1; dirty = true; return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if (p.b === 2 || p.sh) { V.tx += dx * V.dist / cv.clientHeight * 1.1; V.ty -= dy * V.dist / cv.clientHeight * 1.1; } else { V.yaw += dx * 0.01; V.pitch += dy * 0.01; clampP(); } dirty = true;
    });
    const up = e => { delete P[e.pointerId]; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', e => { e.preventDefault(); V.dist = Math.max(0.6, Math.min(12, V.dist * Math.exp(e.deltaY * 0.0015))); dirty = true; }, { passive: false });
    return { V, redraw: () => { dirty = true; }, view: (n) => { const m = { front: [0, 0], top: [0, Math.PI / 2], bottom: [0, -Math.PI / 2], right: [-Math.PI / 2, 0], left: [Math.PI / 2, 0], back: [Math.PI, 0] }[n] || [0, 0]; V.yaw = m[0]; V.pitch = m[1]; V.tx = V.ty = 0; V.dist = 3.2; dirty = true; }, thumb: () => { draw(); const t = document.createElement('canvas'); t.width = 160; t.height = Math.max(1, Math.round(160 * cv.height / cv.width)); t.getContext('2d').drawImage(cv, 0, 0, t.width, t.height); return t.toDataURL('image/jpeg', 0.7); } };
  }

  /* ---------- la pestaña ---------- */
  A.render.scanTab = pid => {
    const L = list(pid).slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    let h = '<div class="sc-wrap"><section class="card"><div class="im-top"><div><h2>Escaneos 3D <span class="count">' + L.length + '</span></h2><div class="hint" style="margin:2px 0 0">Adjuntá los escaneos intraorales y los diseños de este paciente (STL, PLY u OBJ) y mirálos girando, acercando y moviendo, sin salir de la historia clínica.</div></div></div>' +
      '<div class="row3" style="margin-top:10px"><div class="field"><label for="scK">Tipo</label><select id="scK">' + KINDS.map(k => '<option>' + k + '</option>').join('') + '</select></div><div class="field"><label for="scT">Pieza (opcional)</label><input id="scT" inputmode="numeric" placeholder="ej. 36"></div><div class="field"><label for="scD">Fecha del escaneo</label><input id="scD" type="date" value="' + A.today() + '"></div></div><div class="field"><label for="scN">Nota (opcional)</label><input id="scN" placeholder="Ej.: preparación de 46 para corona, escáner Medit i700"></div>' +
      '<div class="row-btns"><label class="btn primary filebtn">+ Subir escaneo<input type="file" id="scF" accept=".stl,.ply,.obj" hidden data-chg="scUp" multiple></label></div><div id="scMsg" class="hint bad"></div><div class="small-note">Hasta ' + MAXMB + ' MB por archivo. Si tu escáner exporta otro formato, exportalo como STL o PLY (el PLY conserva el color).</div></section>';
    h += L.length ? '<section class="card"><div class="sc-grid">' + L.map(x => '<button class="sc-it" data-act="scOpen" data-id="' + esc(x.id) + '"><img alt="" src="' + esc(x.thumb || '') + '"><b>' + esc(x.name) + '</b><span>' + esc(x.kind) + (x.tooth ? ' · pieza ' + esc(x.tooth) : '') + '</span><small>' + dmy(x.date) + ' · ' + esc(x.fmt.toUpperCase()) + ' · ' + mb(x.size) + '</small></button>').join('') + '</div></section>' : '<section class="card"><div class="empty">Todavía no hay escaneos. Subí el primero con «+ Subir escaneo».</div></section>';
    return h + '</div>';
  };
  const readData = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('lectura')); r.readAsDataURL(f); });
  const readBuf = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(new Error('lectura')); r.readAsArrayBuffer(f); });
  A.chg.scUp = async el => {
    const pid = S.fichaPid, files = Array.prototype.slice.call(el.files || []), msg = $('#scMsg'); if (!files.length) return; el.value = '';
    const kind = ($('#scK') || {}).value || KINDS[0], tooth = ($('#scT') || {}).value.trim(), date = ($('#scD') || {}).value || A.today(), note = ($('#scN') || {}).value.trim(); let n = 0;
    for (const f of files) {
      if (!/\.(stl|ply|obj)$/i.test(f.name)) { msg.textContent = '«' + f.name + '»: el formato tiene que ser STL, PLY u OBJ.'; continue; }
      if (f.size > MAXMB * 1048576) { msg.textContent = '«' + f.name + '» pesa ' + mb(f.size) + ': el máximo es ' + MAXMB + ' MB.'; continue; }
      msg.textContent = 'Procesando «' + f.name + '»…'; await new Promise(r => setTimeout(r, 30));
      try {
        const g = parse3D(await readBuf(f), f.name), cv = document.createElement('canvas'); cv.style.cssText = 'position:fixed;left:-9999px;top:0;width:320px;height:240px'; document.body.appendChild(cv); let thumb = '';
        try { const vw = viewer(cv, g); thumb = vw.thumb(); } finally { cv.remove(); }
        const id = A.uid(); await A.media.put('scan_' + id, await readData(f));
        list(pid).push({ id, name: f.name.replace(/\.[^.]+$/, ''), date, kind, tooth, note, fmt: f.name.toLowerCase().replace(/^.*\./, ''), size: f.size, tris: g.tris, dims: g.dims.map(v => Math.round(v * 10) / 10), thumb, pro: A.PAT(pid).pro });
        A.pd(pid).notes.unshift({ id: A.uid(), date, pro: A.PAT(pid).pro, text: 'Se adjuntó un escaneo 3D: ' + kind + (tooth ? ', pieza ' + tooth : '') + ' (' + f.name + ').' }); n++;
      } catch (e) { msg.textContent = /webgl/.test(String(e && e.message)) ? 'Este equipo no puede mostrar 3D (WebGL).' : 'No se pudo leer «' + f.name + '». Revisá que sea un STL, PLY u OBJ válido.'; }
    }
    if (n) { msg.textContent = ''; A.touchPd(pid); A.refresh(); A.toast(n + ' escaneo' + (n === 1 ? '' : 's') + ' agregado' + (n === 1 ? '' : 's') + '.'); }
  };
  A.acts.scOpen = el => { S.modal = { type: 'scan', pid: S.fichaPid, id: el.getAttribute('data-id') }; A.renderModal(); };
  MF.scan = m => {
    const x = byId(m.pid, m.id); if (!x) return '';
    const b = '<div class="sc-stage"><canvas id="scCv" aria-label="Escaneo 3D de ' + esc(x.name) + '"></canvas><div class="sc-load" id="scLoad">Cargando el modelo…</div></div>' +
      '<div class="sc-bar"><button class="btn small" data-act="scView" data-v="front">Frente</button><button class="btn small" data-act="scView" data-v="top">Oclusal</button><button class="btn small" data-act="scView" data-v="bottom">Desde abajo</button><button class="btn small" data-act="scView" data-v="left">Izquierda</button><button class="btn small" data-act="scView" data-v="right">Derecha</button><button class="btn small" data-act="scView" data-v="back">Atrás</button><button class="btn small" data-act="scAuto" id="scAutoB" aria-pressed="false">Girar solo</button><button class="btn small" data-act="scBg">Fondo claro / oscuro</button><button class="btn small" data-act="scFull">Pantalla completa</button></div>' +
      '<div class="small-note">Mouse: arrastrar gira · rueda acerca · botón derecho o Shift mueve. Celular: un dedo gira, dos dedos acercan y mueven. <b>Tamaño:</b> ' + esc((x.dims || []).join(' × ')) + ' (en las unidades del archivo, normalmente mm) · ' + Math.round((x.tris || 0) / 1000).toLocaleString('es-AR') + ' mil triángulos</div>' +
      '<div class="row2"><div class="field"><label for="scNm">Nombre</label><input id="scNm" data-chg="scField" data-k="name" data-id="' + esc(x.id) + '" value="' + esc(x.name) + '"></div><div class="field"><label for="scNo">Nota</label><input id="scNo" data-chg="scField" data-k="note" data-id="' + esc(x.id) + '" value="' + esc(x.note || '') + '"></div></div>';
    return A.modalShell(x.kind + ' · ' + dmy(x.date), b, '<button class="btn danger" data-act="scDel" data-id="' + esc(x.id) + '">Borrar</button><button class="btn" data-act="scDl" data-id="' + esc(x.id) + '">Descargar</button><button class="btn primary" data-act="closeModal">Cerrar</button>', true);
  };
  let VW = null;
  A.modalAfter.scan = async m => {
    const x = byId(m.pid, m.id), cv = $('#scCv'), ld = $('#scLoad'); VW = null; if (!x || !cv) return;
    try {
      const data = await A.media.get('scan_' + x.id); if (!data) { ld.textContent = 'El archivo todavía no está en este equipo (esperá a que sincronice).'; return; }
      const buf = await (await fetch(data)).arrayBuffer(), g = parse3D(buf, x.name + '.' + x.fmt); if (!document.body.contains(cv)) return;
      VW = viewer(cv, g); ld.remove();
    } catch (e) { if (ld) ld.textContent = /webgl/.test(String(e && e.message)) ? 'Este equipo no puede mostrar 3D (WebGL).' : 'No se pudo abrir el modelo.'; }
  };
  A.acts.scView = el => { if (VW) VW.view(el.getAttribute('data-v')); };
  A.acts.scAuto = el => { if (!VW) return; VW.V.auto = !VW.V.auto; el.setAttribute('aria-pressed', String(VW.V.auto)); };
  A.acts.scBg = () => { if (!VW) return; VW.V.dark = !VW.V.dark; VW.redraw(); };
  A.acts.scFull = () => { const s = $('.sc-stage'); try { if (s.requestFullscreen) s.requestFullscreen(); else if (s.webkitRequestFullscreen) s.webkitRequestFullscreen(); } catch (e) { /* nada */ } };
  A.chg.scField = el => { const x = byId(S.modal.pid, el.getAttribute('data-id')); if (!x) return; x[el.getAttribute('data-k')] = el.value.trim() || (el.getAttribute('data-k') === 'name' ? x.name : ''); A.touchPd(S.modal.pid); };
  A.acts.scDl = async el => { const x = byId(S.modal.pid, el.getAttribute('data-id')), d = x && await A.media.get('scan_' + x.id); if (!d) { A.toast('El archivo todavía no está en este equipo.'); return; } A.saveFile(x.name + '.' + x.fmt, await (await fetch(d)).blob()); };
  A.acts.scDel = el => { const pid = S.modal.pid, id = el.getAttribute('data-id'); const pd = A.pd(pid); pd.scans = list(pid).filter(x => x.id !== id); A.media.del('scan_' + id); A.touchPd(pid); S.modal = null; A.renderModal(); A.refresh(); A.toast('Escaneo borrado.'); };

  const css = document.createElement('style'); css.id = 'ovApp140';
  css.textContent = '.sc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}.sc-it{display:flex;flex-direction:column;gap:3px;text-align:left;padding:8px;border:1px solid var(--line);border-radius:12px;background:var(--surface);cursor:pointer;color:var(--ink)}.sc-it img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:8px;background:var(--surface-2)}.sc-it span,.sc-it small{color:var(--ink-2);font-size:.8rem}' +
    '.sc-stage{position:relative;width:100%;height:min(58vh,520px);border-radius:12px;overflow:hidden;background:#0f2226}.sc-stage canvas{width:100%;height:100%;display:block;touch-action:none;cursor:grab}.sc-load{position:absolute;inset:0;display:grid;place-items:center;color:#fff;font-size:.95rem;text-align:center;padding:20px;pointer-events:none}.sc-bar{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.sc-bar .btn[aria-pressed="true"]{background:var(--accent);color:var(--accent-ink)}';
  document.head.appendChild(css);
})();
