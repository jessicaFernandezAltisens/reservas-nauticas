import { Link } from 'react-router-dom';

export default function NoEncontrado() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-6xl">🌊</p>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">Página no encontrada</h1>
      <p className="mt-2 text-slate-500">Parece que esta ruta se la ha llevado la marea.</p>
      <Link to="/" className="btn-primario mt-6">Volver al inicio</Link>
    </div>
  );
}
