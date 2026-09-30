import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { apiService } from '../services/api';

interface FileViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  contractId: number;
  fileName: string;
  fileType?: string;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  isOpen,
  onClose,
  contractId,
  fileName,
  fileType,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    let isMounted = true;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(null);

    // Fetch secure blob with Authorization: Bearer <token>
    apiService
      .getContractFileBlob(contractId, false)
      .then(({ blob }) => {
        if (!isMounted) return;
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Error fetching contract file blob:', err);
        setError(err.message || 'Impossible de charger le document sécurisé');
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, contractId]);

  if (!isOpen) return null;

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const isPdf = ext === 'pdf' || fileType?.includes('pdf');
  const isImage = ['jpg', 'jpeg', 'png'].includes(ext) || fileType?.startsWith('image/');
  const isOfficeDoc = ['doc', 'docx', 'xls', 'xlsx'].includes(ext);

  const handleDownload = async () => {
    try {
      await apiService.downloadContractFile(contractId, fileName);
    } catch (err: any) {
      alert(err.message || 'Erreur lors du téléchargement');
    }
  };

  return (
    <div
      id="file-viewer-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        id="file-viewer-card"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              {isImage ? (
                <ImageIcon className="w-5 h-5" />
              ) : isOfficeDoc ? (
                <FileSpreadsheet className="w-5 h-5" />
              ) : (
                <FileText className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                📄 {fileName}
              </h2>
              <p className="text-[11px] text-slate-500">
                Contrat #{contractId} • Aperçu sécurisé (Authentification requise)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-viewer-download"
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Télécharger le fichier sécurisé"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger</span>
            </button>

            {blobUrl && (
              <a
                id="btn-viewer-external"
                href={blobUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors"
                title="Ouvrir dans un nouvel onglet"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Plein écran</span>
              </a>
            )}

            <button
              id="btn-viewer-close"
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors ml-1 cursor-pointer"
              aria-label="Fermer la visionneuse"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-auto flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-500 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Chargement sécurisé du document...</span>
            </div>
          ) : error ? (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-200 max-w-md text-center">
              <AlertCircle className="w-10 h-10 text-rose-600 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Impossible de charger le document
              </h3>
              <p className="text-xs text-rose-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          ) : isPdf && blobUrl ? (
            <iframe
              src={blobUrl}
              title={`Document ${fileName}`}
              className="w-full h-full rounded-xl border border-slate-200 bg-white shadow-xs"
            />
          ) : isImage && blobUrl ? (
            <div className="max-w-full max-h-full flex items-center justify-center p-2 bg-white rounded-xl shadow-xs border border-slate-200 overflow-auto">
              <img
                src={blobUrl}
                alt={fileName}
                className="max-h-[75vh] max-w-full object-contain rounded-lg"
              />
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Aperçu non disponible directement
              </h3>
              <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                Le format <strong className="font-semibold text-slate-800">.{ext.toUpperCase()}</strong>{' '}
                nécessite d'être ouvert avec l'application bureautique appropriée (Microsoft Word, Excel, etc.).
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger {fileName}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
