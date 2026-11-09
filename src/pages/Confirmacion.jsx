import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  NEGOCIO,
  buscarPorCodigo,
  desglosePrecio,
  esPesca,
  getActividad,
  getBarco,
  getExtras,
  getZarpe,
  lugaresReserva,
} from '../lib/storage';
import { formatearDuracion, formatearFecha, formatearPesos, restarMinutos } from '../lib/formato';
import { descargarICS, generarICS } from '../lib/ics';
import EstadoBadge from '../components/EstadoBadge.jsx';

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function lineasPasajeros(r, pesca) {
  if (pesca) return [plural(r.adultos, 'persona', 'personas') + ' (10 años o más)'];
  const l = [plural(r.adultos, 'adulto', 'adultos')];
  if (r.ninos) l.push(plural(r.ninos, 'niño de 2 a 10 años', 'niños de 2 a 10 años'));
  if (r.bebes) l.push(plural(r.bebes, 'menor de 2', 'menores de 2') + ' (sin costo)');
  return l;
}

function Bloque({ titulo, children }) {
  return (
    <section className="border-t border-slate-100 py-4 first:border-0 first:pt-0">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</h2>
      {children}
    </section>
  );
}

export default function Confirmacion() {
  const { codigo } = useParams();
  const reserva = buscarPorCodigo(codigo);
  const [copiado, setCopiado] = useState(false);
  const [icsCopiado, setIcsCopiado] = useState('');

  const zarpe = reserva && getZarpe(reserva.zarpeId);
  const actividad = zarpe && getActividad(zarpe.actividadId);
  const barco = zarpe && getBarco(zarpe.barcoId);

  if (!reserva || !zarpe || !actividad) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-5xl">🧭</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">No encontramos esa reserva</h1>
        <p className="mt-2 text-slate-500">
          {codigo ? `No hay ninguna reserva con el código ${codigo} en este navegador.` : 'Falta el código de reserva.'}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/reservar" className="btn-primario">Reservar salida</Link>
          <Link to="/mi-reserva" className="btn-secundario">Buscar reserva</Link>
        </div>
      </div>
    );
  }

  const pesca = esPesca(actividad);
  const min = NEGOCIO.minutosPresentacion;
  const presentacion = restarMinutos(zarpe.hora, min);
  const fecha = formatearFecha(zarpe.fecha);
  const pasajeros = lineasPasajeros(reserva, pesca);
  const extras = pesca ? getExtras().filter((e) => reserva.extras?.[e.id]) : [];
  // Desglose guardado al reservar (o recalculado para reservas antiguas sin él).
  const desglose = reserva.desglose ?? desglosePrecio(actividad, reserva, getExtras());

  const textoExtras = extras.map((e) => `${reserva.extras[e.id]} × ${e.nombre.toLowerCase()}`).join(', ');
  const textoDesglose = desglose
    .map((l) => `${l.concepto}: ${l.cantidad} × ${formatearPesos(l.unitario)} = ${formatearPesos(l.subtotal)}`)
    .join('\n');
  const descripcion =
    `Pasajeros: ${pasajeros.join(', ')} (${lugaresReserva(reserva)} lugares)\n` +
    (pesca ? `Extras: ${textoExtras || 'sin extras'}\n` : '') +
    `${textoDesglose}\nTotal: ${formatearPesos(reserva.precio)}`;

  const mensajeWhatsApp =
    `⛵ Reserva ${NEGOCIO.nombre}\n` +
    `Código: ${reserva.codigo}\n` +
    `${actividad.nombre} · ${barco?.nombre ?? ''}\n` +
    `${fecha}\n` +
    `Presentación: ${presentacion} (${min} min antes) · Zarpe: ${zarpe.hora}\n` +
    `Lugar: ${NEGOCIO.puntoEncuentro}\n` +
    descripcion;
  const enlaceWhatsApp = `https://wa.me/?text=${encodeURIComponent(mensajeWhatsApp)}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(reserva.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* portapapeles no disponible */
    }
  }

  const generar = () => generarICS({ reserva, zarpe, actividad, barco, negocio: NEGOCIO, descripcion });

  function descargarCalendario() {
    descargarICS(generar(), `reserva-${reserva.codigo}.ics`);
  }

  // Alternativa para navegadores o visores que bloquean descargas.
  async function copiarCalendario() {
    try {
      await navigator.clipboard.writeText(generar());
      setIcsCopiado('Evento copiado. Pegalo en un archivo de texto, guardalo como .ics y abrilo con tu calendario.');
    } catch {
      setIcsCopiado('No se pudo copiar el evento en este navegador.');
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:py-12">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl">✅</div>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 sm:text-3xl">¡Reserva confirmada!</h1>
        <p className="mt-1 text-sm text-slate-500">Guardá tu código para consultar o cancelar (con más de 24 h de anticipación).</p>
        <div className="mt-4 inline-flex items-center gap-3 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50 px-4 py-2.5">
          <span className="font-mono text-xl font-bold tracking-widest text-sky-900 sm:text-2xl">{reserva.codigo}</span>
          <button
            type="button"
            onClick={copiar}
            className="rounded-md bg-white px-3 py-1 text-sm font-medium text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100"
          >
            {copiado ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        {reserva.estado !== 'confirmada' && (
          <p className="mt-3"><EstadoBadge estado={reserva.estado} /></p>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <a
          href={enlaceWhatsApp}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-emerald-800"
        >
          💬 Compartir por WhatsApp
        </a>
        <button type="button" onClick={descargarCalendario} className="btn-secundario gap-2">
          📅 Agregar al calendario (.ics)
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-slate-500">
        ¿No se descargó?{' '}
        <button type="button" onClick={copiarCalendario} className="font-medium text-sky-700 underline underline-offset-2">
          Copiar el evento
        </button>
        {icsCopiado && <span role="status" className="mt-1 block">{icsCopiado}</span>}
      </p>

      <div className="tarjeta mt-6 text-sm">
        <Bloque titulo="Salida">
          <dl className="space-y-1.5">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Actividad</dt>
              <dd className="text-right font-medium">
                {actividad.emoji} {actividad.nombre}
                <span className="block text-xs font-normal text-slate-500">{formatearDuracion(actividad.duracionMin)}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Barco</dt>
              <dd className="text-right font-medium">{barco ? `${barco.emoji} ${barco.nombre}` : zarpe.barcoId}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Zarpe</dt>
              <dd className="text-right font-medium">
                {fecha}
                <span className="block text-base font-bold">{zarpe.hora}</span>
              </dd>
            </div>
          </dl>
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900">
            🕒 Presentate a las <strong>{presentacion}</strong>, {min} minutos antes del zarpe, en {NEGOCIO.puntoEncuentro}.
          </p>
        </Bloque>

        <Bloque titulo={`Pasajeros · ${plural(lugaresReserva(reserva), 'lugar', 'lugares')}`}>
          <ul className="space-y-1">
            {pasajeros.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <p className="mt-1 text-slate-500">Titular: {reserva.nombre} · {reserva.telefono}</p>
        </Bloque>

        {pesca && (
          <Bloque titulo="Extras">
            {extras.length ? (
              <ul className="space-y-1">
                {extras.map((e) => (
                  <li key={e.id}>{reserva.extras[e.id]} × {e.nombre}</li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500">Sin extras</p>
            )}
          </Bloque>
        )}

        <Bloque titulo="Desglose">
          <table className="w-full">
            <tbody>
              {desglose.map((l) => (
                <tr key={l.concepto}>
                  <td className="py-1 pr-2">
                    {l.concepto}
                    <span className="block text-xs text-slate-500">
                      {l.cantidad} × {l.unitario ? formatearPesos(l.unitario) : 'sin costo'}
                    </span>
                  </td>
                  <td className="py-1 text-right tabular-nums">{formatearPesos(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td className="pt-2 font-semibold">Total</td>
                <td className="pt-2 text-right text-xl font-bold text-sky-800 tabular-nums">{formatearPesos(reserva.precio)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 text-xs text-slate-400">Pago en el muelle antes de embarcar.</p>
        </Bloque>
      </div>

      <div className="mt-6 flex justify-center gap-4 text-sm">
        <Link to={`/mi-reserva?codigo=${reserva.codigo}`} className="font-medium text-sky-700 hover:underline">Ver en Mi reserva</Link>
        <Link to="/" className="font-medium text-sky-700 hover:underline">Volver al inicio</Link>
      </div>
    </div>
  );
}
