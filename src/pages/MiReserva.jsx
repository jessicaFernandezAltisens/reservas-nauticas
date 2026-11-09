import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  HORAS_CANCELACION,
  NEGOCIO,
  alternativasPara,
  buscarReserva,
  cancelarReserva,
  fechaHoraZarpe,
  getActividad,
  getBarco,
  getZarpe,
  lugaresReserva,
  moverReserva,
  msHastaZarpe,
  plazasOcupadas,
  puedeCancelar as sePuedeCancelar,
  zarpeCerrado,
} from '../lib/storage';
import { fechaISO } from '../data/semilla';
import { formatearFecha } from '../lib/formato';
import { linkWhatsApp } from '../lib/whatsapp';
import DetalleReserva from '../components/DetalleReserva.jsx';
import { confirmar } from '../components/Dialogo.jsx';

export function AvisoClima({ reserva, onMovida }) {
  const original = getZarpe(reserva.zarpeOriginalId ?? reserva.zarpeId);
  const actividad = original && getActividad(original.actividadId);
  const alternativas = alternativasPara(reserva);
  const lugares = lugaresReserva(reserva);
  const [error, setError] = useState('');

  async function elegir(z) {
    const cuando = `${formatearFecha(z.fecha, { year: undefined }).toLowerCase()} a las ${z.hora}`;
    if (!await confirmar(`¿Pasar tu reserva al ${cuando}?`)) return;
    try {
      onMovida(moverReserva(reserva.codigo, z.id), cuando);
    } catch (err) {
      setError(err.message);
    }
  }

  const textoWhatsApp =
    `Hola, soy ${reserva.nombre}. Mi reserva ${reserva.codigo} (${actividad?.nombre ?? ''}` +
    `${original ? `, ${original.fecha} ${original.hora}` : ''}) quedó a reprogramar por el clima y no encuentro otro zarpe para ${lugares} personas.`;

  return (
    <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-lg font-bold text-amber-900">⛈️ Tu zarpe se suspendió por el clima</p>
      <p className="mt-1 text-sm text-amber-900">
        La salida de <strong>{actividad?.nombre}</strong>
        {original && (
          <>
            {' '}del <span>{formatearFecha(original.fecha, { year: undefined }).toLowerCase()}</span> a las{' '}
            {original.hora}
          </>
        )}{' '}
        no se va a hacer. Tu reserva no se pierde
        {alternativas.length > 0
          ? `: elegí otro zarpe donde entre todo tu grupo (${lugares} ${lugares === 1 ? 'lugar' : 'lugares'}). El precio no cambia.`
          : '.'}
      </p>

      {alternativas.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {alternativas.map((z) => {
            const b = getBarco(z.barcoId);
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => elegir(z)}
                className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3 text-left hover:border-sky-400 hover:ring-2 hover:ring-sky-100"
              >
                <span>
                  <span className="block text-sm font-semibold text-slate-900">
                    {formatearFecha(z.fecha, { year: undefined, month: 'short' })}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {z.hora} · {b?.nombre}
                  </span>
                </span>
                <span className="text-xs font-semibold text-emerald-600">{z.libres} libres</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-white p-4 text-sm text-slate-700">
          <p>
            Por ahora no hay otro zarpe de esta actividad con lugar para todo tu grupo. Tu reserva queda pendiente y
            te vamos a escribir por WhatsApp al <strong>{reserva.telefono}</strong> para resolverlo.
          </p>
          <a
            href={linkWhatsApp(NEGOCIO.whatsapp, textoWhatsApp)}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
          >
            💬 Escribinos por WhatsApp
          </a>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-rose-700">{error}</p>}
    </div>
  );
}

/** "2 días y 5 h", "3 h 20 min", "45 min" */
function textoFalta(ms) {
  if (ms <= 0) return 'El zarpe ya salió';
  const min = Math.floor(ms / 60000);
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d) return `Faltan ${d} ${d === 1 ? 'día' : 'días'}${h ? ` y ${h} h` : ''} para el zarpe`;
  if (h) return `Faltan ${h} h${m ? ` ${m} min` : ''} para el zarpe`;
  return `Faltan ${m} min para el zarpe`;
}

export default function MiReserva() {
  const [params] = useSearchParams();
  const [codigo, setCodigo] = useState((params.get('codigo') ?? '').toUpperCase());
  const [celular, setCelular] = useState('');
  const [buscada, setBuscada] = useState(null); // { codigo, celular } de la última búsqueda con resultado
  const [reserva, setReserva] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [ahora, setAhora] = useState(() => Date.now());

  // El reloj avanza: si se cruza el límite de 24 h con la pantalla abierta, el botón desaparece solo.
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Si otra pestaña (p. ej. /admin) cambia la reserva, se refleja sin recargar.
  useEffect(() => {
    if (!buscada) return undefined;
    const releer = () => setReserva(buscarReserva(buscada.codigo, buscada.celular));
    window.addEventListener('storage', releer);
    return () => window.removeEventListener('storage', releer);
  }, [buscada]);

  function buscar(e) {
    e.preventDefault();
    setAviso('');
    const r = buscarReserva(codigo, celular);
    if (!r) {
      setReserva(null);
      setBuscada(null);
      setError('No hay ninguna reserva con ese código y ese celular. Revisá que estén escritos exactamente igual que al reservar.');
      return;
    }
    setError('');
    setBuscada({ codigo, celular });
    setReserva(r);
    setAhora(Date.now());
  }

  async function cancelar() {
    if (!await confirmar('¿Seguro que querés cancelar esta reserva? Los lugares se liberan en el momento.')) return;
    try {
      const { reserva: actualizada, lugaresLiberados } = cancelarReserva(buscada.codigo, buscada.celular);
      setReserva(actualizada);
      setError('');
      setAviso(
        lugaresLiberados
          ? `Reserva cancelada. Se ${lugaresLiberados === 1 ? 'liberó 1 lugar' : `liberaron ${lugaresLiberados} lugares`} en el zarpe.`
          : 'Reserva cancelada.'
      );
    } catch (err) {
      // La comprobación se hace de nuevo al cancelar: si ya no se puede, se muestra el bloqueo actualizado.
      setReserva(buscarReserva(buscada.codigo, buscada.celular));
      setAhora(Date.now());
      setError(err.message);
    }
  }

  function alMover(nueva, cuando) {
    setReserva(nueva ?? buscarReserva(buscada.codigo, buscada.celular));
    setAviso(`Listo: tu reserva pasó al ${cuando}. Sigue confirmada.`);
  }

  const zarpe = reserva && getZarpe(reserva.zarpeId);
  const actividad = zarpe && getActividad(zarpe.actividadId);
  const ms = msHastaZarpe(reserva, ahora);
  const puedeCancelar = sePuedeCancelar(reserva, ahora);
  const bloqueada = reserva && reserva.estado !== 'cancelada' && !puedeCancelar && ms > 0;
  const libresAhora = zarpe && !zarpeCerrado(zarpe) ? Math.max(0, zarpe.cupo - plazasOcupadas(zarpe.id)) : null;
  const limite = zarpe && new Date(fechaHoraZarpe(zarpe).getTime() - HORAS_CANCELACION * 3600 * 1000);

  const textoWhatsApp = reserva
    ? `Hola, soy ${reserva.nombre}. Tengo la reserva ${reserva.codigo} (${actividad?.nombre ?? ''}` +
      `${zarpe ? `, ${formatearFecha(zarpe.fecha, { year: undefined }).toLowerCase()} a las ${zarpe.hora}` : ''}).` +
      ` Faltan ${HORAS_CANCELACION} h o menos para el zarpe y quiero avisarles: `
    : '';

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-12">
      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Mi reserva</h1>
      <p className="mt-1 text-slate-500">Ingresá el código y el celular exactamente como al reservar.</p>
      <p className="mt-1 text-xs text-slate-400">
        Demo: <span className="font-mono">MA-DEMO10</span> · 099433677 (cancelable) ·{' '}
        <span className="font-mono">MA-DEMO03</span> · 097174306 (a reprogramar por clima)
      </p>

      <form onSubmit={buscar} className="tarjeta mt-6 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Código</span>
          <input
            className="campo font-mono"
            placeholder="MA-XXXXXX"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.toUpperCase())}
            autoCapitalize="characters"
            spellCheck={false}
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Celular</span>
          <input
            type="tel"
            inputMode="numeric"
            className="campo"
            placeholder="099 123 456"
            value={celular}
            onChange={(e) => setCelular(e.target.value)}
            required
          />
        </label>
        <button type="submit" className="btn-primario">Buscar</button>
      </form>

      {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {reserva && (
        <div className="tarjeta mt-6">
          {aviso && <p role="status" className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{aviso}</p>}
          {reserva.estado === 'reprogramar' && <AvisoClima reserva={reserva} onMovida={alMover} />}

          {reserva.estado !== 'cancelada' && (
            <p className={`mb-3 text-sm font-medium ${puedeCancelar ? 'text-slate-500' : 'text-amber-700'}`}>⏱️ {textoFalta(ms)}</p>
          )}

          <DetalleReserva reserva={reserva} />

          {reserva.estado === 'cancelada' && libresAhora !== null && ms > 0 && (
            <p className="mt-4 text-sm text-slate-500">
              Ahora el zarpe tiene {libresAhora} {libresAhora === 1 ? 'lugar libre' : 'lugares libres'}.
            </p>
          )}

          <div className="mt-6 space-y-3">
            {puedeCancelar && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={cancelar}
                  className="inline-flex items-center justify-center rounded-lg bg-rose-600 px-5 py-2.5 font-semibold text-white hover:bg-rose-700"
                >
                  Cancelar reserva
                </button>
                <span className="text-sm text-slate-500">
                  Podés cancelar desde la app hasta el {formatearFecha(fechaISO(limite), { year: undefined }).toLowerCase()} a las{' '}
                  {String(limite.getHours()).padStart(2, '0')}:{String(limite.getMinutes()).padStart(2, '0')}.
                </span>
              </div>
            )}

            {bloqueada && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p>
                  <strong>Faltan {HORAS_CANCELACION} horas o menos para el zarpe</strong>, así que ya no se puede cancelar
                  desde la app. Si no vas a poder ir, avisanos por WhatsApp.
                </p>
                <a
                  href={linkWhatsApp(NEGOCIO.whatsapp, textoWhatsApp)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800"
                >
                  💬 Avisar por WhatsApp
                </a>
              </div>
            )}

            <Link to="/reservar" className="btn-secundario">Nueva reserva</Link>
          </div>
        </div>
      )}
    </div>
  );
}
