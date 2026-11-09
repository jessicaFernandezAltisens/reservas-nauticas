import { useMemo, useState } from 'react';
import { esPesca, getActividad, getBarco, getExtras, lugaresReserva, plazasOcupadas, zarpeCerrado, zarpeEsFuturo } from '../lib/storage';
import { formatearDuracion, formatearFecha, formatearPesos, hoyISO } from '../lib/formato';
import { linkWhatsApp } from '../lib/whatsapp';
import EstadoBadge from './EstadoBadge.jsx';

const corto = (r, pesca) =>
  pesca
    ? `${r.adultos} pers.`
    : [`${r.adultos} ad.`, r.ninos ? `${r.ninos} niñ.` : '', r.bebes ? `${r.bebes} <2` : ''].filter(Boolean).join(' · ');

function Ocupacion({ ocupadas, cupo }) {
  const pct = cupo ? Math.min(100, Math.round((ocupadas / cupo) * 100)) : 0;
  const color = pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="min-w-[160px]">
      <div className="flex justify-between text-xs font-medium text-slate-600">
        <span>{ocupadas}/{cupo} ocupados</span>
        <span>{Math.max(0, cupo - ocupadas)} libres</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TarjetaZarpe({ zarpe, reservas, onCerrarPorClima }) {
  const actividad = getActividad(zarpe.actividadId);
  const barco = getBarco(zarpe.barcoId);
  const pesca = esPesca(actividad);
  const cerrado = zarpeCerrado(zarpe);
  const pasado = !zarpeEsFuturo(zarpe);
  const extrasCat = getExtras();

  const delZarpe = reservas.filter((r) => r.zarpeId === zarpe.id);
  const activas = delZarpe.filter((r) => r.estado === 'confirmada');
  const otras = delZarpe.filter((r) => r.estado !== 'confirmada');
  const ocupadas = plazasOcupadas(zarpe.id, reservas);

  const tot = activas.reduce(
    (t, r) => ({
      adultos: t.adultos + r.adultos,
      ninos: t.ninos + (r.ninos || 0),
      bebes: t.bebes + (r.bebes || 0),
      equipo: t.equipo + (r.extras?.equipo || 0),
      carnada: t.carnada + (r.extras?.carnada || 0),
      importe: t.importe + r.precio,
    }),
    { adultos: 0, ninos: 0, bebes: 0, equipo: 0, carnada: 0, importe: 0 }
  );

  return (
    <article className={`tarjeta p-0 ${cerrado ? 'border-amber-200' : ''}`}>
      <header className={`flex flex-wrap items-start justify-between gap-3 rounded-t-2xl p-4 ${cerrado ? 'bg-amber-50' : 'bg-slate-50'}`}>
        <div>
          <p className="text-2xl font-bold text-slate-900">{zarpe.hora}</p>
          <p className="font-semibold text-slate-800">
            {actividad?.emoji} {actividad?.nombre}
            <span className="font-normal text-slate-500"> · {formatearDuracion(actividad?.duracionMin ?? 0)}</span>
          </p>
          <p className="text-sm text-slate-600">
            {barco?.emoji} {barco?.nombre} · {zarpe.cupo} lugares
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {cerrado ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
              ⛈️ No disponible · clima
            </span>
          ) : pasado ? (
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">Ya zarpó</span>
          ) : (
            <Ocupacion ocupadas={ocupadas} cupo={zarpe.cupo} />
          )}
          {!cerrado && !pasado && (
            <button
              type="button"
              onClick={() => onCerrarPorClima(zarpe)}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50"
            >
              ⛈️ Reprogramar por clima
            </button>
          )}
        </div>
      </header>

      <div className="p-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Pasajeros {cerrado ? '' : `· ${ocupadas} ${ocupadas === 1 ? 'lugar' : 'lugares'}`}
        </h3>

        {activas.length === 0 ? (
          <p className="text-sm text-slate-400">{cerrado ? 'Sin pasajeros: el zarpe se cerró por clima.' : 'Sin reservas todavía para este zarpe.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="py-1 pr-3 font-medium">Titular</th>
                  <th className="py-1 pr-3 font-medium">Celular</th>
                  <th className="py-1 pr-3 font-medium">Pasajeros</th>
                  {pesca && <th className="py-1 pr-3 font-medium">Extras</th>}
                  <th className="py-1 pr-3 font-medium">Código</th>
                  <th className="py-1 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activas.map((r) => (
                  <tr key={r.codigo}>
                    <td className="py-1.5 pr-3 font-medium">{r.nombre}</td>
                    <td className="py-1.5 pr-3">
                      <a href={linkWhatsApp(r.telefono)} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">
                        {r.telefono}
                      </a>
                    </td>
                    <td className="py-1.5 pr-3">
                      <span className="font-semibold">{lugaresReserva(r)}</span>
                      <span className="text-slate-500"> ({corto(r, pesca)})</span>
                    </td>
                    {pesca && (
                      <td className="py-1.5 pr-3 text-slate-600">
                        {extrasCat.filter((e) => r.extras?.[e.id]).map((e) => `${r.extras[e.id]} ${e.id}`).join(' · ') || '—'}
                      </td>
                    )}
                    <td className="py-1.5 pr-3 font-mono text-xs">{r.codigo}</td>
                    <td className="py-1.5 text-right tabular-nums">{formatearPesos(r.precio)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 text-xs text-slate-600">
                <tr>
                  <td className="pt-2" colSpan={2}>
                    {activas.length} {activas.length === 1 ? 'reserva' : 'reservas'}
                  </td>
                  <td className="pt-2">
                    {pesca ? `${tot.adultos} pers.` : `${tot.adultos} ad. · ${tot.ninos} niñ. · ${tot.bebes} <2`}
                  </td>
                  {pesca && <td className="pt-2">{tot.equipo} equipo · {tot.carnada} carnada</td>}
                  <td />
                  <td className="pt-2 text-right font-semibold tabular-nums">{formatearPesos(tot.importe)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {otras.length > 0 && (
          <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">No ocupan lugar</p>
            <ul className="space-y-1 text-sm text-slate-500">
              {otras.map((r) => (
                <li key={r.codigo} className="flex flex-wrap items-center gap-2">
                  <EstadoBadge estado={r.estado} />
                  <span>{r.nombre}</span>
                  <span>· {lugaresReserva(r)} {lugaresReserva(r) === 1 ? 'lugar' : 'lugares'}</span>
                  <span className="font-mono text-xs">{r.codigo}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );
}

export default function VistaDiaria({ zarpes, reservas, onCerrarPorClima }) {
  const fechas = useMemo(() => [...new Set(zarpes.map((z) => z.fecha))].sort(), [zarpes]);
  const [fecha, setFecha] = useState(() => {
    const hoy = hoyISO();
    return fechas.find((f) => f >= hoy) ?? fechas.at(-1) ?? hoy;
  });

  const i = fechas.indexOf(fecha);
  const delDia = zarpes.filter((z) => z.fecha === fecha).sort((a, b) => a.hora.localeCompare(b.hora));
  const pasajerosDia = delDia.reduce((s, z) => s + (zarpeCerrado(z) ? 0 : plazasOcupadas(z.id, reservas)), 0);

  return (
    <div className="mt-4">
      <div className="tarjeta flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-40"
          onClick={() => setFecha(fechas[i - 1])}
          disabled={i <= 0}
          aria-label="Día anterior"
        >
          ◀
        </button>
        <input
          type="date"
          className="campo w-auto py-1.5"
          value={fecha}
          onChange={(e) => e.target.value && setFecha(e.target.value)}
          aria-label="Elegir día"
        />
        <button
          type="button"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-40"
          onClick={() => setFecha(fechas[i + 1])}
          disabled={i < 0 || i >= fechas.length - 1}
          aria-label="Día siguiente"
        >
          ▶
        </button>
        <div className="w-full sm:ml-auto sm:w-auto sm:text-right">
          <p className="font-semibold text-slate-900">{formatearFecha(fecha)}</p>
          <p className="text-sm text-slate-500">
            {delDia.length} {delDia.length === 1 ? 'zarpe' : 'zarpes'} · {pasajerosDia} pasajeros
          </p>
        </div>
      </div>

      {delDia.length === 0 ? (
        <p className="tarjeta mt-4 text-center text-slate-500">
          {zarpes.length === 0
            ? 'No hay zarpes cargados. Creá uno en la pestaña Zarpes o restaurá los datos de ejemplo en Ajustes.'
            : 'No hay zarpes programados este día. Usá ◀ ▶ para ir a un día con salidas.'}
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {delDia.map((z) => (
            <TarjetaZarpe key={z.id} zarpe={z} reservas={reservas} onCerrarPorClima={onCerrarPorClima} />
          ))}
        </div>
      )}
    </div>
  );
}
