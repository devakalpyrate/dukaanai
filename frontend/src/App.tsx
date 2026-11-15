import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Mic, Package, ArrowLeftRight, BarChart3, Settings } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AuthModal } from './components/AuthModal';
import { OverviewPage } from './pages/OverviewPage';
import { CustomersPage } from './pages/CustomersPage';
import { ProductsPage } from './pages/ProductsPage';
import { SalesPage } from './pages/SalesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { VoiceAssistantPage } from './pages/VoiceAssistantPage';
import { DocsPage } from './pages/DocsPage';
import { PageId, UserProfile } from './types';

const API_BASE = typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000';

const pagePathMap: Record<PageId, string> = {
  overview: '/home',
  'voice-assistant': '/assistant',
  customers: '/customers',
  products: '/products',
  sales: '/sales',
  reports: '/reports',
  settings: '/settings',
  docs: '/docs',
};

const pathToPageMap: Record<string, PageId> = {
  '/home': 'overview',
  '/': 'overview',
  '/assistant': 'voice-assistant',
  '/customers': 'customers',
  '/products': 'products',
  '/sales': 'sales',
  '/reports': 'reports',
  '/settings': 'settings',
  '/docs': 'docs',
};

const getInitialUser = (): UserProfile | null => {
  try {
    const token = localStorage.getItem('dukaanai_token');
    const savedUserStr = localStorage.getItem('dukaanai_user');
    if (token && savedUserStr) {
      const u = JSON.parse(savedUserStr);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: 'Store Owner',
        shop_id: u.shop_id,
        shop_name: u.shop_name,
      };
    }
  } catch {}
  return null;
};

const getInitialDocSection = (): string => {
  if (typeof window === 'undefined') return 'welcome';
  const path = window.location.pathname;
  if (path.startsWith('/docs/')) {
    return path.split('/docs/')[1] || 'welcome';
  }
  return 'welcome';
};

const getInitialPage = (initialUser: UserProfile | null): PageId => {
  if (typeof window === 'undefined') return 'overview';
  const path = window.location.pathname;
  if (path.startsWith('/docs')) return 'docs';
  if (!initialUser) return 'overview';
  if (path === '/login' || path === '/') return 'overview';
  return pathToPageMap[path] || 'overview';
};

export const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(getInitialUser);
  const [currentPage, setCurrentPage] = useState<PageId>(() => getInitialPage(getInitialUser()));
  const [previousPage, setPreviousPage] = useState<PageId>('overview');
  const [docSubSection, setDocSubSection] = useState<string>(getInitialDocSection);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (page: PageId) => {
    if (currentPage !== 'docs' && page === 'docs') {
      setPreviousPage(currentPage);
    }
    setCurrentPage(page);
    setMobileMenuOpen(false);
    const targetPath = pagePathMap[page] || '/home';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  useEffect(() => {
    const currentPath = window.location.pathname;

    if (currentPath.startsWith('/docs')) {
      const parts = currentPath.split('/docs/')[1];
      if (parts) {
        setDocSubSection(parts);
      }
      setCurrentPage('docs');
      return;
    }

    if (user) {
      if (currentPath === '/login' || currentPath === '/') {
        window.history.replaceState(null, '', '/home');
        setCurrentPage('overview');
      } else if (pathToPageMap[currentPath]) {
        setCurrentPage(pathToPageMap[currentPath]);
      }
    } else {
      if (currentPath !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
    }
  }, [user]);

  useEffect(() => {
    const onPopState = () => {
      const currentPath = window.location.pathname;

      if (currentPath.startsWith('/docs')) {
        const parts = currentPath.split('/docs/')[1];
        if (parts) {
          setDocSubSection(parts);
        }
        setCurrentPage('docs');
        return;
      }

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
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage user={user} onUpdateUser={handleUpdateUser} />;
      case 'docs':
        return <DocsPage onBackToApp={() => handleNavigate(previousPage || 'overview')} initialSection={docSubSection} />;
      default:
        return <OverviewPage onOpenVoice={() => handleNavigate('voice-assistant')} onNavigate={handleNavigate} />;
    }
  };

  if (currentPage === 'docs') {
    return <DocsPage onBackToApp={() => handleNavigate(previousPage || 'overview')} initialSection={docSubSection} />;
  }

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
            mobileOpen={mobileMenuOpen}
            onCloseMobileMenu={() => setMobileMenuOpen(false)}
          />

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <Header
              user={user}
              onNavigate={handleNavigate}
              onLogout={handleLogout}
              onOpenVoice={() => handleNavigate('voice-assistant')}
              onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
            />

            <main
              className={`flex-1 min-w-0 ${
                currentPage === 'voice-assistant'
                  ? 'overflow-hidden p-0 flex flex-col min-h-0 relative'
                  : currentPage === 'customers'
                  ? 'overflow-hidden p-3 md:p-4 flex flex-col min-h-0 relative'
                  : 'overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8 custom-scrollbar pb-20 md:pb-6'
              }`}
            >
              <div
                className={`w-full ${
                  currentPage === 'voice-assistant' || currentPage === 'customers'
                    ? 'h-full flex flex-col min-h-0 relative'
                    : 'max-w-7xl mx-auto'
                }`}
              >
                {renderCurrentPage()}
              </div>
            </main>

            {/* Mobile Bottom Navigation Bar (7 options: 3 left + Center Goal Mic + 3 right) */}
            <nav className="md:hidden h-16 border-t border-[var(--border-color)] bg-[#0E1217]/95 backdrop-blur-md px-1 flex items-center justify-between shrink-0 z-30 select-none">
              {/* 1. Home */}
              <button
                onClick={() => handleNavigate('overview')}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[9px] font-bold cursor-pointer transition-colors ${
                  currentPage === 'overview' ? 'text-[#FFD026]' : 'text-[#8B949E] hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 mb-0.5" />
                <span className="truncate max-w-[46px] leading-tight">Home</span>
              </button>

              {/* 2. Khata */}
              <button
                onClick={() => handleNavigate('customers')}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[9px] font-bold cursor-pointer transition-colors ${
                  currentPage === 'customers' ? 'text-[#FFD026]' : 'text-[#8B949E] hover:text-white'
                }`}
              >
                <Users className="w-4 h-4 mb-0.5" />
                <span className="truncate max-w-[46px] leading-tight">Khata</span>
              </button>

              {/* 3. Products */}
              <button
                onClick={() => handleNavigate('products')}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[9px] font-bold cursor-pointer transition-colors ${
                  currentPage === 'products' ? 'text-[#FFD026]' : 'text-[#8B949E] hover:text-white'
                }`}
              >
                <Package className="w-4 h-4 mb-0.5" />
                <span className="truncate max-w-[46px] leading-tight">Products</span>
              </button>

              {/* 4. Central Elevated Goal Mic Button */}
              <div className="shrink-0 px-1 -mt-5">
                <button
                  onClick={() => handleNavigate('voice-assistant')}
                  className={`w-12 h-12 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-95 border-2 border-[#1E232B] shadow-lg ${
                    currentPage === 'voice-assistant'
                      ? 'bg-[#FFD026] text-black shadow-amber-500/40 ring-2 ring-[#FFD026]/50'
                      : 'bg-[#FFD026] text-black shadow-amber-500/25 hover:scale-105'
                  }`}
                  title="Voice Assistant"
                  aria-label="Voice Assistant"
                >
                  <Mic className="w-6 h-6 stroke-[2.4]" />
                </button>
              </div>

              {/* 5. Sales */}
              <button
                onClick={() => handleNavigate('sales')}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[9px] font-bold cursor-pointer transition-colors ${
                  currentPage === 'sales' ? 'text-[#FFD026]' : 'text-[#8B949E] hover:text-white'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4 mb-0.5" />
                <span className="truncate max-w-[46px] leading-tight">Sales</span>
              </button>

              {/* 6. Reports */}
              <button
                onClick={() => handleNavigate('reports')}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[9px] font-bold cursor-pointer transition-colors ${
                  currentPage === 'reports' ? 'text-[#FFD026]' : 'text-[#8B949E] hover:text-white'
                }`}
              >
                <BarChart3 className="w-4 h-4 mb-0.5" />
                <span className="truncate max-w-[46px] leading-tight">Reports</span>
              </button>

              {/* 7. Settings */}
              <button
                onClick={() => handleNavigate('settings')}
                className={`flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl text-[9px] font-bold cursor-pointer transition-colors ${
                  currentPage === 'settings' ? 'text-[#FFD026]' : 'text-[#8B949E] hover:text-white'
                }`}
              >
                <Settings className="w-4 h-4 mb-0.5" />
                <span className="truncate max-w-[46px] leading-tight">Settings</span>
              </button>
            </nav>
          </div>
        </>
      )}
    </div>
  );
};
