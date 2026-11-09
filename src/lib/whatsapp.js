// Enlaces wa.me. Los números uruguayos locales («099 123 456») se pasan a formato internacional (598…).
export function numeroInternacional(telefono) {
  let d = String(telefono || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('598')) return d;
  if (d.startsWith('0')) return `598${d.slice(1)}`;
  if (d.length === 8) return `598${d}`;
  return d;
}

export const linkWhatsApp = (telefono, texto = '') =>
  `https://wa.me/${numeroInternacional(telefono)}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`;
