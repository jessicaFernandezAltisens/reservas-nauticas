import { useState } from 'react';
import { actualizarCupoBarco, getBarcos, ocupacionPorBarco } from '../lib/storage';

function FilaBarco({ barco, version, onGuardado }) {
  const [valor, setValor] = useState(String(barco.capacidad));
  const [error, setError] = useState('');

  const ocupacion = ocupacionPorBarco(barco.id); // se recalcula en cada render (version cambia al guardar)
  const maxOcupadas = Math.max(0, ...ocupacion.map((o) => o.ocupadas));
  const peor = ocupacion.find((o) => o.ocupadas === maxOcupadas && maxOcupadas > 0);
  const n = Number(valor);
  const invalido = !Number.isInteger(n) || n < 1 || n > 500;
  const pordebajo = !invalido && n < maxOcupadas;
  const sinCambios = n === barco.capacidad;

  function guardar(e) {
    e.preventDefault();
    try {
      const b = actualizarCupoBarco(barco.id, valor);
      setError('');
      onGuardado(b);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={guardar} className="grid gap-3 border-t border-slate-100 py-4 first:border-0 sm:grid-cols-[1.4fr_1fr_auto] sm:items-center" data-version={version}>
      <div>
        <p className="font-semibold text-slate-900">
          {barco.emoji} {barco.nombre}
        </p>
        <p className="text-sm text-slate-500">{barco.descripcion}</p>
        <p className="mt-1 text-xs text-slate-500">
          {ocupacion.length} zarpes · ocupación máxima: <strong>{maxOcupadas}</strong>
          {peor && ` (${peor.zarpe.fecha} ${peor.zarpe.hora})`}
        </p>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Cupo (lugares)</span>
        <input
          type="number"
          inputMode="numeric"
          min={Math.max(1, maxOcupadas)}
          max={500}
          step={1}
          className={`campo ${pordebajo || invalido ? 'border-rose-400' : ''}`}
          value={valor}
          onChange={(e) => {
            setValor(e.target.value);
            setError('');
          }}
          aria-label={`Cupo de ${barco.nombre}`}
        />
        {pordebajo && (
          <span className="mt-1 block text-xs text-rose-600">
            No puede ser menor que {maxOcupadas}: hay un zarpe con esa ocupación.
          </span>
        )}
      </label>
      <button type="submit" className="btn-primario" disabled={invalido || pordebajo || sinCambios}>
        Guardar
      </button>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-3">{error}</p>}
    </form>
  );
}

export default function CuposBarcos({ version, onGuardado }) {
  const barcos = getBarcos();
  return (
    <div className="tarjeta mt-4">
      <h2 className="font-bold text-slate-900">Cupos de los barcos</h2>
      <p className="text-sm text-slate-500">
        El cupo se aplica al barco y a todos sus zarpes. No se puede bajar por debajo de la ocupación de ninguno de sus
        zarpes (cuentan solo las reservas confirmadas).
      </p>
      <div className="mt-2">
        {barcos.map((b) => (
          <FilaBarco key={`${b.id}-${version}`} barco={b} version={version} onGuardado={onGuardado} />
        ))}
      </div>
    </div>
  );
}
