import { useState } from 'react';
import { HORARIOS } from '../data/semilla';
import { crearZarpe, getActividades, getBarcos } from '../lib/storage';
import { formatearDuracion, hoyISO } from '../lib/formato';

// Barco sugerido para cada actividad según el horario del briefing (se puede cambiar).
const barcoSugerido = (actividadId) => HORARIOS.find((h) => h.actividadId === actividadId)?.barcos[0] ?? '';

export default function FormNuevoZarpe({ onCreado }) {
  const actividades = getActividades();
  const barcos = getBarcos();
  const inicial = actividades[0]?.id ?? '';
  const [form, setForm] = useState({ actividadId: inicial, fecha: '', hora: '', barcoId: barcoSugerido(inicial) });
  const [error, setError] = useState('');

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor, ...(campo === 'actividadId' ? { barcoId: barcoSugerido(valor) } : {}) }));
    setError('');
  }

  function enviar(e) {
    e.preventDefault();
    try {
      const z = crearZarpe(form);
      setForm((f) => ({ ...f, hora: '' }));
      onCreado(z);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={enviar} className="tarjeta mt-4 p-4" noValidate>
      <h2 className="font-bold text-slate-900">Nuevo zarpe</h2>
      <p className="text-sm text-slate-500">Arranca con todos los lugares del barco libres.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.8fr_1fr_auto] lg:items-end">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Actividad</span>
          <select className="campo" value={form.actividadId} onChange={(e) => set('actividadId', e.target.value)}>
            {actividades.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre} ({formatearDuracion(a.duracionMin)})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Fecha</span>
          <input type="date" className="campo" min={hoyISO()} value={form.fecha} onChange={(e) => set('fecha', e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Hora</span>
          <input type="time" className="campo" step={300} value={form.hora} onChange={(e) => set('hora', e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Barco</span>
          <select className="campo" value={form.barcoId} onChange={(e) => set('barcoId', e.target.value)}>
            <option value="">Elegí un barco</option>
            {barcos.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre} ({b.capacidad} lugares)
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn-primario">Crear zarpe</button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    </form>
  );
}
