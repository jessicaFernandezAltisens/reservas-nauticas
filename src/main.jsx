import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { inicializarDatos } from './lib/storage';
import './index.css';

// Siembra actividades, barcos, zarpes y reservas de demo solo si localStorage está vacío.
inicializarDatos();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
