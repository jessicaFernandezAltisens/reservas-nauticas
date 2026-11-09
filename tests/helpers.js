// Utilidades de prueba: un localStorage/sessionStorage en memoria y una forma de "recargar" la app
// (cargar una instancia nueva del módulo de datos sobre el MISMO almacenamiento).

export function crearStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    clear: () => m.clear(),
    get length() {
      return m.size;
    },
    _mapa: m,
  };
}

let instancia = 0;

/**
 * Carga la app como lo haría el navegador al abrir la página:
 * instancia nueva de storage.js + inicializarDatos() (siembra solo si localStorage está vacío).
 */
export async function abrirApp(local = crearStorage(), session = crearStorage()) {
  globalThis.localStorage = local;
  globalThis.sessionStorage = session;
  const s = await import(`../src/lib/storage.js?instancia=${++instancia}`);
  const sembro = s.inicializarDatos();
  return { s, local, session, sembro };
}

/** Fecha y hora del zarpe en milisegundos. */
export const msZarpe = (s, zarpe) => s.fechaHoraZarpe(zarpe).getTime();

export const HORA = 3600 * 1000;

/** Comprueba que ningún zarpe tenga más lugares ocupados que su cupo. Devuelve los excedidos. */
export function zarpesExcedidos(s) {
  const reservas = s.getReservas();
  return s
    .getZarpes()
    .map((z) => ({ id: z.id, cupo: z.cupo, ocupadas: s.plazasOcupadas(z.id, reservas) }))
    .filter((x) => x.ocupadas > x.cupo);
}

/** PRNG determinista (mulberry32) para que la prueba aleatoria sea reproducible. */
export function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
