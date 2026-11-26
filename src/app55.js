/* ===== 1.43: Novedades sin cansar (tarjeta única en el inicio, casilla y Ajustes › Novedades) + «Sugerencias y críticas» en Ayuda ===== */
(function () {
  'use strict';
  const A = window.App, S = A.S, esc = A.esc, MF = A.modalFns, $ = q => document.querySelector(q);
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* nada */ } } };

  /* Lo nuevo, de lo más nuevo a lo más viejo. «top» = lo que va en la tarjeta (máx. 3 en total). Escribir corto y en lo que le sirve al usuario. */
  const NEWS = [
    { v: '1.50.0', b: '1.105.0', d: '2026-11-26', items: [
      { t: 'Consentimientos editables: en la lista de consentimientos, «✎ Editar» cambia el texto para todos los pacientes (procedimiento, riesgos, alternativas y declaraciones), y «+ Nuevo consentimiento» crea uno propio. Podés volver al texto original cuando quieras.' },
      { t: 'Antes de firmar, «✎ Agregar o quitar cosas antes de firmar» ajusta el texto solo para esa persona (sirve para cualquier documento: consentimiento, presupuesto, recibo…). Queda escrito en lo que se firma.' },
      { t: 'Una vez firmado, «Enviar por WhatsApp»: en el teléfono comparte el PDF y elegís el chat; en la PC lo descarga y abre el chat del paciente.' }
    ] },
    { v: '1.49.0', b: '1.104.0', d: '2026-11-26', items: [
      { t: 'Si trabajás en otro consultorio con un usuario que te dieron (sin correo) y ahora tenés tu propia cuenta, podés vincularlos: en Dónde trabajás tocá «Vincular mi usuario de otro consultorio». El acceso a ese consultorio pasa a tu cuenta y elegís dónde trabajar con un solo ingreso.' }
    ] },
    { v: '1.48.0', b: '1.103.0', d: '2026-11-26', items: [
      { t: 'Avisos con la app cerrada también en iPhone, iPad y PC: en Menú › Avisos y sonidos, tocá «Activar avisos con la app cerrada». En el iPhone, primero instalá OdontoVoz en la pantalla de inicio (botón «Instalar como aplicación») y abrila desde ese ícono. Te llega cuando llega un paciente, cancelan un turno, hay una nota de otro, queda poco stock o piden un turno online.' }
    ] },
    { v: '1.47.0', b: '1.102.0', d: '2026-11-26', items: [
      { t: 'Profesionales: la especialidad ahora se elige de una lista (con «Otra» para escribirla) y se pueden cargar varias matrículas, cada una con su provincia o colegio (por ejemplo Río Negro y Neuquén). Salen todas juntas en las indicaciones y firmas, y las fichas de la FORN usan la de Río Negro.' },
      { t: 'Sello y foto de la matrícula: si tenés más de una matrícula, cada una puede tener su propio sello y su foto (la firma es una sola).' }
    ] },
    { v: '1.46.0', b: '1.101.0', d: '2026-11-26', items: [
      { t: 'Al cargar lo que hiciste desde la evolución, cada práctica tiene su tilde «Cobrar». Si destildás una (por ejemplo la consulta), queda registrada en la historia clínica pero no se cobra, y escribís el motivo: la secretaría lo ve en «Para cobrar» y en la cuenta del paciente. Después elegís igual si cobra la secretaría o cobrás vos.' }
    ] },
    { v: '1.45.0', b: '1.100.0', d: '2026-11-26', items: [
      { t: 'iPhone y iPad: el botón «Instalar como aplicación» ahora abre una guía de 4 pasos (Compartir › Agregar a inicio › Agregar), con los íconos de Safari y un botón para copiar el enlace. Apple no permite instalar con un solo toque.' }
    ] },
    { v: '1.44.0', b: '1.99.0', d: '2026-11-26', items: [
      { t: 'Cada profesional ve solo su agenda: en Usuarios del equipo hay una opción nueva, «Cada profesional ve solo su agenda». Prendida, los usuarios con puesto Profesional o Asistente ven únicamente los turnos de su profesional. El dueño, los socios, la administración y la secretaría siguen viendo todas las agendas.' }
    ] },
    { v: '1.43.0', b: '1.98.0', d: '2026-11-26', items: [
      { t: 'Tope mensual de prácticas por obra social: en Ajustes › Obras sociales, en cada una podés poner cuántas prácticas por mes cubre. En la ficha del paciente (y en la resumida) aparece un aviso: cuántas prácticas lleva este mes, «le queda 1» cuando está por llegar, y en rojo cuando llegó o se pasó del tope. Tocando el aviso ves cuáles son. También te avisa al registrar la práctica que llega al tope.', top: true }
    ] },
    { v: '1.42.1', b: '1.97.1', d: '2026-11-26', items: [
      { t: 'Stock: lo que agregás del catálogo ahora se acomoda en las categorías del stock (por ejemplo, «Composites y resinas» pasa a «Restauración») y queda asociado a su tipo, así el descuento automático por práctica funciona. Lo que ya habías cargado se corrige solo al abrir el stock.' }] },
    { v: '1.42.0', b: '1.97.0', d: '2026-11-26', items: [
      { t: 'Stock más simple: «Llegó mercadería» y «Cargar una compra» eran lo mismo y ahora es un solo botón: «Cargar compra · llegó mercadería». «Contar el stock» e «Insumo nuevo» se juntaron en un solo botón, «Editar stock».' },
      { t: 'Editar stock: ves todo lo que tenés por categoría (desplegable), cambiás la cantidad exacta con − y + o escribiéndola, sacás un producto (con deshacer), y con «＋ Agregar producto» buscás en el catálogo (por ejemplo «composite») y elegís la variedad que tenés, o cargás hablando o a mano.' }] },
    { v: '1.41.1', b: '1.96.1', d: '2026-11-26', items: [
      { t: 'Stock en la PC: los botones de arriba (Llegó mercadería, Usé algo, Contar el stock…) y las categorías ahora se acomodan en varias líneas y se ven completos; si no entraran, se arrastran con el mouse o con la rueda.' }] },
    { v: '1.41.0', b: '1.96.0', d: '2026-11-26', items: [
      { t: 'Stock: «Cargar una compra». Dictás o escribís lo que llegó con su precio («5 composite 3M A3 a 18500, 2 composite 3M A1 a 18500…»), la app arma las líneas con el producto del catálogo, corregís cantidad y precio, y al confirmar se suma todo al stock con el costo de cada uno. Podés repetir una compra anterior.' },
      { t: 'Comparación de precios: cada producto guarda el historial de lo que pagaste; al cargar una nueva compra ves «última vez $X» con la diferencia (▲ sube, ▼ baja), y en el stock aparece el último precio con su variación.' },
      { t: 'Mi stock ahora muestra las categorías contraídas, como botones con ícono, la cantidad de productos y un aviso de cuántos hay que reponer. Tocás una y se despliega; hay «Abrir todas / Cerrar todas», y al buscar o filtrar se abren solas.' }] },
    { v: '1.40.0', b: '1.95.0', d: '2026-11-26', items: [
      { t: 'Stock con productos concretos: en Mi stock, «Agregar producto» te deja buscar en el catálogo de Rutiden (marca, tono, presentación: «composite voco b2»), cargar hablando («2 composite 3M A2, una jeringa de composite Voco B2, baberos…») o cargar a mano. Cada producto queda con su código, así el pedido sale exacto.' },
      { t: 'Si tenés varios productos del mismo tipo (por ejemplo, composites de 3M y de Voco), el descuento automático por práctica gasta primero el que vence antes y, si no, el que más tiene.' }] },
    { v: '1.39.0', b: '1.94.0', d: '2026-11-26', items: [
      { t: 'Tutoriales nuevos, grabados con la app como está hoy y con una voz que te va explicando: «Configurá tu consultorio» (lo primero que tenés que hacer: Primeros pasos y todos los Ajustes), «La agenda» y «Ficha y ortodoncia». Los videos viejos se borraron.' },
      { t: 'En Inicio, en la tarjeta de Primeros pasos, y arriba en Ajustes hay un botón para mirar el video de cómo configurar tu consultorio. También están en Ajustes › Videos tutoriales y en la web, en Tutoriales.' }] },
    { v: '1.38.1', b: '1.93.1', d: '2026-11-26', items: [
      { t: 'Agenda: mantené apretado un turno (o un bloqueo) y, después de un instante, sale un menú chiquito para borrarlo (con aviso de deshacer). Mientras apretás se llena un anillo rojo que muestra cuánto falta. El tiempo es el mismo que el de bloquear horas (mínimo 1,5 s; se puede subir a 4 s desde la burbuja).' },
      { t: 'Calendario de la agenda: el selector de mes ahora es un botón que abre una grilla de meses, se cierra al volver a tocarlo o al tocar afuera.' },
      { t: 'La burbuja de turnos (menú + lista de pacientes) y el cuadrito del motivo se pueden mover arrastrando su título.' }] },
    { v: '1.38.0', b: '1.93.0', d: '2026-11-26', items: [
      { t: 'Animaciones suaves en las ventanas emergentes: las ventanas aparecen con un pequeño rebote (en el celular suben un poco), se desvanecen al cerrarlas con la X o «Cerrar», y lo mismo la ventanita del turno, los menús y los avisos. Los botones se hunden un poquito al tocarlos. Si tu celular tiene activada la opción de reducir movimiento, se apagan solas.' }] },
    { v: '1.37.0', b: '1.92.0', d: '2026-11-26', items: [
      { t: 'Agenda, arrastrar pacientes: ahora la tarjetita del paciente se levanta con una animación, el horario donde cae late suave (y se pone rojo si está ocupado), y al soltar el paciente «vuela» hasta el turno, que aparece con un resplandor.' },
      { t: 'Apenas se crea el turno sale un cuadrito con animación para escribir el motivo, con botones rápidos (Control, Limpieza, Dolor, Urgencia…). Se guarda con Enter o «Guardar», y «Omitir» lo cierra. En el celular aparece desde abajo.' }] },
    { v: '1.36.2', b: '1.91.2', d: '2026-11-26', items: [
      { t: 'Calendario de la agenda más compacto: los tres meses entran completos en la pantalla sin bajar, aun en pantallas chicas. Arriba hay un selector de mes (hasta un año adelante) para saltar directo a la fecha del turno, por ejemplo dentro de 5 meses.' }] },
    { v: '1.36.1', b: '1.91.1', d: '2026-11-26', items: [
      { t: 'Arreglo en la agenda: al pasar de un mes al siguiente (por ejemplo del 30 al 1) la tira de fechas ya no da la vuelta para atrás; se mueve suave desde donde estaba.' }] },
    { v: '1.36.0', b: '1.91.0', d: '2026-11-26', items: [
      { t: 'Agenda en la PC y tablet: el calendario de la derecha se rediseñó (tarjetas por mes, colores, leyenda arriba). Los días sin atención por vacaciones, feriado o agenda cancelada se ven en rojo suave y los días que se atiende en verde suave. Si elegís «Todos» y solo algún profesional no está, el día lleva un puntito rojo.' },
      { t: 'Vacaciones: al cargar un período en Profesionales, si ya había turnos esos días te ofrece cancelarlos y avisar a cada paciente por WhatsApp. Las columnas de esos días dicen «Vacaciones» (o «Cerrado» en los feriados) con el motivo.' }] },
    { v: '1.35.1', b: '1.90.1', d: '2026-11-26', items: [
      { t: 'Arreglo en la agenda (web y tablet): al cambiar de día, la tira de fechas ya no da toda la vuelta; se mueve suave desde donde estaba hasta el día elegido.' }] },
    { v: '1.35.0', b: '1.90.0', d: '2026-11-26', items: [
      { t: 'Ortodoncia: si en la evolución clínica escribís un control de ortodoncia (por ejemplo «control de ortodoncia, cambié arco superior .014 NiTi, cadena elástica…»), se crea solo el control en la solapa Ortodoncia con el arco, lo que hiciste y el próximo control, y te avisa con la opción de deshacer. La nota queda tal cual la escribiste.' },
      { t: 'En esa nota de la evolución aparece «Agregar foto» (con el tipo de foto) y «Ver en Ortodoncia». En la solapa, cada control tiene un lápiz ✎ para completar o corregir los detalles.' }] },
    { v: '1.34.1', b: '1.89.1', d: '2026-11-26', items: [
      { t: 'Ficha del paciente en el celular: el selector de secciones ahora dice «Estás en…» con el ícono de la sección y un botón verde «Cambiar sección» (que late las primeras veces). Al abrirlo, cada sección es una tarjeta con ícono y una línea que explica qué hay adentro.' },
      { t: 'Ortodoncia: ícono nuevo, un diente con bracket y arco por delante.' }] },
    { v: '1.34.0', b: '1.89.0', d: '2026-11-26', items: [
      { t: 'El puesto «Recepción» ahora se llama «Secretaría» y administra el consultorio: da y borra turnos, maneja pacientes (datos y cuenta), cobros, caja y cuentas. No modifica la historia clínica, los precios ni borra o archiva pacientes. Para que pueda corregir cobros hay que correr una vez supabase/secretaria.sql.' },
      { t: 'Arreglo en el celular: al buscar un paciente arriba en el inicio, los resultados se veían cortados y con las letras en vertical; ahora ocupan todo el ancho.' }] },
    { v: '1.33.1', b: '1.88.1', d: '2026-11-25', items: [
      { t: 'Turno con paciente nuevo: la obra social ahora se elige igual que en la ficha (lista para elegir o escribir, N.º de afiliado y plan con un toque).' },
      { t: 'Arreglo: las ventanas podían quedar chicas después de usar el teclado en la tablet y tapar botones como «Borrar turno»; ahora se reacomodan solas.' }] },
    { v: '1.33.0', b: '1.88.0', d: '2026-11-25', items: [
      { t: 'Plan y presupuesto: ahora podés subir planes de tratamiento en PDF (por ejemplo, los de ortodoncia que armás fuera de la aplicación). Les ponés nombre, y desde la ficha del paciente los abrís, descargás, renombrás o quitás.' }] },
    { v: '1.32.0', b: '1.87.0', d: '2026-11-25', items: [
      { t: 'Ortodoncia: solapa nueva en la ficha del paciente. Empezás el tratamiento (aparatología, inicio, duración) y en cada control cargás las fotos del día, el arco, los elásticos y lo que hiciste. Se anota solo en la evolución clínica (con las fotos) y las fotos quedan también en «Fotos y radiografías».' },
      { t: 'Ortodoncia: «Antes y ahora» compara la primera y la última foto de cada vista, barra de avance del tratamiento y botón para dar el turno del próximo control.' }] },
    { v: '1.31.0', b: '1.86.0', d: '2026-11-25', items: [
      { t: 'Agenda: dar turno arrastrando. En la burbuja de un espacio libre, arrastrá un paciente (en el celu, mantenelo presionado un instante) hasta el horario que quieras de la agenda y soltalo: se crea el turno ahí. Mientras arrastrás ves dónde cae y si está ocupado.' },
      { t: 'Agenda: estirá el borde de abajo de cualquier turno o bloqueo (la rayita gris) hacia abajo o arriba para cambiar la duración de a 15 minutos: 45 min, 1 hora, etc. Si se pisa con otro turno, te pregunta qué hacer.' }] },
    { v: '1.30.4', b: '1.85.4', d: '2026-11-25', items: [
      { t: 'Tablets: las ventanas (por ejemplo Nuevo turno) se ajustan al espacio visible y los botones de abajo ya no quedan tapados por la barra del teclado.' }] },
    { v: '1.30.3', b: '1.85.3', d: '2026-11-25', items: [
      { t: 'Arreglo: las ventanas flotantes ahora se arrastran con el dedo (en tablets y pantallas táctiles se soltaban a los pocos milímetros).' }] },
    { v: '1.30.2', b: '1.85.2', d: '2026-11-25', items: [
      { t: 'Stock: al cerrar con la X una ventanita (insumo, pedido, conteo, etc.) volvés al stock y seguís trabajando, en vez de salir al menú.' }] },
    { v: '1.30.1', b: '1.85.1', d: '2026-11-25', items: [
      { t: 'Rutiden: el pedido por WhatsApp ya sale con el número de Rutiden cargado.' }] },
    { v: '1.30.0', b: '1.85.0', d: '2026-11-25', items: [
      { t: 'Stock rediseñado: dos lugares claros, «Mi stock» y «Comprar stock». En Mi stock ves cuántos insumos tenés, cuántos andan bien, cuáles están por acabarse y cuáles vencen pronto; tocás un número y se filtra.' },
      { t: 'Mi stock: buscador, categorías, orden (lo más urgente, nombre, vence antes, más usado, mayor valor), agrupado o lista compacta, barra de cuánto queda y botones − / + para descontar o sumar uno al instante. Botón Compartir para mandar el stock por WhatsApp.' },
      { t: 'Comprar stock: «Lo que falta» (con el aviso de cuántos hay para reponer), Rutiden con su catálogo, «Mi pedido» y Surdental (próximamente). Los insumos ahora pueden tener costo por unidad y el stock calcula cuánto vale.' }] },
    { v: '1.29.0', b: '1.84.0', d: '2026-11-25', items: [
      { t: 'Agenda: mantené presionado un espacio libre (1 segundo; se cambia a 0,5, 2 o 4 s desde la burbuja) y arrastrá hacia abajo o hacia arriba para elegir las horas. Soltás, ajustás el final si hace falta, ponés un motivo y tocás «Bloquear».', top: true },
      { t: 'Agenda: al tocar un espacio libre se abre una burbuja con el menú (Turno, Sobreturno, Bloquear, Nota) y, a la derecha, la lista de pacientes con buscador: elegís uno y se arma el turno en ese horario.' }] },
    { v: '1.28.1', b: '1.83.1', d: '2026-11-25', items: [
      { t: 'Rutiden: al filtrar por marca ya se puede volver a «Todas».' }] },
    { v: '1.28.0', b: '1.83.0', d: '2026-11-25', items: [
      { t: 'Stock › Rutiden: la casa de insumos de la zona, adentro del stock. Más de 2.900 productos agrupados por categoría, marca y variantes (colores, medidas). Cargás tus precios (de lista y el último al que compraste), armás el pedido y se lo mandás a Rutiden por WhatsApp. Podés seguir cualquier producto en tu stock.', top: true }] },
    { v: '1.27.1', b: '1.82.1', d: '2026-11-24', items: [
      { t: 'La fecha de nacimiento ahora se carga en tres casilleros: día, mes y año. Escribís o elegís el día, elegís el mes, escribís el año, y calcula la edad sola. Ya no hay que buscarla en el calendario.' }] },
    { v: '1.27.0', b: '1.82.0', d: '2026-11-24', items: [
      { t: 'Planes nuevos: Profesional USD 22,21, Consultorio o Centro USD 45 (hasta 5 profesionales y 6 equipos, sin adicionales) y Empresa USD 96. Sin descuentos fijos: consultá por los disponibles. El precio en pesos se actualiza cada lunes con el dólar oficial.', top: true }] },
    { v: '1.26.0', b: '1.81.0', d: '2026-11-24', items: [
      { t: 'Cada profesional puede tener cargada su matrícula, su sello y su firma (Ajustes › Profesionales): se suben una sola vez con una foto y quedan registrados con fecha y quién los cargó. Se estampan solos en las fichas FORN.', top: true },
      { t: 'FORN: al presentar las fichas del mes se sellan. Cada una lleva un código de verificación, ya no se pueden modificar (si hay un error, se hace una ficha de corrección) y el PDF mensual trae una nota de presentación con la firma y el sello del profesional.' }] },
    { v: '1.25.2', b: '1.80.2', d: '2026-11-24', items: [
      { t: 'En «Mis números» ahora elegís quién ve tu caja: Visible, Privada o Solo yo. En «Solo yo» además tus cobros no aparecen en «Para cobrar» y nadie más puede abrir tu caja, ni siquiera el dueño de la cuenta.', top: true }] },
    { v: '1.25.1', b: '1.80.1', d: '2026-11-24', items: [
      { t: 'El puesto «Dueño/a (socio/a)» ahora tiene los mismos permisos que el dueño de la cuenta: usuarios, invitaciones, código, ajustes y todas las pantallas. Además atiende con su agenda. Solo el plan, el cobro de la cuenta y la caja privada de otro profesional siguen aparte. Hay que volver a correr socio.sql en Supabase.', top: true }] },
    { v: '1.25.0', b: '1.80.0', d: '2026-11-24', items: [
      { t: 'Nuevo puesto «Dueño/a (socio/a)»: maneja el equipo igual que el dueño de la cuenta (crea y quita usuarios, cambia puestos) y también atiende. Para activarlo hay que correr una vez socio.sql en Supabase.', top: true },
      { t: '«Mi caja en privado»: en «Mis números», cada dueño/a o socio/a decide si sus cobros se ven en la caja general. Si los deja en privado, no aparecen en la caja, el inicio ni las liquidaciones del consultorio.' }] },
    { v: '1.24.0', b: '1.79.0', d: '2026-11-24', items: [
      { t: 'Acuerdos nuevos para quien alquila: módulo (horas por semana a convenir, con días y horarios y un valor que se edita) o consultorio entero (por mes o por hora). Siempre se queda con el 100%. También hay «Socia / dueña».', top: true },
      { t: 'Caja privada: quien alquila (o una socia que lo elija) puede ocultar sus cobros y números. La administración ve solo el alquiler. Por ahora se oculta en Liquidaciones y «Mis números»; la caja del día y la cuenta de cada paciente todavía muestran los cobros.' }] },
    { v: '1.23.3', b: '1.78.3', d: '2026-11-24', items: [
      { t: 'Si administrás y también atendés (o sos dueño/a y atendés), los avisos de «llegó un paciente» ahora son solo de tus pacientes, en pantalla y con la app cerrada. Podés cambiarlo en Avisos y sonidos. Los «Para cobrar» quedan para la secretaria. En Usuarios del equipo se ve «Administra y atiende».', top: true }] },
    { v: '1.23.2', b: '1.78.2', d: '2026-11-24', items: [
      { t: 'Si el dueño de la cuenta también atiende: en Usuarios del equipo elige «Atiendo como…». Se le abre su agenda, firma como ese profesional y sus notas quedan a su nombre (antes figuraban con el mail de la cuenta).', top: true }] },
    { v: '1.23.1', b: '1.78.1', d: '2026-11-24', items: [
      { t: 'Socios del mismo centro: un usuario con puesto Administración ahora puede «Atender como» un profesional. Se le abre su agenda, firma y presenta las fichas FORN como ese profesional, y sigue viendo todo lo demás. Se elige en Usuarios del equipo.' }] },
    { v: '1.23', b: '1.78.0', d: '2026-11-24', items: [
      { t: 'FORN: botón «+ Ficha nueva» en la presentación mensual. Elegís el paciente (se completa sola) o la creás sin paciente y la completás a mano; después la podés asignar a un paciente. Todo queda en el registro de la organización.' }] },
    { v: '1.22.3', b: '1.77.3', d: '2026-11-24', items: [
      { t: 'En el menú, FORN aparece con el logo de la Federación y «Presentación mensual» debajo.' }] },
    { v: '1.22.2', b: '1.77.2', d: '2026-11-23', items: [
      { t: '«FORN · Presentación mensual» está ahora en el menú principal, arriba de «Cambios de hoy · deshacer».' }] },
    { v: '1.22.1', b: '1.77.1', d: '2026-11-23', items: [
      { t: 'Ficha FORN: «Código» ahora es una lista desplegable con los códigos de la obra social del paciente, por capítulos y con lo que paga la obra social, tomados de los aranceles de la Federación (se actualizan solos cada mes).' },
      { t: 'La presentación mensual y el PDF llevan el logo de la Federación Odontológica de Río Negro.' }] },
    { v: '1.22', b: '1.77.0', d: '2026-11-23', items: [
      { t: 'Fichas FORN: en la ficha del paciente (Datos e historia › FORN) se arma la ficha de la Federación Odontológica de Río Negro del mes, con sus datos ya cargados, lo que le hiciste ese mes con su código y la firma del paciente con el dedo.', top: true },
      { t: 'Menú › FORN · Presentación mensual: todas las fichas del mes en un PDF (con un resumen al principio), para mandar por WhatsApp o mail y marcarlas como presentadas.' }] },
    { v: '1.21.3', b: '1.76.3', d: '2026-11-23', items: [
      { t: '«Revisar una mudanza ya hecha» es más segura: solo mueve lo que trajo la mudanza (no toca lo que cargaste vos, lo anulado ni lo que pasaste a mano), podés destildar cada pase, no crea pacientes salvo que lo pidas y se puede deshacer.' }] },
    { v: '1.21.2', b: '1.76.2', d: '2026-11-23', items: [
      { t: 'Mudanza más segura: si no se puede saber con certeza de qué paciente es una evolución o un turno (dos pacientes con el mismo nombre, datos que no coinciden), ya no se adivina. No se carga y al final te muestra la lista.', top: true },
      { t: 'En la evolución, las notas traídas del sistema anterior tienen «No es de este paciente»: la pasás a la ficha correcta buscando al paciente, o la anulás.', top: true },
      { t: 'El asistente de mudanza ya no mezcla dos registros distintos del sistema anterior que tengan el mismo número interno.' }] },
    { v: '1.21.1', b: '1.76.1', d: '2026-11-20', items: [
      { t: 'Arriba de la ficha completa se ve también el N° de afiliado (edad · DNI · obra social · N° afiliado · teléfono).' },
      { t: 'En la ficha resumida: el N° de afiliado en «Datos principales» y las últimas 3 notas de la evolución clínica, debajo de «Qué hice hoy».' },
      { t: '«Facturado a obras sociales» pasó al final de la ficha, más compacto: se anota con «+ Anotar facturación».' }] },
    { v: '1.21', b: '1.76.0', d: '2026-11-20', items: [
      { t: 'Nuevo en la ficha (Datos e historia): «Facturado a obras sociales». Anotás mes por mes qué le facturaste a la obra social (prácticas y piezas) para no volver a facturarlo por error. Queda como un registro continuo, aparte de la evolución.' },
      { t: 'La última nota de facturación aparece en la ficha resumida, debajo de «Abrir ficha completa».' }] },
    { v: '1.20.3', b: '1.75.3', d: '2026-11-20', items: [
      { t: 'Arreglo: el logo al lado de «Buen día» ya no parpadea ni desaparece cuando la app se sincroniza.' }] },
    { v: '1.20.2', b: '1.75.2', d: '2026-11-20', items: [
      { t: 'En el celular, los 4 accesos directos del inicio entran en una sola fila.' },
      { t: 'Stock de insumos mantiene el mismo tamaño al pasar de una pestaña a otra (antes se achicaba en «Movimientos»).' }] },
    { v: '1.20.1', b: '1.75.1', d: '2026-11-20', items: [
      { t: 'Más fluido al desplazarse en Ajustes, en las ventanas y en la ficha (sobre todo en celulares Android).' },
      { t: 'En la computadora, la ventanita de un turno ya no queda cortada en los últimos turnos del día: siempre entra entera en la pantalla.' }] },
    { v: '1.20', b: '1.75.0', d: '2026-11-20', items: [
      { t: 'Foto del paciente: tocá su cara (o sus iniciales) en la ficha para sacarle una foto o elegirla de la galería. Aparece en el buscador y en la lista de pacientes. Es opcional y pide la autorización del paciente.', top: true },
      { t: 'Arreglo: en el odontograma se pueden volver a pintar varias caras seguidas del mismo diente y saltar entre dientes libremente.' },
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
      { t: 'Al anotar lo que hiciste en la evolución, primero te pregunta: «¿Cobra secretaría o lo cobro yo?». A secretaría le aparece un cartel con lo que escribiste y lo que hay que cobrar, y lo puede corregir.', top: true },
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
      { t: 'Consentimiento en papel: se imprime, se firma y se sube la foto a la historia clínica. Radiografías en PDF, arrastrando o pegando. Secretaría carga sin poder borrar lo hecho.', top: 1 }] },
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
      { t: 'Los equipos se enteran al instante de lo que hace otro (por ejemplo, cuando secretaría marca que llegó un paciente).', top: 1 }] },
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
      { t: 'Ajustes › Equipo e invitaciones, para sumar odontólogos y secretaría.' },
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
