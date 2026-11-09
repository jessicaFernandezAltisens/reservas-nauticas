// ─────────────────────────────────────────────────────────────────────────────
// DATOS DE DEMOSTRACIÓN (según el briefing)
// Se escriben en localStorage SOLO la primera vez (cuando no existe la clave).
// Recargar la página no los sobrescribe. Para volver a cargarlos:
// /admin → Ajustes → «Restaurar datos de ejemplo».
// Precios de ejemplo en pesos uruguayos ($U).
// ─────────────────────────────────────────────────────────────────────────────

import { desglosePrecio, totalDesglose } from '../lib/precios.js';

// ⚠️ Número de ejemplo: reemplazalo por el WhatsApp real del negocio (solo dígitos, con código de país).
export const NEGOCIO = {
  nombre: 'Marea Alta',
  whatsapp: '59899000000',
  puntoEncuentro: 'Muelle de Marea Alta', // ⚠️ de ejemplo: poné la dirección real
  minutosPresentacion: 15, // presentarse 15 min antes del zarpe
};

export const BARCOS = [
  { id: 'gaviota', nombre: 'Gaviota', emoji: '🛥️', capacidad: 15, descripcion: 'Cubierta abierta.' },
  { id: 'petrel', nombre: 'Petrel', emoji: '🚢', capacidad: 30, descripcion: 'El más grande, con acceso cómodo desde el muelle.' },
  { id: 'cormoran', nombre: 'Cormorán', emoji: '🎣', capacidad: 12, descripcion: 'Ideal para pesca.' },
  { id: 'albatros', nombre: 'Albatros', emoji: '⛵', capacidad: 10, descripcion: 'El más chico.' },
];

// tipo 'paseo': adultos + niños (2–10) + menores de 2 (no pagan, ocupan lugar).
// tipo 'pesca': una sola cantidad, todas las personas con 10 años o más.
export const ACTIVIDADES = [
  {
    id: 'paseo-corto',
    nombre: 'Paseo corto por la bahía',
    emoji: '🌊',
    tipo: 'paseo',
    duracionMin: 30,
    precioAdulto: 650,
    precioNino: 300,
    edadMinima: 0,
    horarioTexto: 'Viernes a domingo, 12:30 y 17:00',
    descripcion: 'Media hora recorriendo la bahía. Perfecto para ir con los más chicos.',
  },
  {
    id: 'paseo-bahia',
    nombre: 'Paseo por la bahía',
    emoji: '🌅',
    tipo: 'paseo',
    duracionMin: 60,
    precioAdulto: 950,
    precioNino: 450,
    edadMinima: 0,
    horarioTexto: 'Todos los días, 11:00, 15:00 y 18:30',
    descripcion: 'Una hora de navegación por la bahía con vistas a la costa.',
  },
  {
    id: 'pesca-expres',
    nombre: 'Pesca exprés',
    emoji: '🐟',
    tipo: 'pesca',
    duracionMin: 120,
    precioAdulto: 1400,
    precioNino: null,
    edadMinima: 10,
    horarioTexto: 'Sábado y domingo, 15:30',
    descripcion: 'Dos horas de pesca para probar suerte sin madrugar.',
  },
  {
    id: 'pesca-embarque',
    nombre: 'Pesca de embarque',
    emoji: '🎣',
    tipo: 'pesca',
    duracionMin: 240,
    precioAdulto: 2100,
    precioNino: null,
    edadMinima: 10,
    horarioTexto: 'Martes a domingo, 7:00',
    descripcion: 'Salida temprana de cuatro horas para pescar en serio.',
  },
];

export const EXTRAS = [
  { id: 'equipo', nombre: 'Equipo completo', precio: 300, unidad: 'persona', maxPorPersona: true },
  { id: 'carnada', nombre: 'Carnada de camarón', precio: 150, unidad: 'porción', maxPorPersona: false },
];

// Días con Date.getDay(): 0 = domingo … 6 = sábado.
// Si hay varios barcos, se van alternando entre zarpes.
export const HORARIOS = [
  { actividadId: 'paseo-bahia', dias: [0, 1, 2, 3, 4, 5, 6], horas: ['11:00', '15:00', '18:30'], barcos: ['petrel', 'gaviota'] },
  { actividadId: 'paseo-corto', dias: [5, 6, 0], horas: ['12:30', '17:00'], barcos: ['albatros'] },
  { actividadId: 'pesca-embarque', dias: [2, 3, 4, 5, 6, 0], horas: ['07:00'], barcos: ['cormoran'] },
  { actividadId: 'pesca-expres', dias: [6, 0], horas: ['15:30'], barcos: ['cormoran'] },
];

// Cantidad de zarpes de la demo. El horario completo de 7 días genera 35;
// se toman 14 repartidos entre las 4 actividades. Pon Infinity para el horario completo.
export const ZARPES_DEMO = 14;

// ── Generación de zarpes a partir del horario ───────────────────────────────

export function fechaISO(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export const idZarpe = (fecha, hora, actividadId) => `${fecha}_${hora}_${actividadId}`;

/** Todos los zarpes del horario entre hoy+desde y hoy+hasta (incluidos). */
export function generarZarpes(desde, hasta) {
  const capacidad = Object.fromEntries(BARCOS.map((b) => [b.id, b.capacidad]));
  const zarpes = [];
  for (let i = desde; i <= hasta; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const fecha = fechaISO(d);
    for (const h of HORARIOS) {
      if (!h.dias.includes(d.getDay())) continue;
      h.horas.forEach((hora, j) => {
        const barcoId = h.barcos[(i + j) % h.barcos.length];
        zarpes.push({
          id: idZarpe(fecha, hora, h.actividadId),
          actividadId: h.actividadId,
          barcoId,
          fecha,
          hora,
          cupo: capacidad[barcoId], // cada zarpe arranca con todos los lugares del barco
          estado: 'abierto', // 'abierto' | 'cerrado_clima'
        });
      });
    }
  }
  return zarpes.sort((a, b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`));
}

/** Elige `total` zarpes alternando actividades (round-robin) para que estén todas. */
function seleccionarRepartidos(zarpes, total) {
  const colas = ACTIVIDADES.map((a) => zarpes.filter((z) => z.actividadId === a.id));
  const elegidos = [];
  while (elegidos.length < total && colas.some((c) => c.length)) {
    for (const c of colas) if (c.length && elegidos.length < total) elegidos.push(c.shift());
  }
  return elegidos.sort((a, b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`));
}

// ── Reservas de demostración ────────────────────────────────────────────────
// [actividadId, nº de zarpe de esa actividad (0 = el primero), adultos, niños, menores2,
//  equipo, carnada, estado, nombre, notas]
const PLAN_RESERVAS = [
  ['paseo-bahia', 0, 2, 2, 1, 0, 0, 'confirmada', 'Martina Pereira', ''],
  ['paseo-bahia', 0, 4, 0, 0, 0, 0, 'confirmada', 'Diego Rodríguez', ''],
  ['paseo-bahia', 1, 6, 3, 0, 0, 0, 'confirmada', 'Florencia Silva', 'Cumpleaños de 8.'],
  ['paseo-bahia', 2, 2, 0, 0, 0, 0, 'cancelada', 'Santiago González', 'Canceló por lluvia.'],
  ['paseo-corto', 0, 3, 2, 1, 0, 0, 'confirmada', 'Valentina Fernández', 'Vamos con cochecito.'],
  ['paseo-corto', 0, 2, 2, 0, 0, 0, 'confirmada', 'Joaquín Martínez', ''], // este zarpe queda completo (10/10)
  ['paseo-corto', 1, 2, 1, 0, 0, 0, 'confirmada', 'Camila López', ''],
  ['pesca-embarque', 0, 4, 0, 0, 4, 4, 'confirmada', 'Federico Sosa', ''],
  ['pesca-embarque', 0, 8, 0, 0, 2, 6, 'confirmada', 'Nicolás Ramírez', 'Salida de la empresa.'], // completo (12/12)
  ['pesca-embarque', 1, 2, 0, 0, 0, 2, 'confirmada', 'Lucía Méndez', 'Traemos nuestras cañas.'],
  ['pesca-expres', 0, 3, 0, 0, 3, 3, 'confirmada', 'Matías Acosta', ''],
  ['pesca-expres', 1, 2, 0, 0, 2, 0, 'cancelada', 'Sofía Núñez', ''],
];

// Zarpes que la demo deja cerrados por clima: [actividadId, nº de zarpe de esa actividad].
// Sus reservas confirmadas pasan a «A reprogramar» (en la demo: MA-DEMO03, grupo de 9).
const CIERRES_CLIMA_DEMO = [['paseo-bahia', 1]];

export function crearDatosSemilla() {
  // Próximos 7 días empezando mañana.
  const zarpes = seleccionarRepartidos(generarZarpes(1, 7), ZARPES_DEMO);
  const actividad = (id) => ACTIVIDADES.find((a) => a.id === id);
  const ahora = Date.now();

  const reservas = [];
  PLAN_RESERVAS.forEach(([actividadId, n, adultos, ninos, bebes, equipo, carnada, estado, nombre, notas], i) => {
    const zarpe = zarpes.filter((z) => z.actividadId === actividadId)[n];
    if (!zarpe) return;
    const desglose = desglosePrecio(actividad(actividadId), { adultos, ninos, bebes, extras: { equipo, carnada } }, EXTRAS);
    reservas.push({
      codigo: `MA-DEMO${String(i + 1).padStart(2, '0')}`,
      zarpeId: zarpe.id,
      adultos,
      ninos,
      bebes,
      extras: { equipo, carnada },
      nombre,
      telefono: `09${9 - (i % 3)}${String(100 + i * 37).padStart(3, '0')}${String(200 + i * 53).slice(-3)}`, // 9 dígitos
      desglose,
      precio: totalDesglose(desglose),
      estado,
      creadaEn: new Date(ahora - (12 - i) * 5 * 3600 * 1000).toISOString(),
    });
  });

  for (const [actividadId, n] of CIERRES_CLIMA_DEMO) {
    const z = zarpes.filter((x) => x.actividadId === actividadId)[n];
    if (!z) continue;
    z.estado = 'cerrado_clima';
    z.cerradoEn = new Date(ahora - 3600 * 1000).toISOString();
    for (const r of reservas) {
      if (r.zarpeId === z.id && r.estado === 'confirmada') {
        r.estado = 'reprogramar';
        r.zarpeOriginalId = z.id;
      }
    }
  }

  return {
    version: 3,
    actividades: ACTIVIDADES,
    barcos: BARCOS,
    extras: EXTRAS,
    zarpes,
    reservas,
    sembradoEn: new Date().toISOString(),
  };
}
