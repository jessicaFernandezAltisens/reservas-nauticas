import { ESTADOS } from '../lib/storage';

const COLORES = {
  reprogramar: 'bg-amber-100 text-amber-800 ring-amber-200',
  confirmada: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  cancelada: 'bg-rose-100 text-rose-800 ring-rose-200',
};

export default function EstadoBadge({ estado }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${COLORES[estado] ?? ''}`}>
      {ESTADOS[estado] ?? estado}
    </span>
  );
}
