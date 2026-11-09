import { Link } from 'react-router-dom';
import { getActividades } from '../lib/storage';
import { formatearDuracion, formatearPesos } from '../lib/formato';

/** Precio más bajo de la actividad (niño en paseos, por persona en pesca). */
const precioDesde = (a) => Math.min(a.precioAdulto, a.precioNino ?? Infinity);

export default function Inicio() {
  const actividades = getActividades();

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:py-10">
      <h1 className="text-2xl font-extrabold leading-tight text-slate-900 sm:text-4xl">Salidas en barco por la bahía</h1>
      <p className="mt-1 text-sm text-slate-500 sm:text-base">Elegí una actividad y reservá tu lugar.</p>

      {actividades.length === 0 && (
        <p className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          Todavía no hay actividades cargadas.
        </p>
      )}

      <ul className="mt-4 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {actividades.map((a) => (
          <li key={a.id} className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-tarjeta)] transition hover:border-sky-200 sm:p-6">
            <div className="flex items-center gap-3 sm:flex-col sm:items-start">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-2xl sm:h-16 sm:w-16 sm:text-4xl"
                aria-hidden="true"
              >
                {a.emoji}
              </span>
              <div>
                <h2 className="text-base font-bold leading-snug text-slate-900 sm:text-lg">{a.nombre}</h2>
                <p className="text-sm text-slate-500">⏱️ {formatearDuracion(a.duracionMin)}</p>
              </div>
            </div>

            <p className="mt-3 text-sm text-slate-500 sm:mt-auto sm:pt-5">
              Desde <span className="text-lg font-bold text-slate-900">{formatearPesos(precioDesde(a))}</span>
            </p>

            <Link
              to={`/reservar?actividad=${a.id}`}
              className="btn-primario mt-3 w-full"
              aria-label={`Reservar salida: ${a.nombre}`}
            >
              Reservar salida
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
