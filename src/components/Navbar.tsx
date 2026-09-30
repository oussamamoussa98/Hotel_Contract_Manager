import React from 'react';
import {
  LayoutDashboard,
  FileText,
  ClockAlert,
  Building2,
  PlusCircle,
  Menu,
  X,
  Compass,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { User } from '../types';

export type MainTab = 'dashboard' | 'contracts' | 'pending' | 'hotels' | 'users';

interface NavbarProps {
  currentTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
  pendingCount: number;
  totalCount: number;
  onOpenAddContract: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  pendingCount,
  totalCount,
  onOpenAddContract,
  currentUser,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const handleTabClick = (tab: MainTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div className="flex items-center gap-3">
            <button
              id="brand-home-button"
              onClick={() => handleTabClick('dashboard')}
              className="flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg p-1"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm ring-1 ring-white/20">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg tracking-tight text-white block leading-tight">
                  Hotel Contract Manager
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Navigation principale">
            <button
              id="nav-tab-dashboard"
              onClick={() => handleTabClick('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              id="nav-tab-contracts"
              onClick={() => handleTabClick('contracts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'contracts'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Contrats</span>
              {totalCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-slate-800 text-slate-300 rounded-full">
                  {totalCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-pending"
              onClick={() => handleTabClick('pending')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                currentTab === 'pending'
                  ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50'
                  : 'text-rose-300 hover:text-white hover:bg-rose-950/60 border border-rose-900/60'
              }`}
            >
              <ClockAlert className="w-4 h-4 text-rose-300" />
              <span>Non saisis</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-black bg-white text-rose-700 rounded-full shadow-2xs animate-pulse">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              id="nav-tab-hotels"
              onClick={() => handleTabClick('hotels')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentTab === 'hotels'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Hôtels</span>
            </button>

            {currentUser?.role === 'ADMIN' && (
              <button
                id="nav-tab-users"
                onClick={() => handleTabClick('users')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  currentTab === 'users'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Utilisateurs</span>
              </button>
            )}
          </nav>

          {/* Quick Action Button & User Session */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              id="btn-open-add-contract-nav"
              onClick={onOpenAddContract}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Contrat</span>
            </button>

            {currentUser && (
              <div
                id="user-session-badge"
                className="flex items-center gap-3 pl-3 border-l border-slate-700/80"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div className="text-left leading-tight hidden lg:block">
                    <div className="text-xs font-semibold text-slate-200 truncate max-w-[130px]">
                      {currentUser.name}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {currentUser.role === 'ADMIN' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-700/70 tracking-wide">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-700/70 tracking-wide">
                          AGENT_SAISIE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {onLogout && (
                  <button
                    id="btn-logout"
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Se déconnecter"
                    aria-label="Se déconnecter"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              id="btn-open-add-contract-mobile"
              onClick={onOpenAddContract}
              className="p-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500"
              title="Ajouter un contrat"
            >
              <PlusCircle className="w-5 h-5" />
            </button>

            <button
              id="btn-toggle-mobile-menu"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800"
              aria-label="Menu principal"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-900 px-4 pt-2 pb-4 space-y-1">
          <button
            id="mobile-nav-tab-dashboard"
            onClick={() => handleTabClick('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium ${
              currentTab === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </div>
          </button>

          <button
            id="mobile-nav-tab-contracts"
            onClick={() => handleTabClick('contracts')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium ${
              currentTab === 'contracts' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Contrats</span>
            </div>
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800">{totalCount}</span>
          </button>

          <button
            id="mobile-nav-tab-pending"
            onClick={() => handleTabClick('pending')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-semibold ${
              currentTab === 'pending' ? 'bg-rose-600 text-white' : 'text-rose-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <ClockAlert className="w-4 h-4 text-rose-300" />
              <span>Non saisis</span>
            </div>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-white text-rose-700 rounded-full font-black">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            id="mobile-nav-tab-hotels"
            onClick={() => handleTabClick('hotels')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium ${
              currentTab === 'hotels' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span>Hôtels</span>
            </div>
          </button>

          {currentUser?.role === 'ADMIN' && (
            <button
              id="mobile-nav-tab-users"
              onClick={() => handleTabClick('users')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium ${
                currentTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Utilisateurs</span>
              </div>
            </button>
          )}

          {currentUser && (
            <div className="pt-3 mt-2 border-t border-slate-800 flex items-center justify-between px-3 py-2 bg-slate-950/60 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                  <UserIcon className="w-3.5 h-3.5" />
                </div>
                <div className="text-left leading-tight">
                  <div className="text-xs font-semibold text-slate-200">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] mt-0.5">
                    {currentUser.role === 'ADMIN' ? (
                      <span className="text-emerald-400 font-bold font-mono">ADMIN</span>
                    ) : (
                      <span className="text-amber-400 font-bold font-mono">AGENT_SAISIE</span>
                    )}
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  id="btn-logout-mobile"
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg border border-rose-900/40"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Déconnexion</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </header>
  );
};
