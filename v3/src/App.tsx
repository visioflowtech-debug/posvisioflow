import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Register from './pages/Register';
import Products from './pages/Products';
import POS from './pages/POS';
import SalesHistory from './pages/SalesHistory';
import Settings from './pages/Settings';
import Dashboard from './pages/DashboardPage';
import Purchases from './pages/Purchases';
import Expenses from './pages/Expenses';
import FinancialReports from './pages/FinancialReports';
import Team from './pages/Team';
import SuperAdmin from './pages/SuperAdmin';
import { Loader2, Ban } from 'lucide-react';
import { ToastProvider } from './context/ToastContext';

import { useCompanyProfile, type UserRole } from './hooks/useCompanyProfile';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { role, loading: roleLoading, isSuperAdmin, isSuspended } = useCompanyProfile();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" />;
  }

  // Suspended Check
  if (isSuspended) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <div className="bg-red-100 p-4 rounded-full mb-4">
          <Ban className="w-12 h-12 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Cuenta Suspendida</h1>
        <p className="text-gray-600 mb-8 max-w-md">
          El acceso a esta empresa ha sido deshabilitado por un administrador.
          Contacta a soporte para más información.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    );
  }

  // Super Admin Bypass
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/super-admin"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <SuperAdmin />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <ProtectedRoute>
                <Products />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <POS />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales-history"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <SalesHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <Purchases />
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <Expenses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/financial-reports"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <FinancialReports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <Team />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
