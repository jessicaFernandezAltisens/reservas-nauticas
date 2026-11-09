import { useState } from 'react';
import { confirmar } from './Dialogo.jsx';
import { MENSAJE_BLOQUEADO, almacenamientoDisponible, clavesDeLaApp, restaurarDatosEjemplo } from '../lib/storage';

export default function Ajustes({ onRestaurado }) {
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const disponible = almacenamientoDisponible();
  const claves = clavesDeLaApp();

  async function restaurar() {
    if (
      !await confirmar(
        'Se borrarán TODOS los datos de esta app en este navegador (barcos, zarpes, reservas y cambios) ' +
          'y se cargarán los datos de ejemplo. No se puede deshacer. ¿Continuar?'
      )
    )
      return;
    try {
      const r = restaurarDatosEjemplo();
      setResultado(r);
      setError('');
      onRestaurado(r);
    } catch (err) {
      setResultado(null);
      setError(err.message);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <section className="tarjeta">
        <h2 className="font-bold text-slate-900">Almacenamiento</h2>
        {disponible ? (
          <p className="mt-1 text-sm text-slate-600">
            ✅ localStorage disponible. Esta app usa {claves.length} {claves.length === 1 ? 'clave' : 'claves'}:{' '}
            {claves.map((k) => (
              <code key={k} className="mr-1 rounded bg-slate-100 px-1 text-xs">{k}</code>
            ))}
          </p>
        ) : (
          <p className="mt-1 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">⚠️ {MENSAJE_BLOQUEADO}</p>
        )}
      </section>

      <section className="tarjeta">
        <h2 className="font-bold text-slate-900">Restaurar datos de ejemplo</h2>
        <p className="mt-1 text-sm text-slate-600">
          Limpia las claves de esta app en el navegador y vuelve a cargar <strong>4 barcos</strong>,{' '}
          <strong>4 actividades</strong>, <strong>14 zarpes</strong> (próximos 7 días, desde mañana) y{' '}
          <strong>12 reservas</strong> con los precios del briefing. Se pierden las reservas, zarpes y cupos cambiados.
        </p>
        <button
          type="button"
          onClick={restaurar}
          disabled={!disponible}
          className="mt-4 inline-flex items-center justify-center rounded-lg bg-rose-600 px-5 py-2.5 font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Restaurar datos de ejemplo
        </button>
        {resultado && (
          <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
            Listo. Se {resultado.clavesBorradas.length === 1 ? 'borró 1 clave' : `borraron ${resultado.clavesBorradas.length} claves`} y se
            cargaron {resultado.barcos} barcos, {resultado.actividades} actividades, {resultado.zarpes} zarpes y {resultado.reservas} reservas.
          </p>
        )}
        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      </section>
    </div>
  );
}
