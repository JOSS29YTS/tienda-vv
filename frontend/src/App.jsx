import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import UsersPage from './pages/dashboard/UsersPage';
import ProductsPage from './pages/dashboard/ProductsPage';
import SalesPage from './pages/dashboard/SalesPage';

import ClientsPage from './pages/dashboard/ClientsPage';
import PurchasesPage from './pages/dashboard/PurchasesPage';
import InventoryPage from './pages/dashboard/InventoryPage';
import HistoryPage from './pages/dashboard/HistoryPage';
import InvoicesPage from './pages/dashboard/InvoicesPage';
import FinancesPage from './pages/dashboard/FinancesPage';
import ProfitLossPage from './pages/dashboard/ProfitLossPage';
import CommissionsPage from './pages/dashboard/CommissionsPage';
import BankPage from './pages/dashboard/BankPage';
import GastosPage from './pages/dashboard/GastosPage';


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
import { RateProvider } from './context/RateContext';
import { StoreProvider } from './context/StoreContext';

import ProtectedRoute from './components/auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <RateProvider>
        <StoreProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Protected Dashboard Routes */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<DashboardHome />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="inventory" element={
                  <ProtectedRoute allowedRoles={['administrador', 'gerente']}>
                    <InventoryPage />
                  </ProtectedRoute>
                } />
                <Route path="sales" element={<SalesPage />} />
                <Route path="purchases" element={<PurchasesPage />} />
                <Route path="clients" element={<ClientsPage />} />
                <Route path="invoices" element={
                  <ProtectedRoute allowedRoles={['administrador', 'gerente']}>
                    <InvoicesPage />
                  </ProtectedRoute>
                } />
                <Route path="commissions" element={
                  <ProtectedRoute allowedRoles={['administrador', 'gerente']}>
                    <CommissionsPage />
                  </ProtectedRoute>
                } />
                <Route path="bank" element={
                  <ProtectedRoute allowedRoles={['administrador', 'gerente']}>
                    <BankPage />
                  </ProtectedRoute>
                } />
                <Route path="finances" element={
                  <ProtectedRoute allowedRoles={['administrador', 'gerente']}>
                    <FinancesPage />
                  </ProtectedRoute>
                } />
                <Route path="profit-loss" element={
                  <ProtectedRoute allowedRoles={['administrador', 'gerente']}>
                    <ProfitLossPage />
                  </ProtectedRoute>
                } />
                <Route path="gastos" element={
                  <ProtectedRoute allowedRoles={['administrador', 'gerente']}>
                    <GastosPage />
                  </ProtectedRoute>
                } />
                <Route path="users" element={<UsersPage />} />
                <Route path="history" element={<HistoryPage />} />
              </Route>



              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes >
          </BrowserRouter >
        </StoreProvider>
      </RateProvider>
    </AuthProvider >
  );
}

export default App;
