import React, { useState, useEffect, useRef } from 'react';
import {
  Contract,
  ContractFormData,
  REGIONS,
  CHAINS,
  STATUS_OPTIONS,
  Region,
  Chain,
  EntryStatus,
  Hotel,
  PAYMENT_TERMS_OPTIONS,
  SUPPORTED_FILE_EXTENSIONS,
  SUPPORTED_FILE_ACCEPT,
  MAX_FILE_SIZE_BYTES,
} from '../types';
import {
  X,
  Building2,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Eye,
  Download,
  Trash2,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  AlertTriangle,
  FileCheck2,
} from 'lucide-react';
import { apiService } from '../services/api';

interface ContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ContractFormData) => Promise<void>;
  initialData?: Contract | null;
  existingHotels: Hotel[];
}

export const ContractModal: React.FC<ContractModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  existingHotels,
}) => {
  const isEditing = Boolean(initialData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getTodayString = () => new Date().toISOString().split('T')[0];
  const getOneYearLaterString = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState<ContractFormData>({
    hotelName: '',
    region: 'HAMMAMET',
    chain: 'IBEROSTAR',
    contractDateFrom: getTodayString(),
    contractDateTo: getOneYearLaterString(),
    contractDate: getTodayString(),
    receptionDate: getTodayString(),
    entryStatus: 'NON_SAISI',
    paymentTerms: "Avance et le reste à l'hôtel",
    fileName: '',
    pendingFile: null,
    removeFile: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Sync state when modal opens or initialData changes
  useEffect(() => {
    if (initialData) {
      const fromDate = initialData.contractDateFrom || initialData.contractDate || getTodayString();
      const toDate = initialData.contractDateTo || initialData.contractDate || getOneYearLaterString();
      setFormData({
        hotelId: initialData.hotel?.id,
        hotelName: initialData.hotel?.name || '',
        region: initialData.hotel?.region || 'HAMMAMET',
        chain: initialData.hotel?.chain || 'IBEROSTAR',
        contractDateFrom: fromDate,
        contractDateTo: toDate,
        contractDate: fromDate,
        receptionDate: initialData.receptionDate || getTodayString(),
        entryStatus: initialData.entryStatus || 'NON_SAISI',
        paymentTerms: initialData.paymentTerms || "Avance et le reste à l'hôtel",
        fileName: initialData.fileName || '',
        pendingFile: null,
        removeFile: false,
      });
    } else {
      setFormData({
        hotelName: '',
        region: 'HAMMAMET',
        chain: 'IBEROSTAR',
        contractDateFrom: getTodayString(),
        contractDateTo: getOneYearLaterString(),
        contractDate: getTodayString(),
        receptionDate: getTodayString(),
        entryStatus: 'NON_SAISI',
        paymentTerms: "Avance et le reste à l'hôtel",
        fileName: '',
        pendingFile: null,
        removeFile: false,
      });
    }
    setErrors({});
    setServerError(null);
    setFileError(null);
  }, [initialData, isOpen]);

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes === 0) return '';
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
  };

  const validateAndSetFile = (file: File): boolean => {
    setFileError(null);
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!SUPPORTED_FILE_EXTENSIONS.includes(ext)) {
      setFileError(
        `Extension ${ext} non autorisée. Formats acceptés : PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX.`
      );
      return false;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(
        `Le fichier dépasse la taille maximale autorisée de 10 Mo (${(file.size / (1024 * 1024)).toFixed(2)} Mo).`
      );
      return false;
    }

    setFormData((prev) => ({
      ...prev,
      fileName: file.name,
      pendingFile: file,
      removeFile: false,
    }));
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleRemoveFile = () => {
    setFormData((prev) => ({
      ...prev,
      fileName: '',
      pendingFile: null,
      removeFile: true,
    }));
    setFileError(null);
  };

  const getFileIcon = (fileName?: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-4 h-4 text-rose-600" />;
    if (['jpg', 'jpeg', 'png'].includes(ext || ''))
      return <ImageIcon className="w-4 h-4 text-blue-600" />;
    if (['xls', 'xlsx'].includes(ext || ''))
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    return <FileText className="w-4 h-4 text-slate-600" />;
  };

  if (!isOpen) return null;

  // Hotel autocompletion helper
  const handleHotelNameChange = (name: string) => {
    setFormData((prev) => {
      const match = existingHotels.find(
        (h) => h.name.toLowerCase() === name.trim().toLowerCase()
      );
      if (match) {
        return {
          ...prev,
          hotelName: name,
          region: match.region,
          chain: match.chain,
        };
      }
      return { ...prev, hotelName: name };
    });

    if (errors.hotelName) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.hotelName;
        return copy;
      });
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!formData.hotelName || !formData.hotelName.trim()) {
      errs.hotelName = "Le nom de l'hôtel est obligatoire";
    }
    if (!formData.region) {
      errs.region = 'Veuillez sélectionner une région';
    }
    if (!formData.chain) {
      errs.chain = 'Veuillez sélectionner une chaîne hôtelière';
    }
    if (!formData.contractDateFrom) {
      errs.contractDateFrom = 'La date contrat (à partir du) est obligatoire';
    }
    if (!formData.contractDateTo) {
      errs.contractDateTo = 'La date contrat (jusqu\'au) est obligatoire';
    }
    if (
      formData.contractDateFrom &&
      formData.contractDateTo &&
      formData.contractDateTo < formData.contractDateFrom
    ) {
      errs.contractDateTo =
        'La date contrat (jusqu\'au) ne peut pas être antérieure à la date contrat (à partir du)';
    }
    if (!formData.receptionDate) {
      errs.receptionDate = 'La date de réception est requise';
    }
    if (!formData.entryStatus) {
      errs.entryStatus = "L'état de saisie est requis";
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
      await onSubmit({
        ...formData,
        contractDate: formData.contractDateFrom || formData.contractDate,
      });
      onClose();
    } catch (err: any) {
      setServerError(
        err.message || 'Une erreur est survenue lors de l’enregistrement du contrat.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewExistingFile = async () => {
    if (!initialData?.id) return;
    try {
      const { blob } = await apiService.getContractFileBlob(initialData.id, false);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err: any) {
      setFileError(err.message || "Impossible d'afficher le document");
    }
  };

  const handleDownloadExistingFile = async () => {
    if (!initialData?.id) return;
    try {
      await apiService.downloadContractFile(initialData.id, formData.fileName);
    } catch (err: any) {
      setFileError(err.message || "Impossible de télécharger le document");
    }
  };

  return (
    <div
      id="contract-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      aria-labelledby="contract-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="contract-modal-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden transition-all transform scale-100"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold">
              <FileCheck2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="contract-modal-title" className="text-base font-bold text-white">
                {isEditing ? 'Modifier le contrat hôtelier' : 'Nouveau contrat hôtelier'}
              </h2>
              <p className="text-xs text-blue-200">
                Saisie rapide & enregistrement dans la base centralisée
              </p>
            </div>
          </div>

          <button
            id="btn-close-contract-modal"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Fermer la boîte de dialogue"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div
            id="modal-server-error-alert"
            className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-rose-800 text-xs"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Erreur de traitement :</span>
              <span>{serverError}</span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Row 1: Nom Hôtel + Suggestion */}
          <div>
            <label
              htmlFor="contract-form-hotel-name"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Nom de l'hôtel <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="contract-form-hotel-name"
                list="existing-hotels-datalist"
                type="text"
                placeholder="Ex: Iberostar Averroes Hammamet"
                value={formData.hotelName}
                onChange={(e) => handleHotelNameChange(e.target.value)}
                autoFocus
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                  errors.hotelName
                    ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500'
                    : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              <datalist id="existing-hotels-datalist">
                {existingHotels.map((h) => (
                  <option key={h.id} value={h.name}>
                    {h.region} • {h.chain}
                  </option>
                ))}
              </datalist>
            </div>
            {errors.hotelName && (
              <p className="text-xs text-rose-600 mt-1 font-medium">{errors.hotelName}</p>
            )}
          </div>

          {/* Row 2: Région & Chaîne */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="contract-form-region"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Région <span className="text-rose-500">*</span>
              </label>
              <select
                id="contract-form-region"
                value={formData.region}
                onChange={(e) => {
                  const val = e.target.value as Region;
                  setFormData((prev) => ({ ...prev, region: val }));
                  if (errors.region) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.region;
                      return copy;
                    });
                  }
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="contract-form-chain"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Chaîne hôtelière <span className="text-rose-500">*</span>
              </label>
              <select
                id="contract-form-chain"
                value={formData.chain}
                onChange={(e) => {
                  const val = e.target.value as Chain;
                  setFormData((prev) => ({ ...prev, chain: val }));
                  if (errors.chain) {
                    setErrors((prev) => {
                      const copy = { ...prev };
                      delete copy.chain;
                      return copy;
                    });
                  }
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {CHAINS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Période du Contrat (à partir du / jusqu'au) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="contract-form-date-from"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Date contrat (à partir du) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="contract-form-date-from"
                  type="date"
                  value={formData.contractDateFrom}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      contractDateFrom: e.target.value,
                      contractDate: e.target.value,
                    })
                  }
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                    errors.contractDateFrom
                      ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
              </div>
              {errors.contractDateFrom && (
                <p className="text-xs text-rose-600 mt-1 font-medium">
                  {errors.contractDateFrom}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="contract-form-date-to"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Date contrat (jusqu'au) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                <input
                  id="contract-form-date-to"
                  type="date"
                  value={formData.contractDateTo}
                  onChange={(e) =>
                    setFormData({ ...formData, contractDateTo: e.target.value })
                  }
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                    errors.contractDateTo
                      ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500'
                      : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                  }`}
                />
              </div>
              {errors.contractDateTo && (
                <p className="text-xs text-rose-600 mt-1 font-medium">
                  {errors.contractDateTo}
                </p>
              )}
            </div>
          </div>

          {/* Row 3b: Date de réception */}
          <div>
            <label
              htmlFor="contract-form-reception-date"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Date de réception <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                id="contract-form-reception-date"
                type="date"
                value={formData.receptionDate}
                onChange={(e) =>
                  setFormData({ ...formData, receptionDate: e.target.value })
                }
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border bg-white focus:outline-none focus:ring-2 ${
                  errors.receptionDate
                    ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500'
                    : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
            </div>
            {errors.receptionDate && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                {errors.receptionDate}
              </p>
            )}
          </div>

          {/* Row 4: État de saisie (3 options claires et visuelles) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              État de saisie <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {STATUS_OPTIONS.map((st) => {
                const isSelected = formData.entryStatus === st.value;
                return (
                  <button
                    key={st.value}
                    id={`btn-select-status-${st.value.toLowerCase()}`}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, entryStatus: st.value as EntryStatus })
                    }
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                      isSelected
                        ? st.value === 'SAISI'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-400'
                          : st.value === 'XML'
                          ? 'border-blue-500 bg-blue-50/70 text-blue-900 ring-2 ring-blue-400'
                          : 'border-rose-500 bg-rose-50/70 text-rose-900 ring-2 ring-rose-400'
                        : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100/70'
                    }`}
                  >
                    <span className="text-xs font-bold tracking-tight">
                      {st.value === 'SAISI' && '✓ Saisi'}
                      {st.value === 'XML' && 'Flux XML'}
                      {st.value === 'NON_SAISI' && '⚠ Non Saisi'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                      {st.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 5: Modalités de paiement (Options rapides + Zone de texte libre) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="contract-form-payment-terms"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                <span>Modalités de paiement</span>
              </label>
              <span className="text-[11px] text-slate-400">2 options rapides ou texte personnalisé</span>
            </div>

            {/* Visual 2-Option selector cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              {PAYMENT_TERMS_OPTIONS.map((term) => {
                const isSelected = formData.paymentTerms?.trim() === term;
                return (
                  <button
                    key={term}
                    type="button"
                    id={`btn-payment-${term === "Totalité à l'agence" ? 'agence' : 'hotel'}`}
                    onClick={() => setFormData({ ...formData, paymentTerms: term })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold text-left border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-400 shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <span>{term}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Textarea */}
            <textarea
              id="contract-form-payment-terms"
              rows={3}
              value={formData.paymentTerms}
              onChange={(e) =>
                setFormData({ ...formData, paymentTerms: e.target.value })
              }
              placeholder="Préciser les modalités de paiement (ex: Avance et le reste à l'hôtel, acomptes, conditions spécifiques...)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-y"
            />
          </div>

          {/* Row 6: Fichier contrat (PHASE 5 CONFORME) */}
          <div className="border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                <span>Fichier du contrat</span>
              </label>
              <span className="text-[11px] text-slate-400">
                PDF, DOC, DOCX, JPG, PNG, XLS, XLSX (Max 10 Mo)
              </span>
            </div>

            {/* Input caché pour la sélection de fichier */}
            <input
              ref={fileInputRef}
              id="contract-modal-hidden-file-input"
              type="file"
              accept={SUPPORTED_FILE_ACCEPT}
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Affichage : "Aucun contrat joint" vs "📄 filename.pdf" avec Voir, Télécharger, Supprimer */}
            {!formData.fileName || formData.removeFile ? (
              <div
                id="contract-file-empty-zone"
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-4 transition-all text-center flex flex-col items-center justify-center gap-2 ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                    : 'border-slate-300 bg-slate-50/50 text-slate-500 hover:bg-slate-50 hover:border-slate-400'
                }`}
              >
                <div className="text-xs text-slate-500 italic">
                  " Aucun contrat joint "
                </div>

                <button
                  id="btn-attach-contract-file-modal"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition-colors"
                >
                  <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                  <span>📎 Joindre le contrat</span>
                </button>

                <p className="text-[10px] text-slate-400">
                  Glissez-déposez votre document ici ou cliquez pour parcourir
                </p>
              </div>
            ) : (
              <div
                id="contract-file-attached-zone"
                className="border border-slate-200 bg-slate-50/80 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 shadow-2xs">
                    {getFileIcon(formData.fileName)}
                  </div>
                  <div className="min-w-0">
                    <div
                      id="modal-file-display-name"
                      className="text-xs font-bold text-slate-800 truncate"
                      title={formData.fileName}
                    >
                      📄 {formData.fileName}
                    </div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2 mt-0.5">
                      {formData.pendingFile ? (
                        <span className="text-emerald-700 font-medium">
                          Nouveau document joint ({formatFileSize(formData.pendingFile.size)})
                        </span>
                      ) : (
                        <span>
                          Document enregistré
                          {initialData?.fileSize ? ` • ${formatFileSize(initialData.fileSize)}` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Boutons d'actions : Voir, Télécharger, Supprimer */}
                <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                  {/* Bouton Voir */}
                  {initialData?.id && !formData.pendingFile ? (
                    <button
                      id="btn-view-contract-file"
                      type="button"
                      onClick={handleViewExistingFile}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer"
                      title="Voir le fichier"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>Voir</span>
                    </button>
                  ) : (
                    formData.pendingFile && (
                      <button
                        id="btn-view-pending-file"
                        type="button"
                        onClick={() => {
                          if (formData.pendingFile) {
                            const url = URL.createObjectURL(formData.pendingFile);
                            window.open(url, '_blank');
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer"
                        title="Prévisualiser"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                        <span>Voir</span>
                      </button>
                    )
                  )}

                  {/* Bouton Télécharger */}
                  {initialData?.id && !formData.pendingFile ? (
                    <button
                      id="btn-download-contract-file"
                      type="button"
                      onClick={handleDownloadExistingFile}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-300 rounded-md shadow-2xs transition-colors cursor-pointer"
                      title="Télécharger le fichier"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span>Télécharger</span>
                    </button>
                  ) : (
                    formData.pendingFile && (
                      <button
                        id="btn-download-pending-file"
                        type="button"
                        onClick={() => {
                          if (formData.pendingFile) {
                            const url = URL.createObjectURL(formData.pendingFile);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = formData.pendingFile.name;
                            a.click();
                            URL.revokeObjectURL(url);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-300 rounded-md shadow-2xs transition-colors"
                        title="Télécharger le fichier"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" />
                        <span>Télécharger</span>
                      </button>
                    )
                  )}

                  {/* Bouton Supprimer */}
                  <button
                    id="btn-remove-contract-file"
                    type="button"
                    onClick={handleRemoveFile}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-md shadow-2xs transition-colors"
                    title="Supprimer le fichier"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Supprimer</span>
                  </button>
                </div>
              </div>
            )}

            {/* Message d'erreur de validation du fichier */}
            {fileError && (
              <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>{fileError}</span>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="border-t border-slate-200 pt-4 mt-4 flex items-center justify-end gap-3">
            <button
              id="btn-cancel-contract-modal"
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Annuler
            </button>

            <button
              id="btn-submit-contract-modal"
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {submitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEditing ? 'Mettre à jour' : 'Enregistrer le contrat'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
