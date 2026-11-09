import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ESTADOS,
  actualizarEstado,
  eliminarReserva,
  entrarAdmin,
  esAdmin,
  exportarDatos,
  getActividad,
  getActividades,
  getBarco,
  getReservas,
  getZarpe,
  getZarpes,
  importarDatos,
  alternativasPara,
  borrarZarpe,
  lugaresReserva,
  moverReserva,
  plazasOcupadas,
  programarZarpes,
  reprogramarPorClima,
  salirAdmin,
  vaciarReservas,
  zarpeCerrado,
  zarpeEsFuturo,
} from '../lib/storage';
import { linkWhatsApp } from '../lib/whatsapp';
import { formatearFecha, formatearFechaHora, formatearPesos } from '../lib/formato';
import EstadoBadge from '../components/EstadoBadge.jsx';
import VistaDiaria from '../components/VistaDiaria.jsx';
import { avisar as avisarError, confirmar } from '../components/Dialogo.jsx';
import FormNuevoZarpe from '../components/FormNuevoZarpe.jsx';
import CuposBarcos from '../components/CuposBarcos.jsx';
import Ajustes from '../components/Ajustes.jsx';
import { resumenPersonas } from '../components/DetalleReserva.jsx';

function Login({ onOk }) {
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');

  function entrar(e) {
    e.preventDefault();
    if (entrarAdmin(clave)) onOk();
    else setError('Clave incorrecta.');
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <form onSubmit={entrar} className="tarjeta">
        <h1 className="text-xl font-bold text-slate-900">Panel de administración</h1>
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Clave</span>
          <input
            type="password"
            className="campo"
            value={clave}
            onChange={(e) => { setClave(e.target.value); setError(''); }}
            autoComplete="current-password"
            autoFocus
          />
        </label>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <button type="submit" className="btn-primario mt-4 w-full">Entrar</button>
      </form>
    </div>
  );
}

function Stat({ label, valor, color = 'text-slate-900' }) {
  return (
    <div className="tarjeta p-3.5 sm:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums sm:text-2xl ${color}`}>{valor}</p>
    </div>
  );
}

function BarraOcupacion({ ocupadas, cupo }) {
  const pct = cupo ? Math.min(100, Math.round((ocupadas / cupo) * 100)) : 0;
  const color = pct >= 100 ? 'bg-rose-500' : pct >= 75 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600">{ocupadas}/{cupo}</span>
    </div>
  );
}

function descripcionZarpe(z) {
  if (!z) return '—';
  const a = getActividad(z.actividadId);
  return `${formatearFecha(z.fecha, { weekday: 'short', year: undefined, month: 'short' })} ${z.hora} · ${a?.nombre ?? z.actividadId}`;
}

export default function Admin() {
  const [autenticado, setAutenticado] = useState(esAdmin());
  const [pestana, setPestana] = useState('dia');
  const [version, setVersion] = useState(0); // fuerza relectura tras cambios
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState('');
  const [actividadId, setActividadId] = useState('');
  const [zarpeId, setZarpeId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const inputImport = useRef(null);

  const recargar = () => setVersion((v) => v + 1);

  // Sincroniza si se modifican datos en otra pestaña.
  useEffect(() => {
    window.addEventListener('storage', recargar);
    return () => window.removeEventListener('storage', recargar);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reservas = useMemo(() => getReservas(), [version]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const zarpes = useMemo(() => getZarpes(), [version]);
  const actividades = getActividades();

  const filtradas = useMemo(() => {
    const q = texto.trim().toLowerCase();
    const zarpePorId = Object.fromEntries(zarpes.map((z) => [z.id, z]));
    return reservas
      .filter((r) => !estado || r.estado === estado)
      .filter((r) => !zarpeId || r.zarpeId === zarpeId)
      .filter((r) => !actividadId || zarpePorId[r.zarpeId]?.actividadId === actividadId)
      .filter((r) => !q || [r.codigo, r.nombre, r.telefono].some((v) => v?.toLowerCase().includes(q)))
      .sort((a, b) => {
        const za = zarpePorId[a.zarpeId];
        const zb = zarpePorId[b.zarpeId];
        return `${za?.fecha}T${za?.hora}`.localeCompare(`${zb?.fecha}T${zb?.hora}`);
      });
  }, [reservas, zarpes, texto, estado, actividadId, zarpeId]);

  const stats = useMemo(() => {
    const confirmadas = reservas.filter((r) => r.estado === 'confirmada');
    const activas = reservas.filter((r) => r.estado !== 'cancelada'); // confirmadas + a reprogramar
    const plazasTotales = zarpes.filter((z) => !zarpeCerrado(z)).reduce((s, z) => s + z.cupo, 0);
    const plazasVendidas = confirmadas.reduce((s, r) => s + lugaresReserva(r), 0);
    return {
      zarpes: zarpes.length,
      reservas: confirmadas.length,
      reprogramar: reservas.filter((r) => r.estado === 'reprogramar').length,
      lugares: plazasVendidas,
      ocupacion: plazasTotales ? Math.round((plazasVendidas / plazasTotales) * 100) : 0,
      ingresos: activas.reduce((s, r) => s + (r.precio || 0), 0),
    };
  }, [reservas, zarpes]);

  if (!autenticado) return <Login onOk={() => setAutenticado(true)} />;

  function avisar(texto) {
    setMensaje(texto);
    setTimeout(() => setMensaje(''), 3500);
  }

  async function cambiarEstado(codigo, nuevo) {
    try {
      actualizarEstado(codigo, nuevo);
      recargar();
    } catch (err) {
      avisarError(err.message);
    }
  }

  async function cerrarPorClima(z) {
    const n = reservas.filter((r) => r.zarpeId === z.id && r.estado === 'confirmada').length;
    const cuando = `${formatearFecha(z.fecha, { year: undefined }).toLowerCase()} ${z.hora}`;
    if (!await confirmar(`¿Reprogramar por clima el zarpe del ${cuando}? El zarpe quedará no disponible y ${n} reserva(s) activa(s) pasarán a «A reprogramar». No se puede deshacer.`)) return;
    try {
      const movidas = reprogramarPorClima(z.id);
      recargar();
      avisar(`Zarpe marcado como no disponible por clima. ${movidas} reserva(s) quedaron «A reprogramar».`);
    } catch (err) {
      avisarError(err.message);
    }
  }

  function zarpeCreado(z) {
    recargar();
    const a = getActividad(z.actividadId);
    avisar(`Zarpe creado: ${a?.nombre} · ${formatearFecha(z.fecha, { year: undefined }).toLowerCase()} ${z.hora} · ${getBarco(z.barcoId)?.nombre} (${z.cupo} lugares).`);
  }

  async function borrar(z) {
    const cuando = `${formatearFecha(z.fecha, { year: undefined }).toLowerCase()} ${z.hora}`;
    if (!await confirmar(`¿Borrar el zarpe del ${cuando}? No se puede deshacer.`)) return;
    try {
      const canceladas = borrarZarpe(z.id);
      if (zarpeId === z.id) setZarpeId('');
      recargar();
      avisar(`Zarpe borrado${canceladas ? ` (y ${canceladas} reserva(s) cancelada(s) de ese zarpe)` : ''}.`);
    } catch (err) {
      avisarError(err.message);
    }
  }

  async function mover(codigo, nuevoZarpeId) {
    if (!nuevoZarpeId) return;
    try {
      moverReserva(codigo, nuevoZarpeId);
      recargar();
      avisar(`Reserva ${codigo} reprogramada y confirmada.`);
    } catch (err) {
      avisarError(err.message);
    }
  }

  function verAReprogramar() {
    setEstado('reprogramar');
    setZarpeId('');
    setActividadId('');
    setTexto('');
    setPestana('reservas');
  }

  async function eliminar(codigo) {
    if (!await confirmar(`¿Eliminar definitivamente la reserva ${codigo}?`)) return;
    eliminarReserva(codigo);
    recargar();
  }

  function verReservasDeZarpe(id) {
    setZarpeId(id);
    setActividadId('');
    setEstado('');
    setTexto('');
    setPestana('reservas');
  }

  function exportar() {
    const blob = new Blob([JSON.stringify(exportarDatos(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marea-alta-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importar(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const lector = new FileReader();
    lector.onload = async () => {
      try {
        const datos = JSON.parse(lector.result);
        if (!await confirmar('Se reemplazarán todos los datos actuales por los del archivo. ¿Continuar?')) return;
        importarDatos(datos);
        recargar();
        avisar('Datos importados.');
      } catch (err) {
        avisarError(`No se pudo importar: ${err.message}`);
      } finally {
        e.target.value = '';
      }
    };
    lector.readAsText(archivo);
  }

  async function vaciar() {
    if (!await confirmar('Se borrarán TODAS las reservas (se conservan actividades, barcos y zarpes). ¿Continuar?')) return;
    try {
      vaciarReservas();
    } catch (err) {
      avisarError(err.message);
      return;
    }
    recargar();
    avisar('Reservas borradas.');
  }

  function restaurado() {
    setZarpeId('');
    setEstado('');
    setActividadId('');
    setTexto('');
    recargar();
  }

  async function programar() {
    let n;
    try {
      n = programarZarpes(7);
    } catch (err) {
      avisarError(err.message);
      return;
    }
    recargar();
    avisar(n ? `Se programaron ${n} zarpes nuevos según el horario.` : 'El horario de los próximos 7 días ya estaba completo.');
  }

  function cerrarSesion() {
    salirAdmin();
    setAutenticado(false);
  }

  const claseTab = (id) =>
    `shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
      pestana === id ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
    }`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Administración</h1>
          <p className="mt-1 text-slate-500">Zarpes y reservas guardados en este navegador.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportar} className="btn-secundario px-3.5 py-2 text-sm">Exportar JSON</button>
          <button type="button" onClick={() => inputImport.current?.click()} className="btn-secundario px-3.5 py-2 text-sm">Importar JSON</button>
          <input ref={inputImport} type="file" accept="application/json" className="hidden" onChange={importar} />
          <button type="button" onClick={programar} className="btn-secundario px-3.5 py-2 text-sm">Completar horario 7 días</button>
          <button type="button" onClick={vaciar} className="btn-secundario px-3.5 py-2 text-sm text-rose-700">Vaciar reservas</button>
          <button type="button" onClick={cerrarSesion} className="btn-secundario px-3.5 py-2 text-sm">Cerrar sesión</button>
        </div>
      </div>

      {mensaje && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{mensaje}</p>}

      {stats.reprogramar > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>
            ⛈️ <strong>{stats.reprogramar}</strong> {stats.reprogramar === 1 ? 'reserva espera' : 'reservas esperan'} reprogramación
            por clima. El titular puede elegir otro zarpe desde «Mi reserva»; si no hay lugar, resolvelo por WhatsApp.
          </p>
          <button type="button" onClick={verAReprogramar} className="min-h-11 rounded-xl bg-amber-700 px-3.5 py-1.5 font-semibold text-white hover:bg-amber-800">
            Ver reservas
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
        <Stat label="Zarpes" valor={stats.zarpes} />
        <Stat label="Confirmadas" valor={stats.reservas} />
        <Stat label="A reprogramar" valor={stats.reprogramar} color="text-amber-600" />
        <Stat label="Lugares vendidos" valor={stats.lugares} />
        <Stat label="Ocupación" valor={`${stats.ocupacion} %`} color="text-emerald-600" />
        <Stat label="Ingresos previstos" valor={formatearPesos(stats.ingresos)} color="text-sky-700" />
      </div>

      <div className="-mx-4 mt-6 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:mt-8 sm:gap-2 sm:px-0">
        <button type="button" className={claseTab('dia')} onClick={() => setPestana('dia')}>Vista diaria</button>
        <button type="button" className={claseTab('zarpes')} onClick={() => setPestana('zarpes')}>Zarpes</button>
        <button type="button" className={claseTab('reservas')} onClick={() => setPestana('reservas')}>Reservas</button>
        <button type="button" className={claseTab('barcos')} onClick={() => setPestana('barcos')}>Barcos</button>
        <button type="button" className={claseTab('ajustes')} onClick={() => setPestana('ajustes')}>Ajustes</button>
      </div>

      {pestana === 'dia' && <VistaDiaria zarpes={zarpes} reservas={reservas} onCerrarPorClima={cerrarPorClima} />}

      {pestana === 'ajustes' && <Ajustes onRestaurado={restaurado} />}

      {pestana === 'barcos' && (
        <CuposBarcos
          version={version}
          onGuardado={(b) => {
            recargar();
            avisar(`Cupo de ${b.nombre} actualizado a ${b.capacidad} lugares (en el barco y en todos sus zarpes).`);
          }}
        />
      )}

      {pestana === 'zarpes' && <FormNuevoZarpe onCreado={zarpeCreado} />}

      {pestana === 'zarpes' && (
        <div className="tarjeta mt-4 overflow-x-auto p-0">
          {zarpes.length === 0 ? (
            <p className="p-10 text-center text-slate-500">
              No hay zarpes cargados. Creá uno con el formulario de arriba, usá «Completar horario 7 días» o, en Ajustes,
              «Restaurar datos de ejemplo».
            </p>
          ) : (
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Actividad</th>
                  <th className="px-4 py-3">Barco</th>
                  <th className="px-4 py-3">Ocupación</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {zarpes.map((z) => {
                  const a = getActividad(z.actividadId);
                  const b = getBarco(z.barcoId);
                  const n = reservas.filter((r) => r.zarpeId === z.id).length;
                  const bloquean = reservas.filter((r) => r.zarpeId === z.id && r.estado !== 'cancelada').length;
                  const pasado = !zarpeEsFuturo(z);
                  const cerrado = zarpeCerrado(z);
                  return (
                    <tr
                      key={z.id}
                      className={`hover:bg-slate-50 ${cerrado ? 'bg-amber-50/60' : pasado ? 'bg-slate-50 text-slate-400' : ''}`}
                    >
                      <td className="px-4 py-3 ">{formatearFecha(z.fecha, { weekday: 'short', month: 'short' })}</td>
                      <td className="px-4 py-3 font-semibold">{z.hora}</td>
                      <td className="px-4 py-3">{a ? `${a.emoji} ${a.nombre}` : z.actividadId}</td>
                      <td className="px-4 py-3">{b ? `${b.emoji} ${b.nombre}` : z.barcoId}</td>
                      <td className="px-4 py-3">
                        {cerrado ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                            ⛈️ Cerrado por clima
                          </span>
                        ) : (
                          <BarraOcupacion ocupadas={plazasOcupadas(z.id, reservas)} cupo={z.cupo} />
                        )}
                        {pasado && <span className="block text-xs text-slate-400">Ya zarpó</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {!pasado && !cerrado && (
                            <button
                              type="button"
                              onClick={() => cerrarPorClima(z)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
                            >
                              Reprogramar por clima
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => verReservasDeZarpe(z.id)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
                          >
                            Ver {n}
                          </button>
                          <button
                            type="button"
                            onClick={() => borrar(z)}
                            disabled={bloquean > 0}
                            title={bloquean ? `Tiene ${bloquean} reserva(s) activa(s) o a reprogramar` : 'Borrar zarpe'}
                            className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {pestana === 'reservas' && (
        <>
          <div className="tarjeta mt-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <input className="campo" placeholder="Buscar código, nombre, celular…" value={texto} onChange={(e) => setTexto(e.target.value)} />
            <select className="campo" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select className="campo" value={actividadId} onChange={(e) => setActividadId(e.target.value)}>
              <option value="">Todas las actividades</option>
              {actividades.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
            </select>
            <div className="flex gap-2">
              <select className="campo" value={zarpeId} onChange={(e) => setZarpeId(e.target.value)}>
                <option value="">Todos los zarpes</option>
                {zarpes.map((z) => <option key={z.id} value={z.id}>{descripcionZarpe(z)}</option>)}
              </select>
              {(texto || estado || actividadId || zarpeId) && (
                <button
                  type="button"
                  className="rounded-lg px-3 text-sm text-slate-500 hover:bg-slate-100"
                  onClick={() => { setTexto(''); setEstado(''); setActividadId(''); setZarpeId(''); }}
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className="tarjeta mt-4 overflow-x-auto p-0">
            {filtradas.length === 0 ? (
              <p className="p-10 text-center text-slate-400">
                {reservas.length === 0
                  ? 'Todavía no hay reservas. Cuando alguien reserve desde «Reservar salida» aparecerá acá.'
                  : 'Ninguna reserva coincide con los filtros. Probá con «Limpiar».'}
              </p>
            ) : (
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Código</th>
                    <th className="px-4 py-3">Zarpe</th>
                    <th className="px-4 py-3">Barco</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Lugares</th>
                    <th className="px-4 py-3">Importe</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtradas.map((r) => {
                    const z = getZarpe(r.zarpeId);
                    const b = z && getBarco(z.barcoId);
                    const aReprogramar = r.estado === 'reprogramar';
                    const opciones = aReprogramar ? alternativasPara(r) : [];
                    const actividad = z && getActividad(z.actividadId);
                    const textoWa = `Hola ${r.nombre}, te escribimos de Marea Alta por tu reserva ${r.codigo}: la salida de ${actividad?.nombre ?? ''} del ${z?.fecha ?? ''} a las ${z?.hora ?? ''} se suspendió por el clima. ¿Coordinamos otra fecha?`;
                    return (
                      <tr key={r.codigo} className="align-top hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold">{r.codigo}</span>
                          <span className="block text-xs text-slate-400">{formatearFechaHora(r.creadaEn)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`${zarpeCerrado(z) ? 'line-through text-slate-400' : ''}`}>{descripcionZarpe(z)}</span>
                          {zarpeCerrado(z) && <span className="block text-xs font-semibold text-amber-700">Cerrado por clima</span>}
                          {r.zarpeOriginalId && r.zarpeOriginalId !== r.zarpeId && (
                            <span className="block text-xs text-slate-400">Reprogramada desde {descripcionZarpe(getZarpe(r.zarpeOriginalId))}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">{b ? `${b.emoji} ${b.nombre}` : '—'}</td>
                        <td className="px-4 py-3">
                          {r.nombre}
                          <span className="block text-xs text-slate-500">{r.telefono}</span>
                          {r.notas && <span className="mt-1 block max-w-[220px] text-xs italic text-slate-400">“{r.notas}”</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-semibold">{lugaresReserva(r)}</span>
                          <span className="block text-xs text-slate-500">{resumenPersonas(r, z && getActividad(z.actividadId))}</span>
                          {(r.extras?.equipo > 0 || r.extras?.carnada > 0) && (
                            <span className="block text-xs text-slate-400">
                              {r.extras.equipo ? `${r.extras.equipo} equipo` : ''}
                              {r.extras.equipo && r.extras.carnada ? ' · ' : ''}
                              {r.extras.carnada ? `${r.extras.carnada} carnada` : ''}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatearPesos(r.precio)}</td>
                        <td className="px-4 py-3"><EstadoBadge estado={r.estado} /></td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            {aReprogramar && (
                              <>
                                <select
                                  className="max-w-[200px] rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs"
                                  value=""
                                  onChange={(e) => mover(r.codigo, e.target.value)}
                                  aria-label={`Mover ${r.codigo} a otro zarpe`}
                                >
                                  <option value="">{opciones.length ? 'Mover a…' : 'Sin zarpes con lugar'}</option>
                                  {opciones.map((o) => (
                                    <option key={o.id} value={o.id}>
                                      {descripcionZarpe(o)} ({o.libres} libres)
                                    </option>
                                  ))}
                                </select>
                                <a
                                  href={linkWhatsApp(r.telefono, textoWa)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                                >
                                  WhatsApp
                                </a>
                              </>
                            )}
                            <select
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                              value={r.estado}
                              onChange={(e) => cambiarEstado(r.codigo, e.target.value)}
                              aria-label={`Estado de ${r.codigo}`}
                            >
                              {Object.entries(ESTADOS)
                                .filter(([k]) => k === r.estado || k === 'cancelada' || (k === 'confirmada' && r.estado === 'cancelada' && !zarpeCerrado(z)))
                                .map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => eliminar(r.codigo)}
                              className="rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-slate-400">
        Aviso: la clave de este panel está escrita en el código del navegador. No es autenticación real.
      </p>
    </div>
  );
}
