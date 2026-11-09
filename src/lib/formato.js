// Fecha de hoy en formato YYYY-MM-DD usando la zona horaria local (no UTC).
export function hoyISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function formatearFecha(iso, opciones = {}) {
  if (!iso) return '';
  const texto = new Date(`${iso}T00:00:00`).toLocaleDateString('es-UY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...opciones,
  });
  // Solo la primera letra en mayúscula: «Lunes, 9 de noviembre».
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Pesos uruguayos: "$U 1.400"
export function formatearPesos(n) {
  return `$U ${Math.round(n || 0).toLocaleString('es-UY')}`;
}

export function formatearFechaHora(isoDateTime) {
  return new Date(isoDateTime).toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatearDuracion(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** "15:30" − 15 → "15:15" */
export function restarMinutos(hora, minutos) {
  const [h, m] = hora.split(':').map(Number);
  const total = (((h * 60 + m - minutos) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
