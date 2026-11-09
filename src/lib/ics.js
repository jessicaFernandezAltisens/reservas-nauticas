// Genera un archivo de calendario .ics (RFC 5545) en el navegador, sin servicios externos.
import { restarMinutos } from './formato.js';

const ZONA = 'America/Montevideo'; // UTC−3, sin horario de verano

// Escapa texto según RFC 5545.
const esc = (t) => String(t ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Pliega líneas a 75 octetos (UTF-8) como pide el estándar.
function plegar(linea) {
  const enc = new TextEncoder();
  if (enc.encode(linea).length <= 75) return linea;
  const partes = [];
  let actual = '';
  for (const ch of linea) {
    const limite = partes.length ? 74 : 75; // las continuaciones empiezan con un espacio
    if (enc.encode(actual + ch).length > limite) {
      partes.push(actual);
      actual = ch;
    } else {
      actual += ch;
    }
  }
  partes.push(actual);
  return partes.join('\r\n ');
}

const fechaHoraLocal = (fecha, hora) => `${fecha.replace(/-/g, '')}T${hora.replace(':', '')}00`;

function fechaHoraUTC(d) {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Suma minutos a fecha + hora sin depender de la zona del navegador. */
function sumarMinutos(fecha, hora, minutos) {
  const [y, m, d] = fecha.split('-').map(Number);
  const [h, mi] = hora.split(':').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, h, mi + minutos));
  const iso = t.toISOString();
  return { fecha: iso.slice(0, 10), hora: iso.slice(11, 16) };
}

/**
 * @param {object} p
 * @param {object} p.reserva
 * @param {object} p.zarpe
 * @param {object} p.actividad
 * @param {object} p.barco
 * @param {object} p.negocio   { nombre, puntoEncuentro, minutosPresentacion }
 * @param {string} p.descripcion  texto con pasajeros, extras y total
 */
export function generarICS({ reserva, zarpe, actividad, barco, negocio, descripcion }) {
  const min = negocio.minutosPresentacion;
  const presentacion = sumarMinutos(zarpe.fecha, zarpe.hora, -min);
  const fin = sumarMinutos(zarpe.fecha, zarpe.hora, actividad.duracionMin);

  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${esc(negocio.nombre)}//Reservas nauticas//ES`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    `TZID:${ZONA}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:-03',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:${reserva.codigo}@reservas.marea-alta`,
    `DTSTAMP:${fechaHoraUTC(new Date())}`,
    // El evento empieza a la hora de presentación (15 min antes del zarpe).
    `DTSTART;TZID=${ZONA}:${fechaHoraLocal(presentacion.fecha, presentacion.hora)}`,
    `DTEND;TZID=${ZONA}:${fechaHoraLocal(fin.fecha, fin.hora)}`,
    `SUMMARY:${esc(`${actividad.nombre} · ${barco?.nombre ?? ''} (zarpe ${zarpe.hora})`)}`,
    `LOCATION:${esc(negocio.puntoEncuentro)}`,
    `DESCRIPTION:${esc(
      `Código de reserva: ${reserva.codigo}\nPresentación: ${restarMinutos(zarpe.hora, min)} (${min} min antes)\nZarpe: ${zarpe.hora}\n${descripcion}`
    )}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(`Presentate en el muelle a las ${restarMinutos(zarpe.hora, min)}`)}`,
    'TRIGGER:-PT1H',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lineas.map(plegar).join('\r\n') + '\r\n';
}

export function descargarICS(contenido, nombreArchivo) {
  const blob = new Blob([contenido], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
