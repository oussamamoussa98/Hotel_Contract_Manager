import React, { useState } from 'react';
import { Contract, EntryStatus, Region, UserRole } from '../types';
import { ContractTable } from './ContractTable';
import {
  ClockAlert,
  AlertTriangle,
  CheckCircle2,
  Filter,
  PlusCircle,
  LayoutDashboard,
  ArrowRight,
  MapPin,
  Calendar,
} from 'lucide-react';

interface PendingContractsViewProps {
  contracts: Contract[];
  onOpenAddContract: () => void;
  onEditContract: (contract: Contract) => void;
  onDeleteContract: (contract: Contract) => void;
  onQuickStatusChange: (contract: Contract, newStatus: EntryStatus) => void;
  isLoading: boolean;
  onNavigateToDashboard: () => void;
  onDeleteFile?: (contract: Contract) => Promise<void> | void;
  onUploadFile?: (contract: Contract, file: File) => Promise<void> | void;
  currentUserRole?: UserRole;
}

export const PendingContractsView: React.FC<PendingContractsViewProps> = ({
  contracts,
  onOpenAddContract,
  onEditContract,
  onDeleteContract,
  onQuickStatusChange,
  isLoading,
  onNavigateToDashboard,
  onDeleteFile,
  onUploadFile,
  currentUserRole,
}) => {
  // STRICTEMENT FILTRÉ : Display only NON_SAISI
  const pendingContracts = contracts.filter((c) => c.entryStatus === 'NON_SAISI');

  // Filtre local par région pour faciliter le travail des agents
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredPending = pendingContracts.filter((c) => {
    if (selectedRegion && c.hotel?.region !== selectedRegion) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const hotelName = c.hotel?.name?.toLowerCase() || '';
      return hotelName.includes(q);
    }
    return true;
  });

  // Liste des régions avec des contrats non saisis
  const regionsWithPending = Array.from(
    new Set(pendingContracts.map((c) => c.hotel?.region).filter(Boolean))
  ) as Region[];

  return (
    <div id="contracts-pending-view" className="space-y-6">
      {/* Bannière Haute Visibilité : Priorité Agent */}
      <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-amber-950 rounded-2xl p-6 text-white shadow-lg border-2 border-rose-600/40 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
          <ClockAlert className="w-64 h-64 text-white" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/30 border border-rose-400 text-rose-100 text-xs font-bold mb-2 uppercase tracking-wide animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>Priorité Opérationnelle • Contrats à Traiter</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Contrats Non Saisis</span>
              <span className="px-3 py-0.5 rounded-full bg-white text-rose-800 text-lg font-black shadow-sm">
                {pendingContracts.length}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-rose-100 mt-1.5 max-w-2xl leading-relaxed">
              Cette page regroupe <strong>exclusivement les contrats au statut NON SAISI</strong> nécessitant une saisie manuelle dans le système ou un raccordement au flux XML.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-pending-view-dashboard"
              type="button"
              onClick={onNavigateToDashboard}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-950/80 hover:bg-rose-950 border border-rose-400/40 text-rose-100 text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Voir le Dashboard</span>
            </button>

            <button
              id="btn-pending-add-contract"
              type="button"
              onClick={onOpenAddContract}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-rose-900 hover:bg-rose-50 text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4 text-rose-700" />
              <span>Ajouter un contrat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Barre de filtrage rapide dédiée aux contrats en attente */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <input
              id="pending-search-hotel"
              type="text"
              placeholder="Filtrer par nom d'hôtel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 placeholder-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 min-w-[180px]">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="pending-filter-region"
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
            >
              <option value="">Toutes les régions ({pendingContracts.length})</option>
              {regionsWithPending.map((reg) => {
                const count = pendingContracts.filter((c) => c.hotel?.region === reg).length;
                return (
                  <option key={reg} value={reg}>
                    {reg} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 justify-between md:justify-end">
          <span>Affichage :</span>
          <span className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg font-bold">
            {filteredPending.length} non saisis affichés
          </span>
        </div>
      </div>

      {/* État vide si aucun contrat en attente */}
      {pendingContracts.length === 0 ? (
        <div
          id="pending-contracts-all-done"
          className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-10 text-center shadow-xs"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-extrabold text-emerald-900">
            Aucun contrat en attente de saisie !
          </h2>
          <p className="text-sm text-emerald-700 max-w-md mx-auto mt-2 leading-relaxed">
            Tous les contrats hôteliers enregistrés dans la base ont été traités (marqués comme <strong>Saisi</strong> ou connectés via <strong>flux XML</strong>).
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onNavigateToDashboard}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Consulter la progression sur le Dashboard</span>
            </button>
            <button
              onClick={onOpenAddContract}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ajouter un nouveau contrat</span>
            </button>
          </div>
        </div>
      ) : (
        /* Tableau affichant UNIQUEMENT les contrats NON_SAISI */
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClockAlert className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Action requise des agents :</strong> Saisissez le contrat dans le PMS puis cliquez sur le bouton <span className="font-bold text-emerald-700">"✓ Saisi"</span> ou basculez en <span className="font-bold text-blue-700">"XML"</span>.
              </span>
            </div>
          </div>

          <ContractTable
            contracts={filteredPending}
            onEdit={onEditContract}
            onDelete={onDeleteContract}
            onQuickStatusChange={onQuickStatusChange}
            isLoading={isLoading}
            onOpenAddContract={onOpenAddContract}
            onDeleteFile={onDeleteFile}
            onUploadFile={onUploadFile}
            currentUserRole={currentUserRole}
          />
        </div>
      )}
    </div>
  );
};
