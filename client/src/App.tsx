import React, { useState, useEffect } from 'react';
import { DisplayPage } from './pages/DisplayPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'display' | 'admin'>(() => {
    return window.location.pathname.includes('/admin') ? 'admin' : 'display';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname.includes('/admin') ? 'admin' : 'display');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (currentRoute === 'admin') {
      document.body.style.overflow = 'auto';
      document.body.style.height = 'auto';
    } else {
      document.body.style.overflow = 'hidden';
      document.body.style.height = '100vh';
    }
  }, [currentRoute]);

  return (
    <div className={`w-full relative ${
      currentRoute === 'admin' 
        ? 'min-h-screen overflow-y-auto bg-[#070C18]' 
        : 'w-screen h-screen overflow-hidden bg-[#001438]'
    }`}>
      {/* Apenas renderiza a tela limpa sem botões flutuantes sobrepostos */}
      {currentRoute === 'admin' ? <AdminPage /> : <DisplayPage />}
    </div>
  );
}
