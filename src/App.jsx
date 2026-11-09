import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Inicio from './pages/Inicio.jsx';
import Reservar from './pages/Reservar.jsx';
import Confirmacion from './pages/Confirmacion.jsx';
import MiReserva from './pages/MiReserva.jsx';
import Admin from './pages/Admin.jsx';
import NoEncontrado from './pages/NoEncontrado.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Inicio />} />
        <Route path="/reservar" element={<Reservar />} />
        <Route path="/confirmacion/:codigo" element={<Confirmacion />} />
        <Route path="/confirmacion" element={<Confirmacion />} />
        <Route path="/mi-reserva" element={<MiReserva />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  );
}
