import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Sales } from './pages/Sales';
import { Warehouse } from './pages/Warehouse';
import { Expenses } from './pages/Expenses';
import { Debts } from './pages/Debts';
import { PnL } from './pages/PnL';
import { AdminPanel } from './pages/AdminPanel';
import { SuperAdminPanel } from './pages/SuperAdminPanel';
import { Auth } from './components/Auth';
import { seedDatabase } from './lib/db';
import { useStore } from './store/useStore';

export default function App() {
  const { currentUser } = useStore();

  useEffect(() => {
    seedDatabase();
  }, []);

  if (!currentUser) {
    return <Auth />;
  }

  return (
    <div>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to={currentUser.role === 'superadmin' ? '/requests' : currentUser.role === 'warehouse' ? '/warehouse' : '/sales'} replace />} />
            
            {/* Super Admin Only */}
            {currentUser.role === 'superadmin' && (
              <Route path="requests" element={<SuperAdminPanel />} />
            )}

            {/* Cashier & Admin */}
            {(currentUser.role === 'cashier' || currentUser.role === 'admin') && (
              <>
                <Route path="sales" element={<Sales />} />
                <Route path="debts" element={<Debts />} />
              </>
            )}

            {/* Warehouse & Admin */}
            {(currentUser.role === 'warehouse' || currentUser.role === 'admin') && (
              <Route path="warehouse" element={<Warehouse />} />
            )}

            {/* Admin Only */}
            {currentUser.role === 'admin' && (
              <>
                <Route path="expenses" element={<Expenses />} />
                <Route path="pnl" element={<PnL />} />
                <Route path="admin" element={<AdminPanel />} />
              </>
            )}

            <Route path="*" element={<Navigate to={currentUser.role === 'superadmin' ? '/requests' : currentUser.role === 'warehouse' ? '/warehouse' : '/sales'} replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

