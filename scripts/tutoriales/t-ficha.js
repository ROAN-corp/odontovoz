/* Tutorial 3: la ficha del paciente, la evolución y la ortodoncia. */
const IR = (h, tabn) => h.ev(t => { const A = window.App; A.S.fichaTab = t; A.refresh(); }, tabn);
module.exports = {
  titulo: 'La ficha del paciente y la ortodoncia', subtitulo: 'Evolución clínica, fotos, controles y planes en PDF',
  cierre: 'Todo en la ficha del paciente', cierreSub: 'odontovoz.com.ar',
  posterEn: 7,
  segmentos: [
    { dice: 'Esta es la ficha del paciente. Desde la agenda o desde la lista de pacientes, tocás a la persona y se abre su ficha completa. Arriba están sus datos, las alertas clínicas, el saldo de la cuenta y el botón para darle un turno.',
      hace: async h => { await h.ev(() => { const A = window.App; A.S.tab = 'ficha'; A.S.fichaPid = A.PATS[2].id; A.S.fichaTab = 'datos'; A.refresh(); }); await h.sleep(2000); await h.move('#view-ficha .alert-strip, #view-ficha .fh'); await h.sleep(1500); } },
    { dice: 'Debajo tenés las secciones: datos e historia, odontograma, periodontograma, plan y presupuesto, lo realizado, laboratorios, recetas, fotos y radiografías, ortodoncia, documentos y firmas, y la cuenta. Todo lo del paciente en un solo lugar.',
      muestra: 'Las secciones de la ficha: odontograma, plan, laboratorio, fotos, ortodoncia, documentos y cuenta.',
      hace: async h => { const n = await h.page.locator('#view-ficha .ftab').count(); for (let i = 0; i < Math.min(n, 10); i++) { await h.move(h.page.locator('#view-ficha .ftab').nth(i)); await h.sleep(500); } } },
    { dice: 'En Datos e historia está la evolución clínica. Acá escribís lo que hiciste, como siempre. Por ejemplo: control de ortodoncia, cambié arco superior e inferior cero catorce niti, puse cadena elástica de la trece a la veintitrés.',
      muestra: 'En «Datos e historia › Evolución clínica» escribís lo que hiciste: «Control de ortodoncia, cambié arco superior e inferior 0.14 NiTi, puse cadena elástica de 13 a 23».',
      hace: async h => { await h.scroll('body', 0, 100); const t = h.page.locator('#noteTxt'); await t.scrollIntoViewIfNeeded(); await h.click(t); await h.page.keyboard.type('Control de ortodoncia, cambié arco superior e inferior 0.14 niti, puse cadena elástica de 13 a 23', { delay: 55 }); await h.sleep(900); await h.click('[data-act="addNote"]'); await h.sleep(1500); const g = h.page.locator('.modal [data-act="pwGo"][data-k="nota"]'); if (await g.count()) { await h.click(g.first()); } await h.sleep(1500); } },
    { dice: 'La aplicación reconoce que es un control de ortodoncia, y crea sola el control en la solapa Ortodoncia, con el arco, lo que hiciste y la fecha del próximo control. Te avisa, y si no era lo que querías, lo deshacés con un toque. La nota queda tal cual la escribiste.',
      muestra: 'Se crea solo el control en la solapa Ortodoncia, con aviso y opción de deshacer.',
      hace: async h => { await h.move('#toastHost .toast'); await h.sleep(2500); } },
    { dice: 'Y en la misma nota aparece el botón Agregar foto. Elegís qué foto es, frente, sonrisa, intraoral, y la sacás o la subís. La foto queda en la nota, en el control y en la sección de fotos del paciente.',
      muestra: 'En la nota aparece «Agregar foto»: queda en la nota, en el control y en Fotos del paciente.',
      hace: async h => { await h.page.locator('.ox-addph').first().scrollIntoViewIfNeeded(); await h.move('.ox-addph label.btn'); await h.sleep(1200); await h.page.setInputFiles('.ox-addph input[type=file]', h.foto1); await h.sleep(2200); await h.move('.timeline .ox-th'); await h.sleep(1500); } },
    { dice: 'En la solapa Ortodoncia ves el tratamiento: el tipo de aparatología, la barra de avance, la cantidad de controles y el próximo. Ahí cargás cada control con lo que hiciste, los arcos, los elásticos y las fotos del día, y al guardar se anota también en la evolución.',
      muestra: 'Solapa «Ortodoncia»: tratamiento, barra de avance y un formulario para cada control.',
      hace: async h => { await h.click(h.page.locator('#view-ficha .ftab[data-tab="orto"]').first()); await h.sleep(1500); await h.scroll('body', 0, 100); await h.move('.ox-prog'); await h.sleep(1500); await h.click('[data-act="oxChip"][data-c="Cambio de arco"]'); await h.sleep(700); await h.click('[data-act="oxChip"][data-c="Cadena elástica"], [data-act="oxChip"][data-c="Elásticos"]'); await h.sleep(900); } },
    { dice: 'Cuando hay dos fotos del mismo tipo en distintos controles, aparece Antes y ahora, que muestra la primera y la última lado a lado, para que vos y el paciente vean el avance.',
      muestra: '«Antes y ahora»: la primera y la última foto de cada vista, lado a lado.',
      hace: async h => { await h.page.selectOption('#oxV', 'Frente').catch(() => {}); await h.page.setInputFiles('input[data-chg="oxPhoto"]', h.foto2); await h.sleep(2200); await h.click('[data-act="oxSave"]'); await h.sleep(1500); await h.move('.ox-cmp'); await h.sleep(2800); } },
    { dice: 'Y si tus planes de tratamiento los armás por fuera de la aplicación, como los de ortodoncia, en Plan y presupuesto podés subir el archivo en PDF. Le ponés un nombre, y queda guardado en la ficha del paciente, para abrirlo o descargarlo cuando quieras.',
      muestra: 'En «Plan y presupuesto» subís tus planes en PDF: quedan guardados en la ficha.',
      hace: async h => { await h.click(h.page.locator('#view-ficha .ftab[data-tab="plan"]').first()); await h.sleep(1500); await h.type('#pfT', 'Plan de ortodoncia'); await h.page.setInputFiles('input[data-chg="pfFile"]', h.pdf); await h.sleep(2000); await h.move('.pf-list li'); await h.sleep(2000); } },
    { dice: 'Así, desde una sola ficha seguís la historia clínica, las fotos, la ortodoncia y los planes de cada paciente. En Ajustes, en el menú, tenés más tutoriales. Gracias por usar OdontoVoz.',
      hace: async h => { await h.sleep(1500); } }
  ]
};
