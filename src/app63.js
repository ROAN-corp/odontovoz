/* ===== 1.46.4: el precio de lo que se cobra desde la evolución y el odontograma sale de «Prácticas y aranceles» ===== */
(function () {
  'use strict';
  const A = window.App;
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  /* qué ítems de la lista corresponden a cada marca del odontograma */
  const FIND = {
    obturacion: /composite|resina|restauraci|obturaci/, composite: /composite|resina|restauraci|obturaci/,
    amalgama: /amalgama/, ionomero: /ionomero/, sellador: /sellador/,
    extraccion: /extracci/, extraido: /extracci/, endodoncia: /endodoncia(?! *retrat)/, corona: /^corona(?! provisoria| sobre implante)/,
    perno: /perno/, implante: /^implante/
  };
  const AVOID = /incrustaci|inlay|onlay|retratamiento|complej|quirurg|cordal|provisori/;
  const byFaces = (list, n) => {
    const one = list.filter(c => /\b1 cara|simple|una cara/.test(norm(c.label)));
    const two = list.filter(c => /\b2 caras|compuest|dos caras/.test(norm(c.label)));
    const three = list.filter(c => /\b3|mas caras|complej|tres caras/.test(norm(c.label)));
    if (n >= 3 && three.length) return three[0];
    if (n === 2 && two.length) return two[0];
    if (one.length) return one[0];
    return list.length === 1 ? list[0] : null;
  };
  A.catItemFor = (cond, nFaces) => {
    const re = FIND[cond]; if (!re || !A.CAT) return null;
    let list = A.CAT.filter(c => re.test(norm(c.label)) && c.price > 0);
    const plain = list.filter(c => !AVOID.test(norm(c.label)));
    if (plain.length) list = plain;
    if (!list.length) return null;
    if (/obturacion|composite|amalgama/.test(cond)) return byFaces(list, nFaces || 1);
    if (cond === 'extraccion' || cond === 'extraido') return list.filter(c => /simple/.test(norm(c.label)))[0] || list[0];
    return list.length === 1 ? list[0] : list.filter(c => /unirradicular/.test(norm(c.label)))[0] || list[0];
  };
  const prev = A.priceOf;
  A.priceOf = (cond, nFaces) => { const it = A.catItemFor(cond, nFaces); return it ? it.price : prev(cond, nFaces); };
})();
