/* Tutorial 2: la agenda: dar, mover y borrar turnos. */
module.exports = {
  titulo: 'La agenda, paso a paso', subtitulo: 'Dar turnos arrastrando, bloquear horas, vacaciones y más',
  cierre: 'Ya dominás la agenda', cierreSub: 'En el próximo video: la ficha del paciente',
  posterEn: 7,
  segmentos: [
    { dice: 'Esta es la agenda. Arriba tenés los días, para pasar de uno a otro con un toque. En el medio hay una columna por cada profesional, con sus horarios. Y a la derecha está el calendario de varios meses: los días en verde se atiende, y los rojos no hay atención.',
      muestra: 'La agenda: los días arriba, una columna por profesional y, a la derecha, el calendario.',
      hace: async h => { await h.ev(() => { const A = window.App; A.S.date = A.add(A.today(), 60); A.S.tab = 'agenda'; A.S.view = 'dia'; A.S.calM = null; A.refresh(); }); await h.sleep(1500); await h.move('#dayStrip .wk[aria-pressed="true"]'); await h.sleep(1500); await h.move('.am-side .mc-d.am-w'); await h.sleep(1500); } },
    { dice: 'Para dar un turno, tocá un horario libre. Se abre una burbuja con las opciones y, a la derecha, la lista de pacientes. Podés buscar por nombre, apellido o documento.',
      hace: async h => { const p = await h.libre(0, 3); await h.to(p.x, p.y); await h.page.mouse.click(p.x, p.y); await h.sleep(1600); await h.type('#bubQ', 'mar'); await h.sleep(1200); await h.ev(() => { const q = document.getElementById('bubQ'); q.value = ''; window.App.ins.bubQ(q); }); await h.sleep(600); } },
    { dice: 'Y acá viene lo más rápido: mantené apretado un paciente y arrastralo hasta el horario que quieras. Mientras arrastrás, ves dónde va a caer, y se pone rojo si ya está ocupado.',
      hace: async h => { const row = await h.box('#bub .bub-list button[data-pid]'); const p = await h.libre(0, 6); await h.drag(row.x + 40, row.y + 20, p.x, p.y, 1600, 300); await h.sleep(900); await h.up(); await h.sleep(900); } },
    { dice: 'Apenas lo soltás, el paciente vuela hasta el turno y aparece un cuadrito para escribir el motivo. Podés tocar uno de los botones, como Control o Limpieza, o escribir el tuyo y apretar Enter.',
      muestra: 'Se abre un cuadrito para el motivo: tocá un botón (Control, Limpieza…) o escribí el tuyo.',
      hace: async h => { await h.sleep(1800); await h.click('#mvPop .mv-chips button >> nth=0'); await h.sleep(1200); } },
    { dice: 'Si el turno dura más, estirá el borde de abajo, esa rayita gris, y la duración cambia de a quince minutos: cuarenta y cinco, una hora, lo que necesites.',
      hace: async h => { const b = await h.box('.blk.blk-new .rz, .blk[data-id] .rz >> nth=0').catch(() => null); const r = await h.ev(() => { const A = window.App, a = A.day(A.S.date).filter(x => x.motivo)[0] || A.day(A.S.date).slice(-1)[0]; const e = document.querySelector('.blk[data-id="' + a.id + '"] .rz'); e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + 6 }; }); await h.sleep(300); await h.drag(r.x, r.y, r.x, r.y + 56, 1200, 200); await h.sleep(800); await h.up(); await h.sleep(1000); } },
    { dice: 'Para bloquear horas, por ejemplo un almuerzo o una reunión, mantené apretado un espacio libre y arrastrá hacia abajo hasta la hora que quieras. Después ponés el motivo y tocás Bloquear.',
      hace: async h => { const p = await h.libre(0, 12); await h.drag(p.x, p.y, p.x, p.y + 84, 1200, 1500); await h.sleep(1500); await h.click('#blkBar [data-act="blkGo"]').catch(() => {}); await h.sleep(1200); } },
    { dice: 'Si querés borrar un turno, mantenelo apretado unos segundos. Se llena un anillo rojo y aparece un menú chiquito con la opción Borrar turno. Si te equivocás, tenés un aviso para deshacerlo.',
      muestra: 'Para borrar un turno: mantenelo apretado. Aparece un menú chiquito con «Borrar turno».',
      hace: async h => { const r = await h.ev(() => { const A = window.App, a = A.day(A.S.date).filter(x => x.motivo)[0] || A.day(A.S.date).filter(x => x.type !== 'block').slice(-1)[0]; const e = document.querySelector('.blk[data-id="' + a.id + '"]'); e.scrollIntoView({ block: 'center' }); const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + 24 }; }); await h.sleep(300); await h.to(r.x, r.y); await h.page.mouse.down(); await h.sleep(2300); await h.page.mouse.up(); await h.sleep(1200); await h.click('#delMini [data-act="delMiniGo"]'); await h.sleep(1500); } },
    { dice: 'Las vacaciones se cargan en Ajustes, en Profesionales. Después de cargarlas, esos días aparecen en rojo en el calendario de la derecha, y la columna dice Vacaciones, para que tu secretaria sepa que ese día no se dan turnos.',
      muestra: 'Vacaciones: se cargan en Ajustes › Profesionales. Los días quedan en rojo y la columna dice «Vacaciones».',
      hace: async h => { await h.ev(() => { const A = window.App, p = A.PROS[0]; const f = A.add(A.today(), 61), t = A.add(A.today(), 66); p.vac = [{ from: f, to: t, why: 'Vacaciones de invierno' }]; A.dropDayCache && A.dropDayCache(); A.S.date = A.add(A.today(), 62); A.S.proSel = [p.id]; A.refresh(); }); await h.sleep(1500); await h.move('.am-side .mc-d.am-off'); await h.sleep(2500); await h.move('.gb-offlbl'); await h.sleep(2500); } },
    { dice: 'Para dar un turno dentro de varios meses, tocá el nombre del mes en el calendario y elegí el mes que necesitás. Y desde ahí, el día.',
      hace: async h => { await h.click('.mc-jump'); await h.sleep(1500); await h.click('.mc-pm >> nth=6'); await h.sleep(1800); } },
    { dice: 'Con esto ya manejás toda la agenda. Si tu secretaria usa la aplicación, puede hacer todo lo que te mostré. En el próximo video vemos la ficha del paciente y la ortodoncia.',
      hace: async h => { await h.sleep(1800); } }
  ]
};
