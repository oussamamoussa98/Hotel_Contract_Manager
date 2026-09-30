import React, { useState, useRef, useEffect } from 'react';
import {
  Contract,
  EntryStatus,
  SortField,
  SUPPORTED_FILE_ACCEPT,
  SUPPORTED_FILE_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  UserRole,
} from '../types';
import { StatusBadge } from './StatusBadge';
import { FileViewerModal } from './FileViewerModal';
import { apiService } from '../services/api';
import {
  FileText,
  FileCode,
  Edit2,
  Trash2,
  Building,
  Calendar,
  CreditCard,
  Check,
  AlertTriangle,
  Code2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileX2,
  Paperclip,
  Eye,
  Download,
  MapPin,
  Layers,
  MoreVertical,
  ChevronDown,
} from 'lucide-react';

interface ContractTableProps {
  contracts: Contract[];
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
  onQuickStatusChange: (contract: Contract, newStatus: EntryStatus) => void;
  isLoading: boolean;
  onOpenAddContract: () => void;
  onDeleteFile?: (contract: Contract) => Promise<void> | void;
  onUploadFile?: (contract: Contract, file: File) => Promise<void> | void;
  currentUserRole?: UserRole;
}

export const ContractTable: React.FC<ContractTableProps> = ({
  contracts,
  onEdit,
  onDelete,
  onQuickStatusChange,
  isLoading,
  onOpenAddContract,
  onDeleteFile,
  onUploadFile,
  currentUserRole = 'ADMIN',
}) => {
  const [sortField, setSortField] = useState<SortField>('receptionDate');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [previewContract, setPreviewContract] = useState<Contract | null>(null);
  const [targetUploadContract, setTargetUploadContract] = useState<Contract | null>(null);
  const [openActionMenuId, setOpenActionMenuId] = useState<number | null>(null);
  const [downloadingContractId, setDownloadingContractId] = useState<number | null>(null);
  const tableFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadContract = async (contract: Contract) => {
    try {
      setDownloadingContractId(contract.id);
      await apiService.downloadContractFile(contract.id, contract.fileName);
    } catch (err: any) {
      alert(err.message || 'Erreur lors du téléchargement');
    } finally {
      setDownloadingContractId(null);
    }
  };

  // Close actions dropdown on click outside or escape key
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-menu="true"]')) {
        setOpenActionMenuId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenActionMenuId(null);
    };

    if (openActionMenuId !== null) {
      document.addEventListener('mousedown', handleDocumentClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openActionMenuId]);

  const handleTableFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && targetUploadContract && onUploadFile) {
      onUploadFile(targetUploadContract, file);
    }
    setTargetUploadContract(null);
    if (tableFileInputRef.current) {
      tableFileInputRef.current.value = '';
    }
  };

  const triggerUploadForContract = (contract: Contract) => {
    setTargetUploadContract(contract);
    tableFileInputRef.current?.click();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      // Pour les dates, trier par défaut du plus récent au plus ancien, pour les textes de A à Z
      setSortAsc(field !== 'receptionDate' && field !== 'contractDate');
    }
  };

  const sortedContracts = [...contracts].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'receptionDate') {
      comparison = a.receptionDate.localeCompare(b.receptionDate);
    } else if (sortField === 'contractDate') {
      const dateA = a.contractDateFrom || a.contractDate || '';
      const dateB = b.contractDateFrom || b.contractDate || '';
      comparison = dateA.localeCompare(dateB);
    } else if (sortField === 'hotel') {
      comparison = a.hotel.name.localeCompare(b.hotel.name, 'fr', { sensitivity: 'base' });
    } else if (sortField === 'region') {
      const regA = a.hotel.region || '';
      const regB = b.hotel.region || '';
      comparison = regA.localeCompare(regB, 'fr', { sensitivity: 'base' });
    } else if (sortField === 'chain') {
      const chainA = a.hotel.chain || '';
      const chainB = b.hotel.chain || '';
      comparison = chainA.localeCompare(chainB, 'fr', { sensitivity: 'base' });
    } else if (sortField === 'status') {
      // NON_SAISI d'abord pour attirer l'attention ou comparaison alphabétique
      comparison = a.entryStatus.localeCompare(b.entryStatus);
    }
    return sortAsc ? comparison : -comparison;
  });

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 group-hover:text-slate-600 ml-1" />;
    }
    return sortAsc ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 ml-1" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 ml-1" />
    );
  };

  const formatDate = (dStr?: string) => {
    if (!dStr) return '-';
    try {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return dStr;
    } catch {
      return dStr;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-12 text-center">
        <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Chargement des contrats en cours...</p>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div
        id="empty-contracts-state"
        className="bg-white rounded-xl shadow-xs border border-slate-200 p-12 text-center"
      >
        <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <FileX2 className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">Aucun contrat trouvé</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
          Aucun contrat ne correspond à vos filtres actuels ou la base ne contient pas encore de contrat.
        </p>
        <button
          id="btn-empty-add-contract"
          onClick={onOpenAddContract}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          <span>+ Ajouter un contrat</span>
        </button>
      </div>
    );
  }

  return (
    <div
      id="contracts-table-container"
      className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              {/* 1. Hôtel */}
              <th
                id="th-sort-hotel"
                scope="col"
                className={`py-3 px-4 cursor-pointer select-none transition-colors group ${
                  sortField === 'hotel' ? 'bg-blue-50/80 text-blue-900 font-bold' : 'hover:bg-slate-100'
                }`}
                onClick={() => handleSort('hotel')}
                title="Trier par hôtel"
              >
                <div className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                  <span>Hôtel</span>
                  {renderSortIndicator('hotel')}
                </div>
              </th>

              {/* 2. Région */}
              <th
                id="th-sort-region"
                scope="col"
                className={`py-3 px-3 cursor-pointer select-none transition-colors group ${
                  sortField === 'region' ? 'bg-blue-50/80 text-blue-900 font-bold' : 'hover:bg-slate-100'
                }`}
                onClick={() => handleSort('region')}
                title="Trier par région"
              >
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                  <span>Région</span>
                  {renderSortIndicator('region')}
                </div>
              </th>

              {/* 3. Chaîne */}
              <th
                id="th-sort-chain"
                scope="col"
                className={`py-3 px-3 cursor-pointer select-none transition-colors group ${
                  sortField === 'chain' ? 'bg-blue-50/80 text-blue-900 font-bold' : 'hover:bg-slate-100'
                }`}
                onClick={() => handleSort('chain')}
                title="Trier par chaîne"
              >
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                  <span>Chaîne</span>
                  {renderSortIndicator('chain')}
                </div>
              </th>

              {/* 4. Date contrat */}
              <th
                id="th-sort-contract-date"
                scope="col"
                className={`py-3 px-3 cursor-pointer select-none transition-colors whitespace-nowrap group ${
                  sortField === 'contractDate' ? 'bg-blue-50/80 text-blue-900 font-bold' : 'hover:bg-slate-100'
                }`}
                onClick={() => handleSort('contractDate')}
                title="Trier par date de contrat"
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
                  <span>Date contrat</span>
                  {renderSortIndicator('contractDate')}
                </div>
              </th>

              {/* 5. Date réception */}
              <th
                id="th-sort-reception-date"
                scope="col"
                className={`py-3 px-3 cursor-pointer select-none transition-colors whitespace-nowrap group ${
                  sortField === 'receptionDate' ? 'bg-blue-50/80 text-blue-900 font-bold' : 'hover:bg-slate-100'
                }`}
                onClick={() => handleSort('receptionDate')}
                title="Trier par date de réception"
              >
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Date réception</span>
                  {renderSortIndicator('receptionDate')}
                </div>
              </th>

              {/* 6. Saisie (Statut) */}
              <th
                id="th-sort-status"
                scope="col"
                className={`py-3 px-3 cursor-pointer select-none text-center transition-colors group ${
                  sortField === 'status' ? 'bg-blue-50/80 text-blue-900 font-bold' : 'hover:bg-slate-100'
                }`}
                onClick={() => handleSort('status')}
                title="Trier par statut de saisie"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Saisie</span>
                  {renderSortIndicator('status')}
                </div>
              </th>

              {/* 7. Paiement */}
              <th scope="col" className="py-3 px-3">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Paiement</span>
                </div>
              </th>

              {/* 8. Contrat (Fichier) */}
              <th scope="col" className="py-3 px-3">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Contrat</span>
                </div>
              </th>

              {/* 9. Actions */}
              <th scope="col" className="py-3 px-4 text-right">
                <span>Actions</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sortedContracts.map((contract) => {
              const isNonSaisi = contract.entryStatus === 'NON_SAISI';
              const isXml = contract.entryStatus === 'XML';
              const isSaisi = contract.entryStatus === 'SAISI';

              return (
                <tr
                  key={contract.id}
                  id={`contract-row-${contract.id}`}
                  className={`transition-colors hover:bg-slate-50/80 ${
                    isNonSaisi ? 'bg-rose-50/30' : ''
                  }`}
                >
                  {/* Column 1: Hôtel */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 text-sm">
                      {contract.hotel?.name || 'Hôtel sans nom'}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <span>Réf #{contract.id}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-600">
                        {contract.hotel?.chainDisplayName || contract.hotel?.chain}
                      </span>
                    </div>
                  </td>

                  {/* Column 2: Région */}
                  <td className="py-3 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
                      {contract.hotel?.regionDisplayName || contract.hotel?.region}
                    </span>
                  </td>

                  {/* Column 3: Chaîne */}
                  <td className="py-3 px-3">
                    <span className="text-slate-800 font-medium">
                      {contract.hotel?.chainDisplayName || contract.hotel?.chain}
                    </span>
                  </td>

                  {/* Column 4: Date contrat (Période) */}
                  <td className="py-3 px-3 whitespace-nowrap text-slate-700 font-mono text-xs">
                    {contract.contractDateFrom &&
                    contract.contractDateTo &&
                    contract.contractDateFrom !== contract.contractDateTo ? (
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">
                          {formatDate(contract.contractDateFrom)} → {formatDate(contract.contractDateTo)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans">
                          Du {formatDate(contract.contractDateFrom)} au {formatDate(contract.contractDateTo)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-900">
                        {formatDate(contract.contractDateFrom || contract.contractDate)}
                      </span>
                    )}
                  </td>

                  {/* Column 5: Date réception */}
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span className="font-mono text-xs font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {formatDate(contract.receptionDate)}
                    </span>
                  </td>

                  {/* Column 6: Saisie (Status indicator with fast toggle) */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <StatusBadge status={contract.entryStatus} size="sm" />

                      {/* Fast toggle buttons for agent quick-entry */}
                      <div className="inline-flex items-center rounded-md border border-slate-200 bg-white p-0.5 shadow-2xs ml-1">
                        {!isSaisi && (
                          <button
                            id={`btn-quick-saisi-${contract.id}`}
                            type="button"
                            onClick={() => onQuickStatusChange(contract, 'SAISI')}
                            className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            title="Marquer comme Saisi"
                          >
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </button>
                        )}
                        {!isXml && (
                          <button
                            id={`btn-quick-xml-${contract.id}`}
                            type="button"
                            onClick={() => onQuickStatusChange(contract, 'XML')}
                            className="p-1 rounded text-slate-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                            title="Marquer comme Flux XML"
                          >
                            <Code2 className="w-3 h-3 stroke-[2.5]" />
                          </button>
                        )}
                        {!isNonSaisi && (
                          <button
                            id={`btn-quick-nonsaisi-${contract.id}`}
                            type="button"
                            onClick={() => onQuickStatusChange(contract, 'NON_SAISI')}
                            className="p-1 rounded text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Remettre à Non Saisi"
                          >
                            <AlertTriangle className="w-3 h-3 stroke-[2]" />
                          </button>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Column 7: Paiement */}
                  <td className="py-3 px-3 max-w-[200px]">
                    <p
                      className="text-slate-600 text-xs truncate"
                      title={contract.paymentTerms || 'Non spécifié'}
                    >
                      {contract.paymentTerms || (
                        <span className="text-slate-400 italic">Non spécifié</span>
                      )}
                    </p>
                  </td>

                  {/* Column 8: Contrat (Fichier) */}
                  <td className="py-3 px-3">
                    {contract.fileName ? (
                      <div
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 max-w-[210px]"
                        title={contract.fileName}
                      >
                        <FileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="truncate">{contract.fileName}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-slate-400 italic text-xs">
                          Aucun contrat joint
                        </span>
                        {onUploadFile && (
                          <button
                            id={`btn-table-attach-file-${contract.id}`}
                            type="button"
                            onClick={() => triggerUploadForContract(contract)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200 rounded transition-colors shadow-2xs"
                            title="Joindre un fichier de contrat"
                          >
                            <Paperclip className="w-3 h-3 text-blue-600" />
                            <span>📎 Joindre le contrat</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Column 9: Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5 justify-end">
                      {/* Voir & Télécharger (quand un fichier est présent) */}
                      {contract.fileName && (
                        <>
                          <button
                            id={`btn-action-view-${contract.id}`}
                            type="button"
                            onClick={() => setPreviewContract(contract)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg shadow-2xs transition-colors"
                            title="Voir le fichier du contrat"
                            aria-label={`Voir le contrat ${contract.id}`}
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Voir</span>
                          </button>

                          <button
                            id={`btn-action-download-${contract.id}`}
                            type="button"
                            onClick={() => handleDownloadContract(contract)}
                            disabled={downloadingContractId === contract.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
                            title="Télécharger le fichier du contrat"
                            aria-label={`Télécharger le contrat ${contract.id}`}
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>{downloadingContractId === contract.id ? 'Téléchargement...' : 'Télécharger'}</span>
                          </button>
                        </>
                      )}

                      {/* Menu déroulant Actions: Modifier & Supprimer (si ADMIN) */}
                      <div className="relative inline-block text-left" data-action-menu="true">
                        <button
                          id={`btn-actions-menu-${contract.id}`}
                          type="button"
                          onClick={() =>
                            setOpenActionMenuId(
                              openActionMenuId === contract.id ? null : contract.id
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg shadow-2xs transition-colors"
                          aria-expanded={openActionMenuId === contract.id}
                          aria-haspopup="true"
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                          <span>Actions</span>
                          <ChevronDown
                            className={`w-3 h-3 text-slate-400 transition-transform ${
                              openActionMenuId === contract.id ? 'rotate-180 text-blue-600' : ''
                            }`}
                          />
                        </button>

                        {openActionMenuId === contract.id && (
                          <div
                            id={`actions-dropdown-${contract.id}`}
                            className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 divide-y divide-slate-100 text-left animate-in fade-in zoom-in-95 duration-100"
                            role="menu"
                            aria-orientation="vertical"
                          >
                            <div className="py-0.5">
                              <button
                                id={`btn-menu-edit-${contract.id}`}
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  onEdit(contract);
                                }}
                                className="w-full px-3 py-1.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-700 flex items-center gap-2 font-medium transition-colors"
                                role="menuitem"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Modifier</span>
                              </button>
                            </div>

                            {currentUserRole === 'ADMIN' && (
                              <div className="py-0.5">
                                <button
                                  id={`btn-menu-delete-${contract.id}`}
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    onDelete(contract);
                                  }}
                                  className="w-full px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 flex items-center gap-2 font-medium transition-colors cursor-pointer"
                                  role="menuitem"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                  <span>Supprimer</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="bg-slate-50/70 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
        <div>
          Total : <strong className="text-slate-800 font-semibold">{contracts.length}</strong>{' '}
          contrat{contracts.length > 1 ? 's' : ''} listé{contracts.length > 1 ? 's' : ''}
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Saisi
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Flux XML
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Non Saisi (Urgent)
          </span>
        </div>
      </div>

      {/* Input de sélection masqué pour téléversement direct depuis la table */}
      <input
        ref={tableFileInputRef}
        id="table-hidden-file-input"
        type="file"
        accept={SUPPORTED_FILE_ACCEPT}
        onChange={handleTableFileSelected}
        className="hidden"
      />

      {/* Visionneuse intégrée sécurisée de document */}
      {previewContract && previewContract.fileName && (
        <FileViewerModal
          isOpen={Boolean(previewContract)}
          onClose={() => setPreviewContract(null)}
          contractId={previewContract.id}
          fileName={previewContract.fileName}
          fileType={previewContract.fileType}
        />
      )}
    </div>
  );
};
