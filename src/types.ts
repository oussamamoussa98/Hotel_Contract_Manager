export type Region =
  | 'HAMMAMET'
  | 'MAHDIA'
  | 'SOUSSE'
  | 'MONASTIR'
  | 'DJERBA'
  | 'SFAX'
  | 'TUNIS'
  | 'TABARKA'
  | 'DOUZ'
  | 'TOZEUR'
  | 'BIZERTE'
  | 'KAIROUAN'
  | 'DIVERS';

export type Chain =
  | 'IBEROSTAR'
  | 'EL_MOURADI'
  | 'BHR'
  | 'KHAYAM'
  | 'MARHABA'
  | 'AZUR'
  | 'VINCCI'
  | 'TMK'
  | 'HASDRUBAL'
  | 'TTS'
  | 'MEDINA'
  | 'MAGIC_LIFE'
  | 'THALASSA'
  | 'MZABI'
  | 'CONCORDE'
  | 'SHT'
  | 'INDEPENDANT';

export type EntryStatus = 'SAISI' | 'XML' | 'NON_SAISI';

export interface Hotel {
  id: number;
  name: string;
  region: Region;
  regionDisplayName?: string;
  chain: Chain;
  chainDisplayName?: string;
  createdAt?: string;
  updatedAt?: string;
  contractCount?: number;
}

export interface Contract {
  id: number;
  hotel: Hotel;
  contractDate?: string;
  contractDateFrom: string;
  contractDateTo: string;
  receptionDate: string;
  entryStatus: EntryStatus;
  statusLabel?: string;
  statusBadgeColor?: string;
  paymentTerms?: string;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  fileSize?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const PAYMENT_TERMS_OPTIONS = [
  "Avance et le reste à l'hôtel",
  "Totalité à l'agence",
] as const;

export type PaymentTerm = typeof PAYMENT_TERMS_OPTIONS[number];

export interface ContractFormData {
  hotelId?: number;
  hotelName: string;
  region: Region;
  chain: Chain;
  contractDate?: string;
  contractDateFrom: string;
  contractDateTo: string;
  receptionDate: string;
  entryStatus: EntryStatus;
  paymentTerms: string;
  fileName?: string;
  pendingFile?: File | null;
  removeFile?: boolean;
}

export const SUPPORTED_FILE_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
  '.xls',
  '.xlsx',
];

export const SUPPORTED_FILE_ACCEPT = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx';
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Mo

export interface ContractFilterState {
  region: string;
  chain: string;
  status: string;
  hotel: string;
  contractDate: string;
  contractDateFrom: string;
  contractDateTo: string;
  receptionDate: string;
  receptionDateFrom: string;
  receptionDateTo: string;
}

export type SortField = 'hotel' | 'region' | 'chain' | 'contractDate' | 'receptionDate' | 'status';
export type SortDirection = 'asc' | 'desc';

export const REGIONS: { value: Region; label: string }[] = [
  { value: 'HAMMAMET', label: 'Hammamet' },
  { value: 'MAHDIA', label: 'Mahdia' },
  { value: 'SOUSSE', label: 'Sousse' },
  { value: 'MONASTIR', label: 'Monastir' },
  { value: 'DJERBA', label: 'Djerba' },
  { value: 'SFAX', label: 'Sfax' },
  { value: 'TUNIS', label: 'Tunis' },
  { value: 'TABARKA', label: 'Tabarka' },
  { value: 'DOUZ', label: 'Douz' },
  { value: 'TOZEUR', label: 'Tozeur' },
  { value: 'BIZERTE', label: 'Bizerte' },
  { value: 'KAIROUAN', label: 'Kairouan' },
  { value: 'DIVERS', label: 'Divers' },
];

export const CHAINS: { value: Chain; label: string }[] = [
  { value: 'IBEROSTAR', label: 'Iberostar' },
  { value: 'EL_MOURADI', label: 'El Mouradi' },
  { value: 'BHR', label: 'BHR' },
  { value: 'KHAYAM', label: 'Khayam' },
  { value: 'MARHABA', label: 'Marhaba' },
  { value: 'AZUR', label: 'Azur' },
  { value: 'VINCCI', label: 'Vincci' },
  { value: 'TMK', label: 'TMK' },
  { value: 'HASDRUBAL', label: 'Hasdrubal' },
  { value: 'TTS', label: 'TTS' },
  { value: 'MEDINA', label: 'Medina' },
  { value: 'MAGIC_LIFE', label: 'Magic Life' },
  { value: 'THALASSA', label: 'Thalassa' },
  { value: 'MZABI', label: 'Mzabi' },
  { value: 'CONCORDE', label: 'Concorde' },
  { value: 'SHT', label: 'SHT' },
  { value: 'INDEPENDANT', label: 'Indépendant' },
];

export const STATUS_OPTIONS: { value: EntryStatus; label: string; description: string }[] = [
  { value: 'NON_SAISI', label: 'Non Saisi', description: 'En attente de saisie dans le système' },
  { value: 'SAISI', label: 'Saisi', description: 'Intégré manuellement dans le PMS/ERP' },
  { value: 'XML', label: 'XML', description: 'Intégré via flux XML direct' },
];

export interface RegionStat {
  region: Region;
  regionDisplayName: string;
  total: number;
  saisi: number;
  xml: number;
  nonSaisi: number;
  treated: number;
  progressPercentage: number;
}

export interface DashboardStats {
  totalContracts: number;
  saisis: number;
  xml: number;
  nonSaisis: number;
  treatedContracts: number;
  progressPercentage: number;
  regions: RegionStat[];
}

// ====================================================
// PHASE 8: AUTHENTICATION & AUTHORIZATION TYPES
// ====================================================
export type UserRole = 'ADMIN' | 'AGENT_SAISIE';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: UserRole;
}

export interface ResetPasswordData {
  newPassword: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  expiresIn?: number | string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAgentSaisie: boolean;
  loading: boolean;
}

