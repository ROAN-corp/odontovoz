/* ===== 1.43: Novedades sin cansar (tarjeta única en el inicio, casilla y Ajustes › Novedades) + «Sugerencias y críticas» en Ayuda ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, MF = A.modalFns, $ = q => document.querySelector(q);
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };

  /* Lo nuevo, de lo más nuevo a lo más viejo. «top» = lo que va en la tarjeta (máx. 3 en total). Escribir corto y en lo que le sirve al usuario. */
  const NEWS = [
    { v: '1.20', b: '1.75.0', d: '2026-11-20', items: [
      { t: 'Foto del paciente: tocá su cara (o sus iniciales) en la ficha para sacarle una foto o elegirla de la galería. Aparece en el buscador y en la lista de pacientes. Es opcional y pide la autorización del paciente.', top: true },
      { t: 'Arreglo: en el odontograma se pueden volver a pintar varias caras seguidas del mismo diente y saltar entre dientes libremente.', top: true },
      { t: 'En el plan de tratamiento, el nombre de cada fase se ve completo aunque se muestren los costos.' },
      { t: 'El botón «Ficha completa» de la ficha resumida tiene el estilo nuevo.' }] },
    { v: '1.19', b: '1.74.0', d: '2026-11-20', items: [
      { t: 'OdontoVoz se renovó por fuera: letra nueva más legible, colores y sombras más prolijos, botones más cómodos y un micrófono más visible. Todo funciona igual que antes.' },
      { t: 'Odontograma con dientes color marfil, con forma y surcos según la pieza (incisivo, canino, premolar o molar). Se tocan y se dictan igual.' }] },
    { v: '1.18.2', b: '1.73.2', d: '2026-11-20', items: [
      { t: 'En la computadora podés mandar los recordatorios con la app de WhatsApp de escritorio (también Business): todo va a la misma ventana, sin abrir una pestaña por paciente. Se elige en Ajustes › WhatsApp para recordatorios.' }] },
    { v: '1.18.1', b: '1.73.1', d: '2026-11-20', items: [
      { t: 'En la computadora, la app intenta reusar la misma pestaña de WhatsApp Web.' }] },
    { v: '1.18', b: '1.73.0', d: '2026-11-20', items: [
      { t: 'Cobros, pagos y precios aceptan centavos (por ejemplo 75.000,50).' },
      { t: 'Stock renovado: kit recomendado según cuántos odontólogos atienden, botones grandes y el pedido se puede tildar, editar y mandar desde una barra fija.' }] },
    { v: '1.17.4', b: '1.72.4', d: '2026-11-20', items: [
      { t: 'En el resumen del paciente, si debe, hay un botón «Cobrar deuda» para registrar el pago al toque.', top: true },
      { t: 'En «Para cobrar», el nombre del paciente abre su ficha resumida.', top: true }] },
    { v: '1.17.3', b: '1.72.3', d: '2026-11-20', items: [
      { t: 'Arreglo: en el turno nuevo ya se puede elegir al paciente de la lista de sugerencias.', top: true }] },
    { v: '1.17.2', b: '1.72.2', d: '2026-11-20', items: [
      { t: 'Plan de tratamiento renovado: a lo ancho, cada fase en su tarjeta de color y la evaluación al final, cerrada.', top: true },
      { t: 'Accesos directos centrados: con muchos ya no se salen del recuadro.' }] },
    { v: '1.17.1', b: '1.72.1', d: '2026-11-20', items: [
      { t: 'Medios de pago y recargos: botón «Usar valores preestablecidos» con valores de referencia actualizados (después los cambiás).', top: true },
      { t: 'Turno nuevo: ya no se marcan Bloquear y Nota al cambiar de Turno a Sobreturno; hora y duración sin superponerse; la ventana no cambia de tamaño. La ficha resumida queda fija.' }] },
    { v: '1.17', b: '1.72.0', d: '2026-11-20', items: [
      { t: 'Ficha: datos personales y anamnesis quedan como resumen al guardar, con «Editar» para cambiarlos. Así la evolución queda más arriba.', top: true },
      { t: 'Bloquear todo el día con un botón, y los días bloqueados se ven en el calendario.', top: true },
      { t: 'Al tocar la agenda, el turno cae en el horario configurado (cada 30 min, por ejemplo). Accesos directos con × al editarlos. Estilo degradé en Apariencia.' }] },
    { v: '1.16.1', b: '1.71.1', d: '2026-11-20', items: [
      { t: 'En la PC también se arrastran la ventanita del turno, «Para cobrar» y el resumen del paciente.', top: true },
      { t: 'Los íconos de los accesos directos vuelven a su color de siempre.' }] },
    { v: '1.16', b: '1.71.0', d: '2026-11-20', items: [
      { t: 'El botón Atrás te lleva a la pantalla anterior (por ejemplo, de la ficha a la agenda), sin pasar por cada pestaña que tocaste.', top: true },
      { t: 'Caja y Liquidaciones: botón «Ver en gráficos» con lo cobrado por día, por medio de pago, por profesional y más.', top: true }] },
    { v: '1.15', b: '1.70.0', d: '2026-11-20', items: [
      { t: 'Anamnesis más completa y por grupos: VIH, hepatitis B o C, tuberculosis, coagulación, alergia a AINE, válvula protésica y más.', top: true },
      { t: 'Al lado de las alertas aparecen chiquitos los antecedentes (bruxismo, fuma, asma…).', top: true },
      { t: 'Ficha: menú de secciones con íconos (en el celular, un botón que despliega todas) y el resumen nuevo también al abrir un paciente desde el buscador.' }] },
    { v: '1.14', b: '1.69.0', d: '2026-11-20', items: [
      { t: 'Menú más ordenado: cada opción en su recuadro y Laboratorio más arriba.', top: true },
      { t: '«Tu cuenta», «Ayuda» y «Turnos por internet» se despliegan al tocarlos.', top: true }] },
    { v: '1.13', b: '1.68.0', d: '2026-11-20', items: [
      { t: 'Inicio: los accesos directos van en un recuadro con colores y se cambian con «Cambiar». Para dar un turno, entrá a la agenda.', top: true },
      { t: 'En la agenda, el nombre del paciente es un botón: tocalo para ver su ficha resumida.', top: true },
      { t: 'La ventanita del turno tiene un marco nuevo y podés elegirle el color.' }] },
    { v: '1.12.1', b: '1.67.1', d: '2026-11-20', items: [
      { t: 'Arreglo: al destildar prácticas en «Prácticas de hoy» ya no se tapa la ventana con una franja rayada.', top: true }] },
    { v: '1.12', b: '1.67.0', d: '2026-11-20', items: [
      { t: 'Las ventanas se pueden minimizar (botón –) y quedan en una burbuja que movés por la pantalla. En la PC también se arrastran.', top: true },
      { t: 'Turno nuevo más prolijo: el tipo en una sola fila y los horarios libres del día para tocar.', top: true },
      { t: 'Los botones de voz son más chicos, se arrastran y se pueden achicar todavía más.' }] },
    { v: '1.11', b: '1.66.0', d: '2026-11-20', items: [
      { t: 'Primeros pasos: una guía en el inicio te dice qué falta configurar (paso 3 de 7, por ejemplo).', top: true },
      { t: 'Ajustes más claros: cada sección en su recuadro de color, y Consultorio ordenado por pasos.', top: true },
      { t: '«Equipo e invitaciones» ahora está en Ajustes › Consultorio, debajo de Centro y profesionales.' }] },
    { v: '1.10.1', b: '1.65.1', d: '2026-11-17', items: [
      { t: 'Los aranceles aceptan centavos: escribí por ejemplo 12.500,50.', top: true }] },
    { v: '1.10', b: '1.65.0', d: '2026-11-17', items: [
      { t: 'Planes a la vista: en Obras sociales y aranceles cada obra social muestra sus planes y podés ver los aranceles de cada uno.', top: true },
      { t: 'Al cobrar, si la obra social tiene planes, tocás el del paciente y los importes se acomodan solos (queda guardado en la ficha).', top: true },
      { t: 'Cuando sale una versión nueva aparece una ventana con «Actualizar» (o «Descargar» en el celular). Podés dejarlo para más tarde.' }] },
    { v: '1.9.1', b: '1.64.1', d: '2026-11-17', items: [
      { t: 'Las restauraciones dicen si son simples (1 cara), compuestas (2) o complejas (3 o más), y se cobran con ese código. También entiende «por oclusal y por vestibular» y siglas como «27 OV» o «36 MOD».', top: true }] },
    { v: '1.9', b: '1.64.0', d: '2026-11-17', items: [
      { t: 'Al anotar lo que hiciste, primero solo elegís quién cobra. Si cobra la secretaría, ella decide cómo: coseguro, diferencial, cubierto por la obra social, todo particular o nada.', top: true },
      { t: 'Planes de cada obra social: cada plan con sus valores (los de la Federación se cargan solos). En la ficha elegís el plan del paciente y al cobrar se usan esos valores.', top: true }] },
    { v: '1.8', b: '1.63.0', d: '2026-11-17', items: [
      { t: 'Cobrar con varios medios de pago a la vez (por ejemplo, una parte en efectivo y el resto con tarjeta), también en «Cobrar antes de atender».', top: true },
      { t: 'Recargos por cuotas de tarjeta y descuentos por medio de pago, fijos para cada consultorio: Ajustes › Medios de pago y recargos. Si se cambian en un cobro, pide el motivo.' },
      { t: 'Toda corrección o aclaración en un cobro lleva su motivo y el dueño la ve en Caja › Historial › Correcciones.' }] },
    { v: '1.7', b: '1.62.0', d: '2026-11-17', items: [
      { t: 'Al anotar lo que hiciste en la evolución, primero te pregunta: «¿Cobra secretaría o lo cobro yo?». A recepción le aparece un cartel con lo que escribiste y lo que hay que cobrar, y lo puede corregir.', top: true },
      { t: 'Entiende varias prácticas juntas: «arreglo en 24, 25 y 33 por oclusal, por mesial y por distal, y limpieza».' },
      { t: 'Nuevas opciones de cobro: «Cubierto 100% por la obra social» y «No le cobro nada» (pide el motivo y queda anotado).' }] },
    { v: '1.6.1', b: '1.61.1', d: '2026-11-17', items: [
      { t: '«Deshacer» en Cambios de hoy ya no borra la historia clínica ni los cobros: lo escrito queda anulado, con quién y por qué.', top: true },
      { t: 'Modo oscuro: se arreglaron textos que no se leían (letras claras sobre fondo blanco), también en la página de mudanza.' }] },
    { v: '1.6', b: '1.61.0', d: '2026-11-17', items: [
      { t: 'Caja nueva, más fácil: Hoy, Te deben, Tenés que pagar, Tu plata, El mes e Historial. Arriba, lo que entró, lo que salió y lo que queda en el cajón, y un semáforo con lo que hay que revisar.', top: true },
      { t: 'Abrir y cerrar la caja contando los billetes; si falta o sobra plata queda anotado por qué. Transferencias para confirmar, comisiones de tarjetas, facturas y resumen para el contador.' },
      { t: 'Liquidaciones: adelantos, gastos a cargo del profesional y confirmación desde «Mis números». Nada se borra: lo anulado queda tachado con el motivo.' }] },
    { v: '1.5', b: '1.60.0', d: '2026-11-17', items: [
      { t: 'Al tocar el nombre de un paciente en la agenda: arriba sus datos, el odontograma y el motivo; «Abrir ficha completa» bien grande junto a lo realizado, lo pagado y lo que debe; la seña en una línea chiquita.', top: true }] },
    { v: '1.4', b: '1.59.0', d: '2026-11-17', items: [
      { t: 'Navi conversa: «¿cuántos turnos tengo el viernes?», «¿y mañana?», «¿puedo sumar más gente?» y pedidos largos como «llevame a la agenda de mañana y contame cuántos turnos tengo».', top: true },
      { t: 'Si le pedís sumar un paciente nuevo, te pregunta a quién y lo agenda en el primer turno libre. También abre por voz cualquier pantalla del menú (stock, obras sociales, novedades…).' }] },
    { v: '1.3', b: '1.58.0', d: '2026-11-17', items: [
      { t: 'El asistente habla menos: si no entiende, dice solo «No entendí», y las respuestas en voz alta son cortas.', top: true }] },
    { v: '1.2.3', b: '1.57.3', d: '2026-11-16', items: [
      { t: 'Si trabajás en más de un lugar, abrí el menú y tocá el nombre del lugar (arriba de todo) para cambiar.' }] },
    { v: '1.2', b: '1.57.0', d: '2026-11-16', items: [
      { t: 'Pedidos de stock más rápidos: cuando haya un proveedor recomendado, le mandás el pedido armado por WhatsApp con un toque.' }] },
    { v: '1.1.3', b: '1.56.3', d: '2026-11-16', items: [
      { t: 'En el celular, el inicio muestra el nombre OdontoVoz centrado en la barra de arriba.' }] },
    { v: '1.1.2', b: '1.56.2', d: '2026-11-16', items: [
      { t: 'Stock de insumos ahora está en el menú principal.', top: 1 },
      { t: 'En Stock › «Cuándo avisar y cuánto pedir» elegís, para cada insumo, cuándo te avisa (se puede media caja: 0,5) y hasta cuánto pedir.' },
      { t: 'El logo de OdontoVoz pasó a la barra de arriba.' }] },
    { v: '1.1', b: '1.56.0', d: '2026-11-16', items: [
      { t: 'Cobrar antes de atender: si el paciente viene con prácticas autorizadas (por ejemplo de SOSUNC), la secretaria se las cobra al llegar. Cuando el odontólogo carga lo que hizo, le aparece «ya cobrado en secretaría» y no se cobra dos veces.', top: 1 },
      { t: 'Está en la ventanita del turno («Cobrar antes de atender»), en la cuenta del paciente y, al marcar «Llegó» a alguien de una obra social que pide autorización, la app lo pregunta sola.' },
      { t: 'SOSUNC ya está en la lista de obras sociales (pide autorización; aranceles de la Federación de Río Negro).' }] },
    { v: '1.0', b: '1.55.0', d: '2026-11-16', items: [
      { t: 'OdontoVoz 1.0: la primera versión oficial. Desde ahora los números de versión arrancan de nuevo.', top: 1 },
      { t: 'Incluye todo lo de las versiones de prueba: voz, agenda, historia clínica, historias de papel, caja, obras sociales, stock, equipo y más.' }] },
    { v: '1.54.1', d: '2026-11-16', items: [
      { t: 'Elegir la obra social es más fácil: la lista aparece debajo del campo, con renglones grandes, y busca por sigla o por nombre («luz» encuentra Luz y Fuerza).', top: 1 }] },
    { v: '1.54', d: '2026-11-16', items: [
      { t: 'Cancelar la agenda de un día entero: «Navi, cancelame la agenda del viernes porque me tuve que ir». Suspende los turnos, bloquea el día y te deja avisar a cada paciente por WhatsApp.', top: 1 },
      { t: 'Agregar agenda un día puntual: «Navi, agregame una agenda el jueves de 9 a 14» o «extendeme el jueves hasta las 18». También en la agenda › Más.', top: 1 }] },
    { v: '1.53.1', d: '2026-11-16', items: [
      { t: 'El asistente por voz entiende muchas más formas de pedir lo mismo: «¿me abrís…?», «¿me abrirías…?», «chusmeame la historia de…», «Julián pagó 20 lucas», «cayó Julián», «¿cómo pinta mañana?».', top: 1 }] },
    { v: '1.53', d: '2026-11-16', items: [
      { t: 'Pasar historias de papel: sacale fotos a cada historia clínica, OdontoVoz la lee y vos revisás y confirmás sección por sección.', top: 1 },
      { t: 'Descargar todas las historias clínicas en PDF (Ajustes › Copia de seguridad), con constancia y códigos para comprobar que no se tocaron.', top: 1 }] },
    { v: '1.52.1', d: '2026-11-15', items: [
      { t: 'Nueva dirección: odontovoz.com.ar (la anterior te lleva sola). Si usás la web, entrá de nuevo con tu usuario.', top: 1 }] },
    { v: '1.52', d: '2026-11-14', items: [
      { t: 'Planes nuevos: Profesional, Consultorio o Centro y Empresa, todos con todas las funciones. Se pueden sumar consultorios o profesionales (con un equipo más) por USD 3.', top: 1 },
      { t: 'El modo LITE ya no está: la app es una sola, completa.' }] },
    { v: '1.51', d: '2026-11-14', items: [
      { t: 'Al tocar «Cobrar» elegís: «Cobro yo ahora» o «Lo cobra la secretaria». Si la cobra ella, le aparece en «Para cobrar» de su usuario con aviso en el teléfono.', top: 1 }] },
    { v: '1.50.4', d: '2026-11-14', items: [
      { t: 'Consultorios de Neuquén: pueden precargar los aranceles de Río Negro como referencia y cambiarlos por los suyos (lo editado no se toca más).' }] },
    { v: '1.50.3', d: '2026-11-14', items: [
      { t: 'Elegís de dónde se precargan los aranceles de tus obras sociales: Federación de Río Negro (automático), Neuquén u otra provincia (a mano). Se cambia en Ajustes › Obras sociales.', top: 1 }] },
    { v: '1.50.2', d: '2026-11-14', items: [
      { t: 'Los aranceles de la Federación solo suben: si publican un valor más bajo que el que tenés o editaste, queda el tuyo. Lo editado se marca con ✎.', top: 1 },
      { t: 'En Obras sociales podés apagar la carga automática (por ejemplo, si tu consultorio está en Neuquén) o apagarla para una obra social sola.' }] },
    { v: '1.50.1', d: '2026-11-14', items: [
      { t: 'Los aranceles de la Federación Odontológica de Río Negro se cargan solos en tus obras sociales (OSPe, Prevención Salud, OSDE, Swiss Medical y más) y se actualizan cada mes.', top: 1 },
      { t: 'Si la tabla trae coseguro, la primera vez te pregunta si lo cobrás; queda como predeterminado.' }] },
    { v: '1.50', d: '2026-11-14', items: [
      { t: 'Al cargar prácticas a un paciente con obra social elegís qué le cobrás: «No le cobro nada», coseguro, diferencial (el monto que quieras) o todo particular.', top: 1 },
      { t: 'Lo que paga la obra social queda pendiente en Caja › Obras sociales, aunque todavía no tengas su arancel cargado (lo podés escribir en el momento y se recuerda).', top: 1 }] },
    { v: '1.49.3', d: '2026-11-14', items: [
      { t: 'Cada celular y computadora guarda su copia de los datos en un espacio mucho más grande: ahora entran consultorios y centros con decenas de miles de pacientes, también sin internet.' }] },
    { v: '1.49.2', d: '2026-11-13', items: [
      { t: 'En la historia clínica, «Indicaciones» ahora se llama «Indicaciones y recetas»: arriba está el botón para hacer la receta electrónica (RCTA) y abajo las indicaciones para el paciente.', top: 1 }] },
    { v: '1.49.1', d: '2026-11-13', items: [
      { t: 'Receta electrónica: en Android, «Recetar en RCTA» abre la app de RCTA si la tenés instalada (si no, la web). Los datos del paciente quedan copiados para pegar.', top: 1 }] },
    { v: '1.49', d: '2026-11-12', items: [
      { t: 'Al cobrar: descuento o recargo libre según cómo paga (efectivo, débito, transferencia…), y cuotas con tarjeta o del consultorio. Queda asentado quién lo aplicó y cuándo.', top: 1 },
      { t: 'Presupuestos en pesos, dólares, euros o reales (también mezclados), con precio por ítem e ítems libres. Lista de precios para compartir por WhatsApp o PDF.', top: 1 },
      { t: 'Turnos de 15 minutos a 8 horas. Receta electrónica (RCTA u otra) desde la ficha, con los datos del paciente listos para pegar. Insumos: aumento contra la primera compra.', top: 1 }] },
    { v: '1.48.1', d: '2026-11-12', items: [
      { t: 'Porcentaje de cada profesional a elección, del 5% al 100% (por ejemplo 30% o 50%), también al sumarlo al centro y en cada excepción.', top: 1 }] },
    { v: '1.48', d: '2026-11-11', items: [
      { t: 'Aranceles de la Federación Odontológica de Río Negro: en Obras sociales tocá «Federación RN» y se cargan solos. Cada mes te avisamos cuando haya valores nuevos; tus coseguros los decidís vos.', top: 1 },
      { t: 'Subir precios por porcentaje (todos o por categoría) y «Costos y rentabilidad»: precios de insumos mes a mes, gastos fijos y precio sugerido para no perder margen.', top: 1 },
      { t: 'Consentimiento en papel: se imprime, se firma y se sube la foto a la historia clínica. Radiografías en PDF, arrastrando o pegando. Recepción carga sin poder borrar lo hecho.', top: 1 }] },
    { v: '1.47', d: '2026-11-11', items: [
      { t: 'La Caja abre en «Cobros del día»: el total de hoy, por medio de pago y por odontólogo, con quién cobró y qué pagó cada paciente.', top: 1 },
      { t: 'Obras sociales que pagan después (como OSOEFRNyN): lo que pagan no queda «para cobrar» al paciente; en Caja › Obras sociales ves lo que te deben por mes y marcás «Llegó el pago».', top: 1 },
      { t: 'Acuerdo de cada profesional al crearlo o editarlo: porcentaje con excepciones (ej.: 40% y Ortodoncia 60%), módulo, consultorio entero u otro. La liquidación se hace sobre lo cobrado.' }] },
    { v: '1.46.4', d: '2026-11-11', items: [
      { t: 'Cerrar sesión en un equipo ya no cierra la sesión de esa persona en sus otros equipos.', top: 1 },
      { t: 'Lo que se cobra desde la evolución usa tus precios de «Prácticas y aranceles» (por ejemplo, composite por cantidad de caras).', top: 1 }] },
    { v: '1.46.3', d: '2026-11-11', items: [
      { t: 'Si escribís un pago en la evolución («hoy paga 130.000 de 150.000 que debía»), la app te ofrece registrar el cobro con un toque y te dice cuánto queda debiendo.', top: 1 },
      { t: 'Si alguien después carga el mismo cobro a mano, la app avisa que ya está y no se duplica.', top: 1 }] },
    { v: '1.46.2', d: '2026-11-11', items: [
      { t: 'En un centro, cada odontólogo del equipo ve todas las agendas pero solo cambia la suya, y le llegan solo los avisos de sus pacientes.', top: 1 }] },
    { v: '1.46.1', d: '2026-11-11', items: [
      { t: 'Arreglado: con varios equipos abiertos la pantalla parpadeaba y se sincronizaba de más.', top: 1 }] },
    { v: '1.46', d: '2026-11-11', items: [
      { t: 'Tus datos se respaldan en tres lugares: la nube, una copia cifrada cada noche en otra empresa y un disco nuestro. Lo ves en Ajustes › Copia de seguridad.', top: 1 },
      { t: 'En el celular, los avisos llegan aunque la app esté cerrada (llegó un paciente, cancelaciones, notas, stock bajo y turnos online).', top: 1 }] },
    { v: '1.45.4', d: '2026-11-11', items: [
      { t: 'Turnero online: los pacientes reservan como máximo 30 minutos, y cada día dice claro cuántos «turnos libres» quedan.', top: 1 }] },
    { v: '1.45.3', d: '2026-11-11', items: [
      { t: 'Los equipos se enteran al instante de lo que hace otro (por ejemplo, cuando recepción marca que llegó un paciente).', top: 1 }] },
    { v: '1.45.2', d: '2026-11-11', items: [
      { t: 'La sesión ya no se cierra sola: queda abierta hasta que toques «Cerrar sesión» (al ingresar podés elegirlo).', top: 1 },
      { t: 'En el celular, los avisos (llegó un paciente, stock, laboratorio, turnos online…) aparecen arriba, en la barra de notificaciones, como un mensaje de WhatsApp.', top: 1 }] },
    { v: '1.45.1', d: '2026-11-11', items: [
      { t: 'Si hiciste la mudanza desde Bilog: Ajustes › Mudanza › «Revisar una mudanza ya hecha» comprueba que cada evolución esté en la ficha correcta y corrige lo que no.', top: 1 }] },
    { v: '1.45', d: '2026-11-11', items: [
      { t: 'Queda registrado qué usuario cargó, cambió o anuló cada cosa (Historial de cambios en el menú ⋮ del paciente).', top: 1 },
      { t: '¿Paciente repetido? Menú ⋮ › «Unir con otra ficha»: junta todo en una sola, sin perder nada.', top: 1 },
      { t: 'Al crear un paciente podés tildar «Es de prueba»: esos se borran del todo. Los reales se archivan.' }] },
    { v: '1.44', d: '2026-11-09', items: [
      { t: 'Odontograma: lo que marcás en rojo al revisar al paciente queda como «ya lo tenía» y no se cobra. Si lo hiciste vos hoy, elegí «Lo hice yo hoy» o decí «hice…».', top: 1 }] },
    { v: '1.43', d: '2026-11-09', items: [
      { t: 'Ajustes › Ayuda › «Sugerencias y críticas»: contanos qué mejorarías, lo leemos todo.', top: 1 },
      { t: 'Ajustes › Novedades: la lista de lo nuevo de cada versión.' }] },
    { v: '1.42', d: '2026-11-09', items: [
      { t: 'Lo que escribís en la evolución («hice restauración en 25») se marca solo en el odontograma.', top: 1 },
      { t: 'Lo que dejás para la próxima («la próx 24») queda planificado en azul, sin cobrar.' }] },
    { v: '1.41', d: '2026-11-09', items: [
      { t: 'Las evoluciones traídas de otro sistema se pueden pasar al odontograma: «Ver y pasar» en el odontograma del paciente.', top: 1 },
      { t: 'Si cambiás de consultorio sin internet, la app te avisa en vez de perder lo que no se guardó.' }] },
    { v: '1.40', d: '2026-11-09', items: [
      { t: 'Mudanza gratis: traé pacientes, turnos y evoluciones desde Bilog u otro sistema (Ajustes › Mudanza).', top: 1 },
      { t: 'Ajustes › Equipo e invitaciones, para sumar odontólogos y recepción.' },
      { t: 'Más seguridad al usar la app en varios equipos y en varios consultorios.' }] }
  ];
  const vnum = v => String(v || '0').split('.').map(n => +n || 0).reduce((s, n, i) => s + n * Math.pow(1000, 2 - i), 0);
  const key = n => n.b || n.v;   /* desde la 1.0 cada versión lleva su compilación interna en b */
  const LATEST = key(NEWS[0]);
  const KEY = 'odontovoz.newsSeen';
  /* el primer uso de esta función en un equipo: se toma como visto lo anterior a 1.40 (no se muestra la historia entera) */
  if (!LS.get(KEY, '')) LS.set(KEY, '1.39.9');
  const unseen = () => { const seen = vnum(LS.get(KEY, '0')); return NEWS.filter(n => vnum(key(n)) > seen); };

  /* ---------- tarjeta en el inicio: una sola, aunque haya varias versiones nuevas ---------- */
  const card = () => {
    const v = document.getElementById('view-inicio'); if (!v || S.tab !== 'inicio') return;
    const old = v.querySelector('.nw-card'), un = unseen();
    if (!un.length) { if (old) old.remove(); return; }
    if (old) return;
    const tops = []; un.forEach(n => n.items.forEach(i => { if (i.top && tops.length < 3) tops.push(i.t); }));
    un.forEach(n => n.items.forEach(i => { if (tops.length < 3 && tops.indexOf(i.t) < 0) tops.push(i.t); }));
    const n = un.reduce((s, x) => s + x.items.length, 0);
    const d = document.createElement('section'); d.className = 'nw-card'; d.setAttribute('aria-label', 'Novedades');
    d.innerHTML = '<button class="nw-x" data-act="nwSeen" aria-label="Cerrar novedades">×</button><b class="nw-h">Novedades' + (n > 1 ? ' · ' + n + ' mejoras' : '') + '</b><ul>' + tops.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' +
      '<div class="nw-b"><button class="btn small" data-act="newsOpen">Ver todo</button><button class="btn small ghost" data-act="fbOpen">Dejar una sugerencia</button></div>';
    const hi = v.querySelector('.home-hi'), host = v.querySelector('.home') || v;
    if (hi && hi.parentNode) hi.parentNode.insertBefore(d, hi.nextSibling); else host.insertBefore(d, host.firstChild);
  };
  const quietInbox = () => {
    if (!A.nfAdd) return;
    unseen().forEach(n => { A.nfAdd({ id: 'news:' + n.v, k: 'info', t: 'Novedades de la versión ' + n.v, b: n.items[0].t, act: 'newsOpen', at: n.d + 'T12:00:00' }); if (A.nfRead) A.nfRead('news:' + n.v); });   /* queda en la casilla, sin globito */
  };
  A.afterRefresh = (prev => function () { const r = prev && prev.apply(this, arguments); try { card(); } catch (e) { /* nada */ } return r; })(A.afterRefresh);
  try { new MutationObserver(() => { try { card(); } catch (e) { /* nada */ } }).observe(document.getElementById('view-inicio') || document.body, { childList: true }); } catch (e) { /* nada */ }
  setTimeout(() => { try { quietInbox(); card(); } catch (e) { /* nada */ } }, 1500);
  A.acts.nwSeen = () => { LS.set(KEY, LATEST); if (A.nfRead) unseen().concat(NEWS).forEach(n => { try { A.nfRead('news:' + n.v); } catch (e) { /* nada */ } }); const c = $('.nw-card'); if (c) c.remove(); };

  /* ---------- Ajustes › Novedades ---------- */
  MF.news = () => {
    const seen = vnum(LS.get(KEY, '0'));
    const b = '<div class="nw-list">' + NEWS.map(n => '<section class="nw-v' + (vnum(n.v) > seen ? ' new' : '') + '"><h3>Versión ' + esc(n.v) + (vnum(n.v) > seen ? ' <span class="nw-dot">nuevo</span>' : '') + '</h3><ul>' + n.items.map(i => '<li>' + esc(i.t) + '</li>').join('') + '</ul></section>').join('') + '</div>' +
      '<p class="hint">¿Algo de esto no anda como esperabas? <button class="linkbtn" data-act="fbOpen">Contanos acá</button>.</p>';
    return A.modalShell('Novedades', b, '<button class="btn primary" data-act="newsClose">Listo</button>');
  };
  A.acts.newsOpen = () => { if (A.hideDrawer) A.hideDrawer(); S.modal = { type: 'news' }; A.renderModal(); };
  A.acts.newsClose = () => { A.acts.nwSeen(); S.modal = null; A.renderModal(); };

  /* ---------- Ajustes › Ayuda › Sugerencias y críticas ---------- */
  const KINDS = [['sugerencia', 'Idea o sugerencia'], ['critica', 'Crítica'], ['problema', 'Algo no anda'], ['felicitacion', 'Me gustó']];
  MF.fbBox = () => {
    const f = S.fbF || (S.fbF = { kind: 'sugerencia', text: '', sent: false });
    let b;
    if (f.sent) b = '<p><b>¡Gracias!</b> Lo leemos nosotros, Rodrigo y Angel. Cada comentario nos ayuda a decidir qué mejorar primero.</p><button class="btn small" data-act="fbAgain">Mandar otro</button>';
    else b = '<p class="hint" style="margin-top:0">Escribí lo que quieras: qué te falta, qué te molesta, qué cambiarías o qué te gustó. Las críticas también suman. Lo leemos todo.</p>' +
      '<div class="seg fb-seg" role="group" aria-label="Tipo de comentario">' + KINDS.map(x => '<button data-act="fbKind" data-k="' + x[0] + '" aria-pressed="' + (f.kind === x[0]) + '">' + x[1] + '</button>').join('') + '</div>' +
      '<label class="sr" for="fbTxt">Comentario</label><textarea id="fbTxt" class="inp" rows="6" maxlength="2000" placeholder="Escribí acá…">' + esc(f.text) + '</textarea>' +
      '<div class="hint" id="fbMsg"></div><p class="hint">Si es algo urgente que no te deja trabajar, escribinos por WhatsApp desde «Ayuda y soporte».</p>';
    return A.modalShell('Sugerencias y críticas', b, f.sent ? '<button class="btn primary" data-act="closeModal">Listo</button>' : '<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="fbSend">Enviar</button>');
  };
  A.acts.fbOpen = () => { if (A.hideDrawer) A.hideDrawer(); S.fbF = S.fbF && !S.fbF.sent ? S.fbF : { kind: 'sugerencia', text: '', sent: false }; S.modal = { type: 'fbBox' }; A.renderModal(); };
  /* la base acepta sugerencia/problema/felicitacion/otro: la crítica viaja como «otro» con su etiqueta */
  const sendPrev = A.acts.fbSend;
  A.acts.fbSend = function () {
    const f = S.fbF, ta = $('#fbTxt');
    if (f && f.kind === 'critica' && ta && ta.value.trim() && !/^\[Crítica\]/.test(ta.value)) { ta.value = '[Crítica] ' + ta.value.trim(); f.kind = 'otro'; const r = sendPrev.apply(this, arguments); f.kind = 'critica'; return r; }
    return sendPrev.apply(this, arguments);
  };

  /* ---------- entradas en el menú (y por lo tanto en Ajustes › Ayuda) ---------- */
  const SVG_N = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.4 7.2 17.9l.9-5.4L4.2 8.7l5.4-.8z"/></svg>';
  const SVG_F = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/></svg>';
  const mountMenu = () => {
    const sup = document.querySelector('#gearMenu .dnav[data-act="supportOpen"]'); if (!sup || document.querySelector('#gearMenu .dnav[data-act="fbOpen"]')) return;
    sup.insertAdjacentHTML('beforebegin', '<button class="dnav" data-act="newsOpen">' + SVG_N + '<span class="t">Novedades</span></button><button class="dnav" data-act="fbOpen">' + SVG_F + '<span class="t">Sugerencias y críticas</span></button>');
  };
  mountMenu(); setTimeout(mountMenu, 800);

  const css = document.createElement('style');
  css.textContent = '.nw-card{position:relative;border:1px solid var(--line,#d6e2e2);background:var(--card,#fff);border-radius:16px;padding:12px 40px 12px 14px;margin:10px 0 12px;box-shadow:0 1px 0 rgba(0,0,0,.02)}' +
    '.nw-card .nw-h{display:block;font-size:14px;margin-bottom:4px;color:var(--accent,#0b6b6f)}.nw-card ul{margin:0;padding-left:18px;font-size:14px;line-height:1.4}.nw-card li{margin:2px 0}' +
    '.nw-card .nw-x{position:absolute;top:6px;right:8px;width:30px;height:30px;border:0;background:transparent;font-size:20px;line-height:1;color:var(--muted,#567);cursor:pointer;border-radius:8px}' +
    '.nw-card .nw-b{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}' +
    '.nw-list .nw-v{border-bottom:1px solid var(--line,#e3ecec);padding:4px 0 8px}.nw-list h3{font-size:15px;margin:8px 0 4px}.nw-list ul{margin:0;padding-left:18px}.nw-list li{margin:3px 0}' +
    '.nw-dot{display:inline-block;font-size:11px;font-weight:800;background:#f6c453;color:#08484b;border-radius:999px;padding:1px 8px;margin-left:6px;vertical-align:middle}' +
    '.linkbtn{border:0;background:none;padding:0;color:var(--accent,#0b6b6f);text-decoration:underline;font:inherit;cursor:pointer}' +
    '.fb-seg{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}.fb-seg button{flex:1 1 auto}';
  document.head.appendChild(css);
})();
