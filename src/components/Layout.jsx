import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { MENSAJE_BLOQUEADO, almacenamientoDisponible } from '../lib/storage';
import { DialogoHost } from './Dialogo.jsx';

const ENLACES = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/reservar', label: 'Reservar' },
  { to: '/mi-reserva', label: 'Mi reserva' },
  { to: '/admin', label: 'Admin' },
];

const claseEnlace = ({ isActive }) =>
  `rounded-xl px-3 py-2.5 text-sm font-medium transition ${
    isActive ? 'bg-sky-100 text-sky-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export default function Layout() {
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();

  // Cierra el menú móvil y sube al principio al cambiar de página.
  useEffect(() => {
    setAbierto(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-sky-900">
            <span className="text-2xl">⛵</span> Marea Alta
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {ENLACES.map((e) => (
              <NavLink key={e.to} to={e.to} end={e.end} className={claseEnlace}>
                {e.label}
              </NavLink>
            ))}
          </nav>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setAbierto((v) => !v)}
            aria-label="Abrir menú"
            aria-expanded={abierto}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              {abierto ? (
                <path strokeLinecap="round" d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        {abierto && (
          <nav className="flex flex-col gap-1 border-t border-slate-200 px-4 py-3 md:hidden">
            {ENLACES.map((e) => (
              <NavLink key={e.to} to={e.to} end={e.end} className={claseEnlace}>
                {e.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {!almacenamientoDisponible() && (
        <div role="alert" className="border-b border-rose-200 bg-rose-50">
          <p className="mx-auto max-w-6xl px-4 py-3 text-sm text-rose-800">
            <strong>⚠️ No se pueden guardar datos.</strong> {MENSAJE_BLOQUEADO} Mientras tanto podés mirar las actividades y
            los horarios de ejemplo.
          </p>
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:justify-between sm:py-6 sm:text-sm">
          <p>© {new Date().getFullYear()} Marea Alta · Alquiler de embarcaciones</p>
          <p>Datos guardados solo en este navegador (localStorage).</p>
        </div>
      </footer>

      <DialogoHost />
    </div>
  );
}
