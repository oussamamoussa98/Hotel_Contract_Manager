import React, { useState, useEffect, useCallback } from 'react';
import {
  Contract,
  ContractFilterState,
  ContractFormData,
  Hotel,
  EntryStatus,
  Region,
  Chain,
  User,
  CreateUserData,
  UpdateUserData,
} from './types';
import { apiService } from './services/api';
import { Navbar, MainTab } from './components/Navbar';
import { ContractFilters } from './components/ContractFilters';
import { ContractTable } from './components/ContractTable';
import { ContractModal } from './components/ContractModal';
import { DashboardView } from './components/DashboardView';
import { PendingContractsView } from './components/PendingContractsView';
import { HotelsView } from './components/HotelsView';
import { UsersManagementView } from './components/UsersManagementView';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { LoginView } from './components/LoginView';
import { PlusCircle, ClockAlert, FileText, AlertCircle, RefreshCw, Loader2, Users } from 'lucide-react';

export default function App() {
  // Phase 8: Authenticated User & Session State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Détection de l'onglet initial (support de /contracts/pending, #pending, #dashboard, etc.)
  const getInitialTab = (): MainTab => {
    const pathname = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    if (
      pathname.includes('/contracts/pending') ||
      pathname.includes('/pending') ||
      hash.includes('pending') ||
      hash.includes('a-saisir')
    ) {
      return 'pending';
    }
    if (pathname.includes('/contracts') || hash.includes('contracts')) {
      return 'contracts';
    }
    if (pathname.includes('/hotels') || hash.includes('hotels')) {
      return 'hotels';
    }
    if (pathname.includes('/users') || hash.includes('users')) {
      return 'users';
    }
    return 'dashboard';
  };

  const [currentTab, setCurrentTab] = useState<MainTab>(getInitialTab);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filters State
  const initialFilters: ContractFilterState = {
    region: '',
    chain: '',
    status: '',
    hotel: '',
    contractDate: '',
    contractDateFrom: '',
    contractDateTo: '',
    receptionDate: '',
    receptionDateFrom: '',
    receptionDateTo: '',
  };
  const [filters, setFilters] = useState<ContractFilterState>(initialFilters);
  const [totalContractsCount, setTotalContractsCount] = useState<number>(0);

  // Modals state
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Synchronisation URL avec les onglets (pathname et hash)
  useEffect(() => {
    const handleUrlChange = () => {
      const pathname = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (
        pathname.includes('/contracts/pending') ||
        pathname.includes('/pending') ||
        hash.includes('pending') ||
        hash.includes('a-saisir')
      ) {
        setCurrentTab('pending');
      } else if (hash.includes('dashboard') || pathname === '/' || pathname === '') {
        setCurrentTab('dashboard');
      } else if (hash.includes('contracts') || pathname.includes('/contracts')) {
        setCurrentTab('contracts');
      } else if (hash.includes('hotels') || pathname.includes('/hotels')) {
        setCurrentTab('hotels');
      } else if (hash.includes('users') || pathname.includes('/users')) {
        if (currentUser && currentUser.role !== 'ADMIN') {
          setCurrentTab('dashboard');
          window.location.hash = '#dashboard';
          addToast('warning', 'Accès refusé', 'Accès réservé aux administrateurs.');
        } else {
          setCurrentTab('users');
        }
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [currentUser]);

  const handleSelectTab = (tab: MainTab) => {
    if (tab === 'users') {
      if (currentUser?.role !== 'ADMIN') {
        addToast('warning', 'Accès refusé', 'Accès réservé aux administrateurs.');
        setCurrentTab('dashboard');
        window.location.hash = '#dashboard';
        return;
      }
      setCurrentTab('users');
      window.location.hash = '#users';
      return;
    }

    setCurrentTab(tab);
    if (tab === 'pending') {
      window.location.hash = '#/contracts/pending';
      setFilters((prev) => ({ ...prev, status: 'NON_SAISI' }));
    } else if (tab === 'contracts') {
      window.location.hash = '#contracts';
      setFilters((prev) => ({ ...prev, status: '' }));
    } else if (tab === 'dashboard') {
      window.location.hash = '#dashboard';
    } else if (tab === 'hotels') {
      window.location.hash = '#hotels';
    }
  };

  // Authenticated session validation on startup
  useEffect(() => {
    let isMounted = true;
    const verifySession = async () => {
      const token = apiService.getToken();
      if (!token) {
        if (isMounted) {
          setCurrentUser(null);
          setIsAuthChecking(false);
        }
        return;
      }

      try {
        const user = await apiService.getCurrentUser();
        if (isMounted) {
          setCurrentUser(user);
          setIsAuthChecking(false);
        }
      } catch (err) {
        console.warn('Authentication session check failed:', err);
        apiService.setToken(null);
        apiService.setStoredUser(null);
        if (isMounted) {
          setCurrentUser(null);
          setIsAuthChecking(false);
        }
      }
    };

    verifySession();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    addToast(
      'success',
      'Connexion réussie',
      `Bienvenue, ${user.name} (${user.role === 'ADMIN' ? 'Administrateur' : 'Agent de Saisie'})`
    );
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      setCurrentUser(null);
      setContracts([]);
      setHotels([]);
      addToast('info', 'Déconnexion', 'Vous avez été déconnecté avec succès.');
    }
  };

  // Fetch data
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setApiError(null);
    try {
      const [fetchedHotels, fetchedContracts] = await Promise.all([
        apiService.getHotels(),
        apiService.getContracts(filters),
      ]);
      setHotels(fetchedHotels);
      setContracts(fetchedContracts);

      // Si aucun filtre n'est actif, mettre à jour le nombre total
      const isFiltered = Object.values(filters).some(Boolean);
      if (!isFiltered) {
        setTotalContractsCount(fetchedContracts.length);
      } else if (totalContractsCount === 0) {
        // En cas de démarrage direct sur un filtre, récupérer le compte global
        apiService.getContracts().then((all) => setTotalContractsCount(all.length)).catch(() => {});
      }
    } catch (err: any) {
      console.error('Error fetching contracts/hotels:', err);
      if (
        err.message &&
        (err.message.includes('Session expirée') ||
          err.message.includes('401') ||
          err.message.includes('Non authentifié') ||
          err.message.includes('Authentification requise'))
      ) {
        await apiService.logout();
        setCurrentUser(null);
        addToast('warning', 'Session expirée', 'Votre session a expiré. Veuillez vous reconnecter.');
        return;
      }
      setApiError(err.message || 'Impossible de joindre le serveur API.');
      addToast('error', 'Erreur API', err.message || 'Impossible de synchroniser avec le backend');
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentUser]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [loadData, currentUser]);

  // Handlers for Add / Edit Contract
  const handleOpenAdd = () => {
    setEditingContract(null);
    setIsContractModalOpen(true);
  };

  const handleOpenEdit = (contract: Contract) => {
    setEditingContract(contract);
    setIsContractModalOpen(true);
  };

  const handleSaveContract = async (formData: ContractFormData) => {
    try {
      if (editingContract) {
        let updated = await apiService.updateContract(editingContract.id, formData);

        // Traitement du fichier joint si présent ou suppression demandée
        if (formData.pendingFile) {
          updated = await apiService.uploadContractFile(editingContract.id, formData.pendingFile);
        } else if (formData.removeFile) {
          updated = await apiService.deleteContractFile(editingContract.id);
        }

        addToast(
          'success',
          'Contrat mis à jour',
          `Le contrat pour ${updated.hotel?.name || 'l’hôtel'} a été enregistré.`
        );
      } else {
        let created = await apiService.createContract(formData);

        // Téléversement du fichier joint directement associé
        if (formData.pendingFile) {
          created = await apiService.uploadContractFile(created.id, formData.pendingFile);
        }

        addToast(
          'success',
          'Contrat créé avec succès',
          `Nouveau contrat pour ${created.hotel?.name || 'l’hôtel'} ajouté avec succès.`
        );
      }
      setIsContractModalOpen(false);
      setEditingContract(null);
      await loadData();
    } catch (err: any) {
      console.error('Save error:', err);
      throw err;
    }
  };

  // Handler for Direct File Upload from Table
  const handleUploadDirectFile = async (contract: Contract, file: File) => {
    try {
      await apiService.uploadContractFile(contract.id, file);
      addToast(
        'success',
        'Fichier téléversé',
        `Le fichier "${file.name}" a été joint au contrat #${contract.id} (${contract.hotel?.name}).`
      );
      await loadData();
    } catch (err: any) {
      addToast('error', 'Échec du téléversement', err.message);
    }
  };

  // Handler for Direct File Deletion
  const handleDeleteContractFile = async (contract: Contract) => {
    try {
      await apiService.deleteContractFile(contract.id);
      addToast(
        'info',
        'Fichier supprimé',
        `Le fichier associé au contrat #${contract.id} (${contract.hotel?.name}) a été retiré.`
      );
      await loadData();
    } catch (err: any) {
      addToast('error', 'Échec de la suppression du fichier', err.message);
    }
  };

  // Handlers for Delete Contract
  const handleOpenDelete = (contract: Contract) => {
    setDeletingContract(contract);
  };

  const handleConfirmDelete = async () => {
    if (!deletingContract) return;

    // RBAC client-side guard (backed by HTTP 403 on backend)
    if (currentUser?.role !== 'ADMIN') {
      addToast(
        'error',
        'Accès refusé',
        'Action réservée aux administrateurs. Les agents de saisie ne peuvent pas supprimer de contrats.'
      );
      setDeletingContract(null);
      return;
    }

    setIsDeleting(true);
    try {
      await apiService.deleteContract(deletingContract.id);
      addToast(
        'info',
        'Contrat supprimé',
        `Le contrat de ${deletingContract.hotel?.name} a été retiré.`
      );
      setDeletingContract(null);
      await loadData();
    } catch (err: any) {
      addToast('error', 'Erreur de suppression', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler for Quick Status Change
  const handleQuickStatusChange = async (contract: Contract, newStatus: EntryStatus) => {
    try {
      await apiService.updateContract(contract.id, { entryStatus: newStatus });
      const label = newStatus === 'SAISI' ? 'Saisi ✓' : newStatus === 'XML' ? 'Flux XML' : 'Non Saisi';
      addToast('success', 'Statut mis à jour', `Le contrat #${contract.id} est désormais "${label}"`);
      await loadData();
    } catch (err: any) {
      addToast('error', 'Échec du changement de statut', err.message);
    }
  };

  // Handler for Adding an Hotel from Hotels view
  const handleAddHotel = async (newHotelData: { name: string; region: Region; chain: Chain }) => {
    try {
      const created = await apiService.createHotel(newHotelData);
      addToast('success', 'Hôtel créé', `L'hôtel ${created.name} a été enregistré.`);
      await loadData();
    } catch (err: any) {
      addToast('error', 'Erreur création hôtel', err.message);
      throw err;
    }
  };

  // Chargement de la liste des utilisateurs (ADMIN uniquement)
  const loadUsersData = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;
    setIsLoadingUsers(true);
    try {
      const list = await apiService.getUsers();
      setUsersList(list);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      addToast('error', 'Erreur utilisateurs', err.message || 'Impossible de récupérer la liste des utilisateurs.');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN' && currentTab === 'users') {
      loadUsersData();
    }
  }, [currentUser, currentTab, loadUsersData]);

  // Sécurité RBAC : redirection si un AGENT_SAISIE tente d'accéder à l'onglet Utilisateurs
  useEffect(() => {
    if (currentUser && currentUser.role !== 'ADMIN' && currentTab === 'users') {
      setCurrentTab('dashboard');
      window.location.hash = '#dashboard';
      addToast('warning', 'Accès refusé', 'Accès réservé aux administrateurs.');
    }
  }, [currentUser, currentTab]);

  // Handlers pour la gestion des utilisateurs (Phase 10)
  const handleCreateUser = async (newUserData: CreateUserData) => {
    try {
      const created = await apiService.createUser(newUserData);
      addToast(
        'success',
        'Utilisateur créé',
        `Le compte ${created.name} (${created.email}) a été créé avec succès.`
      );
      await loadUsersData();
    } catch (err: any) {
      addToast('error', 'Échec de la création', err.message);
      throw err;
    }
  };

  const handleUpdateUser = async (userId: number, updateData: UpdateUserData) => {
    try {
      const updated = await apiService.updateUser(userId, updateData);
      addToast(
        'success',
        'Utilisateur modifié',
        `Les informations de ${updated.name} ont été mises à jour.`
      );
      if (currentUser && currentUser.id === userId) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                name: updated.name,
                email: updated.email,
                role: updated.role,
              }
            : null
        );
      }
      await loadUsersData();
    } catch (err: any) {
      addToast('error', 'Échec de la modification', err.message);
      throw err;
    }
  };

  const handleToggleUserStatus = async (userId: number, active: boolean) => {
    try {
      const updated = await apiService.toggleUserStatus(userId, active);
      const actionLabel = active ? 'activé' : 'désactivé';
      addToast(
        'info',
        `Compte ${actionLabel}`,
        `Le compte de ${updated.name} est maintenant ${actionLabel}.`
      );
      await loadUsersData();
    } catch (err: any) {
      addToast('error', 'Échec du changement de statut', err.message);
    }
  };

  const handleResetUserPassword = async (userId: number, newPassword: string) => {
    try {
      const res = await apiService.resetUserPassword(userId, newPassword);
      addToast(
        'success',
        'Mot de passe réinitialisé',
        res.message || 'Le mot de passe a été mis à jour avec succès.'
      );
    } catch (err: any) {
      addToast('error', 'Échec de réinitialisation', err.message);
      throw err;
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await apiService.deleteUser(userId);
      addToast(
        'info',
        'Utilisateur supprimé',
        'Le compte utilisateur a été définitivement supprimé.'
      );
      await loadUsersData();
    } catch (err: any) {
      addToast('error', 'Échec de la suppression', err.message);
      throw err;
    }
  };

  // Pending count (NON_SAISI)
  const pendingCount = contracts.filter((c) => c.entryStatus === 'NON_SAISI').length;

  // 1. Session verification loading screen on cold startup/refresh
  if (isAuthChecking) {
    return (
      <div
        id="auth-loading-screen"
        className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6"
      >
        <Loader2 className="w-9 h-9 animate-spin text-blue-500 mb-4" />
        <p className="text-sm font-semibold text-slate-200">Vérification de la session sécurisée...</p>
        <p className="text-xs text-slate-500 mt-1">Hôtel Contract Manager • Authentification JWT</p>
      </div>
    );
  }

  // 2. Unauthenticated state: display secure login screen
  if (!currentUser) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans antialiased">
      {/* 1. Main Navigation Menu */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        pendingCount={pendingCount}
        totalCount={contracts.length}
        onOpenAddContract={handleOpenAdd}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* 2. Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top API Error Banner if any */}
        {apiError && (
          <div className="mb-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <div>
                <strong className="font-semibold">Alerte de synchronisation :</strong>{' '}
                <span>{apiError}</span>
              </div>
            </div>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1 px-3 py-1 bg-white text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-md font-semibold transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Réessayer</span>
            </button>
          </div>
        )}

        {/* VIEW 1: DASHBOARD */}
        {currentTab === 'dashboard' && (
          <DashboardView
            contracts={contracts}
            hotels={hotels}
            onNavigateToContracts={(status) => {
              if (status) {
                setFilters((prev) => ({ ...prev, status }));
                handleSelectTab('contracts');
              } else {
                setFilters(initialFilters);
                handleSelectTab('contracts');
              }
            }}
            onNavigateToPending={() => handleSelectTab('pending')}
            onOpenAddContract={handleOpenAdd}
            onQuickStatusChange={handleQuickStatusChange}
          />
        )}

        {/* VIEW 2: CONTRACTS (/contracts) */}
        {currentTab === 'contracts' && (
          <div className="space-y-4">
            {/* Header section with page title & quick CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h1 className="text-xl font-bold text-slate-900">
                    Registre des Contrats Hôteliers
                  </h1>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Gestion centralisée, suivi des flux et contrôle de conformité des grilles tarifaires
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-add-contract-page"
                  onClick={handleOpenAdd}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-[0.98]"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>+ Ajouter un contrat</span>
                </button>
              </div>
            </div>

            {/* Filters */}
            <ContractFilters
              filters={filters}
              onFilterChange={(newFilters) => setFilters((prev) => ({ ...prev, ...newFilters }))}
              onReset={() => setFilters(initialFilters)}
              totalFiltered={contracts.length}
              totalAvailable={totalContractsCount || contracts.length}
            />

            {/* Contracts Table */}
            <ContractTable
              contracts={contracts}
              onEdit={handleOpenEdit}
              onDelete={handleOpenDelete}
              onQuickStatusChange={handleQuickStatusChange}
              isLoading={isLoading}
              onOpenAddContract={handleOpenAdd}
              onDeleteFile={handleDeleteContractFile}
              onUploadFile={handleUploadDirectFile}
              currentUserRole={currentUser.role}
            />
          </div>
        )}

        {/* VIEW 3: NON SAISI (/contracts/pending) */}
        {currentTab === 'pending' && (
          <PendingContractsView
            contracts={contracts}
            onOpenAddContract={handleOpenAdd}
            onEditContract={handleOpenEdit}
            onDeleteContract={handleOpenDelete}
            onQuickStatusChange={handleQuickStatusChange}
            isLoading={isLoading}
            onNavigateToDashboard={() => handleSelectTab('dashboard')}
            onDeleteFile={handleDeleteContractFile}
            onUploadFile={handleUploadDirectFile}
            currentUserRole={currentUser.role}
          />
        )}

        {/* VIEW 4: HÔTELS */}
        {currentTab === 'hotels' && (
          <HotelsView
            hotels={hotels}
            onAddHotel={handleAddHotel}
            onFilterByHotel={(hotelName) => {
              setFilters({ ...initialFilters, hotel: hotelName });
              setCurrentTab('contracts');
            }}
          />
        )}

        {/* VIEW 5: UTILISATEURS (ADMIN ONLY) */}
        {currentTab === 'users' && currentUser?.role === 'ADMIN' && (
          <UsersManagementView
            users={usersList}
            onRefreshUsers={loadUsersData}
            onCreateUser={handleCreateUser}
            onUpdateUser={handleUpdateUser}
            onToggleStatus={handleToggleUserStatus}
            onResetPassword={handleResetUserPassword}
            onDeleteUser={handleDeleteUser}
            isLoading={isLoadingUsers}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>Hotel Contract Manager</strong> • Système interne agence de voyage
          </div>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>13 Régions</span>
            <span>•</span>
            <span>17 Chaînes Hôtelières</span>
            <span>•</span>
            <span>Accès sécurisé RBAC</span>
          </div>
        </div>
      </footer>

      {/* Contract Add/Edit Modal */}
      <ContractModal
        isOpen={isContractModalOpen}
        onClose={() => {
          setIsContractModalOpen(false);
          setEditingContract(null);
        }}
        onSubmit={handleSaveContract}
        initialData={editingContract}
        existingHotels={hotels}
      />

      {/* Contract Delete Confirmation Modal */}
      <DeleteConfirmModal
        contract={deletingContract}
        isOpen={Boolean(deletingContract)}
        onClose={() => setDeletingContract(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
