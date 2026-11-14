import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { OverviewPage } from './pages/OverviewPage';
import { CustomersPage } from './pages/CustomersPage';
import { ProductsPage } from './pages/ProductsPage';
import { SalesPage } from './pages/SalesPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { BillingPage } from './pages/BillingPage';
import { AutomationPage } from './pages/AutomationPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { VoiceAssistantPage } from './pages/VoiceAssistantPage';
import { PageId, UserProfile } from './types';

const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000';

const pagePathMap: Record<PageId, string> = {
  overview: '/home',
  'voice-assistant': '/assistant',
  customers: '/customers',
  products: '/products',
  sales: '/sales',
  suppliers: '/suppliers',
  billing: '/billing',
  automation: '/automation',
  reports: '/reports',
  settings: '/settings',
};

const pathToPageMap: Record<string, PageId> = {
  '/home': 'overview',
  '/': 'overview',
  '/assistant': 'voice-assistant',
  '/customers': 'customers',
  '/products': 'products',
  '/sales': 'sales',
  '/suppliers': 'suppliers',
  '/billing': 'billing',
  '/automation': 'automation',
  '/reports': 'reports',
  '/settings': 'settings',
};

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page);
    const targetPath = pagePathMap[page] || '/home';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('dukaanai_token');
    const savedUserStr = localStorage.getItem('dukaanai_user');
    const currentPath = window.location.pathname;

    if (token && savedUserStr) {
      try {
        const u = JSON.parse(savedUserStr);
        setUser({
          id: u.id,
          name: u.name,
          email: u.email,
          role: 'Store Owner',
          shop_id: u.shop_id,
          shop_name: u.shop_name,
        });

        if (currentPath === '/login' || currentPath === '/') {
          window.history.replaceState(null, '', '/home');
          setCurrentPage('overview');
        } else if (pathToPageMap[currentPath]) {
          setCurrentPage(pathToPageMap[currentPath]);
        } else {
          window.history.replaceState(null, '', '/home');
          setCurrentPage('overview');
        }
        return;
      } catch {}
    }

    setUser(null);
    if (currentPath !== '/login') {
      window.history.replaceState(null, '', '/login');
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const currentPath = window.location.pathname;
      const token = localStorage.getItem('dukaanai_token');

      if (!token) {
        if (currentPath !== '/login') {
          window.history.replaceState(null, '', '/login');
        }
        return;
      }

      if (currentPath === '/login' || currentPath === '/') {
        window.history.replaceState(null, '', '/home');
        setCurrentPage('overview');
      } else if (pathToPageMap[currentPath]) {
        setCurrentPage(pathToPageMap[currentPath]);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleUpdateUser = (updated: Partial<UserProfile>) => {
    if (!user) return;
    const nextUser = { ...user, ...updated };
    setUser(nextUser);
    localStorage.setItem(
      'dukaanai_user',
      JSON.stringify({
        id: nextUser.id,
        name: nextUser.name,
        email: nextUser.email,
        shop_id: nextUser.shop_id,
        shop_name: nextUser.shop_name,
      })
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('dukaanai_token');
    localStorage.removeItem('dukaanai_user');
    setUser(null);
    window.history.pushState(null, '', '/login');
    setCurrentPage('overview');
  };

  const handleAuthSuccess = (data: any) => {
    setUser({
      id: data.user_id,
      name: data.name,
      email: data.email,
      role: 'Store Owner',
      shop_id: data.shop_id,
      shop_name: data.shop_name,
    });
    window.history.pushState(null, '', '/home');
    setCurrentPage('overview');
  };

  const renderCurrentPage = () => {
    if (!user) return null;
    switch (currentPage) {
      case 'overview':
        return <OverviewPage onOpenVoice={() => handleNavigate('voice-assistant')} onNavigate={handleNavigate} />;
      case 'voice-assistant':
        return <VoiceAssistantPage />;
      case 'customers':
        return <CustomersPage />;
      case 'products':
        return <ProductsPage />;
      case 'sales':
        return <SalesPage />;
      case 'suppliers':
        return <SuppliersPage />;
      case 'billing':
        return <BillingPage />;
      case 'automation':
        return <AutomationPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage user={user} onUpdateUser={handleUpdateUser} />;
      default:
        return <OverviewPage onOpenVoice={() => handleNavigate('voice-assistant')} onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-app)] text-[var(--text-primary)]">
      <div className="fixed -top-32 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed -bottom-32 right-1/4 w-[550px] h-[550px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {!user ? (
        <AuthModal
          isOpen={true}
          apiBase={API_BASE}
          onSuccess={handleAuthSuccess}
        />
      ) : (
        <>
          <Sidebar
            currentPage={currentPage}
            onSelectPage={handleNavigate}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            shopName={user.shop_name}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Header
              user={user}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              onOpenVoice={() => handleNavigate('voice-assistant')}
            />

            <main
              className={`flex-1 min-w-0 ${
                currentPage === 'voice-assistant'
                  ? 'overflow-hidden p-2 md:p-3 flex flex-col min-h-0'
                  : 'overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-thin'
              }`}
            >
              <div
                className={`w-full ${
                  currentPage === 'voice-assistant'
                    ? 'max-w-5xl mx-auto h-full flex flex-col min-h-0'
                    : 'max-w-7xl mx-auto'
                }`}
              >
                {renderCurrentPage()}
              </div>
            </main>
          </div>
        </>
      )}
    </div>
  );
};
