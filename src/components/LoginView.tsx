import React, { useState } from 'react';
import { Compass, Lock, Mail, AlertCircle, Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import { apiService } from '../services/api';
import { User } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Veuillez saisir votre adresse email et mot de passe.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.login({
        email: email.trim(),
        password,
      });
      onLoginSuccess(response.user);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Identifiants invalides ou serveur inaccessible.');
    } finally {
      setIsLoading(false);
    }
  };

  // Raccourcis de développement pour préremplir les champs (sans exposer de mot de passe en dur en production)
  const handlePrefill = (prefillEmail: string, prefillPass: string) => {
    setEmail(prefillEmail);
    setPassword(prefillPass);
    setError(null);
  };

  return (
    <div
      id="login-view-container"
      className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden"
    >
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[550px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/30 ring-1 ring-white/20 text-white mx-auto">
            <Compass className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hotel Contract Manager
            </h1>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
          {/* Error Banner */}
          {error && (
            <div
              id="login-error-alert"
              className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="input-login-email"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Adresse email professionnelle
              </label>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="input-login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@agence-voyage.tn"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="input-login-password"
                  className="block text-xs font-semibold text-slate-300"
                >
                  Mot de passe
                </label>
              </div>
              <div className="relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-600/30 transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Vérification des identifiants...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Se connecter</span>
                </>
              )}
            </button>
          </form>

          {/* Development / Test Accounts Assistant (Safe helper for verification) */}
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Comptes de test (Phase 8 Développement)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                id="btn-dev-prefill-admin"
                type="button"
                onClick={() => handlePrefill('admin@hotelcontracts.local', 'Admin123!')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-left border border-slate-700/60 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-semibold text-blue-300">
                  <ShieldCheck className="w-3 h-3 text-blue-400" />
                  <span>Admin</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  admin@hotelcontracts.local
                </div>
                <div className="text-[9px] text-emerald-400/90 font-mono mt-0.5">
                  Accès complet + Suppr.
                </div>
              </button>

              <button
                id="btn-dev-prefill-agent"
                type="button"
                onClick={() => handlePrefill('agent@hotelcontracts.local', 'Agent123!')}
                className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-left border border-slate-700/60 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                  <UserCheck className="w-3 h-3 text-amber-400" />
                  <span>Agent Saisie</span>
                </div>
                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                  agent@hotelcontracts.local
                </div>
                <div className="text-[9px] text-amber-400/90 font-mono mt-0.5">
                  Saisie (Suppr. interdite)
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500">
          <p>Portail interne sécurisé • Authentification & Contrôle d'Accès par Rôle (RBAC)</p>
        </div>
      </div>
    </div>
  );
};
