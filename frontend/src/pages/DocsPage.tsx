import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Terminal,
  Layers,
  Database,
  Cpu,
  Code2,
  ShieldCheck,
  Share2,
  Wrench,
  History,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { DOC_CATEGORIES } from '../docs/docsData';
import { getDocPage, getAdjacentPages, ALL_DOC_PAGES } from '../docs/docsRegistry';

interface DocsPageProps {
  onBackToApp?: () => void;
  initialSection?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  '01': <Terminal className="w-4 h-4 text-[#FFD026]" />,
  '02': <BookOpen className="w-4 h-4 text-[#FFD026]" />,
  '03': <Layers className="w-4 h-4 text-[#FFD026]" />,
  '04': <Database className="w-4 h-4 text-[#FFD026]" />,
  '05': <Cpu className="w-4 h-4 text-[#FFD026]" />,
  '06': <Code2 className="w-4 h-4 text-[#FFD026]" />,
  '07': <ShieldCheck className="w-4 h-4 text-[#FFD026]" />,
  '08': <Share2 className="w-4 h-4 text-[#FFD026]" />,
  '09': <Wrench className="w-4 h-4 text-[#FFD026]" />,
  '10': <History className="w-4 h-4 text-[#FFD026]" />,
};

export const DocsPage: React.FC<DocsPageProps> = ({ onBackToApp, initialSection }) => {
  const [activePageId, setActivePageId] = useState<string>(() => {
    if (initialSection && ALL_DOC_PAGES[initialSection]) {
      return initialSection;
    }
    return 'intro';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const parentCategory = DOC_CATEGORIES.find((cat) =>
      cat.items.some((item) => item.id === activePageId)
    );
    if (parentCategory) {
      setCollapsedCategories((prev) => ({
        ...prev,
        [parentCategory.id]: false,
      }));
    }
  }, [activePageId]);

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleSelectPage = (pageId: string) => {
    setActivePageId(pageId);
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.history && window.history.pushState) {
      window.history.pushState(null, '', `/docs/${pageId}`);
    }
  };

  const scrollToHeading = (headingId: string) => {
    const el = document.getElementById(headingId);
    if (el) {
      const yOffset = -80;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const currentPage = useMemo(() => getDocPage(activePageId), [activePageId]);
  const { prev, next } = useMemo(() => getAdjacentPages(activePageId), [activePageId]);

  useEffect(() => {
    if (currentPage && currentPage.title) {
      document.title = `${currentPage.title} - Documentation | DukaanAI`;
    } else {
      document.title = 'Documentation | DukaanAI';
    }
  }, [currentPage]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return DOC_CATEGORIES;
    const q = searchQuery.toLowerCase();
    return DOC_CATEGORIES.map((cat) => {
      const matchingItems = cat.items.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          cat.title.toLowerCase().includes(q)
      );
      return {
        ...cat,
        items: matchingItems,
      };
    }).filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-[#090B0E] text-[#E6EDF3] flex flex-col font-sans selection:bg-[#FFD026]/30 selection:text-[#FFD026]">
      {/* Top Navbar spanning full width flush */}
      <header className="sticky top-0 z-40 border-b border-[#1E232B] bg-[#0E1217]/95 backdrop-blur-md px-4 lg:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="lg:hidden p-1.5 rounded-lg border border-[#1E232B] bg-[#12161F] text-[#8B949E] hover:text-[#FFD026]"
            aria-label="Open documentation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="hidden lg:flex p-1.5 rounded-lg border border-[#1E232B] bg-[#12161F] text-[#8B949E] hover:text-[#FFD026] hover:border-[#FFD026]/40 transition-all duration-200 cursor-pointer active:scale-95"
            title={isSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#FFD026] text-black font-black text-sm flex items-center justify-center border border-[#E6B800] shadow-sm">
              द
            </div>
            <span className="font-extrabold tracking-tight text-base text-white">
              Dukaan<span className="text-[#FFD026]">AI</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-[#FFD026]/10 text-[#FFD026] border border-[#FFD026]/20 font-bold font-mono">
              v1.2 Docs
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg border border-[#1E232B] bg-[#12161F] hover:bg-[#1E232B] text-[#E6EDF3] transition-colors font-medium shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#FFD026]" />
              <span>Back to App</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container - Left Sidebar attached flush to screen left edge */}
      <div className="flex-1 flex w-full relative">
        {/* Left Navigation Sidebar (Desktop) - Flush with left screen border & smooth sliding animation */}
        <aside
          className={`hidden lg:flex flex-col shrink-0 border-r border-[#1E232B] bg-[#0B0E14] sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto transition-all duration-300 ease-in-out ${
            isSidebarOpen
              ? 'w-72 p-4 opacity-100 translate-x-0'
              : 'w-0 p-0 border-r-0 opacity-0 -translate-x-full pointer-events-none overflow-hidden'
          }`}
        >
          <div className="w-64">
            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8B949E]" />
              <input
                type="text"
                placeholder="Search documentation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#161B22] border border-[#30363D] text-xs text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FFD026] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-[#8B949E] hover:text-[#FFD026] text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Navigation Tree with smooth transitions */}
            <nav className="space-y-3.5 text-xs">
              {filteredCategories.map((category) => {
                const isCollapsed = Boolean(collapsedCategories[category.id] && !searchQuery);
                const hasActivePage = category.items.some((i) => i.id === activePageId);

                return (
                  <div key={category.id} className="space-y-1">
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left font-bold transition-all duration-200 cursor-pointer ${
                        hasActivePage
                          ? 'text-[#FFD026] bg-[#FFD026]/10'
                          : 'text-[#C9D1D9] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {CATEGORY_ICONS[category.number]}
                        <span className="font-mono text-[11px] text-[#8B949E]">{category.number}.</span>
                        <span className="text-xs">{category.title}</span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 text-[#8B949E] transition-transform duration-200 ${
                          isCollapsed ? 'rotate-0' : 'rotate-90 text-[#FFD026]'
                        }`}
                      />
                    </button>

                    <div
                      className={`ml-4 pl-2 border-l border-[#1E232B] space-y-0.5 transition-all duration-200 ease-in-out ${
                        isCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[500px] opacity-100'
                      }`}
                    >
                      {category.items.map((item) => {
                        const isActive = item.id === activePageId;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectPage(item.id)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-all duration-150 flex items-center justify-between cursor-pointer ${
                              isActive
                                ? 'bg-[#FFD026] text-black font-bold shadow-sm'
                                : 'text-[#8B949E] hover:text-[#E6EDF3] hover:bg-white/5'
                            }`}
                          >
                            <span className="truncate">{item.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileDrawerOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
              onClick={() => setMobileDrawerOpen(false)}
            />
            <div className="relative w-80 max-w-[85vw] bg-[#0E1217] border-r border-[#1E232B] p-4 h-full overflow-y-auto z-10 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#1E232B]">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded bg-[#FFD026] text-black font-black text-xs flex items-center justify-center">
                      द
                    </div>
                    <span className="font-bold text-sm text-white">DukaanAI Documentation</span>
                  </div>
                  <button onClick={() => setMobileDrawerOpen(false)} className="p-1 rounded text-[#8B949E] hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Search docs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-[#161B22] border border-[#30363D] text-xs text-white placeholder-[#8B949E] focus:outline-none focus:border-[#FFD026]"
                  />
                </div>

                <nav className="mt-4 space-y-3 text-xs">
                  {filteredCategories.map((cat) => (
                    <div key={cat.id} className="space-y-1">
                      <div className="font-bold text-[#FFD026] flex items-center space-x-2 px-1">
                        {CATEGORY_ICONS[cat.number]}
                        <span>{cat.number}. {cat.title}</span>
                      </div>
                      <div className="pl-4 border-l border-[#1E232B] space-y-0.5">
                        {cat.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleSelectPage(item.id)}
                            className={`w-full text-left px-2 py-1 rounded text-xs ${
                              item.id === activePageId
                                ? 'bg-[#FFD026] text-black font-bold'
                                : 'text-[#8B949E] hover:text-white'
                            }`}
                          >
                            {item.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
              </div>

              {onBackToApp && (
                <button
                  onClick={onBackToApp}
                  className="mt-6 w-full flex items-center justify-center space-x-2 py-2 rounded-lg bg-[#12161F] border border-[#1E232B] text-[#E6EDF3] text-xs font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-[#FFD026]" />
                  <span>Return to Main App</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Center Main Content & Right TOC area with smooth flex adaptation */}
        <div className="flex-1 flex justify-center min-w-0 transition-all duration-300 ease-in-out">
          <div className="flex-1 flex max-w-6xl justify-between px-4 sm:px-8 lg:px-12 py-8 lg:py-10 gap-8">
            <main className="flex-1 min-w-0 max-w-3xl">
              {/* Breadcrumb Navigation */}
              <nav className="flex items-center space-x-1.5 text-xs text-[#8B949E] mb-4 font-mono">
                <span>Docs</span>
                <ChevronRight className="w-3 h-3 text-[#30363D]" />
                <span>{currentPage.categoryNumber}. {currentPage.categoryTitle}</span>
                <ChevronRight className="w-3 h-3 text-[#30363D]" />
                <span className="text-[#FFD026] font-medium">{currentPage.title}</span>
              </nav>

              {/* Page Header */}
              <div className="pb-6 mb-8 border-b border-[#1E232B]">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#FFD026]/10 text-[#FFD026] border border-[#FFD026]/30">
                    Section {currentPage.categoryNumber}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {currentPage.title}
                </h1>
                <p className="mt-2 text-sm sm:text-base text-[#8B949E] leading-relaxed">
                  {currentPage.subtitle}
                </p>
              </div>

              {/* Active Page Content */}
              <div className="text-[#C9D1D9] text-sm leading-relaxed">
                {currentPage.content}
              </div>

              {/* Bottom Next / Prev Navigation Cards */}
              <div className="mt-12 pt-6 border-t border-[#1E232B] flex flex-col sm:flex-row items-center justify-between gap-4">
                {prev ? (
                  <button
                    onClick={() => handleSelectPage(prev.id)}
                    className="w-full sm:w-1/2 p-4 rounded-xl border border-[#1E232B] bg-[#12161F] hover:bg-[#161B22] hover:border-[#FFD026]/50 text-left transition-all duration-200 group cursor-pointer"
                  >
                    <div className="flex items-center space-x-1 text-xs text-[#8B949E] group-hover:text-[#FFD026]">
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </div>
                    <div className="text-sm font-bold text-white mt-1 truncate">
                      {prev.title}
                    </div>
                  </button>
                ) : (
                  <div className="hidden sm:block sm:w-1/2" />
                )}

                {next ? (
                  <button
                    onClick={() => handleSelectPage(next.id)}
                    className="w-full sm:w-1/2 p-4 rounded-xl border border-[#1E232B] bg-[#12161F] hover:bg-[#161B22] hover:border-[#FFD026]/50 text-right transition-all duration-200 group cursor-pointer"
                  >
                    <div className="flex items-center justify-end space-x-1 text-xs text-[#8B949E] group-hover:text-[#FFD026]">
                      <span>Next</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-sm font-bold text-white mt-1 truncate">
                      {next.title}
                    </div>
                  </button>
                ) : (
                  <div className="hidden sm:block sm:w-1/2" />
                )}
              </div>
            </main>

            {/* Right Column: "On This Page" Table of Contents (TOC) */}
            <aside className="hidden xl:block w-64 shrink-0 p-6 sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto">
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>On This Page</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD026]" />
              </div>
              {currentPage.headings.length > 0 ? (
                <ul className="space-y-2 text-xs">
                  {currentPage.headings.map((heading) => (
                    <li key={heading.id} className={heading.level === 3 ? 'pl-3' : ''}>
                      <button
                        onClick={() => scrollToHeading(heading.id)}
                        className="text-left text-[#8B949E] hover:text-[#FFD026] transition-colors leading-relaxed block truncate w-full cursor-pointer"
                      >
                        {heading.text}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#8B949E]">Overview content</p>
              )}

              <div className="mt-8 pt-4 border-t border-[#1E232B] text-[11px] text-[#8B949E] space-y-1.5">
                <p className="font-semibold text-white">DukaanAI Documentation</p>
                <p className="text-[#8B949E]">Voice Operating System for Retail</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};
