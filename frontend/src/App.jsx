import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';

// Placeholder components
const PlaceholderComponent = ({ title }) => (
  <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 min-h-[400px] flex flex-col items-center justify-center text-center">
    <div className="bg-slate-50 p-6 rounded-full mb-4">
      <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    </div>
    <h2 className="text-3xl font-bold mb-2 font-heading text-slate-800">{title}</h2>
    <p className="text-slate-500 max-w-md">
      Esta sección está en construcción. Pronto podrás gestionar {title.toLowerCase()} aquí con la nueva interfaz.
    </p>
  </div>
);

import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="products" element={<PlaceholderComponent title="Productos" />} />
            <Route path="inventory" element={<PlaceholderComponent title="Inventario" />} />
            <Route path="sales" element={<PlaceholderComponent title="Ventas" />} />
            <Route path="purchases" element={<PlaceholderComponent title="Compras" />} />
            <Route path="clients" element={<PlaceholderComponent title="Clientes" />} />
            <Route path="history" element={<PlaceholderComponent title="Historial" />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
