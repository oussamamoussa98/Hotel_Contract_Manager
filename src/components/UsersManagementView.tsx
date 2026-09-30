import React, { useState } from 'react';
import { User, UserRole, CreateUserData, UpdateUserData } from '../types';
import { UserModal } from './UserModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { DeleteUserModal } from './DeleteUserModal';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Edit2,
  KeyRound,
  Trash2,
  Power,
  RotateCcw,
  Calendar,
} from 'lucide-react';

interface UsersManagementViewProps {
  users: User[];
  onRefreshUsers: () => Promise<void>;
  onCreateUser: (data: CreateUserData) => Promise<void>;
  onUpdateUser: (id: number, data: UpdateUserData) => Promise<void>;
  onToggleStatus: (id: number, active: boolean) => Promise<void>;
  onResetPassword: (id: number, newPassword: string) => Promise<void>;
  onDeleteUser: (id: number) => Promise<void>;
  isLoading: boolean;
}

export const UsersManagementView: React.FC<UsersManagementViewProps> = ({
  users,
  onRefreshUsers,
  onCreateUser,
  onUpdateUser,
  onToggleStatus,
  onResetPassword,
  onDeleteUser,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals state
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active admins count calculation for safety guard
  const activeAdminsCount = users.filter((u) => u.role === 'ADMIN' && u.active).length;

  const isLastActiveAdmin = (user: User) => {
    return user.role === 'ADMIN' && user.active && activeAdminsCount <= 1;
  };

  // Filtered users list
  const filteredUsers = users.filter((u) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      if (!matchName && !matchEmail) return false;
    }
    if (roleFilter && u.role !== roleFilter) return false;
    if (statusFilter === 'active' && !u.active) return false;
    if (statusFilter === 'inactive' && u.active) return false;
    return true;
  });

  const handleOpenCreate = () => {
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleConfirmDelete = async (userId: number) => {
    setIsDeleting(true);
    try {
      await onDeleteUser(userId);
      setDeletingUser(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('');
    setStatusFilter('');
  };

  const hasActiveFilters = Boolean(searchQuery || roleFilter || statusFilter);

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div id="users-management-view" className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Gestion des Utilisateurs & Accès
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-open-create-user"
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm transition-all active:scale-[0.98] cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Nouvel utilisateur</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              id="filter-users-search"
              type="text"
              placeholder="Rechercher par nom ou adresse email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              id="filter-users-role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="">Tous les rôles</option>
              <option value="ADMIN">ADMIN (Administrateurs)</option>
              <option value="AGENT_SAISIE">AGENT_SAISIE (Agents)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="filter-users-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actifs uniquement</option>
              <option value="inactive">Désactivés uniquement</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
          <span>
            Affichage : <strong className="text-slate-800 font-semibold">{filteredUsers.length}</strong> sur {users.length} utilisateur{users.length > 1 ? 's' : ''}
          </span>

          {hasActiveFilters && (
            <button
              id="btn-reset-users-filters"
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser les filtres</span>
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div id="users-table-container" className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Utilisateur</th>
                <th className="py-3 px-4">Rôle</th>
                <th className="py-3 px-4 text-center">Statut</th>
                <th className="py-3 px-4">Date création</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Chargement des utilisateurs...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">Aucun utilisateur trouvé</p>
                    <p className="text-xs text-slate-400 mt-0.5">Modifiez vos critères de recherche ou ajoutez un nouveau compte.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const lastAdmin = isLastActiveAdmin(user);

                  return (
                    <tr
                      key={user.id}
                      id={`user-row-${user.id}`}
                      className={`hover:bg-slate-50/80 transition-colors ${!user.active ? 'bg-slate-50/50 opacity-80' : ''}`}
                    >
                      {/* Name & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                            user.role === 'ADMIN'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-900 text-sm truncate">
                              {user.name}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        {user.role === 'ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>ADMIN</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                            <UserIcon className="w-3 h-3 text-amber-600" />
                            <span>AGENT_SAISIE</span>
                          </span>
                        )}
                      </td>

                      {/* Active Status */}
                      <td className="py-3 px-4 text-center">
                        {user.active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Actif</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            <XCircle className="w-3 h-3 text-slate-400" />
                            <span>Désactivé</span>
                          </span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 text-slate-500 font-mono tabular-nums">
                        {formatDate(user.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          {/* Modifier */}
                          <button
                            id={`btn-user-edit-${user.id}`}
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Modifier l'utilisateur"
                            aria-label={`Modifier ${user.name}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            id={`btn-user-reset-pwd-${user.id}`}
                            type="button"
                            onClick={() => setResettingUser(user)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                            title="Réinitialiser le mot de passe"
                            aria-label={`Réinitialiser le mot de passe de ${user.name}`}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Activate / Deactivate Toggle */}
                          <button
                            id={`btn-user-toggle-status-${user.id}`}
                            type="button"
                            onClick={() => onToggleStatus(user.id, !user.active)}
                            disabled={lastAdmin}
                            className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
                              lastAdmin
                                ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                                : user.active
                                ? 'text-slate-500 hover:text-amber-700 hover:bg-amber-50 border-slate-200'
                                : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border-slate-200'
                            }`}
                            title={lastAdmin ? 'Impossible de désactiver le dernier administrateur' : user.active ? 'Désactiver le compte' : 'Activer le compte'}
                            aria-label={user.active ? 'Désactiver' : 'Activer'}
                          >
                            <Power className={`w-3.5 h-3.5 ${user.active ? 'text-amber-600' : 'text-emerald-600'}`} />
                          </button>

                          {/* Delete */}
                          <button
                            id={`btn-user-delete-${user.id}`}
                            type="button"
                            onClick={() => setDeletingUser(user)}
                            disabled={lastAdmin}
                            className={`p-1.5 border rounded-lg transition-colors cursor-pointer ${
                              lastAdmin
                                ? 'opacity-40 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                                : 'text-slate-500 hover:text-rose-700 hover:bg-rose-50 border-slate-200'
                            }`}
                            title={lastAdmin ? 'Impossible de supprimer le dernier administrateur actif' : 'Supprimer le compte'}
                            aria-label={`Supprimer ${user.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="bg-slate-50/70 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs text-slate-500">
          <div>
            Total : <strong className="text-slate-800 font-semibold">{users.length}</strong> compte{users.length > 1 ? 's' : ''} ({activeAdminsCount} admin{activeAdminsCount > 1 ? 's' : ''} actif{activeAdminsCount > 1 ? 's' : ''})
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Compte actif
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400" /> Compte désactivé
            </span>
          </div>
        </div>
      </div>

      {/* User Create / Edit Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => {
          setIsUserModalOpen(false);
          setEditingUser(null);
        }}
        onSubmitCreate={onCreateUser}
        onSubmitUpdate={onUpdateUser}
        initialData={editingUser}
      />

      {/* Reset Password Modal */}
      <ResetPasswordModal
        user={resettingUser}
        isOpen={Boolean(resettingUser)}
        onClose={() => setResettingUser(null)}
        onConfirm={onResetPassword}
      />

      {/* Delete User Confirmation Modal */}
      <DeleteUserModal
        user={deletingUser}
        isOpen={Boolean(deletingUser)}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
        isLastActiveAdmin={deletingUser ? isLastActiveAdmin(deletingUser) : false}
      />
    </div>
  );
};
