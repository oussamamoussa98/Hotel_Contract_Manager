import React from 'react';
import { Contract } from '../types';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmModalProps {
  contract: Contract | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  contract,
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  if (!isOpen || !contract) return null;

  return (
    <div
      id="delete-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="delete-modal-card"
        className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 text-slate-800"
      >
        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h3 className="text-base font-bold text-center text-slate-900 mb-1">
          Confirmer la suppression du contrat
        </h3>

        <p className="text-xs text-slate-500 text-center mb-4 leading-relaxed">
          Êtes-vous certain de vouloir supprimer le contrat pour{' '}
          <strong className="text-slate-800 font-semibold">{contract.hotel?.name}</strong>{' '}
          (reçu le {contract.receptionDate}) ? Cette action est irréversible.
        </p>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg"
          >
            Annuler
          </button>
          <button
            id="btn-confirm-delete"
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? 'Suppression...' : 'Supprimer définitivement'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
