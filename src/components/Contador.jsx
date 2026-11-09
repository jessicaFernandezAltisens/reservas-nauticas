export default function Contador({ label, ayuda, valor, onChange, min = 0, max = 99 }) {
  const cambiar = (v) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div>
        <p className="font-medium text-slate-800">{label}</p>
        {ayuda && <p className="text-xs text-slate-500">{ayuda}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => cambiar(valor - 1)}
          disabled={valor <= min}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-xl font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-50 active:bg-sky-100 disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
          aria-label={`Restar ${label}`}
        >
          −
        </button>
        <span className="w-7 text-center text-lg font-semibold tabular-nums text-slate-900">{valor}</span>
        <button
          type="button"
          onClick={() => cambiar(valor + 1)}
          disabled={valor >= max}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-xl font-semibold text-sky-700 transition hover:border-sky-400 hover:bg-sky-50 active:bg-sky-100 disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
          aria-label={`Sumar ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
