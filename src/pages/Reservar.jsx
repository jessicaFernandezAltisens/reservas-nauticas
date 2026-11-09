import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MENSAJE_BLOQUEADO,
  almacenamientoDisponible,
  calcularPrecio,
  celularValido,
  crearReserva,
  esPesca,
  getActividad,
  getActividades,
  getBarco,
  getExtras,
  zarpesDisponibles,
} from '../lib/storage';
import { formatearDuracion, formatearFecha, formatearPesos } from '../lib/formato';
import Contador from '../components/Contador.jsx';

// Orden del formulario:
// 1 actividad · 2 fecha · 3 zarpe (hora, barco, lugares libres) · 4 adultos, niños 2–10, menores de 2
// · 5 extras (solo pesca) · 6 nombre y celular del titular.

const VACIO = { fecha: '', zarpeId: '', adultos: 1, ninos: 0, bebes: 0, equipo: 0, carnada: 0 };

function Paso({ n, titulo, children, deshabilitado = false, ayuda }) {
  return (
    <section className={`tarjeta ${deshabilitado ? 'opacity-60' : ''}`}>
      <h2 className="flex items-center gap-2.5 font-bold text-slate-900">
        <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm text-white">
          {n}
        </span>
        <span className="sr-only">Paso {n}: </span>
        {titulo}
      </h2>
      {ayuda && <p className="mt-0.5 text-sm text-slate-500">{ayuda}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Reservar() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const actividades = getActividades();
  const catalogoExtras = getExtras();

  const [form, setForm] = useState(() => {
    const desdeUrl = params.get('actividad');
    return {
      actividadId: getActividad(desdeUrl) ? desdeUrl : actividades[0]?.id ?? '',
      ...VACIO,
      nombre: '',
      celular: '',
    };
  });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [version, setVersion] = useState(0); // fuerza releer la disponibilidad

  // Si otra pestaña cambia reservas o zarpes, se actualizan los lugares libres.
  useEffect(() => {
    const releer = () => setVersion((v) => v + 1);
    window.addEventListener('storage', releer);
    return () => window.removeEventListener('storage', releer);
  }, []);

  const actividad = getActividad(form.actividadId);
  const pesca = esPesca(actividad);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const zarpes = useMemo(() => zarpesDisponibles(form.actividadId), [form.actividadId, version]);

  // Fechas con zarpes programados para la actividad.
  const fechas = useMemo(() => {
    const m = new Map();
    for (const z of zarpes) {
      const f = m.get(z.fecha) ?? { fecha: z.fecha, libres: 0 };
      f.libres += z.libres;
      m.set(z.fecha, f);
    }
    return [...m.values()];
  }, [zarpes]);

  const todoCompleto = fechas.length > 0 && fechas.every((f) => f.libres === 0);
  const guardable = almacenamientoDisponible();
  const zarpesDelDia = zarpes.filter((z) => z.fecha === form.fecha);
  const zarpe = zarpesDelDia.find((z) => z.id === form.zarpeId) ?? null;
  const barco = zarpe && getBarco(zarpe.barcoId);

  // Adultos, niños y menores de 2 ocupan una plaza cada uno.
  const ninos = pesca ? 0 : form.ninos;
  const bebes = pesca ? 0 : form.bebes;
  const lugares = form.adultos + ninos + bebes;
  const libres = zarpe?.libres ?? 0;
  const excede = !!zarpe && lugares > libres;
  const extras = { equipo: form.equipo, carnada: form.carnada };
  const total = calcularPrecio(actividad, { adultos: form.adultos, ninos, extras }, catalogoExtras);

  function set(campo, valor) {
    setForm((f) => {
      const n = { ...f, [campo]: valor };
      if (campo === 'actividadId') Object.assign(n, VACIO);
      if (campo === 'fecha') n.zarpeId = '';
      if (n.equipo > n.adultos) n.equipo = n.adultos;
      return n;
    });
    setErrores((e) => ({ ...e, [campo]: undefined, lugares: undefined }));
    setErrorGeneral('');
  }

  function validar() {
    const e = {};
    if (!form.fecha) e.fecha = 'Elegí una fecha.';
    if (!zarpe) e.zarpeId = 'Elegí un zarpe.';
    if (form.adultos < 1) e.lugares = pesca ? 'Indicá al menos una persona.' : 'Tiene que viajar al menos un adulto.';
    else if (excede) e.lugares = `El grupo ocupa ${lugares} lugares y quedan ${libres}. Elegí otro zarpe o reducí el grupo.`;
    if (form.nombre.trim().length < 3) e.nombre = 'Escribí el nombre del titular.';
    if (!celularValido(form.celular)) e.celular = 'El celular tiene que tener 8 o 9 dígitos (ej.: 099 123 456).';
    return e;
  }

  function enviar(ev) {
    ev.preventDefault();
    const e = validar();
    if (Object.keys(e).length) {
      setErrores(e);
      return;
    }
    try {
      const reserva = crearReserva({
        zarpeId: zarpe.id,
        adultos: form.adultos,
        ninos,
        bebes,
        extras: pesca ? extras : {},
        nombre: form.nombre.trim(),
        telefono: form.celular,
      });
      navigate(`/confirmacion/${reserva.codigo}`);
    } catch (err) {
      // La comprobación final falló (p. ej. alguien reservó antes): se muestran los lugares actualizados.
      setVersion((v) => v + 1);
      setErrorGeneral(err.message);
    }
  }

  // Máximo de cada contador: lo que dejan libre los otros dos.
  const maxPara = (otros) => Math.max(0, libres - otros);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-12">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Reservar salida</h1>

      <form onSubmit={enviar} noValidate className="mt-5 grid gap-6 sm:mt-6 lg:grid-cols-3 lg:gap-8">
        <div className="space-y-4 sm:space-y-5 lg:col-span-2">
          {/* 1. Actividad */}
          <Paso n={1} titulo="Actividad">
            {actividades.length === 0 && (
              <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">Todavía no hay actividades cargadas.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {actividades.map((a) => (
                <button
                  type="button"
                  key={a.id}
                  onClick={() => set('actividadId', a.id)}
                  aria-pressed={form.actividadId === a.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    form.actividadId === a.id ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-3xl" aria-hidden="true">{a.emoji}</span>
                  <span>
                    <span className="block font-semibold text-slate-900">{a.nombre}</span>
                    <span className="block text-xs text-slate-500">
                      {formatearDuracion(a.duracionMin)}
                      {esPesca(a) && ` · desde ${a.edadMinima} años`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </Paso>

          {/* 2. Fecha */}
          <Paso n={2} titulo="Fecha">
            {fechas.length === 0 ? (
              <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                🗓️ Por ahora no hay zarpes programados para <strong>{actividad?.nombre ?? 'esta actividad'}</strong>.
                Probá con otra actividad o volvé a consultar más adelante.
              </p>
            ) : (
              <>
              {todoCompleto && (
                <p role="status" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  Todos los zarpes de <strong>{actividad?.nombre}</strong> están completos (o suspendidos). Probá con otra
                  actividad o volvé a consultar más adelante.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {fechas.map((f) => {
                  const activa = form.fecha === f.fecha;
                  const sinLugar = f.libres === 0;
                  return (
                    <button
                      type="button"
                      key={f.fecha}
                      disabled={sinLugar}
                      onClick={() => set('fecha', f.fecha)}
                      aria-pressed={activa}
                      className={`min-w-[84px] rounded-xl border px-3 py-2 text-center transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 ${
                        activa ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="block text-xs uppercase text-slate-500">
                        {formatearFecha(f.fecha, { weekday: 'short', day: undefined, month: undefined, year: undefined })}
                      </span>
                      <span className="block font-semibold text-slate-900">
                        {formatearFecha(f.fecha, { weekday: undefined, month: 'short', year: undefined })}
                      </span>
                      {sinLugar && <span className="block text-[11px] font-semibold text-rose-600">Sin lugar</span>}
                    </button>
                  );
                })}
              </div>
              </>
            )}
            {errores.fecha && <p className="mt-2 text-sm text-rose-600">{errores.fecha}</p>}
          </Paso>

          {/* 3. Zarpe */}
          <Paso n={3} titulo="Zarpe" deshabilitado={!form.fecha} ayuda={!form.fecha ? 'Elegí primero una fecha.' : undefined}>
            {form.fecha && (
              <div className="grid gap-3 sm:grid-cols-2">
                {zarpesDelDia.map((z) => {
                  const b = getBarco(z.barcoId);
                  const activo = form.zarpeId === z.id;
                  const completo = !z.cerrado && z.libres === 0;
                  return (
                    <button
                      type="button"
                      key={z.id}
                      disabled={z.cerrado || completo}
                      onClick={() => set('zarpeId', z.id)}
                      aria-pressed={activo}
                      className={`flex items-center justify-between rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 ${
                        activo ? 'border-sky-500 bg-sky-50 ring-2 ring-sky-200' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span>
                        <span className="block text-lg font-bold text-slate-900">{z.hora}</span>
                        <span className="block text-xs text-slate-500">{b ? `${b.emoji} ${b.nombre}` : z.barcoId}</span>
                      </span>
                      <span
                        className={`text-right text-xs font-semibold ${
                          z.cerrado ? 'text-slate-500' : completo ? 'text-rose-600' : z.libres <= 3 ? 'text-amber-600' : 'text-emerald-600'
                        }`}
                      >
                        {z.cerrado ? '⛈️ Suspendido por clima' : completo ? 'Completo' : `${z.libres} ${z.libres === 1 ? 'lugar libre' : 'lugares libres'}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {zarpesDelDia.some((z) => !z.cerrado && z.libres === 0) && (
              <p className="mt-3 text-sm text-slate-500">
                <span className="font-semibold text-rose-600">Completo</span>: ese horario ya no tiene lugares libres y no se
                puede elegir. Probá con otro horario u otra fecha.
              </p>
            )}
            {errores.zarpeId && <p className="mt-2 text-sm text-rose-600">{errores.zarpeId}</p>}
          </Paso>

          {/* 4. Personas: adultos, niños 2–10, menores de 2 */}
          <Paso
            n={4}
            titulo="Personas"
            deshabilitado={!zarpe}
            ayuda={zarpe ? `Quedan ${libres} lugares en este zarpe. Cada persona ocupa un lugar.` : 'Elegí primero un zarpe.'}
          >
            <fieldset disabled={!zarpe} className="space-y-3">
              <Contador
                label={pesca ? 'Personas' : 'Adultos'}
                ayuda={
                  pesca
                    ? `Solo desde ${actividad.edadMinima} años · ${formatearPesos(actividad.precioAdulto)} c/u`
                    : `Mayores de 10 años · ${formatearPesos(actividad?.precioAdulto)}`
                }
                valor={form.adultos}
                min={1}
                max={Math.max(1, maxPara(ninos + bebes))}
                onChange={(v) => set('adultos', v)}
              />
              {!pesca && (
                <>
                  <Contador
                    label="Niños de 2 a 10 años"
                    ayuda={formatearPesos(actividad?.precioNino)}
                    valor={form.ninos}
                    max={maxPara(form.adultos + form.bebes)}
                    onChange={(v) => set('ninos', v)}
                  />
                  <Contador
                    label="Menores de 2"
                    ayuda="No pagan, pero ocupan un lugar"
                    valor={form.bebes}
                    max={maxPara(form.adultos + form.ninos)}
                    onChange={(v) => set('bebes', v)}
                  />
                </>
              )}
            </fieldset>
            {zarpe && (
              <p className={`mt-3 text-sm ${excede ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
                {excede
                  ? `El grupo ocupa ${lugares} lugares y este zarpe tiene ${libres} libres. Reducí el grupo o elegí otro zarpe.`
                  : `El grupo ocupa ${lugares} de ${libres} lugares libres.`}
              </p>
            )}
            {errores.lugares && !excede && <p className="mt-1 text-sm text-rose-600">{errores.lugares}</p>}
          </Paso>

          {/* 5. Extras (solo pesca) */}
          {pesca && (
            <Paso n={5} titulo="Extras de pesca" deshabilitado={!zarpe}>
              <fieldset disabled={!zarpe} className="space-y-3">
                {catalogoExtras.map((e) => (
                  <Contador
                    key={e.id}
                    label={e.nombre}
                    ayuda={`${formatearPesos(e.precio)} por ${e.unidad}${e.maxPorPersona ? ' · máx. uno por persona' : ''}`}
                    valor={form[e.id]}
                    max={e.maxPorPersona ? form.adultos : 50}
                    onChange={(v) => set(e.id, v)}
                  />
                ))}
              </fieldset>
            </Paso>
          )}

          {/* 6. Titular */}
          <Paso n={pesca ? 6 : 5} titulo="Titular de la reserva">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Nombre</span>
                <input className="campo" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} autoComplete="name" />
                {errores.nombre && <span className="mt-1 block text-sm text-rose-600">{errores.nombre}</span>}
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Celular</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  className="campo"
                  placeholder="099 123 456"
                  value={form.celular}
                  onChange={(e) => set('celular', e.target.value)}
                  autoComplete="tel-national"
                />
                {errores.celular && <span className="mt-1 block text-sm text-rose-600">{errores.celular}</span>}
              </label>
            </div>
          </Paso>
        </div>

        {/* Resumen */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="tarjeta">
            <h2 className="font-bold text-slate-900">Resumen</h2>
            {actividad && (
              <p className="mt-3 font-semibold text-slate-900">
                {actividad.emoji} {actividad.nombre}
                <span className="block text-sm font-normal text-slate-500">{formatearDuracion(actividad.duracionMin)}</span>
              </p>
            )}
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Zarpe</dt>
                <dd className="text-right ">
                  {zarpe ? `${formatearFecha(zarpe.fecha, { year: undefined, month: 'short' })}, ${zarpe.hora}` : '—'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Barco</dt>
                <dd>{barco ? barco.nombre : '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">{pesca ? `${form.adultos} personas` : `${form.adultos} adultos`}</dt>
                <dd>{formatearPesos(form.adultos * (actividad?.precioAdulto ?? 0))}</dd>
              </div>
              {ninos > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">{ninos} niños</dt>
                  <dd>{formatearPesos(ninos * (actividad?.precioNino ?? 0))}</dd>
                </div>
              )}
              {bebes > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-500">{bebes} menores de 2</dt>
                  <dd>{formatearPesos(0)}</dd>
                </div>
              )}
              {pesca &&
                catalogoExtras.filter((e) => form[e.id] > 0).map((e) => (
                  <div key={e.id} className="flex justify-between">
                    <dt className="text-slate-500">{form[e.id]} × {e.nombre.toLowerCase()}</dt>
                    <dd>{formatearPesos(form[e.id] * e.precio)}</dd>
                  </div>
                ))}
              <div className="flex justify-between">
                <dt className="text-slate-500">Lugares</dt>
                <dd className={excede ? 'font-semibold text-rose-600' : ''}>
                  {lugares}{zarpe ? ` de ${libres}` : ''}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-sky-800">{formatearPesos(total)}</span>
            </div>
            {!guardable && (
              <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">⚠️ {MENSAJE_BLOQUEADO}</p>
            )}
            {errorGeneral && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{errorGeneral}</p>}
            <button type="submit" className="btn-primario mt-5 w-full" disabled={excede || !guardable}>
              Confirmar reserva
            </button>
            <p className="mt-3 text-center text-xs text-slate-400">
              Pago en el muelle. Se puede cancelar desde la app con más de 24 h de anticipación.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
}
