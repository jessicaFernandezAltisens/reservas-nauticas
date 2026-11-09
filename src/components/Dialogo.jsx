// Diálogos propios (confirmar / avisar) en lugar de window.confirm y window.alert:
// mismo diseño que la app, accesibles con teclado, y funcionan también dentro de iframes
// o visores que bloquean los cuadros nativos del navegador.
import { useEffect, useRef, useState } from 'react';

let mostrar = null; // lo registra <DialogoHost /> al montarse

function abrir(d) {
  if (mostrar) {
    mostrar(d);
    return;
  }
  // Sin host montado (no debería pasar dentro de la app): se usa el cuadro nativo.
  if (d.tipo === 'confirmar') d.resolve(window.confirm(d.mensaje));
  else {
    window.alert(d.mensaje);
    d.resolve();
  }
}

/** Pide confirmación. Devuelve una promesa con true (aceptar) o false (cancelar / Escape / clic fuera). */
export function confirmar(mensaje, { aceptar = 'Sí, continuar', cancelar = 'Cancelar', titulo = '¿Confirmás?' } = {}) {
  return new Promise((resolve) => abrir({ tipo: 'confirmar', mensaje, aceptar, cancelar, titulo, resolve }));
}

/** Muestra un aviso (por ejemplo, un error). Devuelve una promesa que se resuelve al cerrarlo. */
export function avisar(mensaje, { titulo = 'No se pudo completar' } = {}) {
  return new Promise((resolve) => abrir({ tipo: 'aviso', mensaje, titulo, aceptar: 'Entendido', resolve: () => resolve() }));
}

export function DialogoHost() {
  const [d, setD] = useState(null);
  const boton = useRef(null);

  useEffect(() => {
    mostrar = setD;
    return () => {
      mostrar = null;
    };
  }, []);

  useEffect(() => {
    if (d) boton.current?.focus();
  }, [d]);

  if (!d) return null;

  const cerrar = (valor) => {
    setD(null);
    d.resolve(valor);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && cerrar(false)}
    >
      <div
        role={d.tipo === 'confirmar' ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby="dialogo-titulo"
        aria-describedby="dialogo-mensaje"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onKeyDown={(e) => e.key === 'Escape' && cerrar(false)}
      >
        <h2 id="dialogo-titulo" className="text-lg font-bold text-slate-900">
          {d.titulo}
        </h2>
        <p id="dialogo-mensaje" className="mt-2 whitespace-pre-line text-sm text-slate-600">
          {d.mensaje}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {d.tipo === 'confirmar' && (
            <button type="button" className="btn-secundario" onClick={() => cerrar(false)}>
              {d.cancelar}
            </button>
          )}
          <button ref={boton} type="button" className="btn-primario" onClick={() => cerrar(true)}>
            {d.aceptar}
          </button>
        </div>
      </div>
    </div>
  );
}
