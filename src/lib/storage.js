// Capa de persistencia: TODO se guarda en localStorage del navegador.
// No hay backend: los datos solo existen en este navegador/dispositivo.
import { crearDatosSemilla, generarZarpes, idZarpe } from '../data/semilla.js';
import { desglosePrecio, esPesca, totalDesglose } from './precios.js';
import { ADMIN_CLAVE } from '../config/admin.js';
export { esPesca, desglosePrecio } from './precios.js';
export { NEGOCIO } from '../data/semilla.js';

const CLAVE = 'marea-alta:datos:v3';

export const ESTADOS = {
  confirmada: 'Confirmada',
  reprogramar: 'A reprogramar', // su zarpe se cerró por clima
  cancelada: 'Cancelada',
};

/** Horas mínimas antes del zarpe para cancelar desde la app. */
export const HORAS_CANCELACION = 24;

const VACIO = { version: 3, actividades: [], barcos: [], extras: [], zarpes: [], reservas: [] };

// ── Disponibilidad de localStorage ──────────────────────────────────────────
// Algunos navegadores lo bloquean (modo privado estricto, cookies/datos de sitios desactivados,
// iframes de terceros). En ese caso la app muestra los datos de ejemplo EN MEMORIA solo para mirar,
// avisa en pantalla y se niega a guardar: así nadie cree que tiene una reserva que no existe.

const PREFIJO = 'marea-alta:';

export const MENSAJE_BLOQUEADO =
  'Tu navegador está bloqueando el almacenamiento local (localStorage), así que esta app no puede guardar reservas ni cambios. ' +
  'Salí del modo privado o permití cookies y datos de sitios para esta página, y recargala.';
const MENSAJE_LLENO = 'El almacenamiento del navegador está lleno y no se pudo guardar. Liberá espacio o borrá datos de este sitio.';

let disponible = null; // null = sin comprobar
let memoria = null; // datos de ejemplo en memoria cuando localStorage no está disponible

/** true si localStorage permite leer y escribir. Se comprueba una vez escribiendo y borrando una clave de prueba. */
export function almacenamientoDisponible() {
  if (disponible !== null) return disponible;
  try {
    const k = `${PREFIJO}__prueba`;
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    disponible = true;
  } catch {
    disponible = false;
  }
  return disponible;
}

/** Error con mensaje para mostrar tal cual al usuario. */
export class ErrorAlmacenamiento extends Error {}

// ── Inicialización ───────────────────────────────────────────────────────────

/**
 * Carga los datos de demo SOLO si la clave no existe en localStorage.
 * Si ya existe (aunque tenga 0 reservas), no toca nada. Devuelve true si sembró.
 */
export function inicializarDatos() {
  if (!almacenamientoDisponible()) {
    memoria = crearDatosSemilla();
    return false;
  }
  try {
    if (localStorage.getItem(CLAVE) !== null) return false;
    guardar(crearDatosSemilla());
    return true;
  } catch {
    memoria = crearDatosSemilla();
    return false;
  }
}

/** Claves de localStorage que pertenecen a esta app (prefijo «marea-alta:», incluidas versiones viejas). */
export function clavesDeLaApp() {
  if (!almacenamientoDisponible()) return [];
  const claves = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIJO)) claves.push(k);
  }
  return claves;
}

/**
 * Ajustes → «Restaurar datos de ejemplo».
 * Borra TODAS las claves de esta app en localStorage y vuelve a cargar los datos de ejemplo:
 * 4 barcos, 4 actividades, 14 zarpes (próximos 7 días) y 12 reservas.
 * La sesión de /admin (sessionStorage) no se toca.
 */
export function restaurarDatosEjemplo() {
  if (!almacenamientoDisponible()) throw new ErrorAlmacenamiento(MENSAJE_BLOQUEADO);
  const borradas = clavesDeLaApp();
  for (const k of borradas) localStorage.removeItem(k);
  guardar(crearDatosSemilla());
  const d = leer();
  return {
    clavesBorradas: borradas,
    barcos: d.barcos.length,
    actividades: d.actividades.length,
    zarpes: d.zarpes.length,
    reservas: d.reservas.length,
  };
}

// ── Lectura / escritura base ────────────────────────────────────────────────

function leer() {
  if (!almacenamientoDisponible()) {
    memoria ??= crearDatosSemilla();
    return structuredClone(memoria); // copia: los intentos de modificar no tocan la memoria
  }
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE));
    return datos && typeof datos === 'object' ? { ...VACIO, ...datos } : { ...VACIO };
  } catch {
    return { ...VACIO };
  }
}

function guardar(datos) {
  if (!almacenamientoDisponible()) throw new ErrorAlmacenamiento(MENSAJE_BLOQUEADO);
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  } catch (err) {
    if (err?.name === 'QuotaExceededError' || err?.code === 22) throw new ErrorAlmacenamiento(MENSAJE_LLENO);
    disponible = false;
    throw new ErrorAlmacenamiento(MENSAJE_BLOQUEADO);
  }
}

function modificar(fn) {
  const datos = leer();
  const resultado = fn(datos);
  guardar(datos);
  return resultado;
}

// ── Catálogo ────────────────────────────────────────────────────────────────

export const getActividades = () => leer().actividades;
export const getBarcos = () => leer().barcos;
export const getExtras = () => leer().extras;
export const getActividad = (id) => getActividades().find((a) => a.id === id) ?? null;
export const getBarco = (id) => getBarcos().find((b) => b.id === id) ?? null;

// ── Lugares y precios ───────────────────────────────────────────────────────

/** Lugares que ocupa una reserva: adultos + niños + menores de 2. */
export const lugaresReserva = (r) => (r.adultos || 0) + (r.ninos || 0) + (r.bebes || 0);
const nLugares = (n) => `${n} ${n === 1 ? 'lugar' : 'lugares'}`;

/**
 * Total = adultos × tarifa adulto + niños × tarifa niño (+ equipo y carnada si es pesca).
 * Los menores de 2 no pagan. Tarifas y extras: los del briefing (src/data/semilla.js).
 */
export function calcularPrecio(actividad, pasajeros, catalogoExtras = getExtras()) {
  return totalDesglose(desglosePrecio(actividad, pasajeros, catalogoExtras));
}

// ── Zarpes ──────────────────────────────────────────────────────────────────

const ordenZarpe = (a, b) => `${a.fecha}T${a.hora}`.localeCompare(`${b.fecha}T${b.hora}`);

export const getZarpes = () => [...leer().zarpes].sort(ordenZarpe);
export const getZarpe = (id) => leer().zarpes.find((z) => z.id === id) ?? null;

export const fechaHoraZarpe = (z) => new Date(`${z.fecha}T${z.hora}:00`);
export const zarpeEsFuturo = (z) => fechaHoraZarpe(z) > new Date();
export const zarpeCerrado = (z) => z?.estado === 'cerrado_clima';

/**
 * Plazas ocupadas de un zarpe = pasajeros (adultos + niños + menores de 2) de sus reservas ACTIVAS.
 * Activa = confirmada. Las canceladas y las «A reprogramar» no ocupan plaza.
 */
export function plazasOcupadas(zarpeId, reservas = leer().reservas, excluirCodigo = null) {
  return reservas
    .filter((r) => r.zarpeId === zarpeId && r.estado === 'confirmada' && r.codigo !== excluirCodigo)
    .reduce((s, r) => s + lugaresReserva(r), 0);
}

/**
 * Zarpes futuros (opcionalmente de una actividad) con sus lugares libres.
 * Los cerrados por clima se devuelven con libres = 0 y cerrado = true.
 */
export function zarpesDisponibles(actividadId = null) {
  const datos = leer();
  return datos.zarpes
    .filter((z) => (!actividadId || z.actividadId === actividadId) && zarpeEsFuturo(z))
    .sort(ordenZarpe)
    .map((z) => {
      const cerrado = zarpeCerrado(z);
      return { ...z, cerrado, libres: cerrado ? 0 : Math.max(0, z.cupo - plazasOcupadas(z.id, datos.reservas)) };
    });
}

// ── Clima ───────────────────────────────────────────────────────────────────

/**
 * Cierra un zarpe por clima y pasa sus reservas confirmadas a «A reprogramar».
 * Devuelve cuántas reservas quedaron a reprogramar.
 */
export function reprogramarPorClima(zarpeId) {
  return modificar((datos) => {
    const z = datos.zarpes.find((x) => x.id === zarpeId);
    if (!z) throw new Error('El zarpe no existe.');
    if (zarpeCerrado(z)) throw new Error('Ese zarpe ya está cerrado.');
    if (!zarpeEsFuturo(z)) throw new Error('No se puede cerrar un zarpe que ya salió.');
    const ahora = new Date().toISOString();
    z.estado = 'cerrado_clima';
    z.cerradoEn = ahora;
    let n = 0;
    for (const r of datos.reservas) {
      if (r.zarpeId === zarpeId && r.estado === 'confirmada') {
        r.estado = 'reprogramar';
        r.zarpeOriginalId = zarpeId;
        r.actualizadaEn = ahora;
        n++;
      }
    }
    return n;
  });
}

/** Zarpes abiertos y futuros de la misma actividad donde entra el grupo completo. */
export function alternativasPara(reserva) {
  const zarpe = reserva && getZarpe(reserva.zarpeId);
  if (!zarpe) return [];
  const lugares = lugaresReserva(reserva);
  return zarpesDisponibles(zarpe.actividadId).filter((z) => z.id !== zarpe.id && !z.cerrado && z.libres >= lugares);
}

/** Pasa una reserva a otro zarpe de la misma actividad (titular o admin). Queda confirmada. */
export function moverReserva(codigo, nuevoZarpeId) {
  return modificar((datos) => {
    const r = datos.reservas.find((x) => x.codigo === codigo);
    if (!r) throw new Error('La reserva no existe.');
    if (r.estado === 'cancelada') throw new Error('La reserva está cancelada.');
    const actual = datos.zarpes.find((z) => z.id === r.zarpeId);
    const nuevo = datos.zarpes.find((z) => z.id === nuevoZarpeId);
    if (!nuevo || nuevo.id === r.zarpeId) throw new Error('Elegí otro zarpe.');
    if (actual && nuevo.actividadId !== actual.actividadId) throw new Error('El nuevo zarpe tiene que ser de la misma actividad.');
    if (zarpeCerrado(nuevo) || !zarpeEsFuturo(nuevo)) throw new Error('Ese zarpe no está disponible.');
    const libres = nuevo.cupo - plazasOcupadas(nuevo.id, datos.reservas);
    if (lugaresReserva(r) > libres) throw new Error(`El grupo (${lugaresReserva(r)}) no entra: quedan ${nLugares(Math.max(0, libres))}.`);
    r.zarpeOriginalId ??= r.zarpeId;
    r.zarpeId = nuevo.id;
    r.estado = 'confirmada';
    r.reprogramadaEn = new Date().toISOString();
    r.actualizadaEn = r.reprogramadaEn;
    return { ...r };
  });
}

/**
 * Añade los zarpes del horario para los próximos `dias` días que aún no existan.
 * Los existentes (y los pasados) no se tocan: cada fecha tiene su propio zarpe.
 */
export function programarZarpes(dias = 7) {
  return modificar((datos) => {
    const existentes = new Set(datos.zarpes.map((z) => z.id));
    const capacidad = Object.fromEntries(datos.barcos.map((b) => [b.id, b.capacidad]));
    const nuevos = [];
    for (const z of generarZarpes(0, dias)) {
      if (existentes.has(z.id) || !zarpeEsFuturo(z)) continue;
      if (conflictoBarco(datos, z)) continue; // el barco ya tiene otro zarpe a esa hora
      nuevos.push({ ...z, cupo: capacidad[z.barcoId] ?? z.cupo }); // cupo actual del barco (puede haberse editado)
      datos.zarpes.push(nuevos.at(-1));
    }
    return nuevos.length;
  });
}

// ── Alta / baja de zarpes y cupos de barcos (/admin) ────────────────────────

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const aMin = (hora) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5));

/** Otro zarpe del mismo barco, el mismo día, cuyo horario se superpone (según la duración de cada actividad). */
function conflictoBarco(datos, z, excluirId = null) {
  const dur = (id) => datos.actividades.find((a) => a.id === id)?.duracionMin ?? 0;
  const ini = aMin(z.hora);
  const fin = ini + dur(z.actividadId);
  return (
    datos.zarpes.find(
      (o) =>
        o.id !== excluirId &&
        o.barcoId === z.barcoId &&
        o.fecha === z.fecha &&
        aMin(o.hora) < fin &&
        ini < aMin(o.hora) + dur(o.actividadId)
    ) ?? null
  );
}

/** Lugares ocupados por zarpe de un barco: [{ zarpe, ocupadas }]. */
export function ocupacionPorBarco(barcoId) {
  const datos = leer();
  return datos.zarpes
    .filter((z) => z.barcoId === barcoId)
    .sort(ordenZarpe)
    .map((z) => ({ zarpe: z, ocupadas: plazasOcupadas(z.id, datos.reservas) }));
}

/**
 * Crea un zarpe manual. Arranca con todos los lugares del barco libres.
 * Valida: actividad y barco existentes, fecha/hora válidas y futuras, sin duplicado y sin superposición del barco.
 */
export function crearZarpe({ actividadId, fecha, hora, barcoId }) {
  return modificar((datos) => {
    const actividad = datos.actividades.find((a) => a.id === actividadId);
    const barco = datos.barcos.find((b) => b.id === barcoId);
    if (!actividad) throw new Error('Elegí una actividad.');
    if (!barco) throw new Error('Elegí un barco.');
    if (!FECHA_RE.test(fecha || '')) throw new Error('Elegí una fecha.');
    if (!HORA_RE.test(hora || '')) throw new Error('Indicá la hora en formato HH:MM.');
    const z = { id: idZarpe(fecha, hora, actividadId), actividadId, barcoId, fecha, hora, cupo: barco.capacidad, estado: 'abierto', creadoEnAdmin: true };
    if (!zarpeEsFuturo(z)) throw new Error('La fecha y hora tienen que ser futuras.');
    if (datos.zarpes.some((o) => o.id === z.id)) throw new Error('Ya existe un zarpe de esa actividad en esa fecha y hora.');
    const choque = conflictoBarco(datos, z);
    if (choque) {
      const a = datos.actividades.find((x) => x.id === choque.actividadId);
      throw new Error(`${barco.nombre} ya tiene un zarpe que se superpone: ${a?.nombre ?? choque.actividadId} a las ${choque.hora}.`);
    }
    datos.zarpes.push(z);
    return { ...z };
  });
}

/** Reservas que impiden borrar un zarpe: las confirmadas y las «A reprogramar». */
export function reservasQueBloqueanBorrado(zarpeId) {
  return getReservas().filter((r) => r.zarpeId === zarpeId && r.estado !== 'cancelada');
}

/**
 * Borra un zarpe. No se puede si tiene reservas confirmadas o «A reprogramar».
 * Las reservas canceladas de ese zarpe se borran con él. Devuelve cuántas canceladas se eliminaron.
 */
export function borrarZarpe(zarpeId) {
  return modificar((datos) => {
    if (!datos.zarpes.some((z) => z.id === zarpeId)) throw new Error('El zarpe no existe.');
    const bloquean = datos.reservas.filter((r) => r.zarpeId === zarpeId && r.estado !== 'cancelada');
    if (bloquean.length) {
      throw new Error(
        `No se puede borrar: tiene ${bloquean.length} reserva(s) activa(s) o a reprogramar (${bloquean.map((r) => r.codigo).join(', ')}). Cancelalas o movelas antes.`
      );
    }
    const antes = datos.reservas.length;
    datos.reservas = datos.reservas.filter((r) => r.zarpeId !== zarpeId);
    datos.zarpes = datos.zarpes.filter((z) => z.id !== zarpeId);
    return antes - datos.reservas.length;
  });
}

/**
 * Cambia el cupo (lugares) de un barco y de todos sus zarpes.
 * Se impide reducirlo si la ocupación de CUALQUIER zarpe de ese barco supera el nuevo valor.
 */
export function actualizarCupoBarco(barcoId, nuevoCupo) {
  return modificar((datos) => {
    const barco = datos.barcos.find((b) => b.id === barcoId);
    if (!barco) throw new Error('El barco no existe.');
    const cupo = Number(nuevoCupo);
    if (!Number.isInteger(cupo) || cupo < 1 || cupo > 500) throw new Error('El cupo tiene que ser un número entero entre 1 y 500.');
    const excedidos = datos.zarpes
      .filter((z) => z.barcoId === barcoId)
      .map((z) => ({ z, ocupadas: plazasOcupadas(z.id, datos.reservas) }))
      .filter(({ ocupadas }) => ocupadas > cupo)
      .sort((a, b) => b.ocupadas - a.ocupadas);
    if (excedidos.length) {
      const max = excedidos[0].ocupadas;
      const lista = excedidos.slice(0, 3).map(({ z, ocupadas }) => `${z.fecha} ${z.hora} (${ocupadas})`).join(', ');
      throw new Error(
        `No se puede bajar a ${cupo}: ${excedidos.length === 1 ? 'un zarpe tiene' : `${excedidos.length} zarpes tienen`} más ocupación. ` +
          `Mínimo posible: ${max}. ${lista}${excedidos.length > 3 ? '…' : ''}`
      );
    }
    barco.capacidad = cupo;
    for (const z of datos.zarpes) if (z.barcoId === barcoId) z.cupo = cupo;
    return { ...barco };
  });
}

// ── Reservas ────────────────────────────────────────────────────────────────

export const getReservas = () => leer().reservas;

/** Celular: solo dígitos (se ignoran espacios y guiones). Válido con 8 o 9 dígitos. */
export const normalizarCelular = (c) => String(c ?? '').replace(/[\s-]/g, '');
export const celularValido = (c) => /^\d{8,9}$/.test(normalizarCelular(c));

function generarCodigo(existentes) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I
  let codigo;
  do {
    codigo = 'MA-';
    for (let i = 0; i < 6; i++) codigo += chars[Math.floor(Math.random() * chars.length)];
  } while (existentes.some((r) => r.codigo === codigo));
  return codigo;
}

/**
 * Guarda una reserva. Relee localStorage en el momento de guardar y vuelve a comprobar
 * que el zarpe exista, no haya salido, no esté cerrado y que el grupo entre en los lugares libres
 * (por si otra pestaña reservó mientras se completaba el formulario).
 */
export function crearReserva({ zarpeId, adultos, ninos = 0, bebes = 0, extras = {}, nombre, telefono }) {
  return modificar((datos) => {
    if (!nombre || nombre.trim().length < 3) throw new Error('Falta el nombre del titular.');
    if (!celularValido(telefono)) throw new Error('El celular tiene que tener 8 o 9 dígitos.');
    const zarpe = datos.zarpes.find((z) => z.id === zarpeId);
    if (!zarpe) throw new Error('El zarpe seleccionado no existe.');
    if (!zarpeEsFuturo(zarpe)) throw new Error('Ese zarpe ya salió.');
    if (zarpeCerrado(zarpe)) throw new Error('Ese zarpe se suspendió por el clima.');
    const actividad = datos.actividades.find((a) => a.id === zarpe.actividadId);

    // En pesca solo hay una cantidad (10+ años): sin niños ni menores de 2.
    const pesca = esPesca(actividad);
    const r = {
      adultos,
      ninos: pesca ? 0 : ninos,
      bebes: pesca ? 0 : bebes,
      extras: pesca ? { equipo: Math.min(extras.equipo || 0, adultos), carnada: extras.carnada || 0 } : {},
    };
    if (r.adultos < 1) throw new Error(pesca ? 'Indicá al menos una persona.' : 'Tiene que viajar al menos un adulto.');

    // El grupo entra completo o no entra: no se divide entre zarpes.
    const lugares = lugaresReserva(r);
    const libres = zarpe.cupo - plazasOcupadas(zarpeId, datos.reservas);
    if (lugares > libres) {
      throw new Error(
        libres > 0
          ? `El grupo (${lugares}) no entra: ${libres === 1 ? 'queda' : 'quedan'} ${nLugares(libres)}. Elegí otro zarpe.`
          : 'Este zarpe está completo: ya no quedan lugares. Elegí otro horario u otra fecha.'
      );
    }

    const reserva = {
      codigo: generarCodigo(datos.reservas),
      zarpeId,
      ...r,
      nombre: nombre.trim(),
      telefono: normalizarCelular(telefono),
      // Se guarda el desglose con las tarifas del momento: el comprobante no cambia si luego cambian los precios.
      desglose: desglosePrecio(actividad, r, datos.extras),
      precio: calcularPrecio(actividad, r, datos.extras),
      estado: 'confirmada', // los lugares bajan en el momento
      creadaEn: new Date().toISOString(),
    };
    datos.reservas.push(reserva);
    return reserva;
  });
}

export function buscarPorCodigo(codigo) {
  if (!codigo) return null;
  const c = codigo.trim().toUpperCase();
  return getReservas().find((r) => r.codigo === c) ?? null;
}

/**
 * Busca por código y celular EXACTOS (Mi reserva).
 * Solo se ignoran espacios al principio/final del código y espacios o guiones del celular;
 * no hay coincidencias parciales ni se completan dígitos (099123456 ≠ 99123456).
 */
export function buscarReserva(codigo, celular) {
  const c = String(codigo ?? '').trim();
  const cel = normalizarCelular(celular);
  if (!c || !cel) return null;
  return getReservas().find((r) => r.codigo === c && normalizarCelular(r.telefono) === cel) ?? null;
}

/** Milisegundos que faltan para el zarpe de la reserva (negativo si ya salió). */
export function msHastaZarpe(reserva, ahora = Date.now()) {
  const z = reserva && getZarpe(reserva.zarpeId);
  return z ? fechaHoraZarpe(z).getTime() - ahora : -Infinity;
}

/**
 * El titular puede cancelar desde la app solo si faltan MÁS de 24 h para el zarpe.
 * Con 24 h o menos queda bloqueado y tiene que avisar por WhatsApp.
 */
export function puedeCancelar(reserva, ahora = Date.now()) {
  if (!reserva || reserva.estado === 'cancelada') return false;
  return msHastaZarpe(reserva, ahora) > HORAS_CANCELACION * 3600 * 1000;
}

/**
 * Cancelación del titular. Relee la reserva en el momento, vuelve a comprobar las 24 h
 * y la marca cancelada: sus lugares quedan libres en ese mismo instante.
 * Devuelve { reserva, lugaresLiberados }.
 */
export function cancelarReserva(codigo, celular) {
  const r = buscarReserva(codigo, celular);
  if (!r) throw new Error('No se encontró la reserva.');
  if (r.estado === 'cancelada') throw new Error('La reserva ya estaba cancelada.');
  if (!puedeCancelar(r)) {
    throw new Error(`Faltan ${HORAS_CANCELACION} horas o menos para el zarpe: la cancelación desde la app está bloqueada.`);
  }
  const ocupaba = r.estado === 'confirmada' ? lugaresReserva(r) : 0;
  const reserva = actualizarEstado(r.codigo, 'cancelada');
  return { reserva, lugaresLiberados: ocupaba };
}

/** Cambio de estado desde /admin (sin límite de 24 h). */
export function actualizarEstado(codigo, estado) {
  return modificar((datos) => {
    const r = datos.reservas.find((x) => x.codigo === codigo);
    if (!r) return null;
    if (estado === 'reprogramar' && r.estado !== 'reprogramar') {
      throw new Error('«A reprogramar» se asigna al cerrar el zarpe por clima.');
    }
    if (estado === 'confirmada' && r.estado !== 'confirmada') {
      const z = datos.zarpes.find((x) => x.id === r.zarpeId);
      if (!z || zarpeCerrado(z)) throw new Error('Su zarpe está cerrado por clima: movela a otro zarpe.');
      const libres = z ? z.cupo - plazasOcupadas(r.zarpeId, datos.reservas, codigo) : 0;
      if (lugaresReserva(r) > libres) {
        throw new Error(`No se puede confirmar: el grupo ocupa ${lugaresReserva(r)} y quedan ${nLugares(Math.max(0, libres))}.`);
      }
    }
    r.estado = estado;
    r.actualizadaEn = new Date().toISOString();
    return { ...r };
  });
}

export function eliminarReserva(codigo) {
  modificar((datos) => {
    datos.reservas = datos.reservas.filter((r) => r.codigo !== codigo);
  });
}

/** Borra las reservas y conserva el catálogo y los zarpes. No provoca re-siembra. */
export function vaciarReservas() {
  modificar((datos) => {
    datos.reservas = [];
  });
}

// ── Exportar / importar ─────────────────────────────────────────────────────

export const exportarDatos = () => leer();

export function importarDatos(datos) {
  if (!datos || !Array.isArray(datos.zarpes) || !Array.isArray(datos.reservas)) {
    throw new Error('El archivo no tiene el formato esperado (zarpes y reservas).');
  }
  guardar({ ...VACIO, ...datos });
}

// ── Acceso a /admin ─────────────────────────────────────────────────────────
// ⚠️ NO es autenticación real: la clave está en el código del cliente (src/config/admin.js)
// y la sesión es una marca en sessionStorage que cualquiera puede escribir a mano.

const SESION_ADMIN = 'marea-alta:admin';
let sesionEnMemoria = false; // por si sessionStorage también está bloqueado

/** Compara con la clave escrita en el código. Si coincide, marca la sesión de esta pestaña. */
export function entrarAdmin(clave) {
  if (clave !== ADMIN_CLAVE) return false;
  sesionEnMemoria = true;
  try {
    sessionStorage.setItem(SESION_ADMIN, '1');
  } catch {
    /* sin sessionStorage: la sesión dura hasta recargar */
  }
  return true;
}
export function esAdmin() {
  try {
    return sessionStorage.getItem(SESION_ADMIN) === '1' || sesionEnMemoria;
  } catch {
    return sesionEnMemoria;
  }
}
export function salirAdmin() {
  sesionEnMemoria = false;
  try {
    sessionStorage.removeItem(SESION_ADMIN);
  } catch {
    /* nada que borrar */
  }
}
