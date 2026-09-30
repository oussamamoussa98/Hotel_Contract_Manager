import React, { useState } from 'react';
import { ContractFilterState, REGIONS, CHAINS, STATUS_OPTIONS } from '../types';
import { Search, RotateCcw, Calendar, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

interface ContractFiltersProps {
  filters: ContractFilterState;
  onFilterChange: (newFilters: Partial<ContractFilterState>) => void;
  onReset: () => void;
  totalFiltered: number;
  totalAvailable: number;
}

export const ContractFilters: React.FC<ContractFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  totalFiltered,
  totalAvailable,
}) => {
  const [showAdvancedDates, setShowAdvancedDates] = useState(
    Boolean(filters.contractDateFrom || filters.contractDateTo || filters.receptionDateFrom || filters.receptionDateTo)
  );

  const activeFilters = [
    filters.hotel ? { key: 'hotel', label: `Hôtel: "${filters.hotel}"` } : null,
    filters.region ? { key: 'region', label: `Région: ${filters.region}` } : null,
    filters.chain ? { key: 'chain', label: `Chaîne: ${filters.chain}` } : null,
    filters.status ? { key: 'status', label: `Statut: ${filters.status === 'NON_SAISI' ? 'Non saisi' : filters.status}` } : null,
    filters.contractDate ? { key: 'contractDate', label: `Date contrat: ${filters.contractDate}` } : null,
    filters.receptionDate ? { key: 'receptionDate', label: `Date réception: ${filters.receptionDate}` } : null,
    filters.contractDateFrom ? { key: 'contractDateFrom', label: `Contrat dès: ${filters.contractDateFrom}` } : null,
    filters.contractDateTo ? { key: 'contractDateTo', label: `Contrat jusqu'à: ${filters.contractDateTo}` } : null,
    filters.receptionDateFrom ? { key: 'receptionDateFrom', label: `Réception dès: ${filters.receptionDateFrom}` } : null,
    filters.receptionDateTo ? { key: 'receptionDateTo', label: `Réception jusqu'à: ${filters.receptionDateTo}` } : null,
  ].filter(Boolean) as { key: keyof ContractFilterState; label: string }[];

  const activeCount = activeFilters.length;

  return (
    <div
      id="contracts-filter-panel"
      className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 mb-6 transition-all"
    >
      {/* En-tête des filtres avec statut et bouton Réinitialiser les filtres */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-slate-800">
            Recherche & Filtres multicritères
          </h2>
          {activeCount > 0 && (
            <span
              id="filter-active-count-badge"
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200"
            >
              {activeCount} actif{activeCount > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            Affichage :{' '}
            <strong className="text-slate-800 font-bold">{totalFiltered}</strong> sur{' '}
            {totalAvailable} contrat{totalAvailable > 1 ? 's' : ''}
          </span>

          {/* Bouton RESET imposé par la spécification : "Réinitialiser les filtres" */}
          <button
            id="btn-reset-filters"
            type="button"
            onClick={onReset}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
              activeCount > 0
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 shadow-2xs'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
            }`}
            title="Réinitialiser tous les critères de recherche pour afficher tous les contrats"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser les filtres</span>
          </button>
        </div>
      </div>

      {/* Ligne principale des 6 filtres combinables */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. RECHERCHE DYNAMIQUE HÔTEL */}
        <div className="relative">
          <label htmlFor="filter-hotel-search" className="block text-xs font-medium text-slate-700 mb-1">
            Hôtel <span className="text-slate-400 font-normal">(nom dynamique)</span>
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              id="filter-hotel-search"
              type="text"
              placeholder="Ex: marhaba, iberostar..."
              value={filters.hotel}
              onChange={(e) => onFilterChange({ hotel: e.target.value })}
              className="w-full pl-8 pr-7 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white placeholder-slate-400"
            />
            {filters.hotel && (
              <button
                type="button"
                onClick={() => onFilterChange({ hotel: '' })}
                className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
                title="Effacer la recherche"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 2. RÉGION */}
        <div>
          <label htmlFor="filter-region-select" className="block text-xs font-medium text-slate-700 mb-1">
            Région
          </label>
          <select
            id="filter-region-select"
            value={filters.region}
            onChange={(e) => onFilterChange({ region: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-slate-800"
          >
            <option value="">Toutes les régions (13)</option>
            {REGIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        {/* 3. CHAÎNE */}
        <div>
          <label htmlFor="filter-chain-select" className="block text-xs font-medium text-slate-700 mb-1">
            Chaîne
          </label>
          <select
            id="filter-chain-select"
            value={filters.chain}
            onChange={(e) => onFilterChange({ chain: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-slate-800"
          >
            <option value="">Toutes les chaînes (17)</option>
            {CHAINS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* 4. STATUT */}
        <div>
          <label htmlFor="filter-status-select" className="block text-xs font-medium text-slate-700 mb-1">
            Statut
          </label>
          <select
            id="filter-status-select"
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value })}
            className="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-medium text-slate-800"
          >
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* 5. DATE CONTRAT */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="filter-contract-date" className="block text-xs font-medium text-slate-700">
              Date contrat
            </label>
            {filters.contractDate && (
              <button
                type="button"
                onClick={() => onFilterChange({ contractDate: '' })}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                effacer
              </button>
            )}
          </div>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              id="filter-contract-date"
              type="date"
              value={filters.contractDate}
              onChange={(e) => onFilterChange({ contractDate: e.target.value })}
              className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
        </div>

        {/* 6. DATE RÉCEPTION */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="filter-reception-date" className="block text-xs font-medium text-slate-700">
              Date réception
            </label>
            {filters.receptionDate && (
              <button
                type="button"
                onClick={() => onFilterChange({ receptionDate: '' })}
                className="text-[10px] text-slate-400 hover:text-slate-600"
              >
                effacer
              </button>
            )}
          </div>
          <div className="relative">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              id="filter-reception-date"
              type="date"
              value={filters.receptionDate}
              onChange={(e) => onFilterChange({ receptionDate: e.target.value })}
              className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Bouton pour étendre les plages de dates avancées */}
      <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowAdvancedDates(!showAdvancedDates)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 transition-colors"
        >
          {showAdvancedDates ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Masquer les plages de dates (du / au)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Filtrer par plage de dates (du / au)</span>
            </>
          )}
        </button>

        {/* Pilule d'exemple d'aide */}
        <span className="text-[11px] text-slate-400">
          Exemple combiné : <strong>Djerba</strong> + <strong>Iberostar</strong> + <strong>Non saisi</strong>
        </span>
      </div>

      {/* Plages de dates avancées */}
      {showAdvancedDates && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-dashed border-slate-200 bg-slate-50/60 p-3 rounded-lg">
          <div>
            <label htmlFor="filter-contract-date-from" className="block text-[11px] font-medium text-slate-600 mb-1">
              Date contrat (à partir du)
            </label>
            <input
              id="filter-contract-date-from"
              type="date"
              value={filters.contractDateFrom}
              onChange={(e) => onFilterChange({ contractDateFrom: e.target.value })}
              className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label htmlFor="filter-contract-date-to" className="block text-[11px] font-medium text-slate-600 mb-1">
              Date contrat (jusqu'au)
            </label>
            <input
              id="filter-contract-date-to"
              type="date"
              value={filters.contractDateTo}
              onChange={(e) => onFilterChange({ contractDateTo: e.target.value })}
              className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label htmlFor="filter-reception-date-from" className="block text-[11px] font-medium text-slate-600 mb-1">
              Date réception (à partir du)
            </label>
            <input
              id="filter-reception-date-from"
              type="date"
              value={filters.receptionDateFrom}
              onChange={(e) => onFilterChange({ receptionDateFrom: e.target.value })}
              className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label htmlFor="filter-reception-date-to" className="block text-[11px] font-medium text-slate-600 mb-1">
              Date réception (jusqu'au)
            </label>
            <input
              id="filter-reception-date-to"
              type="date"
              value={filters.receptionDateTo}
              onChange={(e) => onFilterChange({ receptionDateTo: e.target.value })}
              className="w-full px-2.5 py-1 text-xs rounded border border-slate-300 focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>
      )}

      {/* Badges des filtres actifs avec croix pour suppression individuelle */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
          <span className="text-[11px] text-slate-500 font-medium mr-1">Filtres actifs :</span>
          {activeFilters.map((f) => (
            <span
              key={f.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
            >
              <span>{f.label}</span>
              <button
                type="button"
                onClick={() => onFilterChange({ [f.key]: '' })}
                className="text-blue-500 hover:text-blue-800 ml-0.5"
                title={`Supprimer ce filtre`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-slate-500 hover:text-rose-600 underline ml-2 font-medium"
          >
            Tout effacer
          </button>
        </div>
      )}
    </div>
  );
};
