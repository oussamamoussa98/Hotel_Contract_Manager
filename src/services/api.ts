import {
  Contract,
  ContractFilterState,
  ContractFormData,
  Hotel,
  DashboardStats,
  REGIONS,
  Region,
  Chain,
  User,
  LoginCredentials,
  AuthResponse,
  CreateUserData,
  UpdateUserData,
  ResetPasswordData,
} from '../types';

const API_BASE = '/api';
const TOKEN_KEY = 'hotel_contracts_jwt_token';
const USER_KEY = 'hotel_contracts_user';

// Initial demo seed in case the backend server is cold-starting
const INITIAL_HOTELS: Hotel[] = [
  {
    id: 1,
    name: 'Iberostar Averroes Hammamet',
    region: 'HAMMAMET',
    regionDisplayName: 'Hammamet',
    chain: 'IBEROSTAR',
    chainDisplayName: 'Iberostar',
    contractCount: 2,
    createdAt: '2026-01-10T09:00:00',
    updatedAt: '2026-01-10T09:00:00',
  },
  {
    id: 2,
    name: 'Marhaba Beach Resort Sousse',
    region: 'SOUSSE',
    regionDisplayName: 'Sousse',
    chain: 'MARHABA',
    chainDisplayName: 'Marhaba',
    contractCount: 1,
    createdAt: '2026-01-12T10:30:00',
    updatedAt: '2026-01-12T10:30:00',
  },
  {
    id: 3,
    name: 'Hasdrubal Thalassa & Spa Djerba',
    region: 'DJERBA',
    regionDisplayName: 'Djerba',
    chain: 'HASDRUBAL',
    chainDisplayName: 'Hasdrubal',
    contractCount: 2,
    createdAt: '2026-01-15T14:15:00',
    updatedAt: '2026-01-15T14:15:00',
  },
  {
    id: 4,
    name: 'El Mouradi Palm Marina',
    region: 'SOUSSE',
    regionDisplayName: 'Sousse',
    chain: 'EL_MOURADI',
    chainDisplayName: 'El Mouradi',
    contractCount: 1,
    createdAt: '2026-01-18T11:00:00',
    updatedAt: '2026-01-18T11:00:00',
  },
  {
    id: 5,
    name: 'Vincci Marillia',
    region: 'HAMMAMET',
    regionDisplayName: 'Hammamet',
    chain: 'VINCCI',
    chainDisplayName: 'Vincci',
    contractCount: 1,
    createdAt: '2026-01-20T16:45:00',
    updatedAt: '2026-01-20T16:45:00',
  }
];

const INITIAL_CONTRACTS: Contract[] = [
  {
    id: 1,
    hotel: INITIAL_HOTELS[0],
    contractDate: '2026-01-15',
    contractDateFrom: '2026-01-15',
    contractDateTo: '2027-01-14',
    receptionDate: '2026-01-18',
    entryStatus: 'SAISI',
    statusLabel: 'Saisi',
    statusBadgeColor: 'green',
    paymentTerms: "Avance et le reste à l'hôtel",
    fileName: 'contrat_demo_iberostar_hammamet_2026.pdf',
    filePath: '/uploads/contracts/contrat_demo_iberostar_hammamet_2026.pdf',
    fileType: 'application/pdf',
    fileSize: 1845000,
    createdAt: '2026-01-18T14:30:00',
    updatedAt: '2026-01-18T14:30:00',
  },
  {
    id: 2,
    hotel: INITIAL_HOTELS[0],
    contractDate: '2026-02-01',
    contractDateFrom: '2026-02-01',
    contractDateTo: '2027-01-31',
    receptionDate: '2026-02-03',
    entryStatus: 'XML',
    statusLabel: 'XML',
    statusBadgeColor: 'blue',
    paymentTerms: "Totalité à l'agence",
    fileName: 'flux_xml_demo_iberostar_2026.xml',
    filePath: '/uploads/contracts/flux_xml_demo_iberostar_2026.xml',
    fileType: 'application/xml',
    fileSize: 320000,
    createdAt: '2026-02-03T09:15:00',
    updatedAt: '2026-02-03T09:15:00',
  },
  {
    id: 3,
    hotel: INITIAL_HOTELS[1],
    contractDate: '2026-03-10',
    contractDateFrom: '2026-03-10',
    contractDateTo: '2027-03-09',
    receptionDate: '2026-03-12',
    entryStatus: 'NON_SAISI',
    statusLabel: 'Non Saisi',
    statusBadgeColor: 'red',
    paymentTerms: "Avance et le reste à l'hôtel",
    fileName: 'contrat_demo_marhaba_sousse_draft.pdf',
    filePath: '/uploads/contracts/contrat_demo_marhaba_sousse_draft.pdf',
    fileType: 'application/pdf',
    fileSize: 2150000,
    createdAt: '2026-03-12T16:00:00',
    updatedAt: '2026-03-12T16:00:00',
  },
  {
    id: 4,
    hotel: INITIAL_HOTELS[2],
    contractDate: '2026-01-20',
    contractDateFrom: '2026-01-20',
    contractDateTo: '2027-01-19',
    receptionDate: '2026-01-22',
    entryStatus: 'SAISI',
    statusLabel: 'Saisi',
    statusBadgeColor: 'green',
    paymentTerms: "Totalité à l'agence",
    fileName: 'contrat_demo_hasdrubal_djerba_2026.pdf',
    filePath: '/uploads/contracts/contrat_demo_hasdrubal_djerba_2026.pdf',
    fileType: 'application/pdf',
    fileSize: 1420000,
    createdAt: '2026-01-22T11:45:00',
    updatedAt: '2026-01-22T11:45:00',
  },
  {
    id: 5,
    hotel: INITIAL_HOTELS[2],
    contractDate: '2026-04-05',
    contractDateFrom: '2026-04-05',
    contractDateTo: '2027-04-04',
    receptionDate: '2026-04-07',
    entryStatus: 'NON_SAISI',
    statusLabel: 'Non Saisi',
    statusBadgeColor: 'red',
    paymentTerms: "Avance et le reste à l'hôtel",
    fileName: undefined,
    filePath: undefined,
    fileType: undefined,
    fileSize: undefined,
    createdAt: '2026-04-07T08:30:00',
    updatedAt: '2026-04-07T08:30:00',
  },
  {
    id: 6,
    hotel: INITIAL_HOTELS[3],
    contractDate: '2026-02-14',
    contractDateFrom: '2026-02-14',
    contractDateTo: '2027-02-13',
    receptionDate: '2026-02-18',
    entryStatus: 'NON_SAISI',
    statusLabel: 'Non Saisi',
    statusBadgeColor: 'red',
    paymentTerms: "Avance et le reste à l'hôtel",
    fileName: 'contrat_el_mouradi_marina_2026.pdf',
    filePath: '/uploads/contracts/contrat_el_mouradi_marina_2026.pdf',
    fileType: 'application/pdf',
    fileSize: 980000,
    createdAt: '2026-02-18T15:20:00',
    updatedAt: '2026-02-18T15:20:00',
  },
  {
    id: 7,
    hotel: INITIAL_HOTELS[4],
    contractDate: '2026-01-25',
    contractDateFrom: '2026-01-25',
    contractDateTo: '2027-01-24',
    receptionDate: '2026-01-28',
    entryStatus: 'XML',
    statusLabel: 'XML',
    statusBadgeColor: 'blue',
    paymentTerms: "Totalité à l'agence",
    fileName: 'flux_tarifs_vincci_marillia.xml',
    filePath: '/uploads/contracts/flux_tarifs_vincci_marillia.xml',
    fileType: 'application/xml',
    fileSize: 450000,
    createdAt: '2026-01-28T10:00:00',
    updatedAt: '2026-01-28T10:00:00',
  }
];

// Helper to access LocalStorage cache
function getCachedHotels(): Hotel[] {
  try {
    const raw = localStorage.getItem('hcm_hotels');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
  return INITIAL_HOTELS;
}

function saveCachedHotels(hotels: Hotel[]) {
  try {
    localStorage.setItem('hcm_hotels', JSON.stringify(hotels));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

function getCachedContracts(): Contract[] {
  try {
    const raw = localStorage.getItem('hcm_contracts');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
  return INITIAL_CONTRACTS;
}

function saveCachedContracts(contracts: Contract[]) {
  try {
    localStorage.setItem('hcm_contracts', JSON.stringify(contracts));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

export const apiService = {
  // ----------------------------------------------------
  // AUTHENTICATION & SESSION MANAGEMENT
  // ----------------------------------------------------
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setToken(token: string | null): void {
    try {
      if (token) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch (e) {
      console.warn('Storage error setting token:', e);
    }
  },

  getStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setStoredUser(user: User | null): void {
    try {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch (e) {
      console.warn('Storage error setting user:', e);
    }
  },

  getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = { ...extraHeaders };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Email ou mot de passe incorrect');
    }

    const data: AuthResponse = await res.json();
    this.setToken(data.token);
    this.setStoredUser(data.user);
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Non authentifié');
    }

    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: this.getAuthHeaders(),
    });

    if (!res.ok) {
      await this.logout();
      throw new Error('Session expirée ou invalide');
    }

    const user: User = await res.json();
    this.setStoredUser(user);
    return user;
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      }).catch(() => {});
    } finally {
      this.setToken(null);
      this.setStoredUser(null);
    }
  },

  // ----------------------------------------------------
  // HOTELS API
  // ----------------------------------------------------
  async getHotels(): Promise<Hotel[]> {
    try {
      const res = await fetch(`${API_BASE}/hotels`, {
        headers: this.getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          saveCachedHotels(data);
          return data;
        }
      }
    } catch (err) {
      console.info('Utilisation du cache local pour les hôtels (backend non connecté)');
    }
    return getCachedHotels();
  },

  async getHotelById(id: number): Promise<Hotel> {
    try {
      const res = await fetch(`${API_BASE}/hotels/${id}`, {
        headers: this.getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (err) {
      // fallback
    }
    const found = getCachedHotels().find(h => h.id === id);
    if (!found) throw new Error(`Hôtel non trouvé (ID: ${id})`);
    return found;
  },

  async createHotel(hotel: { name: string; region: string; chain: string }): Promise<Hotel> {
    try {
      const res = await fetch(`${API_BASE}/hotels`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(hotel),
      });
      if (res.ok) {
        const created = await res.json();
        const cached = getCachedHotels();
        saveCachedHotels([...cached, created]);
        return created;
      }
      const errJson = await res.json();
      throw new Error(errJson.message || 'Erreur lors de la création de l’hôtel');
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      // Offline fallback
      const cached = getCachedHotels();
      const newHotel: Hotel = {
        id: Date.now(),
        name: hotel.name,
        region: hotel.region as any,
        regionDisplayName: hotel.region,
        chain: hotel.chain as any,
        chainDisplayName: hotel.chain,
        contractCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      saveCachedHotels([...cached, newHotel]);
      return newHotel;
    }
  },

  // ----------------------------------------------------
  // CONTRACTS API
  // ----------------------------------------------------
  async getContracts(filters?: Partial<ContractFilterState>): Promise<Contract[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.region) params.append('region', filters.region);
      if (filters?.chain) params.append('chain', filters.chain);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.hotel) params.append('hotel', filters.hotel);
      if (filters?.contractDate) params.append('contractDate', filters.contractDate);
      if (filters?.contractDateFrom) params.append('contractDateFrom', filters.contractDateFrom);
      if (filters?.contractDateTo) params.append('contractDateTo', filters.contractDateTo);
      if (filters?.receptionDate) params.append('receptionDate', filters.receptionDate);
      if (filters?.receptionDateFrom) params.append('receptionDateFrom', filters.receptionDateFrom);
      if (filters?.receptionDateTo) params.append('receptionDateTo', filters.receptionDateTo);

      const qs = params.toString();
      const res = await fetch(`${API_BASE}/contracts${qs ? '?' + qs : ''}`, {
        headers: this.getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Update cached data if unfiltered
          if (!qs) saveCachedContracts(data);
          return data;
        }
      }
    } catch (err) {
      console.info('Utilisation du filtre local des contrats (backend non connecté)');
    }

    // Local filter fallback
    let list = getCachedContracts();
    const normalizeSearchStr = (str: string) =>
      (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    if (filters?.region) {
      list = list.filter(c => c.hotel.region.toLowerCase() === filters.region!.toLowerCase());
    }
    if (filters?.chain) {
      list = list.filter(c => c.hotel.chain.toLowerCase() === filters.chain!.toLowerCase());
    }
    if (filters?.status) {
      list = list.filter(c => c.entryStatus.toLowerCase() === filters.status!.toLowerCase());
    }
    if (filters?.hotel && filters.hotel.trim() !== '') {
      const q = normalizeSearchStr(filters.hotel);
      list = list.filter(c => normalizeSearchStr(c.hotel.name).includes(q));
    }
    if (filters?.contractDate) {
      list = list.filter(
        c =>
          c.contractDate === filters.contractDate ||
          (c.contractDateFrom && c.contractDateTo && c.contractDateFrom <= filters.contractDate! && c.contractDateTo >= filters.contractDate!)
      );
    }
    if (filters?.contractDateFrom) {
      list = list.filter(c => {
        const cTo = c.contractDateTo || c.contractDateFrom || c.contractDate;
        return cTo ? cTo >= filters.contractDateFrom! : true;
      });
    }
    if (filters?.contractDateTo) {
      list = list.filter(c => {
        const cFrom = c.contractDateFrom || c.contractDate || '';
        return cFrom ? cFrom <= filters.contractDateTo! : true;
      });
    }
    if (filters?.receptionDate) {
      list = list.filter(c => c.receptionDate === filters.receptionDate);
    }
    if (filters?.receptionDateFrom) {
      list = list.filter(c => c.receptionDate >= filters.receptionDateFrom!);
    }
    if (filters?.receptionDateTo) {
      list = list.filter(c => c.receptionDate <= filters.receptionDateTo!);
    }

    return list.sort((a, b) => b.receptionDate.localeCompare(a.receptionDate));
  },

  async getContractById(id: number): Promise<Contract> {
    try {
      const res = await fetch(`${API_BASE}/contracts/${id}`, {
        headers: this.getAuthHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (err) {
      // fallback
    }
    const found = getCachedContracts().find(c => c.id === id);
    if (!found) throw new Error(`Contrat non trouvé (ID: ${id})`);
    return found;
  },

  async createContract(data: ContractFormData): Promise<Contract> {
    // Required validations
    if (!data.hotelName || data.hotelName.trim() === '') {
      throw new Error("Le nom de l'hôtel est requis.");
    }
    if (!data.region) {
      throw new Error('La région est requise.');
    }
    if (!data.chain) {
      throw new Error('La chaîne est requise.');
    }
    const fromDate = data.contractDateFrom || data.contractDate;
    const toDate = data.contractDateTo || data.contractDate;
    if (!fromDate) {
      throw new Error('La date contrat (à partir du) est requise.');
    }
    if (!toDate) {
      throw new Error('La date contrat (jusqu\'au) est requise.');
    }
    if (fromDate && toDate && toDate < fromDate) {
      throw new Error('La date contrat (jusqu\'au) ne peut pas être antérieure à la date contrat (à partir du).');
    }
    if (!data.receptionDate) {
      throw new Error('La date de réception est requise.');
    }
    if (!data.entryStatus) {
      throw new Error('Le statut de saisie est requis.');
    }

    const payload = {
      hotel: {
        name: data.hotelName.trim(),
        region: data.region,
        chain: data.chain,
      },
      contractDate: fromDate,
      contractDateFrom: fromDate,
      contractDateTo: toDate,
      receptionDate: data.receptionDate,
      entryStatus: data.entryStatus,
      paymentTerms: data.paymentTerms || '',
      fileName: data.fileName || null,
    };

    try {
      const res = await fetch(`${API_BASE}/contracts`, {
        method: 'POST',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const created = await res.json();
        const current = getCachedContracts();
        saveCachedContracts([created, ...current]);
        return created;
      }
      const errJson = await res.json();
      throw new Error(errJson.message || 'Erreur lors de la création du contrat');
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      // Local creation fallback
      const cachedHotels = getCachedHotels();
      let matchedHotel = cachedHotels.find(
        h => h.name.toLowerCase() === data.hotelName.trim().toLowerCase()
      );

      if (!matchedHotel) {
        matchedHotel = {
          id: Date.now(),
          name: data.hotelName.trim(),
          region: data.region,
          regionDisplayName: data.region,
          chain: data.chain,
          chainDisplayName: data.chain,
          contractCount: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        saveCachedHotels([...cachedHotels, matchedHotel]);
      } else {
        matchedHotel.contractCount = (matchedHotel.contractCount || 0) + 1;
        saveCachedHotels([...cachedHotels]);
      }

      const newContract: Contract = {
        id: Date.now(),
        hotel: matchedHotel,
        contractDate: fromDate,
        contractDateFrom: fromDate,
        contractDateTo: toDate,
        receptionDate: data.receptionDate,
        entryStatus: data.entryStatus,
        statusLabel: data.entryStatus === 'SAISI' ? 'Saisi' : data.entryStatus === 'XML' ? 'XML' : 'Non Saisi',
        statusBadgeColor: data.entryStatus === 'SAISI' ? 'green' : data.entryStatus === 'XML' ? 'blue' : 'red',
        paymentTerms: data.paymentTerms,
        fileName: data.fileName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const current = getCachedContracts();
      saveCachedContracts([newContract, ...current]);
      return newContract;
    }
  },

  async updateContract(id: number, data: Partial<ContractFormData>): Promise<Contract> {
    try {
      const payload: any = {};
      if (data.contractDate) payload.contractDate = data.contractDate;
      if (data.contractDateFrom) payload.contractDateFrom = data.contractDateFrom;
      if (data.contractDateTo) payload.contractDateTo = data.contractDateTo;
      if (data.receptionDate) payload.receptionDate = data.receptionDate;
      if (data.entryStatus) payload.entryStatus = data.entryStatus;
      if (data.paymentTerms !== undefined) payload.paymentTerms = data.paymentTerms;
      if (data.fileName !== undefined) payload.fileName = data.fileName;

      if (data.hotelId) payload.hotelId = data.hotelId;
      if (data.hotelName) payload.hotelName = data.hotelName;
      if (data.region) payload.region = data.region;
      if (data.chain) payload.chain = data.chain;

      if (data.hotelName || data.region || data.chain || data.hotelId) {
        payload.hotel = {
          ...(data.hotelId ? { id: data.hotelId } : {}),
          ...(data.hotelName ? { name: data.hotelName } : {}),
          ...(data.region ? { region: data.region } : {}),
          ...(data.chain ? { chain: data.chain } : {}),
        };
      }

      const res = await fetch(`${API_BASE}/contracts/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated: Contract = await res.json();
        const current = getCachedContracts().map(c => (c.id === id ? updated : c));
        saveCachedContracts(current);

        // Synchroniser également le référentiel des hôtels en cache si l'hôtel a été modifié
        if (updated.hotel) {
          const cachedHotels = getCachedHotels();
          const hIdx = cachedHotels.findIndex(
            h => (updated.hotel.id && h.id === updated.hotel.id) ||
                 h.name.toLowerCase() === updated.hotel.name.toLowerCase()
          );
          if (hIdx !== -1) {
            cachedHotels[hIdx] = {
              ...cachedHotels[hIdx],
              name: updated.hotel.name,
              region: updated.hotel.region,
              regionDisplayName: updated.hotel.regionDisplayName || updated.hotel.region,
              chain: updated.hotel.chain,
              chainDisplayName: updated.hotel.chainDisplayName || updated.hotel.chain,
              updatedAt: new Date().toISOString(),
            };
            saveCachedHotels(cachedHotels);
          }
        }

        return updated;
      }
      const errJson = await res.json();
      throw new Error(errJson.message || 'Erreur lors de la mise à jour');
    } catch (err: any) {
      if (err.message && !err.message.includes('fetch')) {
        throw err;
      }
      // Local update fallback
      const current = getCachedContracts();
      const idx = current.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Contrat introuvable');

      const existing = current[idx];
      const updatedFrom = data.contractDateFrom || data.contractDate || existing.contractDateFrom || existing.contractDate;
      const updatedTo = data.contractDateTo || data.contractDate || existing.contractDateTo || existing.contractDate;

      const updated: Contract = {
        ...existing,
        contractDate: updatedFrom,
        contractDateFrom: updatedFrom,
        contractDateTo: updatedTo,
        receptionDate: data.receptionDate || existing.receptionDate,
        entryStatus: data.entryStatus || existing.entryStatus,
        statusLabel: (data.entryStatus || existing.entryStatus) === 'SAISI' ? 'Saisi' : (data.entryStatus || existing.entryStatus) === 'XML' ? 'XML' : 'Non Saisi',
        statusBadgeColor: (data.entryStatus || existing.entryStatus) === 'SAISI' ? 'green' : (data.entryStatus || existing.entryStatus) === 'XML' ? 'blue' : 'red',
        paymentTerms: data.paymentTerms !== undefined ? data.paymentTerms : existing.paymentTerms,
        fileName: data.fileName !== undefined ? data.fileName : existing.fileName,
        updatedAt: new Date().toISOString(),
      };

      if (data.hotelName || data.region || data.chain) {
        const newRegion = (data.region as Region) || existing.hotel.region;
        const newChain = (data.chain as Chain) || existing.hotel.chain;
        const newName = data.hotelName || existing.hotel.name;

        updated.hotel = {
          ...existing.hotel,
          name: newName,
          region: newRegion,
          regionDisplayName: newRegion,
          chain: newChain,
          chainDisplayName: newChain,
        };

        const cachedHotels = getCachedHotels();
        const hIdx = cachedHotels.findIndex(
          h => (existing.hotel.id && h.id === existing.hotel.id) ||
               h.name.toLowerCase() === newName.toLowerCase()
        );
        if (hIdx !== -1) {
          cachedHotels[hIdx] = {
            ...cachedHotels[hIdx],
            name: newName,
            region: newRegion,
            regionDisplayName: newRegion,
            chain: newChain,
            chainDisplayName: newChain,
            updatedAt: new Date().toISOString(),
          };
          saveCachedHotels(cachedHotels);
        }
      }

      current[idx] = updated;
      saveCachedContracts(current);
      return updated;
    }
  },

  async deleteContract(id: number): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/contracts/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      if (res.ok || res.status === 204) {
        const current = getCachedContracts().filter(c => c.id !== id);
        saveCachedContracts(current);
        return;
      }
      const errJson = await res.json().catch(() => ({}));
      if (res.status === 403) {
        throw new Error(errJson.message || 'Action non autorisée : seuls les administrateurs peuvent supprimer des contrats.');
      }
      if (res.status === 401) {
        throw new Error(errJson.message || 'Session expirée. Veuillez vous reconnecter.');
      }
      throw new Error(errJson.message || 'Erreur lors de la suppression du contrat');
    } catch (err: any) {
      // Si c'est une erreur de permission ou une réponse de l'API, propager impérativement
      if (err.message && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
      // Local delete fallback uniquement si le serveur est inaccessible
      const current = getCachedContracts().filter(c => c.id !== id);
      saveCachedContracts(current);
    }
  },

  /**
   * Phase 5: Téléversement sécurisé de fichier pour un contrat
   * POST /api/contracts/:id/file
   */
  async uploadContractFile(contractId: number, file: File): Promise<Contract> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/contracts/${contractId}/file`, {
      method: 'POST',
      headers: this.getAuthHeaders(), // Note: do not set Content-Type so browser sets boundary multipart
      body: formData,
    });

    if (res.ok) {
      const updatedContract: Contract = await res.json();
      const current = getCachedContracts().map(c => (c.id === contractId ? updatedContract : c));
      saveCachedContracts(current);
      return updatedContract;
    }

    const errJson = await res.json().catch(() => ({ message: 'Erreur lors du téléversement du fichier.' }));
    throw new Error(errJson.message || `Échec du téléversement (statut ${res.status})`);
  },

  /**
   * Phase 5: Suppression du fichier associé à un contrat
   * DELETE /api/contracts/:id/file
   */
  async deleteContractFile(contractId: number): Promise<Contract> {
    const res = await fetch(`${API_BASE}/contracts/${contractId}/file`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    if (res.ok) {
      const updatedContract: Contract = await res.json();
      const current = getCachedContracts().map(c => (c.id === contractId ? updatedContract : c));
      saveCachedContracts(current);
      return updatedContract;
    }

    const errJson = await res.json().catch(() => ({ message: 'Erreur lors de la suppression du fichier.' }));
    throw new Error(errJson.message || `Échec de la suppression (statut ${res.status})`);
  },

  /**
   * Phase 8 / Phase 5: Récupération sécurisée du fichier sous forme de Blob
   * Utilise l'en-tête Authorization: Bearer <token> sans exposer de token en query param.
   */
  async getContractFileBlob(contractId: number, download: boolean = false): Promise<{ blob: Blob; filename: string }> {
    const res = await fetch(`${API_BASE}/contracts/${contractId}/file${download ? '?download=true' : ''}`, {
      headers: this.getAuthHeaders(),
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('Session expirée ou non autorisée pour accéder à ce fichier.');
      }
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || `Impossible d'accéder au fichier (statut ${res.status})`);
    }

    let filename = `contrat-${contractId}.pdf`;
    const disposition = res.headers.get('Content-Disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = await res.blob();
    return { blob, filename };
  },

  /**
   * Télécharge un fichier de contrat de manière sécurisée en mémoire puis déclenche l'enregistrement côté client.
   */
  async downloadContractFile(contractId: number, fallbackName?: string): Promise<void> {
    const { blob, filename } = await this.getContractFileBlob(contractId, true);
    const finalName = filename || fallbackName || 'contrat.pdf';
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
  },

  /**
   * URL de l'API (pour référence interne uniquement)
   */
  getContractFileUrl(contractId: number, download: boolean = false): string {
    return `${API_BASE}/contracts/${contractId}/file${download ? '?download=true' : ''}`;
  },

  /**
   * Phase 6: Statistiques calculées dynamiquement depuis la base de données
   * GET /api/contracts/stats
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const res = await fetch(`${API_BASE}/contracts/stats`, {
        headers: this.getAuthHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Fallback au calcul local des statistiques:', err);
    }

    // Calcul dynamique local en cas d'erreur réseau
    const cachedContracts = getCachedContracts();
    const totalContracts = cachedContracts.length;
    const saisis = cachedContracts.filter(c => c.entryStatus === 'SAISI').length;
    const xml = cachedContracts.filter(c => c.entryStatus === 'XML').length;
    const nonSaisis = cachedContracts.filter(c => c.entryStatus === 'NON_SAISI').length;
    const treatedContracts = saisis + xml;
    const progressPercentage =
      totalContracts > 0 ? Math.round((treatedContracts / totalContracts) * 100) : 0;

    const regions = REGIONS.map(r => {
      const regContracts = cachedContracts.filter(c => c.hotel?.region === r.value);
      const total = regContracts.length;
      const rSaisi = regContracts.filter(c => c.entryStatus === 'SAISI').length;
      const rXml = regContracts.filter(c => c.entryStatus === 'XML').length;
      const rNonSaisi = regContracts.filter(c => c.entryStatus === 'NON_SAISI').length;
      const rTreated = rSaisi + rXml;
      const progress = total > 0 ? Math.round((rTreated / total) * 100) : 0;

      return {
        region: r.value,
        regionDisplayName: r.label,
        total,
        saisi: rSaisi,
        xml: rXml,
        nonSaisi: rNonSaisi,
        treated: rTreated,
        progressPercentage: progress,
      };
    });

    return {
      totalContracts,
      saisis,
      xml,
      nonSaisis,
      treatedContracts,
      progressPercentage,
      regions,
    };
  },

  // ----------------------------------------------------
  // PHASE 10: USER MANAGEMENT (ADMIN ONLY)
  // ----------------------------------------------------
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`, {
      headers: this.getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erreur lors de la récupération des utilisateurs.' }));
      throw new Error(err.message || `Erreur ${res.status}`);
    }
    return await res.json();
  },

  async createUser(data: CreateUserData): Promise<User> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erreur lors de la création de l\'utilisateur.' }));
      throw new Error(err.message || `Erreur ${res.status}`);
    }
    return await res.json();
  },

  async updateUser(id: number, data: UpdateUserData): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erreur lors de la modification de l\'utilisateur.' }));
      throw new Error(err.message || `Erreur ${res.status}`);
    }
    return await res.json();
  },

  async toggleUserStatus(id: number, active: boolean): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${id}/status`, {
      method: 'PATCH',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ active }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erreur lors du changement de statut de l\'utilisateur.' }));
      throw new Error(err.message || `Erreur ${res.status}`);
    }
    return await res.json();
  },

  async resetUserPassword(id: number, newPassword: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/users/${id}/reset-password`, {
      method: 'POST',
      headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Erreur lors de la réinitialisation du mot de passe.' }));
      throw new Error(err.message || `Erreur ${res.status}`);
    }
    return await res.json();
  },

  async deleteUser(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!res.ok && res.status !== 204) {
      const err = await res.json().catch(() => ({ message: 'Erreur lors de la suppression de l\'utilisateur.' }));
      throw new Error(err.message || `Erreur ${res.status}`);
    }
  },
};
