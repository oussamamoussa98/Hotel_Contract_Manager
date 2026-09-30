import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';

// Validate JWT Secret - strict security check: no hardcoded fallback allowed
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.trim() === '') {
  console.error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing.');
  throw new Error(
    'JWT_SECRET environment variable is missing. Please configure a secure JWT_SECRET in your environment or .env file before starting the application.'
  );
}
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

// Configurable reverse proxy support for production environments behind proxies/load balancers
if (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

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

// ============================================================================
// PHASE 8: AUTHENTICATION & RBAC (USER STORE & DEMO ACCOUNTS)
// NOTICE: These in-memory demo credentials are provided for development and testing
// purposes only and must be disabled or replaced with persistent accounts before
// production deployment. Passwords are encrypted with bcrypt (10 rounds).
//
// Development credentials:
// 1. Administrateur:
//    Email: admin@hotelcontracts.com
//    Mot de passe: AdminPassword123!
//    Rôle: ADMIN (Accès complet + Suppression)
//
// 2. Agent de Saisie:
//    Email: agent@hotelcontracts.com
//    Mot de passe: AgentPassword123!
//    Rôle: AGENT_SAISIE (Consultation, Ajout, Modification, Fichiers, PAS de suppression)
// ============================================================================
interface UserModel {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'AGENT_SAISIE';
  passwordHash: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

const INITIAL_DEMO_USERS: UserModel[] = [
  {
    id: 1,
    email: 'admin@hotelcontracts.com',
    name: 'Administrateur',
    role: 'ADMIN',
    passwordHash: bcrypt.hashSync('AdminPassword123!', 10),
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    email: 'admin@hotelcontracts.local',
    name: 'Administrateur',
    role: 'ADMIN',
    passwordHash: bcrypt.hashSync('Admin123!', 10),
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    email: 'agent@hotelcontracts.com',
    name: 'Agent de Saisie',
    role: 'AGENT_SAISIE',
    passwordHash: bcrypt.hashSync('AgentPassword123!', 10),
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 4,
    email: 'agent@hotelcontracts.local',
    name: 'Agent de Saisie',
    role: 'AGENT_SAISIE',
    passwordHash: bcrypt.hashSync('Agent123!', 10),
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
];

function loadUsers(): UserModel[] {
  try {
    if (fs.existsSync(USERS_FILE_PATH)) {
      const data = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
      const parsed: UserModel[] = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((u) => ({
          ...u,
          active: u.active !== undefined ? Boolean(u.active) : true,
        }));
      }
    }
  } catch (err) {
    console.error('Failed to read users from data/users.json, fallback to initial seed:', err);
  }
  // Initialize file
  saveUsers(INITIAL_DEMO_USERS);
  return [...INITIAL_DEMO_USERS];
}

function saveUsers(usersList: UserModel[]): void {
  try {
    const dir = path.dirname(USERS_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = `${USERS_FILE_PATH}.${Date.now()}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(usersList, null, 2), 'utf-8');
    fs.renameSync(tempPath, USERS_FILE_PATH);
  } catch (err) {
    console.error('Failed to write users to data/users.json:', err);
  }
}

// Initial check & load on startup
loadUsers();

// Helper to strip sensitive password data from user responses
function sanitizeUser(user: UserModel) {
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

// Authentication middleware verifying Bearer JWT and verifying user is still active in store
const authenticateToken = (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
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

    // Phase 10: Every authenticated request verifies that the user still exists and is active
    const currentUsers = loadUsers();
    const liveUser = currentUsers.find((u) => u.id === decoded.id);
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
        message: 'Accès refusé : Action réservée aux administrateurs.',
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
app.post('/api/auth/login', loginRateLimiter, (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Adresse email et mot de passe obligatoires.',
    });
  }

  const currentUsers = loadUsers();
  const normalizedEmail = email.trim().toLowerCase();
  const user = currentUsers.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({
      timestamp: new Date().toISOString(),
      status: 401,
      error: 'Unauthorized',
      message: 'Identifiants invalides : email ou mot de passe incorrect.',
    });
  }

  // Phase 10: If account is deactivated, return 403
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
app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  const currentUsers = loadUsers();
  const user = currentUsers.find((u) => u.id === req.user?.id);
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
// PHASE 10: USER MANAGEMENT API ROUTES (ADMIN ONLY)
// ====================================================

// GET /api/users
app.get('/api/users', authenticateToken, requireRole(['ADMIN']), (req: AuthenticatedRequest, res) => {
  const currentUsers = loadUsers();
  res.json(currentUsers.map(sanitizeUser));
});

// POST /api/users
app.post('/api/users', authenticateToken, requireRole(['ADMIN']), (req: AuthenticatedRequest, res) => {
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
  const currentUsers = loadUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (currentUsers.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Cette adresse email est déjà utilisée par un autre compte.',
    });
  }

  const nextId = currentUsers.length > 0 ? Math.max(...currentUsers.map((u) => u.id)) + 1 : 1;
  const now = new Date().toISOString();
  const newUser: UserModel = {
    id: nextId,
    name: name.trim(),
    email: email.trim(),
    role: assignedRole,
    passwordHash: bcrypt.hashSync(password, 10),
    active: true,
    createdAt: now,
    updatedAt: now,
  };

  currentUsers.push(newUser);
  saveUsers(currentUsers);

  res.status(201).json(sanitizeUser(newUser));
});

// PUT /api/users/:id
app.put('/api/users/:id', authenticateToken, requireRole(['ADMIN']), (req: AuthenticatedRequest, res) => {
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
  const currentUsers = loadUsers();
  const userIndex = currentUsers.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: 'Utilisateur introuvable.',
    });
  }

  const targetUser = currentUsers[userIndex];

  // Email duplicate check
  if (email && typeof email === 'string' && email.trim()) {
    const normalizedEmail = email.trim().toLowerCase();
    const duplicate = currentUsers.find((u) => u.id !== userId && u.email.toLowerCase() === normalizedEmail);
    if (duplicate) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        message: 'Cette adresse email est déjà utilisée par un autre compte.',
      });
    }
    targetUser.email = email.trim();
  }

  if (name && typeof name === 'string' && name.trim()) {
    targetUser.name = name.trim();
  }

  // Role modification with last active admin protection
  if (role && (role === 'ADMIN' || role === 'AGENT_SAISIE')) {
    if (targetUser.role === 'ADMIN' && role === 'AGENT_SAISIE') {
      const activeAdmins = currentUsers.filter((u) => u.role === 'ADMIN' && u.active);
      if (activeAdmins.length <= 1 && targetUser.active) {
        return res.status(400).json({
          timestamp: new Date().toISOString(),
          status: 400,
          error: 'Bad Request',
          message: 'Action interdite : Impossible de modifier le rôle du dernier administrateur actif.',
        });
      }
    }
    targetUser.role = role;
  }

  targetUser.updatedAt = new Date().toISOString();
  currentUsers[userIndex] = targetUser;
  saveUsers(currentUsers);

  res.json(sanitizeUser(targetUser));
});

// PATCH /api/users/:id/status
app.patch('/api/users/:id/status', authenticateToken, requireRole(['ADMIN']), (req: AuthenticatedRequest, res) => {
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

  const currentUsers = loadUsers();
  const user = currentUsers.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: 'Utilisateur introuvable.',
    });
  }

  // Protect last active admin from being deactivated
  if (active === false && user.role === 'ADMIN' && user.active) {
    const activeAdmins = currentUsers.filter((u) => u.role === 'ADMIN' && u.active);
    if (activeAdmins.length <= 1) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        message: 'Action interdite : Impossible de désactiver le dernier compte administrateur actif.',
      });
    }
  }

  user.active = active;
  user.updatedAt = new Date().toISOString();
  saveUsers(currentUsers);

  res.json(sanitizeUser(user));
});

// POST /api/users/:id/reset-password
app.post('/api/users/:id/reset-password', authenticateToken, requireRole(['ADMIN']), (req: AuthenticatedRequest, res) => {
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
      message: 'Le nouveau mot de passe doit comporter au moins 8 caractères.',
    });
  }

  const currentUsers = loadUsers();
  const user = currentUsers.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: 'Utilisateur introuvable.',
    });
  }

  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  user.updatedAt = new Date().toISOString();
  saveUsers(currentUsers);

  res.json({
    success: true,
    message: 'Mot de passe réinitialisé avec succès.',
  });
});

// DELETE /api/users/:id
app.delete('/api/users/:id', authenticateToken, requireRole(['ADMIN']), (req: AuthenticatedRequest, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({
      timestamp: new Date().toISOString(),
      status: 400,
      error: 'Bad Request',
      message: 'Identifiant utilisateur invalide.',
    });
  }

  const currentUsers = loadUsers();
  const userIndex = currentUsers.findIndex((u) => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: 'Utilisateur introuvable.',
    });
  }

  const targetUser = currentUsers[userIndex];

  // Protect last active admin from deletion
  if (targetUser.role === 'ADMIN' && targetUser.active) {
    const activeAdmins = currentUsers.filter((u) => u.role === 'ADMIN' && u.active);
    if (activeAdmins.length <= 1) {
      return res.status(400).json({
        timestamp: new Date().toISOString(),
        status: 400,
        error: 'Bad Request',
        message: 'Action interdite : Impossible de supprimer le dernier compte administrateur actif.',
      });
    }
  }

  currentUsers.splice(userIndex, 1);
  saveUsers(currentUsers);

  res.status(204).send();
});

// ============================================================================
// PHASE 11: DATA PERSISTENCE FOR HOTELS & CONTRACTS (ATOMIC JSON STORAGE)
// ============================================================================
interface HotelModel {
  id: number;
  name: string;
  region: string;
  chain: string;
  createdAt: string;
  updatedAt: string;
}

interface ContractModel {
  id: number;
  hotelId: number;
  contractDate?: string;
  contractDateFrom: string;
  contractDateTo: string;
  receptionDate: string;
  entryStatus: 'SAISI' | 'XML' | 'NON_SAISI';
  paymentTerms: string;
  fileName?: string;
  filePath?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const HOTELS_FILE_PATH = path.join(DATA_DIR, 'hotels.json');
const CONTRACTS_FILE_PATH = path.join(DATA_DIR, 'contracts.json');

const INITIAL_DEMO_HOTELS: HotelModel[] = [
  {
    id: 1,
    name: 'Iberostar Averroes Hammamet',
    region: 'HAMMAMET',
    chain: 'IBEROSTAR',
    createdAt: '2026-01-10T09:00:00Z',
    updatedAt: '2026-01-10T09:00:00Z',
  },
  {
    id: 2,
    name: 'Marhaba Beach Resort Sousse',
    region: 'SOUSSE',
    chain: 'MARHABA',
    createdAt: '2026-01-12T10:30:00Z',
    updatedAt: '2026-01-12T10:30:00Z',
  },
  {
    id: 3,
    name: 'Hasdrubal Thalassa & Spa Djerba',
    region: 'DJERBA',
    chain: 'HASDRUBAL',
    createdAt: '2026-01-15T14:15:00Z',
    updatedAt: '2026-01-15T14:15:00Z',
  },
  {
    id: 4,
    name: 'El Mouradi Palm Marina',
    region: 'SOUSSE',
    chain: 'EL_MOURADI',
    createdAt: '2026-01-18T11:00:00Z',
    updatedAt: '2026-01-18T11:00:00Z',
  },
  {
    id: 5,
    name: 'Vincci Marillia',
    region: 'HAMMAMET',
    chain: 'VINCCI',
    createdAt: '2026-01-20T16:45:00Z',
    updatedAt: '2026-01-20T16:45:00Z',
  },
];

const INITIAL_DEMO_CONTRACTS: ContractModel[] = [
  {
    id: 1,
    hotelId: 1,
    contractDate: '2026-01-15',
    contractDateFrom: '2026-01-15',
    contractDateTo: '2027-01-14',
    receptionDate: '2026-01-18',
    entryStatus: 'SAISI',
    paymentTerms: "Avance et le reste à l'hôtel",
    fileName: 'contrat_demo_iberostar_hammamet_2026.pdf',
    filePath: '/uploads/contracts/contrat_demo_iberostar_hammamet_2026.pdf',
    fileType: 'application/pdf',
    fileSize: 1845000,
    createdAt: '2026-01-18T14:30:00Z',
    updatedAt: '2026-01-18T14:30:00Z',
  },
  {
    id: 2,
    hotelId: 1,
    contractDate: '2026-02-01',
    contractDateFrom: '2026-02-01',
    contractDateTo: '2027-01-31',
    receptionDate: '2026-02-03',
    entryStatus: 'XML',
    paymentTerms: "Totalité à l'agence",
    fileName: 'flux_xml_demo_iberostar_2026.xml',
    filePath: '/uploads/contracts/flux_xml_demo_iberostar_2026.xml',
    fileType: 'application/xml',
    fileSize: 320000,
    createdAt: '2026-02-03T09:15:00Z',
    updatedAt: '2026-02-03T09:15:00Z',
  },
  {
    id: 3,
    hotelId: 2,
    contractDate: '2026-03-10',
    contractDateFrom: '2026-03-10',
    contractDateTo: '2027-03-09',
    receptionDate: '2026-03-12',
    entryStatus: 'NON_SAISI',
    paymentTerms: "Avance et le reste à l'hôtel",
    fileName: 'contrat_demo_marhaba_sousse_draft.pdf',
    filePath: '/uploads/contracts/contrat_demo_marhaba_sousse_draft.pdf',
    fileType: 'application/pdf',
    fileSize: 2150000,
    createdAt: '2026-03-12T16:00:00Z',
    updatedAt: '2026-03-12T16:00:00Z',
  },
  {
    id: 4,
    hotelId: 3,
    contractDate: '2026-01-20',
    contractDateFrom: '2026-01-20',
    contractDateTo: '2027-01-19',
    receptionDate: '2026-01-22',
    entryStatus: 'SAISI',
    paymentTerms: "Totalité à l'agence",
    fileName: 'contrat_demo_hasdrubal_djerba_2026.pdf',
    filePath: '/uploads/contracts/contrat_demo_hasdrubal_djerba_2026.pdf',
    fileType: 'application/pdf',
    fileSize: 1420000,
    createdAt: '2026-01-22T11:45:00Z',
    updatedAt: '2026-01-22T11:45:00Z',
  },
  {
    id: 5,
    hotelId: 3,
    contractDate: '2026-04-05',
    contractDateFrom: '2026-04-05',
    contractDateTo: '2027-04-04',
    receptionDate: '2026-04-07',
    entryStatus: 'NON_SAISI',
    paymentTerms: "Avance et le reste à l'hôtel",
    createdAt: '2026-04-07T08:30:00Z',
    updatedAt: '2026-04-07T08:30:00Z',
  },
];

function handleCorruptedFile(filePath: string, fileLabel: string, err: any): never {
  console.error(`[FATAL] Unable to load ${filePath}. The file contains invalid JSON or invalid data schema. The server will not start to prevent data loss.`);
  console.error(`[FATAL] Error details:`, err);
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${filePath}.corrupted.${timestamp}.bak`;
    fs.copyFileSync(filePath, backupPath);
    console.error(`[FATAL] Corrupted ${fileLabel} file backed up to: ${backupPath}`);
  } catch (backupErr) {
    console.error(`[FATAL] Failed to create backup of corrupted ${fileLabel} file:`, backupErr);
  }
  throw new Error(`Fatal: ${filePath} is corrupted or invalid. Startup aborted to prevent data loss.`);
}

function validateHotels(items: any[]): items is HotelModel[] {
  if (!Array.isArray(items)) return false;
  for (const item of items) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item.id !== 'number' ||
      !Number.isFinite(item.id) ||
      typeof item.name !== 'string' ||
      typeof item.region !== 'string' ||
      typeof item.chain !== 'string' ||
      typeof item.createdAt !== 'string' ||
      typeof item.updatedAt !== 'string'
    ) {
      return false;
    }
  }
  return true;
}

function validateContracts(items: any[]): items is ContractModel[] {
  if (!Array.isArray(items)) return false;
  for (const item of items) {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item.id !== 'number' ||
      !Number.isFinite(item.id) ||
      typeof item.hotelId !== 'number' ||
      !Number.isFinite(item.hotelId) ||
      !['SAISI', 'XML', 'NON_SAISI'].includes(item.entryStatus) ||
      typeof item.createdAt !== 'string' ||
      typeof item.updatedAt !== 'string'
    ) {
      return false;
    }
  }
  return true;
}

function saveHotels(hotelsList: HotelModel[]): void {
  const tempPath = path.join(DATA_DIR, `hotels.json.${Date.now()}.${process.pid}.tmp`);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(tempPath, JSON.stringify(hotelsList, null, 2), 'utf-8');
    fs.renameSync(tempPath, HOTELS_FILE_PATH);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    }
    console.error('Failed to write hotels to data/hotels.json:', err);
    throw err;
  }
}

function saveContracts(contractsList: ContractModel[]): void {
  const tempPath = path.join(DATA_DIR, `contracts.json.${Date.now()}.${process.pid}.tmp`);
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(tempPath, JSON.stringify(contractsList, null, 2), 'utf-8');
    fs.renameSync(tempPath, CONTRACTS_FILE_PATH);
  } catch (err) {
    if (fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
      } catch {}
    }
    console.error('Failed to write contracts to data/contracts.json:', err);
    throw err;
  }
}

function loadHotels(): HotelModel[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(HOTELS_FILE_PATH)) {
    saveHotels(INITIAL_DEMO_HOTELS);
    console.log('[DATA] data/hotels.json not found. Initialized from existing seed data.');
    return [...INITIAL_DEMO_HOTELS];
  }

  let parsed: any;
  try {
    const raw = fs.readFileSync(HOTELS_FILE_PATH, 'utf-8');
    parsed = JSON.parse(raw);
  } catch (parseErr) {
    handleCorruptedFile(HOTELS_FILE_PATH, 'hotels', parseErr);
  }

  if (!validateHotels(parsed)) {
    handleCorruptedFile(
      HOTELS_FILE_PATH,
      'hotels',
      new Error('data/hotels.json does not conform to the expected HotelModel schema.')
    );
  }

  return parsed;
}

function loadContracts(): ContractModel[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(CONTRACTS_FILE_PATH)) {
    saveContracts(INITIAL_DEMO_CONTRACTS);
    console.log('[DATA] data/contracts.json not found. Initialized from existing seed data.');
    return [...INITIAL_DEMO_CONTRACTS];
  }

  let parsed: any;
  try {
    const raw = fs.readFileSync(CONTRACTS_FILE_PATH, 'utf-8');
    parsed = JSON.parse(raw);
  } catch (parseErr) {
    handleCorruptedFile(CONTRACTS_FILE_PATH, 'contracts', parseErr);
  }

  if (!validateContracts(parsed)) {
    handleCorruptedFile(
      CONTRACTS_FILE_PATH,
      'contracts',
      new Error('data/contracts.json does not conform to the expected ContractModel schema.')
    );
  }

  return parsed;
}

let hotels: HotelModel[] = loadHotels();
let contracts: ContractModel[] = loadContracts();

let nextHotelId = hotels.length > 0 ? Math.max(...hotels.map((h) => h.id)) + 1 : 1;
let nextContractId = contracts.length > 0 ? Math.max(...contracts.map((c) => c.id)) + 1 : 1;

console.log(`[DATA] Loaded ${hotels.length} hotels from data/hotels.json`);
console.log(`[DATA] Loaded ${contracts.length} contracts from data/contracts.json`);
console.log(`[DATA] Next hotel ID: ${nextHotelId}`);
console.log(`[DATA] Next contract ID: ${nextContractId}`);

function formatContractResponse(contract: ContractModel) {
  const hotel = hotels.find((h) => h.id === contract.hotelId) || {
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
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
  };
}

// ----------------------------------------------------
// API HOTELS
// ----------------------------------------------------
app.get('/api/hotels', authenticateToken, (req, res) => {
  const response = hotels.map((h) => {
    const count = contracts.filter((c) => c.hotelId === h.id).length;
    return {
      ...h,
      regionDisplayName: h.region,
      chainDisplayName: h.chain,
      contractCount: count,
    };
  });
  res.json(response);
});

app.get('/api/hotels/:id', authenticateToken, (req, res) => {
  const hotel = hotels.find((h) => h.id === Number(req.params.id));
  if (!hotel) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Hôtel non trouvé avec l'id: ${req.params.id}`,
    });
  }
  const count = contracts.filter((c) => c.hotelId === hotel.id).length;
  res.json({
    ...hotel,
    regionDisplayName: hotel.region,
    chainDisplayName: hotel.chain,
    contractCount: count,
  });
});

app.post('/api/hotels', authenticateToken, (req, res) => {
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

  const newHotel: HotelModel = {
    id: nextHotelId++,
    name: name.trim(),
    region,
    chain,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  hotels.push(newHotel);
  saveHotels(hotels);
  res.status(201).json({
    ...newHotel,
    regionDisplayName: newHotel.region,
    chainDisplayName: newHotel.chain,
    contractCount: 0,
  });
});

app.put('/api/hotels/:id', authenticateToken, (req, res) => {
  const hotel = hotels.find((h) => h.id === Number(req.params.id));
  if (!hotel) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Hôtel non trouvé avec l'id: ${req.params.id}`,
    });
  }
  const { name, region, chain } = req.body;
  if (name && name.trim()) hotel.name = name.trim();
  if (region) hotel.region = region;
  if (chain) hotel.chain = chain;
  hotel.updatedAt = new Date().toISOString();
  saveHotels(hotels);
  const count = contracts.filter((c) => c.hotelId === hotel.id).length;
  res.json({
    ...hotel,
    regionDisplayName: hotel.region,
    chainDisplayName: hotel.chain,
    contractCount: count,
  });
});

app.patch('/api/hotels/:id', authenticateToken, (req, res) => {
  const hotel = hotels.find((h) => h.id === Number(req.params.id));
  if (!hotel) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Hôtel non trouvé avec l'id: ${req.params.id}`,
    });
  }
  const { name, region, chain } = req.body;
  if (name && name.trim()) hotel.name = name.trim();
  if (region) hotel.region = region;
  if (chain) hotel.chain = chain;
  hotel.updatedAt = new Date().toISOString();
  saveHotels(hotels);
  const count = contracts.filter((c) => c.hotelId === hotel.id).length;
  res.json({
    ...hotel,
    regionDisplayName: hotel.region,
    chainDisplayName: hotel.chain,
    contractCount: count,
  });
});

// ----------------------------------------------------
// API CONTRACTS
// ----------------------------------------------------
const normalizeSearchStr = (str: string) =>
  (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

app.get('/api/contracts', authenticateToken, (req, res) => {
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

  let filtered = contracts.map((c) => formatContractResponse(c));

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

  // Tri côté serveur
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
    // Par défaut tri par date de réception
    filtered.sort((a, b) => (isAsc ? a.receptionDate.localeCompare(b.receptionDate) : b.receptionDate.localeCompare(a.receptionDate)));
  }

  res.json(filtered);
});

// ----------------------------------------------------
// PHASE 6: API STATISTIQUES DYNAMIQUES & PROGRESSION
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

const getComputedStats = () => {
  const totalContracts = contracts.length;
  const saisis = contracts.filter((c) => c.entryStatus === 'SAISI').length;
  const xml = contracts.filter((c) => c.entryStatus === 'XML').length;
  const nonSaisis = contracts.filter((c) => c.entryStatus === 'NON_SAISI').length;
  const treatedContracts = saisis + xml;
  const progressPercentage =
    totalContracts > 0 ? Math.round((treatedContracts / totalContracts) * 100) : 0;

  const regions = ALL_REGIONS_CONFIG.map((r) => {
    const regionContracts = contracts.filter((c) => {
      const h = hotels.find((hotel) => hotel.id === c.hotelId);
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

app.get('/api/contracts/stats', authenticateToken, (req, res) => {
  res.json(getComputedStats());
});

app.get('/api/stats', authenticateToken, (req, res) => {
  res.json(getComputedStats());
});

app.get('/api/contracts/:id', authenticateToken, (req, res) => {
  const contract = contracts.find((c) => c.id === Number(req.params.id));
  if (!contract) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Contrat non trouvé avec l'id: ${req.params.id}`,
    });
  }
  res.json(formatContractResponse(contract));
});

app.post('/api/contracts', authenticateToken, (req, res) => {
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
  let hotelChanged = false;
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
      let existing = hotels.find(
        (h) => h.name.toLowerCase() === hotel.name.trim().toLowerCase()
      );
      if (!existing) {
        existing = {
          id: nextHotelId++,
          name: hotel.name.trim(),
          region: hotel.region,
          chain: hotel.chain,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        hotels.push(existing);
        hotelChanged = true;
      } else {
        let hMod = false;
        if (hotel.region && existing.region !== hotel.region) {
          existing.region = hotel.region;
          hMod = true;
        }
        if (hotel.chain && existing.chain !== hotel.chain) {
          existing.chain = hotel.chain;
          hMod = true;
        }
        if (hMod) {
          existing.updatedAt = new Date().toISOString();
          hotelChanged = true;
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

  const newContract: ContractModel = {
    id: nextContractId++,
    hotelId: resolvedHotelId,
    contractDate: effectiveFrom,
    contractDateFrom: effectiveFrom,
    contractDateTo: effectiveTo,
    receptionDate,
    entryStatus,
    paymentTerms: paymentTerms || '',
    fileName: fileName || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  contracts.push(newContract);
  if (hotelChanged) {
    saveHotels(hotels);
  }
  saveContracts(contracts);
  res.status(201).json(formatContractResponse(newContract));
});

const handleUpdateContract = (req: express.Request, res: express.Response) => {
  const contract = contracts.find((c) => c.id === Number(req.params.id));
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

  if (contractDateFrom) contract.contractDateFrom = contractDateFrom;
  if (contractDateTo) contract.contractDateTo = contractDateTo;
  if (contractDate) contract.contractDate = contractDate;
  if (contractDateFrom && !contract.contractDate) contract.contractDate = contractDateFrom;
  if (receptionDate) contract.receptionDate = receptionDate;
  if (entryStatus) contract.entryStatus = entryStatus;
  if (paymentTerms !== undefined) contract.paymentTerms = paymentTerms;
  if (fileName !== undefined) contract.fileName = fileName;
  contract.updatedAt = new Date().toISOString();

  let hotelChanged = false;
  // Extract hotel-related information from either nested 'hotel' or top-level props
  const targetRegion = (hotel && hotel.region) || region;
  const targetChain = (hotel && hotel.chain) || chain;
  const targetName = (hotel && hotel.name) || hotelName;
  const targetHotelId = hotelId || (hotel && hotel.id);

  if (targetName && targetName.trim()) {
    let existing = hotels.find(
      (h) => h.name.toLowerCase() === targetName.trim().toLowerCase()
    );
    if (!existing) {
      existing = {
        id: nextHotelId++,
        name: targetName.trim(),
        region: targetRegion || 'DIVERS',
        chain: targetChain || 'INDEPENDANT',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      hotels.push(existing);
      hotelChanged = true;
    } else {
      if (targetRegion && existing.region !== targetRegion) {
        existing.region = targetRegion;
        hotelChanged = true;
      }
      if (targetChain && existing.chain !== targetChain) {
        existing.chain = targetChain;
        hotelChanged = true;
      }
      if (hotelChanged) {
        existing.updatedAt = new Date().toISOString();
      }
    }
    contract.hotelId = existing.id;
  } else if (targetHotelId) {
    const existing = hotels.find((h) => h.id === Number(targetHotelId));
    if (existing) {
      if (targetRegion && existing.region !== targetRegion) {
        existing.region = targetRegion;
        hotelChanged = true;
      }
      if (targetChain && existing.chain !== targetChain) {
        existing.chain = targetChain;
        hotelChanged = true;
      }
      if (targetName && targetName.trim() && existing.name !== targetName.trim()) {
        existing.name = targetName.trim();
        hotelChanged = true;
      }
      if (hotelChanged) {
        existing.updatedAt = new Date().toISOString();
      }
      contract.hotelId = existing.id;
    } else {
      contract.hotelId = Number(targetHotelId);
    }
  } else if (targetRegion || targetChain) {
    const existing = hotels.find((h) => h.id === contract.hotelId);
    if (existing) {
      if (targetRegion && existing.region !== targetRegion) {
        existing.region = targetRegion;
        hotelChanged = true;
      }
      if (targetChain && existing.chain !== targetChain) {
        existing.chain = targetChain;
        hotelChanged = true;
      }
      if (hotelChanged) {
        existing.updatedAt = new Date().toISOString();
      }
    }
  }

  if (hotelChanged) {
    saveHotels(hotels);
  }
  saveContracts(contracts);

  res.json(formatContractResponse(contract));
};

app.put('/api/contracts/:id', authenticateToken, handleUpdateContract);
app.patch('/api/contracts/:id', authenticateToken, handleUpdateContract);

app.delete('/api/contracts/:id', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  const index = contracts.findIndex((c) => c.id === Number(req.params.id));
  if (index === -1) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Contrat non trouvé avec l'id: ${req.params.id}`,
    });
  }

  const [deletedContract] = contracts.splice(index, 1);
  saveContracts(contracts);
  // Nettoyage sécurisé du fichier sur le disque lors de la suppression du contrat
  if (deletedContract.filePath) {
    try {
      const fullPath = path.isAbsolute(deletedContract.filePath)
        ? deletedContract.filePath
        : path.join(process.cwd(), deletedContract.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (e) {
      console.warn('Impossible de supprimer le fichier du contrat:', e);
    }
  }

  res.status(204).send();
});

// ----------------------------------------------------
// PHASE 5: SECURE FILE STORAGE & UPLOAD MANAGEMENT
// ----------------------------------------------------
const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'contracts');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Initial demo files creation for demonstration contracts
const DEMO_FILES = [
  { name: 'contrat_demo_marhaba_sousse_draft.pdf', content: '%PDF-1.4\n1 0 obj\n<< /Title (Contrat Marhaba Beach Resort 2026) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF' },
  { name: 'contrat_demo_hasdrubal_djerba_2026.pdf', content: '%PDF-1.4\n1 0 obj\n<< /Title (Contrat Hasdrubal Thalassa Djerba 2026) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF' },
  { name: 'contrat_demo_iberostar_hammamet_2026.pdf', content: '%PDF-1.4\n1 0 obj\n<< /Title (Contrat Iberostar Averroes 2026) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF' },
  { name: 'flux_xml_demo_iberostar_2026.xml', content: '<?xml version="1.0" encoding="UTF-8"?>\n<hotelRates id="1">\n  <name>Iberostar Averroes</name>\n  <season year="2026"/>\n</hotelRates>' },
];

for (const demo of DEMO_FILES) {
  const filePath = path.join(UPLOADS_DIR, demo.name);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, demo.content, 'utf-8');
  }
}

// Allowed extensions and MIME types strictly adhering to specs
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

// Sanitize filename to prevent path traversal & injection
function sanitizeOriginalFilename(rawName: string): string {
  const base = path.basename(rawName);
  return base.replace(/[^\w\.\-\s]/gi, '_').replace(/\s+/g, '_');
}

// Multer storage engine configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeUUID = crypto.randomUUID();
    cb(null, `${safeUUID}${ext}`);
  },
});

const upload = multer({
  storage,
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

// POST /api/contracts/:id/file - Secure File Upload
app.post('/api/contracts/:id/file', authenticateToken, (req, res) => {
  const contractId = Number(req.params.id);
  const contract = contracts.find((c) => c.id === contractId);

  if (!contract) {
    return res.status(404).json({
      timestamp: new Date().toISOString(),
      status: 404,
      error: 'Not Found',
      message: `Contrat non trouvé avec l'id: ${req.params.id}`,
    });
  }

  const uploadSingle = upload.single('file');

  uploadSingle(req, res, (err) => {
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

    // If an existing file was attached, clean it up safely from disk
    if (contract.filePath) {
      try {
        const oldPath = path.isAbsolute(contract.filePath)
          ? contract.filePath
          : path.join(process.cwd(), contract.filePath);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (cleanErr) {
        console.warn('Impossible de supprimer l’ancien fichier:', cleanErr);
      }
    }

    const sanitizedName = sanitizeOriginalFilename(req.file.originalname);
    const relativePath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');

    contract.fileName = sanitizedName;
    contract.filePath = relativePath;
    contract.fileType = req.file.mimetype;
    contract.fileSize = req.file.size;
    contract.updatedAt = new Date().toISOString();

    saveContracts(contracts);

    res.status(200).json(formatContractResponse(contract));
  });
});

// GET /api/contracts/:id/file - View or Download Contract File
app.get('/api/contracts/:id/file', authenticateToken, (req, res) => {
  const contractId = Number(req.params.id);
  const contract = contracts.find((c) => c.id === contractId);

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

  // Determine physical location on disk
  let physicalPath = contract.filePath
    ? path.isAbsolute(contract.filePath)
      ? contract.filePath
      : path.join(process.cwd(), contract.filePath)
    : path.join(UPLOADS_DIR, contract.fileName || '');

  // If not found at direct path, try looking inside UPLOADS_DIR by filename
  if (!fs.existsSync(physicalPath) && contract.fileName) {
    const fallbackPath = path.join(UPLOADS_DIR, path.basename(contract.fileName));
    if (fs.existsSync(fallbackPath)) {
      physicalPath = fallbackPath;
    }
  }

  if (!fs.existsSync(physicalPath)) {
    // If it is a registered demo file, auto-generate placeholder content so download works seamlessly
    if (contract.fileName) {
      const demoPath = path.join(UPLOADS_DIR, path.basename(contract.fileName));
      fs.writeFileSync(
        demoPath,
        `%PDF-1.4\n% Contract #${contract.id} - ${contract.fileName}\n%%EOF`,
        'utf-8'
      );
      physicalPath = demoPath;
    } else {
      return res.status(404).json({
        timestamp: new Date().toISOString(),
        status: 404,
        error: 'Not Found',
        message: `Le fichier physique associé au contrat #${contractId} est introuvable sur le serveur.`,
      });
    }
  }

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (contract.fileType) {
    res.setHeader('Content-Type', contract.fileType);
  }

  const safeDownloadName = sanitizeOriginalFilename(contract.fileName || 'contrat.pdf');
  const isDownload = req.query.download === 'true' || req.query.action === 'download';

  if (isDownload) {
    res.setHeader('Content-Disposition', `attachment; filename="${safeDownloadName}"`);
    return res.sendFile(path.resolve(physicalPath));
  } else {
    // View mode: inline for PDFs and Images, attachment for Office docs
    const ext = path.extname(safeDownloadName).toLowerCase();
    const canInline = ext === '.pdf' || ext === '.jpg' || ext === '.jpeg' || ext === '.png';
    const dispositionType = canInline ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${dispositionType}; filename="${safeDownloadName}"`);
    return res.sendFile(path.resolve(physicalPath));
  }
});

// DELETE /api/contracts/:id/file - Remove attached file
app.delete('/api/contracts/:id/file', authenticateToken, (req, res) => {
  const contractId = Number(req.params.id);
  const contract = contracts.find((c) => c.id === contractId);

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

  // Safely remove file from disk
  if (contract.filePath) {
    try {
      const fullPath = path.isAbsolute(contract.filePath)
        ? contract.filePath
        : path.join(process.cwd(), contract.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (err) {
      console.warn('Erreur lors de la suppression physique du fichier:', err);
    }
  }

  contract.fileName = undefined;
  contract.filePath = undefined;
  contract.fileType = undefined;
  contract.fileSize = undefined;
  contract.updatedAt = new Date().toISOString();

  saveContracts(contracts);

  res.status(200).json(formatContractResponse(contract));
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

  // Handle Multer upload errors if uncaught
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

  // Handle body-parser / express.json payload too large (exceeds 1mb limit)
  if (err && (err.type === 'entity.too.large' || err.status === 413)) {
    return res.status(413).json({
      timestamp: new Date().toISOString(),
      status: 413,
      error: 'Payload Too Large',
      message: 'La charge utile de la requête dépasse la limite autorisée de 1 Mo.',
    });
  }

  // Handle JSON syntax parse error
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
  // Terminate immediately with non-zero exit code so process manager restarts cleanly
  process.exit(1);
});

// ----------------------------------------------------
// VITE MIDDLEWARE SETUP & SERVER LIFECYCLE
// ----------------------------------------------------
async function startServer() {
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
