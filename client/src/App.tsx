import React, { useState, useEffect } from 'react';
import { DisplayPage } from './pages/DisplayPage';
import { AdminPage } from './pages/AdminPage';
import { AdminLoginPage } from './pages/AdminLoginPage';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<'display' | 'admin'>(() => {
    return window.location.pathname.includes('/admin') ? 'admin' : 'display';
  });

  const [authToken, setAuthToken] = useState<string | null>(() => {
    return localStorage.getItem('tim_admin_token') || sessionStorage.getItem('tim_admin_token');
  });

  const handleLoginSuccess = (token: string, user: any) => {
    localStorage.setItem('tim_admin_token', token);
    localStorage.setItem('tim_admin_user', JSON.stringify(user));
    setAuthToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('tim_admin_token');
    localStorage.removeItem('tim_admin_user');
    sessionStorage.removeItem('tim_admin_token');
    sessionStorage.removeItem('tim_admin_user');
    setAuthToken(null);
  };

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
      document.body.style.height = '100dvh';
    }
  }, [currentRoute]);

  const renderAdminView = () => {
    if (!authToken) {
      return <AdminLoginPage onLoginSuccess={handleLoginSuccess} />;
    }
    return <AdminPage onLogout={handleLogout} />;
  };

  return (
    <div className={`w-full relative ${
      currentRoute === 'admin' 
        ? 'min-h-screen overflow-y-auto bg-[#070C18]' 
        : 'w-screen h-[100dvh] overflow-hidden bg-[#001438]'
    }`}>
      {/* Roteamento Seguro: Admin protegido com autenticação ou Display autônomo */}
      {currentRoute === 'admin' ? renderAdminView() : <DisplayPage />}
    </div>
  );
}
