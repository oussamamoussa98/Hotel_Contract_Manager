import React, { useState, useEffect } from 'react';
import { User, UserRole, CreateUserData, UpdateUserData } from '../types';
import { X, UserPlus, UserCheck, AlertCircle, ShieldCheck, Mail, User as UserIcon, Lock } from 'lucide-react';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCreate: (data: CreateUserData) => Promise<void>;
  onSubmitUpdate: (id: number, data: UpdateUserData) => Promise<void>;
  initialData?: User | null;
}

export const UserModal: React.FC<UserModalProps> = ({
  isOpen,
  onClose,
  onSubmitCreate,
  onSubmitUpdate,
  initialData,
}) => {
  const isEditing = Boolean(initialData);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('AGENT_SAISIE');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEmail(initialData.email);
      setRole(initialData.role);
      setPassword('');
    } else {
      setName('');
      setEmail('');
      setRole('AGENT_SAISIE');
      setPassword('');
    }
    setErrors({});
    setServerError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) {
      errs.name = 'Le nom de l\'utilisateur est obligatoire.';
    }
    if (!email.trim() || !email.includes('@')) {
      errs.email = 'Une adresse email valide est obligatoire.';
    }
    if (!isEditing) {
      if (!password) {
        errs.password = 'Le mot de passe initial est obligatoire.';
      } else if (password.length < 8) {
        errs.password = 'Le mot de passe doit comporter au moins 8 caractères.';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    try {
      if (isEditing && initialData) {
        await onSubmitUpdate(initialData.id, {
          name: name.trim(),
          email: email.trim(),
          role,
        });
      } else {
        await onSubmitCreate({
          name: name.trim(),
          email: email.trim(),
          password,
          role,
        });
      }
      onClose();
    } catch (err: any) {
      setServerError(err.message || 'Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      id="user-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="user-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden transition-all"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              {isEditing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {isEditing ? 'Modifier l\'utilisateur' : 'Créer un utilisateur'}
              </h2>
              <p className="text-[11px] text-blue-200">
                {isEditing ? 'Mise à jour des informations de compte' : 'Accès au registre des contrats'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-user-modal"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            id="user-modal-error-alert"
            className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Erreur :</span>
              <span>{serverError}</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="user-form-name" className="block text-xs font-semibold text-slate-700 mb-1">
              Nom complet <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="user-form-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mohamed Ben Salah"
                className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                  errors.name
                    ? 'border-rose-300 focus:ring-rose-500'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
            </div>
            {errors.name && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="user-form-email" className="block text-xs font-semibold text-slate-700 mb-1">
              Adresse email professionnelle <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="user-form-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@agence-voyage.tn"
                className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                  errors.email
                    ? 'border-rose-300 focus:ring-rose-500'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
            </div>
            {errors.email && <p className="text-xs text-rose-600 mt-1 font-medium">{errors.email}</p>}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="user-form-role" className="block text-xs font-semibold text-slate-700 mb-1">
              Rôle d'accès <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                id="btn-select-role-agent"
                type="button"
                onClick={() => setRole('AGENT_SAISIE')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  role === 'AGENT_SAISIE'
                    ? 'border-amber-400 bg-amber-50/80 text-amber-900 ring-2 ring-amber-400 shadow-2xs'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-xs font-bold">AGENT_SAISIE</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Saisie & gestion contrats</span>
              </button>

              <button
                id="btn-select-role-admin"
                type="button"
                onClick={() => setRole('ADMIN')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                  role === 'ADMIN'
                    ? 'border-emerald-400 bg-emerald-50/80 text-emerald-900 ring-2 ring-emerald-400 shadow-2xs'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-bold">ADMIN</span>
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5">Accès complet + Utilisateurs</span>
              </button>
            </div>
          </div>

          {/* Password (Creation only) */}
          {!isEditing && (
            <div>
              <label htmlFor="user-form-password" className="block text-xs font-semibold text-slate-700 mb-1">
                Mot de passe initial <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="user-form-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className={`w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                    errors.password
                      ? 'border-rose-300 focus:ring-rose-500'
                      : 'border-slate-300 focus:ring-blue-500'
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Minimum 8 caractères</p>
              {errors.password && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{errors.password}</p>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3">
            <button
              id="btn-cancel-user-modal"
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              id="btn-submit-user-modal"
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>{submitting ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer l\'utilisateur'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
