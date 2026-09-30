import React, { useState } from 'react';
import { Contract, Hotel, REGIONS, EntryStatus } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  FileText,
  ClockAlert,
  CheckCircle2,
  Code2,
  PlusCircle,
  ArrowRight,
  MapPin,
  Calendar,
  Layers,
  ArrowUpRight,
  PieChart,
  Compass,
} from 'lucide-react';

interface DashboardViewProps {
  contracts: Contract[];
  hotels: Hotel[];
  onNavigateToContracts: (filterStatus?: string) => void;
  onNavigateToPending: () => void;
  onOpenAddContract: () => void;
  onQuickStatusChange: (contract: Contract, newStatus: EntryStatus) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  contracts,
  hotels,
  onNavigateToContracts,
  onNavigateToPending,
  onOpenAddContract,
  onQuickStatusChange,
}) => {
  // Calcul automatique dynamique à partir de la base de données (contracts)
  const totalContracts = contracts.length;
  const saisis = contracts.filter((c) => c.entryStatus === 'SAISI');
  const xmlContracts = contracts.filter((c) => c.entryStatus === 'XML');
  const nonSaisis = contracts.filter((c) => c.entryStatus === 'NON_SAISI');

  // Traités = SAISI + XML
  const treatedCount = saisis.length + xmlContracts.length;
  const treatedPercentage =
    totalContracts > 0 ? Math.round((treatedCount / totalContracts) * 100) : 0;

  // Calcul des statistiques par région (Région | Total | Saisi | XML | Non saisi)
  const regionStats = REGIONS.map((r) => {
    const regionContracts = contracts.filter((c) => c.hotel?.region === r.value);
    const total = regionContracts.length;
    const rSaisi = regionContracts.filter((c) => c.entryStatus === 'SAISI').length;
    const rXml = regionContracts.filter((c) => c.entryStatus === 'XML').length;
    const rNonSaisi = regionContracts.filter((c) => c.entryStatus === 'NON_SAISI').length;
    const rTreated = rSaisi + rXml;
    const rPercentage = total > 0 ? Math.round((rTreated / total) * 100) : 0;

    return {
      region: r.value,
      label: r.label,
      total,
      saisi: rSaisi,
      xml: rXml,
      nonSaisi: rNonSaisi,
      treated: rTreated,
      percentage: rPercentage,
    };
  });

  // Filtre optionnel pour afficher toutes les régions ou trier par total
  const [regionFilter, setRegionFilter] = useState<'all' | 'active'>('active');

  const displayedRegions =
    regionFilter === 'active'
      ? regionStats.filter((r) => r.total > 0).sort((a, b) => b.total - a.total)
      : [...regionStats].sort((a, b) => b.total - a.total);

  return (
    <div id="dashboard-main-container" className="space-y-6">
      {/* Header & Quick Actions Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-950/80 border border-blue-800/80 text-blue-300 text-xs font-semibold mb-2">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span>Tableau de bord opérationnel</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Suivi & Progression des Contrats
            </h1>
          </div>

          {/* Quick Actions (Conforme aux spécifications) */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Quick Action 1: Ajouter un contrat */}
            <button
              id="btn-quick-add-contract"
              type="button"
              onClick={onOpenAddContract}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              title="Ajouter un nouveau contrat hôtelier"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Ajouter un contrat</span>
            </button>

            {/* Quick Action 2: Voir les contrats non saisis */}
            <button
              id="btn-quick-view-pending"
              type="button"
              onClick={onNavigateToPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
              title="Consulter les contrats restant à traiter (/contracts/pending)"
            >
              <ClockAlert className="w-4 h-4" />
              <span>Voir les contrats non saisis</span>
              {nonSaisis.length > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-white text-rose-700 rounded-full tabular-nums">
                  {nonSaisis.length}
                </span>
              )}
            </button>

            {/* Quick Action 3: Voir tous les contrats */}
            <button
              id="btn-quick-view-all"
              type="button"
              onClick={() => onNavigateToContracts()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 transition-all cursor-pointer"
              title="Voir la liste intégrale des contrats"
            >
              <FileText className="w-4 h-4 text-slate-300" />
              <span>Voir tous les contrats</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: CARDS (TOTAL CONTRATS, SAISIS, XML, NON SAISIS, REQUIRING ATTENTION) */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-slate-600" />
          <span>Statistiques Clés des Contrats</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* CARD 1: TOTAL CONTRATS */}
          <div
            id="card-total-contrats"
            onClick={() => onNavigateToContracts()}
            className="cursor-pointer bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  TOTAL CONTRATS
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums">
                  {totalContracts}
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Total : {totalContracts}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-semibold">
              <span>Voir l'ensemble</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* CARD 2: SAISIS */}
          <div
            id="card-contrats-saisis"
            onClick={() => onNavigateToContracts('SAISI')}
            className="cursor-pointer bg-white rounded-xl p-4 sm:p-5 border border-emerald-200 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                  SAISIS
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-extrabold text-emerald-700 tracking-tight tabular-nums">
                  {saisis.length}
                </div>
                <p className="text-xs font-semibold text-emerald-600 mt-1">
                  Saisis : {saisis.length}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-emerald-50 flex items-center justify-between text-xs text-emerald-700 font-semibold">
              <span>Saisis validés</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* CARD 3: XML */}
          <div
            id="card-contrats-xml"
            onClick={() => onNavigateToContracts('XML')}
            className="cursor-pointer bg-white rounded-xl p-4 sm:p-5 border border-blue-200 shadow-2xs hover:border-blue-400 hover:shadow-xs transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  XML
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Code2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-extrabold text-blue-700 tracking-tight tabular-nums">
                  {xmlContracts.length}
                </div>
                <p className="text-xs font-semibold text-blue-600 mt-1">
                  XML : {xmlContracts.length}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-50 flex items-center justify-between text-xs text-blue-700 font-semibold">
              <span>Flux XML direct</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* CARD 4: NON SAISIS */}
          <div
            id="card-contrats-non-saisis"
            onClick={onNavigateToPending}
            className="cursor-pointer bg-white rounded-xl p-4 sm:p-5 border border-rose-300 shadow-2xs hover:border-rose-500 hover:shadow-xs transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
                  NON SAISIS
                </span>
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <ClockAlert className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-extrabold text-rose-700 tracking-tight tabular-nums">
                  {nonSaisis.length}
                </div>
                <p className="text-xs font-semibold text-rose-600 mt-1">
                  Non saisis : {nonSaisis.length}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-rose-100 flex items-center justify-between text-xs text-rose-700 font-semibold">
              <span>À traiter</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: PROGRESS (Progression de saisie) */}
      <div
        id="section-progression-saisie"
        className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 sm:p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-5 h-5 text-blue-600" />
              <span>Progression de saisie</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Contrats traités définis comme : <span className="font-semibold text-slate-700">SAISI + XML</span>
            </p>
          </div>

          <div className="text-right flex items-baseline sm:flex-col sm:items-end justify-between sm:justify-center">
            <span
              id="progress-counter-display"
              className="text-lg sm:text-xl font-extrabold text-blue-900"
            >
              {treatedCount} / {totalContracts} contrats traités
            </span>
            <span
              id="progress-percentage-badge"
              className="text-sm font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200"
            >
              {treatedPercentage}% complété
            </span>
          </div>
        </div>

        {/* Barre de progression multi-statuts */}
        <div className="space-y-2">
          <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-slate-200">
            {/* Segment SAISI */}
            {totalContracts > 0 && saisis.length > 0 && (
              <div
                className="h-full bg-emerald-500 rounded-l-full transition-all duration-500"
                style={{ width: `${(saisis.length / totalContracts) * 100}%` }}
                title={`Saisis: ${saisis.length} (${Math.round((saisis.length / totalContracts) * 100)}%)`}
              />
            )}
            {/* Segment XML */}
            {totalContracts > 0 && xmlContracts.length > 0 && (
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${(xmlContracts.length / totalContracts) * 100}%` }}
                title={`XML: ${xmlContracts.length} (${Math.round((xmlContracts.length / totalContracts) * 100)}%)`}
              />
            )}
            {/* Segment NON SAISI (reste) */}
            {totalContracts > 0 && nonSaisis.length > 0 && (
              <div
                className="h-full bg-rose-400 rounded-r-full transition-all duration-500"
                style={{ width: `${(nonSaisis.length / totalContracts) * 100}%` }}
                title={`Non saisis: ${nonSaisis.length} (${Math.round((nonSaisis.length / totalContracts) * 100)}%)`}
              />
            )}
          </div>

          {/* Légende détaillée */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pt-1">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span>Saisis : <strong className="text-slate-800">{saisis.length}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
                <span>XML : <strong className="text-slate-800">{xmlContracts.length}</strong></span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-400 inline-block" />
                <span>Non saisis : <strong className="text-rose-700">{nonSaisis.length}</strong></span>
              </span>
            </div>

            <span className="text-slate-400 font-medium">
              Total base : {totalContracts} contrats
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3: REGION STATISTICS (Région | Total | Saisi | XML | Non saisi) */}
      <div
        id="section-region-statistics"
        className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
      >
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span>Statistiques par Région</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Détail d'avancement pour l'ensemble des 13 régions hôtelières.
            </p>
          </div>

          {/* Boutons de filtrage des régions */}
          <div className="inline-flex rounded-lg p-0.5 bg-slate-200 text-xs font-medium">
            <button
              id="btn-filter-regions-active"
              type="button"
              onClick={() => setRegionFilter('active')}
              className={`px-3 py-1 rounded-md transition-all ${
                regionFilter === 'active'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Régions actives ({regionStats.filter((r) => r.total > 0).length})
            </button>
            <button
              id="btn-filter-regions-all"
              type="button"
              onClick={() => setRegionFilter('all')}
              className={`px-3 py-1 rounded-md transition-all ${
                regionFilter === 'all'
                  ? 'bg-white text-slate-900 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Toutes les régions ({REGIONS.length})
            </button>
          </div>
        </div>

        {/* TABLEAU REGION STATISTICS (Région | Total | Saisi | XML | Non saisi) */}
        <div className="overflow-x-auto">
          <table
            id="table-region-statistics"
            className="w-full text-left text-xs border-collapse"
          >
            <thead>
              <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-700 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Région</th>
                <th className="py-3 px-4 text-center">Total</th>
                <th className="py-3 px-4 text-center">Saisi</th>
                <th className="py-3 px-4 text-center">XML</th>
                <th className="py-3 px-4 text-center">Non saisi</th>
                <th className="py-3 px-4 text-right">Progression</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {displayedRegions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Aucune donnée régionale disponible.
                  </td>
                </tr>
              ) : (
                displayedRegions.map((row) => (
                  <tr
                    key={row.region}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => onNavigateToContracts()}
                    title={`Filtrer les contrats pour ${row.label}`}
                  >
                    {/* Colonne 1: Région */}
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600" />
                        <span>{row.label}</span>
                      </div>
                    </td>

                    {/* Colonne 2: Total */}
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-mono">
                        {row.total}
                      </span>
                    </td>

                    {/* Colonne 3: Saisi */}
                    <td className="py-3 px-4 text-center font-semibold text-emerald-700">
                      <span className="inline-block px-2 py-0.5 bg-emerald-50 rounded text-emerald-800 font-mono">
                        {row.saisi}
                      </span>
                    </td>

                    {/* Colonne 4: XML */}
                    <td className="py-3 px-4 text-center font-semibold text-blue-700">
                      <span className="inline-block px-2 py-0.5 bg-blue-50 rounded text-blue-800 font-mono">
                        {row.xml}
                      </span>
                    </td>

                    {/* Colonne 5: Non saisi */}
                    <td className="py-3 px-4 text-center font-semibold text-rose-700">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono ${
                          row.nonSaisi > 0
                            ? 'bg-rose-100 text-rose-800 font-bold'
                            : 'bg-slate-50 text-slate-400'
                        }`}
                      >
                        {row.nonSaisi}
                      </span>
                    </td>

                    {/* Colonne 6: Progression (%) */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 sm:w-28 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              row.percentage === 100
                                ? 'bg-emerald-500'
                                : row.percentage > 50
                                ? 'bg-blue-600'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${row.percentage}%` }}
                          />
                        </div>
                        <span className="font-bold text-slate-700 w-9 text-right font-mono">
                          {row.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {/* Ligne de Totalisation */}
            <tfoot>
              <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
                <td className="py-3 px-4 uppercase text-[11px] tracking-wider text-slate-600">
                  Total Global
                </td>
                <td className="py-3 px-4 text-center font-mono">{totalContracts}</td>
                <td className="py-3 px-4 text-center text-emerald-700 font-mono">
                  {saisis.length}
                </td>
                <td className="py-3 px-4 text-center text-blue-700 font-mono">
                  {xmlContracts.length}
                </td>
                <td className="py-3 px-4 text-center text-rose-700 font-mono">
                  {nonSaisis.length}
                </td>
                <td className="py-3 px-4 text-right font-mono text-blue-900">
                  {treatedPercentage}% traités
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* SECTION 4: APERÇU RAPIDE DES CONTRATS NON SAISIS RESTANTS */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClockAlert className="w-5 h-5 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Contrats à traiter en priorité ({nonSaisis.length})
            </h2>
          </div>
          <button
            id="btn-dashboard-go-to-pending"
            type="button"
            onClick={onNavigateToPending}
            className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 group"
          >
            <span>Ouvrir la page /contracts/pending</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>

        {nonSaisis.length === 0 ? (
          <div className="p-8 text-center bg-emerald-50/60 rounded-xl border border-emerald-100">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-emerald-900">
              Félicitations ! Tous les contrats ont été traités.
            </p>
            <p className="text-xs text-emerald-700 mt-1">
              Aucun contrat n'est actuellement en statut "NON SAISI".
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {nonSaisis.slice(0, 5).map((contract) => (
              <div
                key={contract.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-2 rounded-lg transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 truncate">
                      {contract.hotel?.name}
                    </span>
                    <StatusBadge status={contract.entryStatus} size="sm" />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {contract.hotel?.regionDisplayName || contract.hotel?.region}
                    </span>
                    <span>•</span>
                    <span>{contract.hotel?.chainDisplayName || contract.hotel?.chain}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-slate-600 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Reçu le {contract.receptionDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => onQuickStatusChange(contract, 'SAISI')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                    title="Marquer comme saisi directement"
                  >
                    <span>✓ Saisi</span>
                  </button>
                  <button
                    onClick={() => onQuickStatusChange(contract, 'XML')}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                    title="Marquer comme flux XML"
                  >
                    <span>XML</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
