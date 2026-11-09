// Cálculo de precios (módulo puro, sin localStorage). Lo usan storage.js y la semilla.
//
// Total = adultos × tarifa adulto + niños × tarifa niño (+ equipo y carnada si es pesca).
// Los menores de 2 no pagan (aparecen en el desglose a $U 0).

export const esPesca = (actividad) => actividad?.tipo === 'pesca';

/**
 * Líneas del desglose: [{ concepto, cantidad, unitario, subtotal, extra? }]
 */
export function desglosePrecio(actividad, { adultos = 0, ninos = 0, bebes = 0, extras = {} }, catalogoExtras = []) {
  if (!actividad) return [];
  const pesca = esPesca(actividad);
  const lineas = [];
  if (adultos) lineas.push({ concepto: pesca ? 'Personas' : 'Adultos', cantidad: adultos, unitario: actividad.precioAdulto });
  if (!pesca && ninos) lineas.push({ concepto: 'Niños de 2 a 10 años', cantidad: ninos, unitario: actividad.precioNino ?? 0 });
  if (!pesca && bebes) lineas.push({ concepto: 'Menores de 2', cantidad: bebes, unitario: 0 });
  if (pesca) {
    for (const e of catalogoExtras) {
      if (extras?.[e.id]) lineas.push({ concepto: e.nombre, cantidad: extras[e.id], unitario: e.precio, extra: true });
    }
  }
  return lineas.map((l) => ({ ...l, subtotal: l.cantidad * l.unitario }));
}

export const totalDesglose = (lineas) => lineas.reduce((s, l) => s + l.subtotal, 0);
