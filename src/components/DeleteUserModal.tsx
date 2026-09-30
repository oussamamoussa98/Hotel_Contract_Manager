import React from 'react';
import { User } from '../types';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react';

interface DeleteUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: number) => Promise<void>;
  isDeleting: boolean;
  isLastActiveAdmin: boolean;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  isLastActiveAdmin,
}) => {
  if (!isOpen || !user) return null;

  return (
    <div
      id="delete-user-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="delete-user-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isLastActiveAdmin ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
            }`}>
              {isLastActiveAdmin ? <ShieldAlert className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {isLastActiveAdmin ? 'Action non autorisée' : 'Confirmer la suppression'}
            </h3>
          </div>

          <button
            id="btn-close-delete-user"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-3">
          {isLastActiveAdmin ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
              <strong className="block font-bold mb-1">Protection du dernier administrateur :</strong>
              Impossible de supprimer <strong>{user.name}</strong> ({user.email}) car il s'agit du dernier compte administrateur actif du système.
            </div>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed">
              Êtes-vous certain de vouloir supprimer le compte utilisateur de{' '}
              <strong className="text-slate-900 font-semibold">{user.name}</strong> ({user.email}) ?
              Cette action retirera tous ses accès de manière irréversible.
            </p>
          )}

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Rôle :</span>
              <span className="font-semibold text-slate-800">{user.role}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Statut :</span>
              <span className={`font-semibold ${user.active ? 'text-emerald-700' : 'text-slate-500'}`}>
                {user.active ? 'Actif' : 'Désactivé'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            id="btn-cancel-delete-user"
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            {isLastActiveAdmin ? 'Fermer' : 'Annuler'}
          </button>

          {!isLastActiveAdmin && (
            <button
              id="btn-confirm-delete-user"
              type="button"
              onClick={() => onConfirm(user.id)}
              disabled={isDeleting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Suppression...' : 'Supprimer définitivement'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
