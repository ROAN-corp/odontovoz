/* ===== 1.3: el asistente habla poco: «No entendí» a secas y respuestas habladas cortas ===== */
(function () {
  'use strict';
  const A = window.App;
  const NO = /^No (te )?entend/i;
  /* consejos que no se dicen en voz alta (en pantalla quedan) */
  const TIP = /^(prob[aá]|dec[ií]|pod[eé]s|por ejemplo|ej\.|tip|si quer[eé]s|tambi[eé]n pod|record[aá]|acordate|ojo)/i;

  /* cuando no entiende: solo «No entendí», sin sugerencias (en pantalla también, con lo que escuchó) */
  const execPrev = A.cmd.exec;
  A.cmd.exec = function (text, o) {
    const r = execPrev.apply(this, arguments);
    if (r && !r.ok && NO.test(r.msg || '') && A.CFG.voiceLong !== true) {
      const heard = String(text || '').trim();
      r.msg = 'No entendí' + (heard && heard.length < 80 ? ' «' + heard + '».' : '.');
      r.spoken = 'No entendí.';
    }
    return r;
  };

  /* lo que se dice en voz alta: la primera idea, sin consejos ni ejemplos, y corto */
  A.shortSpeech = msg => {
    let t = String(msg || '').replace(/[«»"]/g, '').replace(/\s*\([^)]*\)/g, '').replace(/\s·\s/g, ', ').replace(/\s+/g, ' ').trim();
    if (!t) return t;
    if (NO.test(t)) return 'No entendí.';
    const parts = t.replace(/[«»"]/g, '').split(/(?<=[.!?])\s+/);
    let out = parts[0];
    for (let i = 1; i < parts.length; i++) {
      if (TIP.test(parts[i]) || (out + ' ' + parts[i]).length > 90) break;
      out += ' ' + parts[i];
    }
    /* si hay que confirmar («Decí agendar para guardarlo»), eso sí se dice */
    const ask = parts.slice(1).filter(p => /^dec[ií] \S+( \S+)? para (guardar|confirmar|hacerlo|agendar|cobrar|borrar)/i.test(p))[0];
    if (ask && out.indexOf(ask) < 0) out += ' ' + ask.split(':')[0].replace(/[,;]\s*$/, '') + (/[.!?]$/.test(ask.split(':')[0]) ? '' : '.');
    if (TIP.test(out)) return '';
    const cap = ask ? 160 : 110;
    if (out.length > cap) { out = out.slice(0, cap).replace(/[\s,;:]+\S*$/, ''); }
    return out;
  };
  const V = A.voice;
  if (V && V.speak) {
    const spPrev = V.speak;
    V.speak = function (msg, force) {
      if (A.CFG.voiceLong === true) return spPrev.apply(this, arguments);
      const s = A.shortSpeech(msg); if (!s) return;
      return spPrev.call(this, s, force);
    };
  }
})();
