import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const Layout = () => {
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden flex-col md:flex-row">
      <Sidebar />
      <main className="flex-1 overflow-y-auto md:ml-64 pt-16 pb-20 md:pt-0 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
};
