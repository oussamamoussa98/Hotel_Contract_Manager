import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';

import {
  initDatabase,
  getUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  getHotels,
  getHotelById,
  findHotelByName,
  createHotel,
  updateHotel,
  getContracts,
  getContractById,
  createContract,
  updateContract,
  deleteContract,
  DbHotel,
  DbContract,
  DbUser,
} from './src/db/index.js';

import {
  uploadContractFile,
  getContractFileStream,
  deleteContractFile,
  sanitizeFilename,
} from './src/services/storage.js';

// Validate JWT Secret with secure fallback so app never crashes if .env is missing
const JWT_SECRET = process.env.JWT_SECRET || 'hotel_contracts_jwt_secure_key_2026_prod_fallback_token_987654321';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '8h') as string;

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security headers via Helmet (configured to preserve React/Vite SPA and PDF blob preview capabilities)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// Express JSON body-size limit (1 MB) to protect against memory exhaustion attacks
app.use(express.json({ limit: '1mb' }));

// Reverse proxy support: Trust front-facing proxy in containerized / Cloud Run / PaaS environments
app.set('trust proxy', process.env.TRUST_PROXY ? (process.env.TRUST_PROXY === 'true' ? true : Number(process.env.TRUST_PROXY) || 1) : 1);

// ----------------------------------------------------
// SYSTEM HEALTH CHECK ENDPOINT
// ----------------------------------------------------
// GET /api/health - Public health check for containers and orchestration (zero auth required)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Helper to strip sensitive password data from user responses
function sanitizeUser(user: DbUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export interface AuthenticatedRequest extends express.Request {
  user?: {
    id: number;
    email: string;
    role: 'ADMIN' | 'AGENT_SAISIE';
    name: string;
  };
}

// Authentication middleware verifying Bearer JWT and verifying user is still active in database
const authenticateToken = async (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      error: 'Unauthorized',
      message: 'Authentification requise : Token d\'authentification manquant ou format invalide.',
    });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET!) as {
      id: number;
      email: string;
      role: 'ADMIN' | 'AGENT_SAISIE';
      name: string;
    };

    const liveUser = await getUserById(decoded.id);
    if (!liveUser || liveUser.active === false) {
      return res.status(401).json({
        timestamp: new Date().toISOString(),
        status: 401,
        error: 'Unauthorized',
        message: 'Session expirée, utilisateur introuvable ou compte désactivé.',
      });
    }

    req.user = {
      id: liveUser.id,
      email: liveUser.email,
      role: liveUser.role,
      name: liveUser.name,
    };
    next();
  } catch (err: any) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      error: 'Unauthorized',
      message: 'Session expirée ou jeton d\'authentification invalide.',
    });
  }
};

// Authorization middleware enforcing RBAC
const requireRole = (allowedRoles: ('ADMIN' | 'AGENT_SAISIE')[]) => {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        timestamp: new Date().toISOString(),
        status: 403,
        error: 'Forbidden',
        message: `Accès refusé. Privilèges requis : [${allowedRoles.join(', ')}]. Votre rôle : ${req.user?.role || 'Aucun'}`,
      });
    }
    next();
  };
};

// ----------------------------------------------------
// RATE LIMITING CONFIGURATION FOR LOGIN (BRUTE-FORCE DEFENSE)
// ----------------------------------------------------
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  limit: 10, // Max 10 login requests per IP per window
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  validate: false,
  keyGenerator: (req) => {
    const forwarded = req.headers['forwarded'];
    if (typeof forwarded === 'string') {
      const match = forwarded.match(/for="?([^";,]+)"?/i);
      if (match && match[1]) {
        return ipKeyGenerator(match[1].trim());
      }
    }
    const xForwardedFor = req.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string') {
      const clientIp = xForwardedFor.split(',')[0].trim();
      return ipKeyGenerator(clientIp);
    }
    return ipKeyGenerator(req.ip || req.socket?.remoteAddress || '127.0.0.1');
  },
  handler: (req, res) => {
    res.status(429).json({
      timestamp: new Date().toISOString(),
      status: 429,
      error: 'Too Many Requests',
      message: 'Trop de tentatives de connexion. Veuillez patienter avant de réessayer.',
    });
  },
});

// ----------------------------------------------------
// AUTHENTICATION ROUTES
// ----------------------------------------------------
// POST /api/auth/login
app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Adresse email et mot de passe obligatoires.',
    });
  }

  const user = await getUserByEmail(email);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      error: 'Unauthorized',
      message: 'Identifiants invalides : email ou mot de passe incorrect.',
    });
  }

  if (user.active === false) {
    return res.status(403).json({
      timestamp: new Date().toISOString(),
      status: 403,
      error: 'Forbidden',
      message: 'Ce compte utilisateur a été désactivé. Veuillez contacter un administrateur.',
    });
  }

  const safeUser = sanitizeUser(user);
  const token = jwt.sign(safeUser, JWT_SECRET!, { expiresIn: (JWT_EXPIRES_IN as any) });

  res.json({
    token,
    user: safeUser,
    expiresIn: JWT_EXPIRES_IN,
  });
});

// GET /api/auth/me
app.get('/api/auth/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  if (!req.user?.id) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      error: 'Unauthorized',
      message: 'Utilisateur non authentifié.',
    });
  }
  const user = await getUserById(req.user.id);
  if (!user) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: 'Utilisateur introuvable.',
    });
  }
  res.json(sanitizeUser(user));
});

// POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Déconnexion effectuée avec succès.' });
});

// ====================================================
// USER MANAGEMENT API ROUTES (ADMIN ONLY)
// ====================================================

// GET /api/users
app.get('/api/users', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  const currentUsers = await getUsers();
  res.json(currentUsers.map(sanitizeUser));
});

// POST /api/users
app.post('/api/users', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Le nom de l\'utilisateur est obligatoire.',
    });
  }
  if (!email || typeof email !== 'string' || !email.trim() || !email.includes('@')) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Une adresse email valide est obligatoire.',
    });
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Le mot de passe doit comporter au moins 8 caractères.',
    });
  }

  const assignedRole: 'ADMIN' | 'AGENT_SAISIE' = role === 'ADMIN' ? 'ADMIN' : 'AGENT_SAISIE';
  const existingUser = await getUserByEmail(email);

  if (existingUser) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Cette adresse email est déjà utilisée par un autre compte.',
    });
  }

  const newUser = await createUser({
    name: name.trim(),
    email: email.trim(),
    role: assignedRole,
    passwordHash: bcrypt.hashSync(password, 10),
    active: true,
  });

  res.status(201).json(sanitizeUser(newUser));
});

// PUT /api/users/:id
app.put('/api/users/:id', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Identifiant utilisateur invalide.',
    });
  }

  const { name, email, role } = req.body || {};
  const targetUser = await getUserById(userId);
  if (!targetUser) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: 'Utilisateur introuvable.',
    });
  }

  if (email && typeof email === 'string' && email.trim()) {
    const existing = await getUserByEmail(email);
    if (existing && existing.id !== userId) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        message: 'Cette adresse email est déjà utilisée par un autre compte.',
      });
    }
  }

  if (role && (role === 'ADMIN' || role === 'AGENT_SAISIE')) {
    if (targetUser.role === 'ADMIN' && role === 'AGENT_SAISIE') {
      const allUsers = await getUsers();
      const activeAdmins = allUsers.filter((u) => u.role === 'ADMIN' && u.active);
      if (activeAdmins.length <= 1 && targetUser.active) {
        return res.status(400).json({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message: 'Action interdite : Impossible de modifier le rôle du dernier administrateur actif.',
        });
      }
    }
  }

  const updated = await updateUser(userId, {
    ...(name ? { name: name.trim() } : {}),
    ...(email ? { email: email.trim() } : {}),
    ...(role ? { role } : {}),
  });

  if (!updated) {
    return res.status(500).json({
      timestamp: new Date().toISOString(),
      status: 500,
      error: 'Internal Server Error',
      message: 'Échec de la mise à jour de l\'utilisateur.',
    });
  }

  res.json(sanitizeUser(updated));
});

// PATCH /api/users/:id/status
app.patch('/api/users/:id/status', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Identifiant utilisateur invalide.',
    });
  }

  const { active } = req.body || {};
  if (typeof active !== 'boolean') {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Le champ active (booléen) est requis.',
    });
  }

  const targetUser = await getUserById(userId);
  if (!targetUser) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: 'Utilisateur introuvable.',
    });
  }

  if (active === false && targetUser.role === 'ADMIN' && targetUser.active) {
    const allUsers = await getUsers();
    const activeAdmins = allUsers.filter((u) => u.role === 'ADMIN' && u.active);
    if (activeAdmins.length <= 1) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        message: 'Action interdite : Impossible de désactiver le dernier compte administrateur actif.',
      });
    }
  }

  const updated = await updateUser(userId, { active });
  res.json(sanitizeUser(updated || targetUser));
});

// POST /api/users/:id/reset-password
app.post('/api/users/:id/reset-password', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Identifiant utilisateur invalide.',
    });
  }

  const { newPassword } = req.body || {};
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Le mot de passe doit comporter au moins 8 caractères.',
    });
  }

  const targetUser = await getUserById(userId);
  if (!targetUser) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: 'Utilisateur introuvable.',
    });
  }

  await updateUser(userId, {
    passwordHash: bcrypt.hashSync(newPassword, 10),
  });

  res.json({
    success: true,
    message: 'Mot de passe réinitialisé avec succès.',
  });
});

// DELETE /api/users/:id
app.delete('/api/users/:id', authenticateToken, requireRole(['ADMIN']), async (req: AuthenticatedRequest, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Identifiant utilisateur invalide.',
    });
  }

  const targetUser = await getUserById(userId);
  if (!targetUser) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: 'Utilisateur introuvable.',
    });
  }

  if (targetUser.role === 'ADMIN' && targetUser.active) {
    const allUsers = await getUsers();
    const activeAdmins = allUsers.filter((u) => u.role === 'ADMIN' && u.active);
    if (activeAdmins.length <= 1) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        message: 'Action interdite : Impossible de supprimer le dernier compte administrateur actif.',
      });
    }
  }

  await deleteUser(userId);
  res.status(204).send();
});

// ----------------------------------------------------
// CONTRACT FORMATTER HELPER
// ----------------------------------------------------
function formatContractResponse(contract: DbContract, cachedHotels: DbHotel[]) {
  const hotel = cachedHotels.find((h) => h.id === contract.hotelId) || {
    id: contract.hotelId,
    name: 'Hôtel Inconnu',
    region: 'DIVERS',
    chain: 'INDEPENDANT',
    createdAt: '',
    updatedAt: '',
  };

  const fromDate = contract.contractDateFrom || contract.contractDate || '';
  const toDate = contract.contractDateTo || contract.contractDate || '';

  return {
    id: contract.id,
    hotel: {
      id: hotel.id,
      name: hotel.name,
      region: hotel.region,
      regionDisplayName: hotel.region,
      chain: hotel.chain,
      chainDisplayName: hotel.chain,
      createdAt: hotel.createdAt,
      updatedAt: hotel.updatedAt,
    },
    contractDate: fromDate,
    contractDateFrom: fromDate,
    contractDateTo: toDate,
    receptionDate: contract.receptionDate,
    entryStatus: contract.entryStatus,
    statusLabel:
      contract.entryStatus === 'SAISI'
        ? 'Saisi'
        : contract.entryStatus === 'XML'
        ? 'XML'
        : 'Non Saisi',
    statusBadgeColor:
      contract.entryStatus === 'SAISI'
        ? 'green'
        : contract.entryStatus === 'XML'
        ? 'blue'
        : 'red',
    paymentTerms: contract.paymentTerms,
    fileName: contract.fileName || null,
    filePath: contract.filePath || null,
    fileType: contract.fileType || null,
    fileSize: contract.fileSize || null,
    storageType: contract.storageType || 'LOCAL',
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  };
}

// ----------------------------------------------------
// API HOTELS
// ----------------------------------------------------
app.get('/api/hotels', authenticateToken, async (req, res) => {
  const [hotelsList, contractsList] = await Promise.all([getHotels(), getContracts()]);
  const response = hotelsList.map((h) => {
    const count = contractsList.filter((c) => c.hotelId === h.id).length;
    return {
      ...h,
      regionDisplayName: h.region,
      chainDisplayName: h.chain,
      contractCount: count,
    };
  });
  res.json(response);
});

app.get('/api/hotels/:id', authenticateToken, async (req, res) => {
  const hotel = await getHotelById(Number(req.params.id));
  if (!hotel) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Hôtel non trouvé avec l'id: ${req.params.id}`,
    });
  }
  const contractsList = await getContracts();
  const count = contractsList.filter((c) => c.hotelId === hotel.id).length;
  res.json({
    ...hotel,
    regionDisplayName: hotel.region,
    chainDisplayName: hotel.chain,
    contractCount: count,
  });
});

app.post('/api/hotels', authenticateToken, async (req, res) => {
  const { name, region, chain } = req.body;
  const validationErrors: Record<string, string> = {};

  if (!name || !name.trim()) {
    validationErrors.name = "Le nom de l'hôtel est obligatoire";
  }
  if (!region) {
    validationErrors.region = 'La région est obligatoire';
  }
  if (!chain) {
    validationErrors.chain = 'La chaîne est obligatoire';
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Erreur de validation des données',
      validationErrors,
    });
  }

  const newHotel = await createHotel({
    name: name.trim(),
    region,
    chain,
  });

  res.status(201).json({
    ...newHotel,
    regionDisplayName: newHotel.region,
    chainDisplayName: newHotel.chain,
    contractCount: 0,
  });
});

app.put('/api/hotels/:id', authenticateToken, async (req, res) => {
  const hotelId = Number(req.params.id);
  const hotel = await getHotelById(hotelId);
  if (!hotel) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Hôtel non trouvé avec l'id: ${req.params.id}`,
    });
  }
  const { name, region, chain } = req.body;
  const updated = await updateHotel(hotelId, {
    ...(name && name.trim() ? { name: name.trim() } : {}),
    ...(region ? { region } : {}),
    ...(chain ? { chain } : {}),
  });

  const contractsList = await getContracts();
  const count = contractsList.filter((c) => c.hotelId === hotelId).length;

  res.json({
    ...(updated || hotel),
    regionDisplayName: (updated || hotel).region,
    chainDisplayName: (updated || hotel).chain,
    contractCount: count,
  });
});

app.patch('/api/hotels/:id', authenticateToken, async (req, res) => {
  const hotelId = Number(req.params.id);
  const hotel = await getHotelById(hotelId);
  if (!hotel) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Hôtel non trouvé avec l'id: ${req.params.id}`,
    });
  }
  const { name, region, chain } = req.body;
  const updated = await updateHotel(hotelId, {
    ...(name && name.trim() ? { name: name.trim() } : {}),
    ...(region ? { region } : {}),
    ...(chain ? { chain } : {}),
  });

  const contractsList = await getContracts();
  const count = contractsList.filter((c) => c.hotelId === hotelId).length;

  res.json({
    ...(updated || hotel),
    regionDisplayName: (updated || hotel).region,
    chainDisplayName: (updated || hotel).chain,
    contractCount: count,
  });
});

// ----------------------------------------------------
// API CONTRACTS
// ----------------------------------------------------
const normalizeSearchStr = (str: string) =>
  (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

app.get('/api/contracts', authenticateToken, async (req, res) => {
  const {
    region,
    chain,
    status,
    hotel,
    contractDate,
    contractDateFrom,
    contractDateTo,
    receptionDate,
    receptionDateFrom,
    receptionDateTo,
    sortBy,
    sortOrder,
  } = req.query as Record<string, string>;

  const [contractsList, hotelsList] = await Promise.all([getContracts(), getHotels()]);

  let filtered = contractsList.map((c) => formatContractResponse(c, hotelsList));

  if (region) {
    filtered = filtered.filter((c) => c.hotel.region.toLowerCase() === region.toLowerCase());
  }
  if (chain) {
    filtered = filtered.filter((c) => c.hotel.chain.toLowerCase() === chain.toLowerCase());
  }
  if (status) {
    filtered = filtered.filter((c) => c.entryStatus.toLowerCase() === status.toLowerCase());
  }
  if (hotel && hotel.trim()) {
    const q = normalizeSearchStr(hotel);
    filtered = filtered.filter((c) => normalizeSearchStr(c.hotel.name).includes(q));
  }
  if (contractDate) {
    filtered = filtered.filter(
      (c) =>
        c.contractDate === contractDate ||
        (c.contractDateFrom && c.contractDateTo && c.contractDateFrom <= contractDate && c.contractDateTo >= contractDate)
    );
  }
  if (contractDateFrom) {
    filtered = filtered.filter((c) => {
      const cTo = c.contractDateTo || c.contractDateFrom || c.contractDate;
      return cTo ? cTo >= contractDateFrom : true;
    });
  }
  if (contractDateTo) {
    filtered = filtered.filter((c) => {
      const cFrom = c.contractDateFrom || c.contractDate || '';
      return cFrom ? cFrom <= contractDateTo : true;
    });
  }
  if (receptionDate) {
    filtered = filtered.filter((c) => c.receptionDate === receptionDate);
  }
  if (receptionDateFrom) {
    filtered = filtered.filter((c) => c.receptionDate >= receptionDateFrom);
  }
  if (receptionDateTo) {
    filtered = filtered.filter((c) => c.receptionDate <= receptionDateTo);
  }

  // Server-side sorting
  const isAsc = sortOrder !== 'desc';
  if (sortBy === 'hotel') {
    filtered.sort((a, b) => (isAsc ? a.hotel.name.localeCompare(b.hotel.name) : b.hotel.name.localeCompare(a.hotel.name)));
  } else if (sortBy === 'region') {
    filtered.sort((a, b) => (isAsc ? a.hotel.region.localeCompare(b.hotel.region) : b.hotel.region.localeCompare(a.hotel.region)));
  } else if (sortBy === 'chain') {
    filtered.sort((a, b) => (isAsc ? a.hotel.chain.localeCompare(b.hotel.chain) : b.hotel.chain.localeCompare(a.hotel.chain)));
  } else if (sortBy === 'contractDate') {
    filtered.sort((a, b) => {
      const dateA = a.contractDateFrom || a.contractDate || '';
      const dateB = b.contractDateFrom || b.contractDate || '';
      return isAsc ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
    });
  } else if (sortBy === 'status') {
    filtered.sort((a, b) => (isAsc ? a.entryStatus.localeCompare(b.entryStatus) : b.entryStatus.localeCompare(a.entryStatus)));
  } else {
    filtered.sort((a, b) => (isAsc ? a.receptionDate.localeCompare(b.receptionDate) : b.receptionDate.localeCompare(a.receptionDate)));
  }

  res.json(filtered);
});

// ----------------------------------------------------
// STATS CALCULATION
// ----------------------------------------------------
const ALL_REGIONS_CONFIG = [
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

const getComputedStats = async () => {
  const [contractsList, hotelsList] = await Promise.all([getContracts(), getHotels()]);
  const totalContracts = contractsList.length;
  const saisis = contractsList.filter((c) => c.entryStatus === 'SAISI').length;
  const xml = contractsList.filter((c) => c.entryStatus === 'XML').length;
  const nonSaisis = contractsList.filter((c) => c.entryStatus === 'NON_SAISI').length;
  const treatedContracts = saisis + xml;
  const progressPercentage =
    totalContracts > 0 ? Math.round((treatedContracts / totalContracts) * 100) : 0;

  const regions = ALL_REGIONS_CONFIG.map((r) => {
    const regionContracts = contractsList.filter((c) => {
      const h = hotelsList.find((hotel) => hotel.id === c.hotelId);
      return h && h.region === r.value;
    });
    const total = regionContracts.length;
    const rSaisi = regionContracts.filter((c) => c.entryStatus === 'SAISI').length;
    const rXml = regionContracts.filter((c) => c.entryStatus === 'XML').length;
    const rNonSaisi = regionContracts.filter((c) => c.entryStatus === 'NON_SAISI').length;
    const rTreated = rSaisi + rXml;
    const rProgress = total > 0 ? Math.round((rTreated / total) * 100) : 0;

    return {
      region: r.value,
      regionDisplayName: r.label,
      total,
      saisi: rSaisi,
      xml: rXml,
      nonSaisi: rNonSaisi,
      treated: rTreated,
      progressPercentage: rProgress,
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
};

app.get('/api/contracts/stats', authenticateToken, async (req, res) => {
  res.json(await getComputedStats());
});

app.get('/api/stats', authenticateToken, async (req, res) => {
  res.json(await getComputedStats());
});

app.get('/api/contracts/:id', authenticateToken, async (req, res) => {
  const contractId = Number(req.params.id);
  const [contract, hotelsList] = await Promise.all([getContractById(contractId), getHotels()]);
  if (!contract) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Contrat non trouvé avec l'id: ${req.params.id}`,
    });
  }
  res.json(formatContractResponse(contract, hotelsList));
});

app.post('/api/contracts', authenticateToken, async (req, res) => {
  const {
    hotel,
    hotelId,
    contractDate,
    contractDateFrom,
    contractDateTo,
    receptionDate,
    entryStatus,
    paymentTerms,
    fileName,
  } = req.body;
  const validationErrors: Record<string, string> = {};

  const effectiveFrom = contractDateFrom || contractDate;
  const effectiveTo = contractDateTo || contractDate;

  if (!effectiveFrom) {
    validationErrors.contractDateFrom = 'La date contrat (à partir du) est obligatoire';
  }
  if (!effectiveTo) {
    validationErrors.contractDateTo = 'La date contrat (jusqu\'au) est obligatoire';
  }
  if (effectiveFrom && effectiveTo && effectiveTo < effectiveFrom) {
    validationErrors.contractDateTo =
      'La date contrat (jusqu\'au) ne peut pas être antérieure à la date contrat (à partir du)';
  }

  if (!receptionDate) {
    validationErrors.receptionDate = 'La date de réception est obligatoire';
  }
  if (!entryStatus) {
    validationErrors.entryStatus = "L'état de saisie est obligatoire";
  }

  let resolvedHotelId = hotelId;
  if (!resolvedHotelId && hotel) {
    if (!hotel.name || !hotel.name.trim()) {
      validationErrors['hotel.name'] = "Le nom de l'hôtel est obligatoire";
    }
    if (!hotel.region) {
      validationErrors['hotel.region'] = 'La région est obligatoire';
    }
    if (!hotel.chain) {
      validationErrors['hotel.chain'] = 'La chaîne est obligatoire';
    }

    if (Object.keys(validationErrors).length === 0) {
      let existing = await findHotelByName(hotel.name);
      if (!existing) {
        existing = await createHotel({
          name: hotel.name.trim(),
          region: hotel.region,
          chain: hotel.chain,
        });
      } else {
        if (
          (hotel.region && existing.region !== hotel.region) ||
          (hotel.chain && existing.chain !== hotel.chain)
        ) {
          await updateHotel(existing.id, {
            ...(hotel.region ? { region: hotel.region } : {}),
            ...(hotel.chain ? { chain: hotel.chain } : {}),
          });
        }
      }
      resolvedHotelId = existing.id;
    }
  } else if (!resolvedHotelId) {
    validationErrors.hotelId = "L'hôtel est obligatoire";
  }

  if (Object.keys(validationErrors).length > 0) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Erreur de validation des données du contrat',
      validationErrors,
    });
  }

  const newContract = await createContract({
    hotelId: resolvedHotelId,
    contractDate: effectiveFrom,
    contractDateFrom: effectiveFrom,
    contractDateTo: effectiveTo,
    receptionDate,
    entryStatus,
    paymentTerms: paymentTerms || '',
    fileName: fileName || undefined,
  });

  const hotelsList = await getHotels();
  res.status(201).json(formatContractResponse(newContract, hotelsList));
});

const handleUpdateContract = async (req: express.Request, res: express.Response) => {
  const contractId = Number(req.params.id);
  const contract = await getContractById(contractId);
  if (!contract) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Contrat non trouvé avec l'id: ${req.params.id}`,
    });
  }

  const {
    hotel,
    hotelId,
    hotelName,
    region,
    chain,
    contractDate,
    contractDateFrom,
    contractDateTo,
    receptionDate,
    entryStatus,
    paymentTerms,
    fileName,
  } = req.body;

  const currentFrom = contract.contractDateFrom || contract.contractDate || '';
  const currentTo = contract.contractDateTo || contract.contractDate || '';
  const targetFrom = contractDateFrom || (contractDate && !contract.contractDateFrom ? contractDate : currentFrom);
  const targetTo = contractDateTo || (contractDate && !contract.contractDateTo ? contractDate : currentTo);

  if (targetFrom && targetTo && targetTo < targetFrom) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'La date contrat (jusqu\'au) ne peut pas être antérieure à la date contrat (à partir du)',
      validationErrors: {
        contractDateTo: 'La date contrat (jusqu\'au) ne peut pas être antérieure à la date contrat (à partir du)',
      },
    });
  }

  const updatePayload: any = {};
  if (contractDateFrom) updatePayload.contractDateFrom = contractDateFrom;
  if (contractDateTo) updatePayload.contractDateTo = contractDateTo;
  if (contractDate) updatePayload.contractDate = contractDate;
  if (contractDateFrom && !contract.contractDate) updatePayload.contractDate = contractDateFrom;
  if (receptionDate) updatePayload.receptionDate = receptionDate;
  if (entryStatus) updatePayload.entryStatus = entryStatus;
  if (paymentTerms !== undefined) updatePayload.paymentTerms = paymentTerms;
  if (fileName !== undefined) updatePayload.fileName = fileName;

  const targetRegion = (hotel && hotel.region) || region;
  const targetChain = (hotel && hotel.chain) || chain;
  const targetName = (hotel && hotel.name) || hotelName;
  const targetHotelId = hotelId || (hotel && hotel.id);

  if (targetName && targetName.trim()) {
    let existing = await findHotelByName(targetName);
    if (!existing) {
      existing = await createHotel({
        name: targetName.trim(),
        region: targetRegion || 'DIVERS',
        chain: targetChain || 'INDEPENDANT',
      });
    } else {
      if (
        (targetRegion && existing.region !== targetRegion) ||
        (targetChain && existing.chain !== targetChain)
      ) {
        await updateHotel(existing.id, {
          ...(targetRegion ? { region: targetRegion } : {}),
          ...(targetChain ? { chain: targetChain } : {}),
        });
      }
    }
    updatePayload.hotelId = existing.id;
  } else if (targetHotelId) {
    const existing = await getHotelById(Number(targetHotelId));
    if (existing) {
      if (
        (targetRegion && existing.region !== targetRegion) ||
        (targetChain && existing.chain !== targetChain) ||
        (targetName && targetName.trim() && existing.name !== targetName.trim())
      ) {
        await updateHotel(existing.id, {
          ...(targetRegion ? { region: targetRegion } : {}),
          ...(targetChain ? { chain: targetChain } : {}),
          ...(targetName && targetName.trim() ? { name: targetName.trim() } : {}),
        });
      }
      updatePayload.hotelId = existing.id;
    } else {
      updatePayload.hotelId = Number(targetHotelId);
    }
  } else if (targetRegion || targetChain) {
    const existing = await getHotelById(contract.hotelId);
    if (existing) {
      await updateHotel(existing.id, {
        ...(targetRegion ? { region: targetRegion } : {}),
        ...(targetChain ? { chain: targetChain } : {}),
      });
    }
  }

  const updatedContract = await updateContract(contractId, updatePayload);
  const hotelsList = await getHotels();
  res.json(formatContractResponse(updatedContract || contract, hotelsList));
};

app.put('/api/contracts/:id', authenticateToken, handleUpdateContract);
app.patch('/api/contracts/:id', authenticateToken, handleUpdateContract);

app.delete('/api/contracts/:id', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  const contractId = Number(req.params.id);
  const contract = await getContractById(contractId);
  if (!contract) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Contrat non trouvé avec l'id: ${req.params.id}`,
    });
  }

  // Safely delete attached file from GCS or disk
  await deleteContractFile(contract);
  await deleteContract(contractId);

  res.status(204).send();
});

// ----------------------------------------------------
// FILE STORAGE & UPLOAD MANAGEMENT
// ----------------------------------------------------
const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
  '.xls',
  '.xlsx',
]);

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

// Use memory storage for direct streaming/upload to GCS or disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(
        new Error(
          `Extension de fichier non autorisée (${ext}). Formats acceptés : PDF, DOC, DOCX, JPG, JPEG, PNG, XLS, XLSX.`
        )
      );
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(
        new Error(
          `Type MIME non autorisé (${file.mimetype}). Le fichier doit être un document PDF, Word, Excel ou une image.`
        )
      );
    }
    cb(null, true);
  },
});

// POST /api/contracts/:id/file - Persistent File Upload (GCS / Disk)
app.post('/api/contracts/:id/file', authenticateToken, async (req, res) => {
  const contractId = Number(req.params.id);
  const contract = await getContractById(contractId);

  if (!contract) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Contrat non trouvé avec l'id: ${req.params.id}`,
    });
  }

  const uploadSingle = upload.single('file');

  uploadSingle(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          timestamp: new Date().toISOString(),
          status: 413,
          error: 'Payload Too Large',
          message: `Le fichier dépasse la taille maximale autorisée de 10 Mo.`,
        });
      }
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        message: `Erreur de téléversement : ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        message: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        message: 'Aucun fichier fourni dans le champ "file".',
      });
    }

    // Clean up old file if present
    await deleteContractFile(contract);

    // Save to persistent storage (GCS if configured, or local fallback)
    const stored = await uploadContractFile(
      contractId,
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype
    );

    const updated = await updateContract(contractId, {
      fileName: stored.fileName,
      filePath: stored.filePath,
      fileType: stored.fileType,
      fileSize: stored.fileSize,
      storageType: stored.storageType,
      gcsBucket: stored.gcsBucket,
      gcsKey: stored.gcsKey,
    });

    const hotelsList = await getHotels();
    res.status(200).json(formatContractResponse(updated || contract, hotelsList));
  });
});

// GET /api/contracts/:id/file - View or Download Contract File (Streaming from GCS / Disk)
app.get('/api/contracts/:id/file', authenticateToken, async (req, res) => {
  const contractId = Number(req.params.id);
  const contract = await getContractById(contractId);

  if (!contract) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Contrat non trouvé avec l'id: ${req.params.id}`,
    });
  }

  if (!contract.fileName && !contract.filePath) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Aucun contrat joint pour le contrat #${contractId}.`,
    });
  }

  const payload = await getContractFileStream(contract);
  if (!payload) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Le fichier associé au contrat #${contractId} est introuvable sur le système de stockage.`,
    });
  }

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', payload.contentType);
  if (payload.contentLength) {
    res.setHeader('Content-Length', payload.contentLength);
  }

  const safeDownloadName = sanitizeFilename(payload.fileName);
  const isDownload = req.query.download === 'true' || req.query.action === 'download';

  if (isDownload) {
    res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
  } else {
    const ext = path.extname(safeDownloadName).toLowerCase();
    const canInline = ext === '.pdf' || ext === '.jpg' || ext === '.jpeg' || ext === '.png';
    const dispositionType = canInline ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${safeDownloadName}"`);
  }

  payload.stream.pipe(res);
});

// DELETE /api/contracts/:id/file - Remove attached file
app.delete('/api/contracts/:id/file', authenticateToken, async (req, res) => {
  const contractId = Number(req.params.id);
  const contract = await getContractById(contractId);

  if (!contract) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Contrat non trouvé avec l'id: ${req.params.id}`,
    });
  }

  if (!contract.fileName && !contract.filePath) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Aucun contrat joint à supprimer pour le contrat #${contractId}.`,
    });
  }

  await deleteContractFile(contract);

  const updated = await updateContract(contractId, {
    fileName: null,
    filePath: null,
    fileType: null,
    fileSize: null,
    storageType: null,
    gcsBucket: null,
    gcsKey: null,
  });

  const hotelsList = await getHotels();
  res.status(200).json(formatContractResponse(updated || contract, hotelsList));
});

// ----------------------------------------------------
// 404 HANDLER FOR UNKNOWN API ROUTES ONLY
// ----------------------------------------------------
app.all('/api/*', (req, res) => {
  res.status(404).json({
    timestamp: new Date().toISOString(),
    status: 404,
    error: 'Not Found',
    message: `Endpoint API introuvable : ${req.method} ${req.path}`,
  });
});

// ----------------------------------------------------
// CENTRALIZED PRODUCTION ERROR HANDLING MIDDLEWARE
// ----------------------------------------------------
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err && err.name === 'MulterError') {
    const isTooLarge = err.code === 'LIMIT_FILE_SIZE';
    return res.status(isTooLarge ? 413 : 400).json({
      timestamp: new Date().toISOString(),
      status: isTooLarge ? 413 : 400,
      error: isTooLarge ? 'Payload Too Large' : 'Bad Request',
      message: isTooLarge
        ? 'Le fichier dépasse la taille maximale autorisée de 10 Mo.'
        : `Erreur de téléversement : ${err.message}`,
    });
  }

  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      timestamp: new Date().toISOString(),
      status: 413,
      error: 'Payload Too Large',
      message: 'La charge utile de la requête dépasse la limite autorisée de 1 Mo.',
    });
  }

  if (err instanceof SyntaxError && 'body' in err && (err as any).status === 400) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Format JSON invalide dans le corps de la requête.',
    });
  }

  const status = typeof err.status === 'number' ? err.status : typeof err.statusCode === 'number' ? err.statusCode : 500;
  const isProd = process.env.NODE_ENV === 'production';

  console.error(`[ERROR] ${req.method} ${req.originalUrl} - ${err.message || err}`, isProd ? '' : err.stack || '');

  res.status(status).json({
    timestamp: new Date().toISOString(),
    status,
    error: status === 500 ? 'Internal Server Error' : err.name || 'Error',
    message: isProd && status === 500
      ? 'Une erreur interne est survenue sur le serveur.'
      : err.message || 'Une erreur inattendue est survenue.',
  });
});

// ----------------------------------------------------
// PROCESS STABILITY: UNHANDLED REJECTIONS & UNCAUGHT EXCEPTIONS
// ----------------------------------------------------
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('[FATAL] Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err: Error) => {
  console.error('[FATAL] Uncaught Exception thrown:', err.message, err.stack);
  process.exit(1);
});

// ----------------------------------------------------
// VITE MIDDLEWARE SETUP & SERVER LIFECYCLE
// ----------------------------------------------------
async function startServer() {
  // Initialize database & repository layer
  await initDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown handling
  let isShuttingDown = false;
  const gracefulShutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[SERVER] ${signal} signal received. Graceful shutdown started...`);
    server.close(() => {
      console.log('[SERVER] Server stopped. All connections closed cleanly.');
      process.exit(0);
    });

    setTimeout(() => {
      console.error('[SERVER] Forcefully terminating process due to shutdown timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();
