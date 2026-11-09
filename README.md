# Marea Alta · Reservas náuticas

App web de reservas de paseos y salidas de pesca en barco. Hecha con **React 18 + Vite 6 + Tailwind CSS 4 + React Router 6**.
**Sin backend:** todos los datos se guardan en el `localStorage` del navegador.

**Previsualización:** <https://claude.ai/artifact/2iWLXBAxdLWokU2MV7JZDe>
(ver [Previsualización](#previsualización) para saber qué cambia respecto a correrla en local).

---

## Índice

1. [Instalación y ejecución](#instalación-y-ejecución)
2. [Rutas](#rutas)
3. [Datos de ejemplo](#datos-de-ejemplo)
4. [Cómo sustituir los datos de ejemplo](#cómo-sustituir-los-datos-de-ejemplo)
5. [Clave de administración](#clave-de-administración-no-es-autenticación-real)
6. [Cálculos y reglas](#cálculos-y-reglas)
7. [Pruebas](#pruebas)
8. [Previsualización](#previsualización)
9. [Publicar en un hosting](#publicar-en-un-hosting)
10. [Estructura del proyecto](#estructura-del-proyecto)

---

## Instalación y ejecución

Requisitos: **Node.js 20.19 o superior** (recomendado 22 LTS) y npm. Comprobá con `node -v`.

```bash
# 1. Entrá en la carpeta del proyecto (descomprimido o clonado)
cd reservas-nauticas

# 2. Instalá las dependencias
npm install

# 3. Arrancá el servidor de desarrollo
npm run dev
```

Abrí **http://localhost:5173**.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compila la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en http://localhost:4173 |
| `npm test` | Pruebas de reglas de negocio (no necesita dependencias extra) |
| `npm run test:360` | Prueba de diseño a 360 px con un navegador real (ver [Pruebas](#pruebas)) |

---

## Rutas

| Ruta | Pantalla |
|---|---|
| `/` | **Inicio**: cuatro tarjetas de actividad con duración, precio desde y «Reservar salida» |
| `/reservar` | **Reservar**: actividad → fecha → zarpe (hora, barco, lugares libres) → adultos, niños de 2 a 10, menores de 2 → extras (pesca) → nombre y celular. `?actividad=<id>` preselecciona |
| `/confirmacion/:codigo` | **Confirmación**: código, actividad, barco, zarpe, presentación 15 min antes, pasajeros, extras, desglose; compartir por WhatsApp y descargar `.ics` |
| `/mi-reserva` | **Mi reserva**: búsqueda por código y celular exactos, estado y datos, cancelación (más de 24 h) o aviso por WhatsApp, reprogramación por clima |
| `/admin` | **Admin** (con clave): Vista diaria, Zarpes, Reservas, Barcos, Ajustes |

---

## Datos de ejemplo

Se cargan **una sola vez**: al abrir la app, si la clave `marea-alta:datos:v3` **no existe** en `localStorage`.
Recargar la página no los sobrescribe, y vaciar las reservas tampoco hace que se vuelvan a cargar.

### Barcos

| Barco | Lugares | Nota |
|---|---|---|
| Gaviota | 15 | Cubierta abierta |
| Petrel | 30 | El más grande, acceso cómodo desde el muelle |
| Cormorán | 12 | Ideal para pesca |
| Albatros | 10 | El más chico |

### Actividades (precios de ejemplo en pesos uruguayos)

| Actividad | Duración | Precio | Horario | Barco |
|---|---|---|---|---|
| Paseo corto por la bahía | 30 min | Adulto $U 650 · niño (2 a 10) $U 300 | Vie a dom, 12:30 y 17:00 | Albatros |
| Paseo por la bahía | 1 h | Adulto $U 950 · niño (2 a 10) $U 450 | Todos los días, 11:00, 15:00 y 18:30 | Petrel / Gaviota (alternan) |
| Pesca exprés | 2 h | $U 1.400 por persona, desde 10 años | Sáb y dom, 15:30 | Cormorán |
| Pesca de embarque | 4 h | $U 2.100 por persona, desde 10 años | Mar a dom, 7:00 | Cormorán |

**Extras de pesca:** equipo completo $U 300 por persona (máx. uno por persona) · carnada de camarón $U 150 por porción.

### Zarpes y reservas

- **14 zarpes** en los próximos 7 días (desde mañana), tomados del horario y repartidos entre las cuatro actividades.
  El horario completo de 7 días son 35 zarpes; `ZARPES_DEMO = 14` en `src/data/semilla.js` (poné `Infinity` para todos).
- **12 reservas** `MA-DEMO01` … `MA-DEMO12`: paseos con adultos, niños y menores de 2, pescas con extras, 2 canceladas,
  2 zarpes completos (Albatros 10/10 y Cormorán 12/12) y un zarpe cerrado por clima (`MA-DEMO03` queda «A reprogramar»).

Para probar «Mi reserva»:

| Código | Celular | Qué muestra |
|---|---|---|
| `MA-DEMO10` | `099433677` | Se puede cancelar (más de 24 h) |
| `MA-DEMO01` | `099100200` | Zarpa mañana: si faltan 24 h o menos, cancelación bloqueada y aviso por WhatsApp |
| `MA-DEMO03` | `097174306` | «A reprogramar» por clima: elige otro zarpe |

### Restaurar los datos de ejemplo

`/admin` → **Ajustes → Restaurar datos de ejemplo**: borra todas las claves de esta app en `localStorage`
(las que empiezan con `marea-alta:`, incluidas versiones viejas) y vuelve a cargar 4 barcos, 4 actividades,
14 zarpes y 12 reservas, con fechas recalculadas desde hoy. No toca datos de otras apps ni la sesión de `/admin`.

---

## Cómo sustituir los datos de ejemplo

Todo el catálogo está en **`src/data/semilla.js`**:

| Qué cambiar | Dónde |
|---|---|
| Nombre, lugares y descripción de los barcos | `BARCOS` |
| Nombre, duración (`duracionMin`), tarifas (`precioAdulto`, `precioNino`), edad mínima y horario visible | `ACTIVIDADES` (`tipo: 'paseo'` o `'pesca'`) |
| Extras de pesca y su precio | `EXTRAS` |
| Días, horas y barcos de cada actividad | `HORARIOS` (días con `Date.getDay()`: 0 = domingo … 6 = sábado) |
| Cantidad de zarpes de la demo | `ZARPES_DEMO` |
| Reservas de demostración | `PLAN_RESERVAS` (y `CIERRES_CLIMA_DEMO` para el zarpe cerrado por clima) |
| **WhatsApp del negocio** ⚠️ de ejemplo | `NEGOCIO.whatsapp` (solo dígitos, con código de país, p. ej. `59899123456`) |
| **Punto de encuentro** ⚠️ de ejemplo | `NEGOCIO.puntoEncuentro` |
| Minutos de presentación antes del zarpe | `NEGOCIO.minutosPresentacion` (15) |

Después de editar el archivo, los navegadores que ya tenían datos los conservan: usá **Ajustes → Restaurar datos de ejemplo**
para cargar los nuevos. Sin tocar código, desde `/admin` también se puede crear y borrar zarpes y cambiar el cupo de los barcos.

Las horas de cancelación (24) están en `HORAS_CANCELACION` (`src/lib/storage.js`).

---

## Clave de administración (NO es autenticación real)

`/admin` pide una clave simple escrita en el código:

```js
// src/config/admin.js
export const ADMIN_CLAVE = 'marea2026';
```

Para cambiarla, editá ese valor y volvé a compilar.

> ⚠️ **Esto NO es autenticación real.**
>
> - La clave viaja dentro del JavaScript que descarga el navegador: cualquiera puede leerla con las herramientas de desarrollo.
> - La «sesión» es una marca en `sessionStorage` que también se puede escribir a mano.
> - Los datos están en el `localStorage` de cada navegador: no hay servidor que proteja nada.
>
> Sirve para que un cliente no entre al panel por accidente. Para una protección real hace falta un backend con usuarios,
> contraseñas cifradas y sesiones del lado del servidor.

---

## Cálculos y reglas

La lógica está en `src/lib/storage.js` (datos) y `src/lib/precios.js` (precio, sin estado).

### Precio

```
Total = adultos × tarifa adulto
      + niños (2 a 10) × tarifa niño
      + [solo pesca] equipo × $U 300 + carnada × $U 150
```

- Los **menores de 2 no pagan** (aparecen en el desglose a $U 0).
- En **pesca** solo hay una cantidad de personas (todas de 10 años o más): no hay niños ni menores de 2,
  y el equipo completo se limita a uno por persona. En paseos los extras se ignoran.
- El desglose se **guarda dentro de la reserva** al crearla: el comprobante no cambia si después se modifican las tarifas.

Ejemplo: pesca exprés, 3 personas, 2 equipos, 4 carnadas → 3 × 1.400 + 2 × 300 + 4 × 150 = **$U 5.400**.

### Lugares y cupo

- Cada zarpe arranca con todos los lugares de su barco libres (`cupo`).
- **Lugares ocupados** = adultos + niños + menores de 2 de las reservas **confirmadas** del zarpe.
  Las canceladas y las «A reprogramar» no ocupan lugar.
- **Lugares libres** = cupo − ocupados. Con 0 libres el zarpe se muestra «Completo» y no se puede elegir.
- El grupo entra completo o no entra (no se divide entre zarpes).
- **Justo antes de guardar** se vuelve a leer `localStorage` y a comprobar el cupo: si otra pestaña reservó mientras tanto,
  no se guarda nada y se muestra el error con los lugares reales.
- El **cupo de un barco** se puede cambiar en `/admin` → Barcos y se aplica a todos sus zarpes, pero **no puede quedar por
  debajo de la ocupación de ninguno** de ellos.

### Cancelación

- Desde «Mi reserva» se puede cancelar solo si faltan **más de 24 h** para el zarpe (con 24 h justas ya está bloqueado).
- Al cancelar, los lugares se liberan en el momento y la pantalla se actualiza sin recargar.
- Con 24 h o menos se bloquea y se ofrece avisar por WhatsApp al negocio, con el mensaje ya escrito.

### Clima

- `/admin` → «Reprogramar por clima» marca el zarpe como **no disponible** y pasa sus reservas confirmadas a **«A reprogramar»**.
- El titular lo ve en «Mi reserva» y puede elegir otro zarpe de la misma actividad donde entre todo el grupo (mismo precio).
  Si no hay ninguno, queda pendiente y se resuelve por WhatsApp.

### Presentación y calendario

- Hora de presentación = hora del zarpe − 15 min.
- El `.ics` se genera en el navegador (sin servicios externos), en la zona `America/Montevideo` (UTC−3), con un aviso 1 h antes.
  Si el navegador bloquea la descarga, «Copiar el evento» deja el contenido en el portapapeles.

### Celular

8 o 9 dígitos (se ignoran espacios y guiones). La búsqueda en «Mi reserva» exige código y celular **exactos**
(`099433677` no es lo mismo que `99433677`).

---

## Pruebas

### Reglas de negocio — `npm test`

Usa el ejecutor de pruebas de Node (`node:test`), sin dependencias extra. 23 pruebas en `tests/reglas.test.js`:

| Grupo | Qué comprueba |
|---|---|
| Datos de ejemplo | 4 barcos, 4 actividades, 14 zarpes, 12 reservas; tarifas del briefing; totales = desglose |
| **Cupo nunca excedido** | grupo que no entra, zarpe completo, llenado exacto, reserva concurrente de otra pestaña y una prueba **aleatoria de 1.500 operaciones** (reservar, cancelar, reactivar, cambiar cupos, clima, mover, programar) que comprueba el cupo de todos los zarpes después de cada una |
| Pasajeros y precio | **menores de 2 ocupan y no pagan**, **extras solo en pesca**, celular de 8 o 9 dígitos |
| Cancelación | **más de 24 h libera lugares**, **24 h justas y 2 h bloqueadas** (reloj simulado), búsqueda exacta |
| Clima | **zarpe no disponible y reservas → A reprogramar**, mover a otro zarpe |
| Cupos de barcos | **reducción inválida bloqueada**, reducción válida aplicada; crear y borrar zarpes |
| Persistencia | **los cambios persisten tras recargar**, vaciar no vuelve a cargar la demo, **restauración** 4/4/14/12, localStorage bloqueado |

### Diseño a 360 px — `npm run test:360`

Recorre la app con Chromium a 360 × 640 haciendo clic (Inicio → Reservar → Confirmación → Mi reserva con cancelación → Admin) y
comprueba: sin desplazamiento horizontal, botones y campos de 44 px o más, campos con letra de 16 px o más,
y el primer «Reservar salida» visible sin scroll. Guarda capturas en `tests/capturas-360/`.

```bash
npm i -D playwright && npx playwright install chromium   # una vez
npm run build && npm run preview                          # en otra terminal
npm run test:360                                          # o: BASE_URL=https://… npm run test:360
```

---

## Previsualización

**URL:** <https://claude.ai/artifact/2iWLXBAxdLWokU2MV7JZDe>

Es la app compilada y publicada como página en claude.ai. Funciona completa (reservar, confirmar, Mi reserva, `/admin`,
clima, cupos, restaurar), con los datos guardados en el navegador de quien la abre. Diferencias con correrla en local:

- **Navegación:** usa un enrutador mínimo compatible en lugar de React Router, porque el visor no admite rutas en la URL.
  Se puede entrar directo a `#reservar`, `#mi-reserva` y `#admin`; la confirmación no tiene enlace propio.
- **Descarga del `.ics`:** el visor de claude.ai bloquea descargas; usá «Copiar el evento». En local o en un hosting propio la descarga funciona.
- **Acceso:** la página es privada de su dueña hasta que se comparte desde su página en claude.ai (botón Compartir).

Para una URL pública propia, ver [Publicar en un hosting](#publicar-en-un-hosting).

---

## Publicar en un hosting

```bash
npm run build      # genera dist/
```

Subí la carpeta `dist/` a cualquier hosting estático (Netlify, Vercel, Cloudflare Pages, GitHub Pages…).
Como es una SPA con rutas, el hosting tiene que devolver `index.html` para cualquier ruta:
`public/_redirects` ya lo resuelve en Netlify y Cloudflare Pages. En otros, configurá ese «fallback».

---

## Estructura del proyecto

```
reservas-nauticas/
├── index.html
├── package.json
├── vite.config.js            # plugins de React y Tailwind
├── public/_redirects         # fallback de SPA para hostings estáticos
├── src/
│   ├── main.jsx              # entrada + carga inicial de datos de ejemplo
│   ├── App.jsx               # rutas
│   ├── index.css             # tema visual (colores, tipografía, botones, campos, tarjetas)
│   ├── config/admin.js       # ADMIN_CLAVE (⚠️ no es autenticación real)
│   ├── data/semilla.js       # barcos, actividades, extras, horarios, NEGOCIO y datos de ejemplo
│   ├── lib/
│   │   ├── storage.js        # localStorage: zarpes, lugares, reservas, clima, cupos, restauración, acceso admin
│   │   ├── precios.js        # desglose y total (sin estado)
│   │   ├── formato.js        # fechas, pesos, duraciones
│   │   ├── ics.js            # genera el .ics en el navegador
│   │   └── whatsapp.js       # enlaces wa.me
│   ├── components/           # Layout, Dialogo, Contador, DetalleReserva, EstadoBadge,
│   │                         # VistaDiaria, FormNuevoZarpe, CuposBarcos, Ajustes
│   └── pages/                # Inicio, Reservar, Confirmacion, MiReserva, Admin, NoEncontrado
└── tests/
    ├── reglas.test.js        # npm test
    ├── helpers.js
    └── visual-360.mjs        # npm run test:360
```

### Notas técnicas

- **localStorage bloqueado** (modo privado estricto, datos de sitios desactivados): aviso en todas las páginas, la app muestra
  los datos de ejemplo en memoria solo para mirar y no deja guardar, para no dar por hecha una reserva que no existe.
- Los diálogos de confirmación son propios (`src/components/Dialogo.jsx`), no `window.confirm`: mismo diseño, accesibles con
  teclado (Escape cancela) y funcionan dentro de visores que bloquean los cuadros nativos.
- Accesibilidad y móvil: botones y campos de 44 px, campos con letra de 16 px (sin zoom en iOS), contraste del botón principal 6:1.
