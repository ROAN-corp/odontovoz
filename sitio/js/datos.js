/* Datos editables del sitio: contacto, planes y dólar. Mantener los precios iguales a src/app25.js, src/app19.js, admin.html y terminos.html. */
window.CONTACTO = { whatsapp: ['5492984513279', '5492984764428'], nombres: ['Rodrigo', 'Angel'], email: 'somosroan@gmail.com' };
window.OV_DOLAR = 1700; /* pesos por dólar de referencia hasta que se baje dolar.json (dólar oficial, se actualiza los lunes) */
window.OV_DOLAR_FECHA = '';
/* usd: precio en dólares por mes; en pesos se calcula con OV_DOLAR. Profesional = equivalente en dólares de $37.753 con USD 1 = $1.700. */
window.PLANES = [
  { nombre: 'Prueba', quien: 'Para conocerla con tus pacientes reales.', usd: 0, por: '7 días', items: ['Todas las funciones de todos los planes', 'Profesionales y consultorios sin límite de prueba', 'Hasta 5 equipos', 'Sin tarjeta de crédito', 'Lanzamiento: los primeros 50 tienen 14 días'], boton: 'Empezar gratis', link: '/app/' },
  { nombre: 'Profesional', quien: 'Un odontólogo, en uno o varios consultorios.', usd: 22.21, items: ['1 profesional', '1 consultorio incluido', 'Hasta 2 equipos (celular y PC)', 'Consultorio adicional con un equipo más (hasta 5 en total): {3}', 'Asistente por voz y respaldo en la nube'], boton: 'Contratar' },
  { nombre: 'Consultorio o Centro', quien: 'Varios profesionales con recepción: consultorios, clínicas y centros.', usd: 45, items: ['Hasta 5 profesionales', 'Hasta 6 equipos', 'Precio total: sin adicionales', 'Recepción incluida', 'Agenda compartida en vivo', 'Liquidación por obra social', 'Ayuda para migrar los datos'], boton: 'Contratar', destacado: true },
  { nombre: 'Empresa', quien: 'Dueños de 2 a 5 consultorios.', usd: 96, items: ['De 2 a 5 consultorios, cada uno con su agenda, su personal y su caja', 'Hasta 40 profesionales y 60 equipos', 'Inicio del dueño con el resumen de cada consultorio', 'Estadísticas, metas, liquidaciones y reporte para el contador', 'Personal con PIN y registro de quién hizo qué'], boton: 'Consultar' }
];
