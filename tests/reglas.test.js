// Pruebas de las reglas de negocio. Ejecutar con:  npm test   (usa node:test, sin dependencias)
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { abrirApp, azar, crearStorage, HORA, msZarpe, zarpesExcedidos } from './helpers.js';

const titular = { nombre: 'Ana Prueba', telefono: '099123456' };

describe('Datos de ejemplo y precios del briefing', () => {
  test('4 barcos, 4 actividades, 14 zarpes, 12 reservas', async () => {
    const { s, sembro } = await abrirApp();
    assert.equal(sembro, true);
    assert.equal(s.getBarcos().length, 4);
    assert.equal(s.getActividades().length, 4);
    assert.equal(s.getZarpes().length, 14);
    assert.equal(s.getReservas().length, 12);
  });

  test('barcos y tarifas según el briefing', async () => {
    const { s } = await abrirApp();
    assert.deepEqual(
      Object.fromEntries(s.getBarcos().map((b) => [b.nombre, b.capacidad])),
      { Gaviota: 15, Petrel: 30, Cormorán: 12, Albatros: 10 }
    );
    const tarifas = Object.fromEntries(s.getActividades().map((a) => [a.id, [a.duracionMin, a.precioAdulto, a.precioNino]]));
    assert.deepEqual(tarifas, {
      'paseo-corto': [30, 650, 300],
      'paseo-bahia': [60, 950, 450],
      'pesca-expres': [120, 1400, null],
      'pesca-embarque': [240, 2100, null],
    });
    assert.deepEqual(s.getExtras().map((e) => [e.id, e.precio]), [['equipo', 300], ['carnada', 150]]);
  });

  test('ninguna reserva de ejemplo excede el cupo y su total coincide con el desglose', async () => {
    const { s } = await abrirApp();
    assert.deepEqual(zarpesExcedidos(s), []);
    for (const r of s.getReservas()) assert.equal(r.precio, r.desglose.reduce((t, l) => t + l.subtotal, 0), r.codigo);
  });
});

describe('Cupo nunca excedido', () => {
  test('un grupo que no entra se rechaza y no cambia la ocupación', async () => {
    const { s } = await abrirApp();
    const z = s.zarpesDisponibles('paseo-corto').find((x) => x.libres > 0 && x.libres < x.cupo);
    const antes = s.plazasOcupadas(z.id);
    assert.throws(() => s.crearReserva({ zarpeId: z.id, adultos: z.libres + 1, ...titular }), /no entra/);
    assert.equal(s.plazasOcupadas(z.id), antes);
  });

  test('zarpe completo: no admite ni una persona más', async () => {
    const { s } = await abrirApp();
    const lleno = s.zarpesDisponibles().find((x) => !x.cerrado && x.libres === 0);
    assert.ok(lleno, 'la demo trae zarpes completos');
    assert.throws(() => s.crearReserva({ zarpeId: lleno.id, adultos: 1, ...titular }), /completo/);
  });

  test('llenar exacto hasta 0 libres funciona; uno más falla', async () => {
    const { s } = await abrirApp();
    const z = s.zarpesDisponibles('paseo-bahia').find((x) => !x.cerrado && x.libres >= 3);
    s.crearReserva({ zarpeId: z.id, adultos: z.libres, ...titular });
    assert.equal(s.zarpesDisponibles('paseo-bahia').find((x) => x.id === z.id).libres, 0);
    assert.throws(() => s.crearReserva({ zarpeId: z.id, adultos: 1, ...titular }));
  });

  test('comprobación al guardar: otra "pestaña" reserva en el medio', async () => {
    const { s, local } = await abrirApp();
    const z = s.zarpesDisponibles('pesca-embarque').find((x) => x.libres === 12);
    const visto = z.libres; // lo que vio el formulario
    // Otra pestaña escribe directamente en localStorage.
    const clave = 'marea-alta:datos:v3';
    const d = JSON.parse(local.getItem(clave));
    d.reservas.push({ codigo: 'MA-OTRA01', zarpeId: z.id, adultos: 10, ninos: 0, bebes: 0, extras: {}, nombre: 'Otra', telefono: '099000111', precio: 0, estado: 'confirmada', creadaEn: new Date().toISOString() });
    local.setItem(clave, JSON.stringify(d));
    assert.throws(() => s.crearReserva({ zarpeId: z.id, adultos: 3, ...titular }), /quedan 2 lugares/);
    assert.ok(visto >= 3);
    assert.deepEqual(zarpesExcedidos(s), []);
  });

  test('aleatoria: 1.500 operaciones mezcladas nunca dejan un zarpe por encima de su cupo', async () => {
    const { s } = await abrirApp();
    const r = azar(20261108);
    const elegir = (xs) => xs[Math.floor(r() * xs.length)];
    let ok = 0;
    for (let i = 0; i < 1500; i++) {
      const op = r();
      try {
        if (op < 0.45) {
          const z = elegir(s.zarpesDisponibles());
          const pesca = s.esPesca(s.getActividad(z.actividadId));
          s.crearReserva({
            zarpeId: z.id,
            adultos: 1 + Math.floor(r() * 8),
            ninos: pesca ? 0 : Math.floor(r() * 4),
            bebes: pesca ? 0 : Math.floor(r() * 3),
            extras: { equipo: Math.floor(r() * 5), carnada: Math.floor(r() * 5) },
            ...titular,
          });
        } else if (op < 0.6) {
          const res = elegir(s.getReservas());
          s.actualizarEstado(res.codigo, 'cancelada');
        } else if (op < 0.72) {
          const res = elegir(s.getReservas().filter((x) => x.estado === 'cancelada'));
          if (res) s.actualizarEstado(res.codigo, 'confirmada'); // reactivar exige que entre
        } else if (op < 0.82) {
          const b = elegir(s.getBarcos());
          s.actualizarCupoBarco(b.id, 1 + Math.floor(r() * 35)); // subir o bajar
        } else if (op < 0.9) {
          const res = elegir(s.getReservas().filter((x) => x.estado === 'reprogramar'));
          if (res) s.moverReserva(res.codigo, elegir(s.zarpesDisponibles()).id);
        } else if (op < 0.95) {
          const z = elegir(s.zarpesDisponibles().filter((x) => !x.cerrado));
          if (z) s.reprogramarPorClima(z.id);
        } else {
          s.programarZarpes(7);
        }
        ok++;
      } catch {
        /* operación rechazada por una regla: es lo esperado a menudo */
      }
      assert.deepEqual(zarpesExcedidos(s), [], `después de la operación ${i}`);
    }
    assert.ok(ok > 200, `se aplicaron ${ok} operaciones válidas`);
  });
});

describe('Pasajeros y precio', () => {
  test('menores de 2 ocupan lugar y no pagan', async () => {
    const { s } = await abrirApp();
    const z = s.zarpesDisponibles('paseo-bahia').find((x) => !x.cerrado && x.libres >= 5);
    const antes = s.plazasOcupadas(z.id);
    const res = s.crearReserva({ zarpeId: z.id, adultos: 2, ninos: 1, bebes: 2, ...titular });
    assert.equal(s.lugaresReserva(res), 5);
    assert.equal(s.plazasOcupadas(z.id), antes + 5);
    assert.equal(res.precio, 2 * 950 + 1 * 450); // los 2 menores, $U 0
    const linea = res.desglose.find((l) => l.concepto === 'Menores de 2');
    assert.deepEqual([linea.cantidad, linea.unitario, linea.subtotal], [2, 0, 0]);
  });

  test('extras solo en pesca', async () => {
    const { s } = await abrirApp();
    const paseo = s.zarpesDisponibles('paseo-bahia').find((x) => !x.cerrado && x.libres >= 3);
    const rp = s.crearReserva({ zarpeId: paseo.id, adultos: 2, ninos: 1, extras: { equipo: 3, carnada: 4 }, ...titular });
    assert.deepEqual(rp.extras, {});
    assert.equal(rp.precio, 2 * 950 + 450);
    assert.ok(rp.desglose.every((l) => !l.extra));

    const pesca = s.zarpesDisponibles('pesca-expres').find((x) => x.libres >= 3);
    const rf = s.crearReserva({ zarpeId: pesca.id, adultos: 3, ninos: 2, bebes: 1, extras: { equipo: 9, carnada: 4 }, ...titular });
    assert.deepEqual([rf.ninos, rf.bebes], [0, 0]); // pesca: solo 10 años o más
    assert.equal(rf.extras.equipo, 3); // máximo uno por persona
    assert.equal(rf.precio, 3 * 1400 + 3 * 300 + 4 * 150);
  });

  test('celular: 8 o 9 dígitos', async () => {
    const { s } = await abrirApp();
    const z = s.zarpesDisponibles('paseo-bahia').find((x) => !x.cerrado && x.libres >= 1);
    for (const mal of ['0991234', '0991234567', '+59899123456', 'abc12345']) {
      assert.throws(() => s.crearReserva({ zarpeId: z.id, adultos: 1, nombre: 'Ana', telefono: mal }), /8 o 9 dígitos/, mal);
    }
    assert.ok(s.crearReserva({ zarpeId: z.id, adultos: 1, nombre: 'Ana', telefono: '99 123 456' }));
  });
});

describe('Cancelación (24 h)', () => {
  async function preparar(t, horasAntes) {
    const { s } = await abrirApp();
    const res = s.buscarReserva('MA-DEMO10', '099433677');
    const z = s.getZarpe(res.zarpeId);
    t.mock.timers.enable({ apis: ['Date'], now: msZarpe(s, z) - horasAntes * HORA });
    return { s, res, z };
  }

  test('con más de 24 h: se cancela y libera los lugares al instante', async (t) => {
    const { s, res, z } = await preparar(t, 24 + 1 / 60); // 24 h y 1 min antes
    const antes = s.plazasOcupadas(z.id);
    const { reserva, lugaresLiberados } = s.cancelarReserva(res.codigo, res.telefono);
    assert.equal(reserva.estado, 'cancelada');
    assert.equal(lugaresLiberados, 2);
    assert.equal(s.plazasOcupadas(z.id), antes - 2);
    // los lugares liberados se pueden volver a reservar
    assert.ok(s.crearReserva({ zarpeId: z.id, adultos: z.cupo - s.plazasOcupadas(z.id), ...titular }));
  });

  test('con exactamente 24 h: bloqueada', async (t) => {
    const { s, res } = await preparar(t, 24);
    assert.equal(s.puedeCancelar(res), false);
    assert.throws(() => s.cancelarReserva(res.codigo, res.telefono), /24 horas o menos/);
    assert.equal(s.buscarReserva(res.codigo, res.telefono).estado, 'confirmada');
  });

  test('con 2 h: bloqueada', async (t) => {
    const { s, res } = await preparar(t, 2);
    assert.throws(() => s.cancelarReserva(res.codigo, res.telefono), /24 horas o menos/);
  });

  test('búsqueda por código y celular exactos', async () => {
    const { s } = await abrirApp();
    assert.ok(s.buscarReserva('MA-DEMO10', '099 433 677'));
    assert.equal(s.buscarReserva('MA-DEMO1', '099433677'), null);
    assert.equal(s.buscarReserva('ma-demo10', '099433677'), null);
    assert.equal(s.buscarReserva('MA-DEMO10', '99433677'), null);
  });
});

describe('Clima', () => {
  test('Reprogramar por clima: zarpe no disponible y reservas activas → A reprogramar', async () => {
    const { s } = await abrirApp();
    const z = s.zarpesDisponibles('pesca-embarque').find((x) => x.libres === 0); // 12/12
    const delZarpe = s.getReservas().filter((r) => r.zarpeId === z.id);
    s.actualizarEstado(delZarpe[0].codigo, 'cancelada'); // una cancelada no debe cambiar
    const n = s.reprogramarPorClima(z.id);
    assert.equal(n, delZarpe.length - 1);
    assert.equal(s.getZarpe(z.id).estado, 'cerrado_clima');
    const despues = s.getReservas().filter((r) => r.zarpeId === z.id);
    assert.deepEqual(despues.map((r) => r.estado).sort(), ['cancelada', ...Array(n).fill('reprogramar')].sort());
    assert.equal(s.plazasOcupadas(z.id), 0);
    const ofrecido = s.zarpesDisponibles('pesca-embarque').find((x) => x.id === z.id);
    assert.deepEqual([ofrecido.cerrado, ofrecido.libres], [true, 0]);
    assert.throws(() => s.crearReserva({ zarpeId: z.id, adultos: 1, ...titular }), /clima/);
    assert.throws(() => s.reprogramarPorClima(z.id), /ya está cerrado/);
  });

  test('una reserva A reprogramar se puede mover a otro zarpe donde entre el grupo', async () => {
    const { s } = await abrirApp();
    const r = s.buscarReserva('MA-DEMO03', '097174306');
    assert.equal(r.estado, 'reprogramar');
    const alt = s.alternativasPara(r);
    assert.ok(alt.length > 0 && alt.every((z) => z.libres >= s.lugaresReserva(r)));
    const movida = s.moverReserva(r.codigo, alt[0].id);
    assert.equal(movida.estado, 'confirmada');
    assert.equal(movida.precio, r.precio);
  });
});

describe('Cupos de los barcos', () => {
  test('reducción inválida bloqueada; válida aplicada a todos sus zarpes', async () => {
    const { s } = await abrirApp();
    assert.throws(() => s.actualizarCupoBarco('cormoran', 11), /Mínimo posible: 12/);
    assert.equal(s.getBarco('cormoran').capacidad, 12);
    assert.ok(s.getZarpes().filter((z) => z.barcoId === 'cormoran').every((z) => z.cupo === 12));
    const max = Math.max(...s.ocupacionPorBarco('gaviota').map((o) => o.ocupadas));
    assert.equal(s.actualizarCupoBarco('gaviota', max).capacidad, max);
    assert.ok(s.getZarpes().filter((z) => z.barcoId === 'gaviota').every((z) => z.cupo === max));
    assert.throws(() => s.actualizarCupoBarco('gaviota', max - 1), /No se puede bajar/);
    assert.deepEqual(zarpesExcedidos(s), []);
  });

  test('crear y borrar zarpes', async () => {
    const { s } = await abrirApp();
    const d = new Date();
    d.setDate(d.getDate() + 10);
    const fecha = d.toISOString().slice(0, 10);
    const z = s.crearZarpe({ actividadId: 'paseo-bahia', fecha, hora: '10:00', barcoId: 'albatros' });
    assert.equal(z.cupo, 10);
    assert.throws(() => s.crearZarpe({ actividadId: 'paseo-corto', fecha, hora: '10:30', barcoId: 'albatros' }), /superpone/);
    const res = s.crearReserva({ zarpeId: z.id, adultos: 2, ...titular });
    assert.throws(() => s.borrarZarpe(z.id), /No se puede borrar/);
    s.actualizarEstado(res.codigo, 'cancelada');
    assert.equal(s.borrarZarpe(z.id), 1);
    assert.equal(s.getZarpe(z.id), null);
  });
});

describe('Persistencia y restauración', () => {
  test('los cambios persisten tras recargar y la demo no se vuelve a cargar', async () => {
    const local = crearStorage();
    const a = await abrirApp(local);
    const z = a.s.zarpesDisponibles('paseo-bahia').find((x) => !x.cerrado && x.libres >= 2);
    const res = a.s.crearReserva({ zarpeId: z.id, adultos: 2, ...titular });
    a.s.actualizarCupoBarco('petrel', 40);
    a.s.actualizarEstado('MA-DEMO02', 'cancelada');

    const b = await abrirApp(local); // "recarga"
    assert.equal(b.sembro, false);
    assert.equal(b.s.getReservas().length, 13);
    assert.ok(b.s.buscarReserva(res.codigo, titular.telefono));
    assert.equal(b.s.getBarco('petrel').capacidad, 40);
    assert.equal(b.s.getReservas().find((r) => r.codigo === 'MA-DEMO02').estado, 'cancelada');
  });

  test('vaciar reservas no provoca una nueva carga de la demo al recargar', async () => {
    const local = crearStorage();
    const a = await abrirApp(local);
    a.s.vaciarReservas();
    const b = await abrirApp(local);
    assert.equal(b.sembro, false);
    assert.equal(b.s.getReservas().length, 0);
  });

  test('Restaurar datos de ejemplo: limpia las claves de la app y recarga 4/4/14/12', async () => {
    const local = crearStorage();
    const session = crearStorage();
    const a = await abrirApp(local, session);
    a.s.entrarAdmin('marea2026');
    a.s.vaciarReservas();
    a.s.actualizarCupoBarco('petrel', 40);
    local.setItem('marea-alta:reservas:v1', '[]');
    local.setItem('otra-app:dato', 'x');

    const r = a.s.restaurarDatosEjemplo();
    assert.deepEqual([r.barcos, r.actividades, r.zarpes, r.reservas], [4, 4, 14, 12]);
    assert.ok(r.clavesBorradas.includes('marea-alta:reservas:v1'));
    assert.deepEqual(a.s.clavesDeLaApp(), ['marea-alta:datos:v3']);
    assert.equal(local.getItem('otra-app:dato'), 'x');
    assert.equal(a.s.getBarco('petrel').capacidad, 30);
    assert.equal(a.s.esAdmin(), true); // la sesión de /admin no se toca

    const b = await abrirApp(local, session);
    assert.equal(b.s.getReservas().length, 12);
  });

  test('localStorage bloqueado: muestra ejemplo en memoria y no deja guardar', async () => {
    const bloqueado = {
      getItem() { throw new Error('SecurityError'); },
      setItem() { throw new Error('SecurityError'); },
      removeItem() { throw new Error('SecurityError'); },
      key: () => null,
      length: 0,
    };
    const { s } = await abrirApp(bloqueado, bloqueado);
    assert.equal(s.almacenamientoDisponible(), false);
    assert.equal(s.getZarpes().length, 14);
    const z = s.zarpesDisponibles('paseo-bahia').find((x) => !x.cerrado && x.libres > 0);
    assert.throws(() => s.crearReserva({ zarpeId: z.id, adultos: 1, ...titular }), /bloqueando el almacenamiento/);
    assert.equal(s.getReservas().length, 12);
  });
});
