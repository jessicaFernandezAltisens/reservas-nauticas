import { esPesca, getActividad, getBarco, getExtras, getZarpe, lugaresReserva, zarpeCerrado } from '../lib/storage';
import { formatearDuracion, formatearFecha, formatearPesos } from '../lib/formato';
import EstadoBadge from './EstadoBadge.jsx';

function Fila({ label, children }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children}</dd>
    </div>
  );
}

/** "2 adultos · 1 niño · 1 menor de 2" o "3 personas" en pesca. */
export function resumenPersonas(r, actividad) {
  if (esPesca(actividad)) return `${r.adultos} ${r.adultos === 1 ? 'persona' : 'personas'}`;
  const partes = [`${r.adultos} ${r.adultos === 1 ? 'adulto' : 'adultos'}`];
  if (r.ninos) partes.push(`${r.ninos} ${r.ninos === 1 ? 'niño' : 'niños'}`);
  if (r.bebes) partes.push(`${r.bebes} ${r.bebes === 1 ? 'menor de 2' : 'menores de 2'}`);
  return partes.join(' · ');
}

export default function DetalleReserva({ reserva }) {
  const zarpe = getZarpe(reserva.zarpeId);
  const actividad = zarpe && getActividad(zarpe.actividadId);
  const barco = zarpe && getBarco(zarpe.barcoId);
  const extras = esPesca(actividad) ? getExtras().filter((e) => reserva.extras?.[e.id]) : [];

  return (
    <dl className="text-sm">
      <Fila label="Código">
        <span className="font-mono">{reserva.codigo}</span>
      </Fila>
      <Fila label="Estado">
        <EstadoBadge estado={reserva.estado} />
      </Fila>
      {zarpe ? (
        <>
          <Fila label="Actividad">{actividad ? `${actividad.emoji} ${actividad.nombre}` : zarpe.actividadId}</Fila>
          <Fila label="Fecha">
            <span className={`${zarpeCerrado(zarpe) ? 'text-slate-400 line-through' : ''}`}>{formatearFecha(zarpe.fecha)}</span>
            {zarpeCerrado(zarpe) && <span className="block text-xs font-semibold text-amber-700">Zarpe suspendido por clima</span>}
          </Fila>
          <Fila label="Hora de zarpe">
            {zarpe.hora}
            {actividad && <span className="font-normal text-slate-500"> · {formatearDuracion(actividad.duracionMin)}</span>}
          </Fila>
          <Fila label="Barco">{barco ? `${barco.emoji} ${barco.nombre}` : zarpe.barcoId}</Fila>
          {reserva.zarpeOriginalId && reserva.zarpeOriginalId !== reserva.zarpeId && (
            <Fila label="Reprogramada desde">
              {(() => {
                const o = getZarpe(reserva.zarpeOriginalId);
                return o ? `${formatearFecha(o.fecha, { weekday: undefined, year: undefined, month: 'short' })}, ${o.hora} (clima)` : reserva.zarpeOriginalId;
              })()}
            </Fila>
          )}
        </>
      ) : (
        <Fila label="Zarpe">
          <span className="text-rose-600">No encontrado ({reserva.zarpeId})</span>
        </Fila>
      )}
      <Fila label="Personas">
        {resumenPersonas(reserva, actividad)}
        <span className="block text-xs font-normal text-slate-500">{lugaresReserva(reserva)} lugares</span>
      </Fila>
      {extras.map((e) => (
        <Fila key={e.id} label={e.nombre}>
          {reserva.extras[e.id]} × {formatearPesos(e.precio)}
        </Fila>
      ))}
      <Fila label="Titular">{reserva.nombre}</Fila>
      <Fila label="Celular">{reserva.telefono}</Fila>
      {reserva.notas && <Fila label="Notas">{reserva.notas}</Fila>}
      <Fila label="Total">
        <span className="text-base font-bold text-sky-800">{formatearPesos(reserva.precio)}</span>
      </Fila>
    </dl>
  );
}
