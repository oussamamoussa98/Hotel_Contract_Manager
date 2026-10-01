import { PrismaClient, Role, EntryStatus } from '@prisma/client';
import fs from 'fs';
import path from 'path';

export { Role, EntryStatus };

export interface DbUser {
  id: number;
  email: string;
  name: string;
  role: 'ADMIN' | 'AGENT_SAISIE';
  passwordHash: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DbHotel {
  id: number;
  name: string;
  region: string;
  chain: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbContract {
  id: number;
  hotelId: number;
  contractDate?: string;
  contractDateFrom: string;
  contractDateTo: string;
  receptionDate: string;
  entryStatus: 'SAISI' | 'XML' | 'NON_SAISI';
  paymentTerms: string;
  fileName?: string | null;
  filePath?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  storageType?: string | null;
  gcsBucket?: string | null;
  gcsKey?: string | null;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const HOTELS_FILE = path.join(DATA_DIR, 'hotels.json');
const CONTRACTS_FILE = path.join(DATA_DIR, 'contracts.json');

export function getDatabaseUrl(): string | undefined {
  let base: string | undefined = undefined;
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '') {
    base = process.env.DATABASE_URL.trim();
  } else if (process.env.SQL_HOST && process.env.SQL_USER) {
    const user = encodeURIComponent(process.env.SQL_USER || '');
    const pass = encodeURIComponent(process.env.SQL_PASSWORD || '');
    const db = process.env.SQL_DB_NAME || 'cloud_sql_development_database';
    base = `postgresql://${user}:${pass}@localhost/${db}?host=${process.env.SQL_HOST}`;
  }

  if (base) {
    const separator = base.includes('?') ? '&' : '?';
    const params: string[] = [];
    if (!base.includes('connection_limit=')) params.push('connection_limit=5');
    if (!base.includes('pool_timeout=')) params.push('pool_timeout=10');
    if (!base.includes('connect_timeout=')) params.push('connect_timeout=15');
    if (params.length > 0) {
      base = `${base}${separator}${params.join('&')}`;
    }
  }
  return base;
}

const activeDbUrl = getDatabaseUrl();
if (activeDbUrl && !process.env.DATABASE_URL) {
  process.env.DATABASE_URL = activeDbUrl;
}

// Global Prisma instance with graceful event-based logging to handle idle pool reaping (57P01)
export const prisma = new PrismaClient({
  datasources: activeDbUrl ? { db: { url: activeDbUrl } } : undefined,
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('error' as never, (e: any) => {
  const msg = String(e?.message || '');
  if (msg.includes('57P01') || msg.includes('terminating connection') || msg.includes('closed connection')) {
    // Normal Cloud SQL idle connection termination event: gracefully handled by executePrisma
    console.log('[DATABASE] Cloud SQL idle connection recycled by database manager (57P01).');
  } else {
    console.error('[DATABASE] Prisma error:', msg);
  }
});

prisma.$on('warn' as never, (e: any) => {
  console.warn('[DATABASE] Prisma warning:', e?.message || e);
});

let isPostgresConnected = false;
let databaseInitialized = false;

/**
 * Executes a Prisma query with automatic retry and reconnection
 * if Cloud SQL terminated an idle connection (PostgreSQL code 57P01).
 */
export async function executePrisma<T>(operation: () => Promise<T>): Promise<T> {
  let attempts = 0;
  while (true) {
    try {
      return await operation();
    } catch (err: any) {
      attempts++;
      const errMsg = String(err?.message || err);
      const isConnectionIssue =
        errMsg.includes('57P01') ||
        errMsg.includes('terminating connection') ||
        errMsg.includes('closed connection') ||
        errMsg.includes('Connection terminated') ||
        errMsg.includes('ECONNRESET') ||
        err?.code === '57P01';

      if (isConnectionIssue && attempts <= 3) {
        console.log(`[DATABASE] Connection recycled (57P01). Reconnecting to Cloud SQL (attempt ${attempts}/3)...`);
        try {
          await prisma.$disconnect();
        } catch {}
        try {
          await prisma.$connect();
        } catch {}
        await new Promise((res) => setTimeout(res, 150 * attempts));
        continue;
      }
      throw err;
    }
  }
}

// ----------------------------------------------------
// INITIALIZATION & FALLBACK JSON STORAGE ENGINE
// ----------------------------------------------------
function readJsonFile<T>(filePath: string, fallback: T[]): T[] {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn(`[DATA] Warning reading ${filePath}:`, err);
  }
  return fallback;
}

function writeJsonAtomic(filePath: string, data: any): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempPath = `${filePath}.${Date.now()}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error(`[DATA] Error writing atomic file ${filePath}:`, err);
  }
}

// In-memory cache when running in fallback mode
let memoryUsers: DbUser[] = [];
let memoryHotels: DbHotel[] = [];
let memoryContracts: DbContract[] = [];

export async function initDatabase(): Promise<boolean> {
  if (databaseInitialized) return isPostgresConnected;

  const dbUrl = getDatabaseUrl();

  // Always load JSON data as backup/seed
  memoryUsers = readJsonFile<DbUser>(USERS_FILE, []);
  memoryHotels = readJsonFile<DbHotel>(HOTELS_FILE, []);
  memoryContracts = readJsonFile<DbContract>(CONTRACTS_FILE, []);

  if (dbUrl && dbUrl.trim() !== '') {
    try {
      console.log('[DATABASE] Connecting to PostgreSQL via Prisma...');
      await prisma.$connect();
      // Test query
      await prisma.$queryRaw`SELECT 1`;
      isPostgresConnected = true;
      console.log('[DATABASE] Connected successfully to Cloud SQL PostgreSQL database.');

      // Check if tables have records; if empty, auto-seed from JSON files
      const userCount = await prisma.user.count();
      if (userCount === 0 && memoryUsers.length > 0) {
        console.log(`[DATABASE] Seeding ${memoryUsers.length} users into PostgreSQL...`);
        for (const u of memoryUsers) {
          await prisma.user.create({
            data: {
              id: u.id,
              email: u.email,
              name: u.name,
              role: u.role as Role,
              passwordHash: u.passwordHash,
              active: u.active ?? true,
              createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
              updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
            },
          });
        }
      }

      const hotelCount = await prisma.hotel.count();
      if (hotelCount === 0 && memoryHotels.length > 0) {
        console.log(`[DATABASE] Seeding ${memoryHotels.length} hotels into PostgreSQL...`);
        for (const h of memoryHotels) {
          await prisma.hotel.create({
            data: {
              id: h.id,
              name: h.name,
              region: h.region,
              chain: h.chain,
              createdAt: h.createdAt ? new Date(h.createdAt) : new Date(),
              updatedAt: h.updatedAt ? new Date(h.updatedAt) : new Date(),
            },
          });
        }
      }

      const contractCount = await prisma.contract.count();
      if (contractCount === 0 && memoryContracts.length > 0) {
        console.log(`[DATABASE] Seeding ${memoryContracts.length} contracts into PostgreSQL...`);
        for (const c of memoryContracts) {
          await prisma.contract.create({
            data: {
              id: c.id,
              hotelId: c.hotelId,
              contractDate: c.contractDate || c.contractDateFrom || '',
              contractDateFrom: c.contractDateFrom || c.contractDate || '',
              contractDateTo: c.contractDateTo || c.contractDate || '',
              receptionDate: c.receptionDate,
              entryStatus: c.entryStatus as EntryStatus,
              paymentTerms: c.paymentTerms || '',
              fileName: c.fileName || null,
              filePath: c.filePath || null,
              fileType: c.fileType || null,
              fileSize: c.fileSize || null,
              storageType: c.storageType || 'LOCAL',
              gcsBucket: c.gcsBucket || null,
              gcsKey: c.gcsKey || null,
              createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
              updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
            },
          });
        }
      }

      // Synchronize PostgreSQL autoincrement sequence counters with current MAX(id)
      try {
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;`);
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('hotels', 'id'), COALESCE(MAX(id), 1)) FROM hotels;`);
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('contracts', 'id'), COALESCE(MAX(id), 1)) FROM contracts;`);
      } catch (seqErr) {
        // Non-fatal if database engine or schema differences prevent sequence update
      }

      console.log('[DATABASE] PostgreSQL database ready and synced.');
    } catch (err) {
      console.warn('[DATABASE] PostgreSQL connection failed or database not reachable.');
      console.warn('[DATABASE] Operating in resilient file-backed mode (data/*.json). Error:', (err as any)?.message || err);
      isPostgresConnected = false;
    }
  } else {
    console.log('[DATABASE] No DATABASE_URL configured. Operating in persistent local file mode (data/*.json).');
    isPostgresConnected = false;
  }

  databaseInitialized = true;
  return isPostgresConnected;
}

export function isUsingPostgres(): boolean {
  return isPostgresConnected;
}

// ----------------------------------------------------
// USER REPOSITORY
// ----------------------------------------------------
export async function getUsers(): Promise<DbUser[]> {
  if (isPostgresConnected) {
    try {
      const records = await executePrisma(() =>
        prisma.user.findMany({
          orderBy: { id: 'asc' },
        })
      );
      return records.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as 'ADMIN' | 'AGENT_SAISIE',
        passwordHash: u.passwordHash,
        active: u.active,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      }));
    } catch (err) {
      console.error('[DATABASE] Error in getUsers:', err);
    }
  }
  return memoryUsers;
}

export async function getUserById(id: number): Promise<DbUser | null> {
  if (isPostgresConnected) {
    try {
      const u = await executePrisma(() => prisma.user.findUnique({ where: { id } }));
      if (!u) return null;
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as 'ADMIN' | 'AGENT_SAISIE',
        passwordHash: u.passwordHash,
        active: u.active,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('[DATABASE] Error in getUserById:', err);
    }
  }
  return memoryUsers.find((u) => u.id === id) || null;
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const normEmail = email.trim().toLowerCase();
  if (isPostgresConnected) {
    try {
      const u = await executePrisma(() =>
        prisma.user.findFirst({
          where: { email: { equals: normEmail, mode: 'insensitive' } },
        })
      );
      if (!u) return null;
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role as 'ADMIN' | 'AGENT_SAISIE',
        passwordHash: u.passwordHash,
        active: u.active,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('[DATABASE] Error in getUserByEmail:', err);
    }
  }
  return memoryUsers.find((u) => u.email.toLowerCase() === normEmail) || null;
}

export async function createUser(data: {
  email: string;
  name: string;
  role: 'ADMIN' | 'AGENT_SAISIE';
  passwordHash: string;
  active?: boolean;
}): Promise<DbUser> {
  if (isPostgresConnected) {
    try {
      const created = await executePrisma(() =>
        prisma.user.create({
          data: {
            email: data.email.trim(),
            name: data.name.trim(),
            role: data.role as Role,
            passwordHash: data.passwordHash,
            active: data.active ?? true,
          },
        })
      );
      return {
        id: created.id,
        email: created.email,
        name: created.name,
        role: created.role as 'ADMIN' | 'AGENT_SAISIE',
        passwordHash: created.passwordHash,
        active: created.active,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('[DATABASE] Error in createUser:', err);
      throw err;
    }
  }

  const nextId = memoryUsers.length > 0 ? Math.max(...memoryUsers.map((u) => u.id)) + 1 : 1;
  const now = new Date().toISOString();
  const newUser: DbUser = {
    id: nextId,
    email: data.email.trim(),
    name: data.name.trim(),
    role: data.role,
    passwordHash: data.passwordHash,
    active: data.active ?? true,
    createdAt: now,
    updatedAt: now,
  };
  memoryUsers.push(newUser);
  writeJsonAtomic(USERS_FILE, memoryUsers);
  return newUser;
}

export async function updateUser(
  id: number,
  data: Partial<Omit<DbUser, 'id' | 'createdAt'>>
): Promise<DbUser | null> {
  if (isPostgresConnected) {
    try {
      const updated = await executePrisma(() =>
        prisma.user.update({
          where: { id },
          data: {
            ...(data.email ? { email: data.email.trim() } : {}),
            ...(data.name ? { name: data.name.trim() } : {}),
            ...(data.role ? { role: data.role as Role } : {}),
            ...(data.passwordHash ? { passwordHash: data.passwordHash } : {}),
            ...(typeof data.active === 'boolean' ? { active: data.active } : {}),
          },
        })
      );
      return {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role as 'ADMIN' | 'AGENT_SAISIE',
        passwordHash: updated.passwordHash,
        active: updated.active,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('[DATABASE] Error in updateUser:', err);
      return null;
    }
  }

  const user = memoryUsers.find((u) => u.id === id);
  if (!user) return null;

  if (data.email) user.email = data.email.trim();
  if (data.name) user.name = data.name.trim();
  if (data.role) user.role = data.role;
  if (data.passwordHash) user.passwordHash = data.passwordHash;
  if (typeof data.active === 'boolean') user.active = data.active;
  user.updatedAt = new Date().toISOString();

  writeJsonAtomic(USERS_FILE, memoryUsers);
  return user;
}

export async function deleteUser(id: number): Promise<boolean> {
  if (isPostgresConnected) {
    try {
      await executePrisma(() => prisma.user.delete({ where: { id } }));
      return true;
    } catch (err) {
      console.error('[DATABASE] Error in deleteUser:', err);
      return false;
    }
  }

  const index = memoryUsers.findIndex((u) => u.id === id);
  if (index === -1) return false;
  memoryUsers.splice(index, 1);
  writeJsonAtomic(USERS_FILE, memoryUsers);
  return true;
}

// ----------------------------------------------------
// HOTEL REPOSITORY
// ----------------------------------------------------
export async function getHotels(): Promise<DbHotel[]> {
  if (isPostgresConnected) {
    try {
      const records = await executePrisma(() =>
        prisma.hotel.findMany({
          orderBy: { name: 'asc' },
        })
      );
      return records.map((h) => ({
        id: h.id,
        name: h.name,
        region: h.region,
        chain: h.chain,
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
      }));
    } catch (err) {
      console.error('[DATABASE] Error in getHotels:', err);
    }
  }
  return memoryHotels;
}

export async function getHotelById(id: number): Promise<DbHotel | null> {
  if (isPostgresConnected) {
    try {
      const h = await executePrisma(() => prisma.hotel.findUnique({ where: { id } }));
      if (!h) return null;
      return {
        id: h.id,
        name: h.name,
        region: h.region,
        chain: h.chain,
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('[DATABASE] Error in getHotelById:', err);
    }
  }
  return memoryHotels.find((h) => h.id === id) || null;
}

export async function findHotelByName(name: string): Promise<DbHotel | null> {
  const norm = name.trim().toLowerCase();
  if (isPostgresConnected) {
    try {
      const h = await executePrisma(() =>
        prisma.hotel.findFirst({
          where: { name: { equals: name.trim(), mode: 'insensitive' } },
        })
      );
      if (!h) return null;
      return {
        id: h.id,
        name: h.name,
        region: h.region,
        chain: h.chain,
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('[DATABASE] Error in findHotelByName:', err);
    }
  }
  return memoryHotels.find((h) => h.name.toLowerCase() === norm) || null;
}

export async function createHotel(data: {
  name: string;
  region: string;
  chain: string;
}): Promise<DbHotel> {
  if (isPostgresConnected) {
    try {
      const created = await executePrisma(() =>
        prisma.hotel.create({
          data: {
            name: data.name.trim(),
            region: data.region,
            chain: data.chain,
          },
        })
      );
      return {
        id: created.id,
        name: created.name,
        region: created.region,
        chain: created.chain,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('[DATABASE] Error in createHotel:', err);
      throw err;
    }
  }

  const nextId = memoryHotels.length > 0 ? Math.max(...memoryHotels.map((h) => h.id)) + 1 : 1;
  const now = new Date().toISOString();
  const newHotel: DbHotel = {
    id: nextId,
    name: data.name.trim(),
    region: data.region,
    chain: data.chain,
    createdAt: now,
    updatedAt: now,
  };
  memoryHotels.push(newHotel);
  writeJsonAtomic(HOTELS_FILE, memoryHotels);
  return newHotel;
}

export async function updateHotel(
  id: number,
  data: Partial<Omit<DbHotel, 'id' | 'createdAt'>>
): Promise<DbHotel | null> {
  if (isPostgresConnected) {
    try {
      const updated = await executePrisma(() =>
        prisma.hotel.update({
          where: { id },
          data: {
            ...(data.name ? { name: data.name.trim() } : {}),
            ...(data.region ? { region: data.region } : {}),
            ...(data.chain ? { chain: data.chain } : {}),
          },
        })
      );
      return {
        id: updated.id,
        name: updated.name,
        region: updated.region,
        chain: updated.chain,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('[DATABASE] Error in updateHotel:', err);
      return null;
    }
  }

  const hotel = memoryHotels.find((h) => h.id === id);
  if (!hotel) return null;

  if (data.name) hotel.name = data.name.trim();
  if (data.region) hotel.region = data.region;
  if (data.chain) hotel.chain = data.chain;
  hotel.updatedAt = new Date().toISOString();

  writeJsonAtomic(HOTELS_FILE, memoryHotels);
  return hotel;
}

// ----------------------------------------------------
// CONTRACT REPOSITORY
// ----------------------------------------------------
export async function getContracts(): Promise<DbContract[]> {
  if (isPostgresConnected) {
    try {
      const records = await executePrisma(() =>
        prisma.contract.findMany({
          orderBy: { id: 'desc' },
        })
      );
      return records.map((c) => ({
        id: c.id,
        hotelId: c.hotelId,
        contractDate: c.contractDate || undefined,
        contractDateFrom: c.contractDateFrom,
        contractDateTo: c.contractDateTo,
        receptionDate: c.receptionDate,
        entryStatus: c.entryStatus as 'SAISI' | 'XML' | 'NON_SAISI',
        paymentTerms: c.paymentTerms,
        fileName: c.fileName,
        filePath: c.filePath,
        fileType: c.fileType,
        fileSize: c.fileSize,
        storageType: c.storageType,
        gcsBucket: c.gcsBucket,
        gcsKey: c.gcsKey,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }));
    } catch (err) {
      console.error('[DATABASE] Error in getContracts:', err);
    }
  }
  return memoryContracts;
}

export async function getContractById(id: number): Promise<DbContract | null> {
  if (isPostgresConnected) {
    try {
      const c = await executePrisma(() => prisma.contract.findUnique({ where: { id } }));
      if (!c) return null;
      return {
        id: c.id,
        hotelId: c.hotelId,
        contractDate: c.contractDate || undefined,
        contractDateFrom: c.contractDateFrom,
        contractDateTo: c.contractDateTo,
        receptionDate: c.receptionDate,
        entryStatus: c.entryStatus as 'SAISI' | 'XML' | 'NON_SAISI',
        paymentTerms: c.paymentTerms,
        fileName: c.fileName,
        filePath: c.filePath,
        fileType: c.fileType,
        fileSize: c.fileSize,
        storageType: c.storageType,
        gcsBucket: c.gcsBucket,
        gcsKey: c.gcsKey,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('[DATABASE] Error in getContractById:', err);
    }
  }
  return memoryContracts.find((c) => c.id === id) || null;
}

export async function createContract(data: {
  hotelId: number;
  contractDate?: string;
  contractDateFrom: string;
  contractDateTo: string;
  receptionDate: string;
  entryStatus: 'SAISI' | 'XML' | 'NON_SAISI';
  paymentTerms: string;
  fileName?: string | null;
  filePath?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  storageType?: string | null;
  gcsBucket?: string | null;
  gcsKey?: string | null;
}): Promise<DbContract> {
  if (isPostgresConnected) {
    try {
      const created = await executePrisma(() =>
        prisma.contract.create({
          data: {
            hotelId: data.hotelId,
            contractDate: data.contractDate || data.contractDateFrom,
            contractDateFrom: data.contractDateFrom,
            contractDateTo: data.contractDateTo,
            receptionDate: data.receptionDate,
            entryStatus: data.entryStatus as EntryStatus,
            paymentTerms: data.paymentTerms || '',
            fileName: data.fileName || null,
            filePath: data.filePath || null,
            fileType: data.fileType || null,
            fileSize: data.fileSize || null,
            storageType: data.storageType || 'LOCAL',
            gcsBucket: data.gcsBucket || null,
            gcsKey: data.gcsKey || null,
          },
        })
      );
      return {
        id: created.id,
        hotelId: created.hotelId,
        contractDate: created.contractDate || undefined,
        contractDateFrom: created.contractDateFrom,
        contractDateTo: created.contractDateTo,
        receptionDate: created.receptionDate,
        entryStatus: created.entryStatus as 'SAISI' | 'XML' | 'NON_SAISI',
        paymentTerms: created.paymentTerms,
        fileName: created.fileName,
        filePath: created.filePath,
        fileType: created.fileType,
        fileSize: created.fileSize,
        storageType: created.storageType,
        gcsBucket: created.gcsBucket,
        gcsKey: created.gcsKey,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('[DATABASE] Error in createContract:', err);
      throw err;
    }
  }

  const nextId = memoryContracts.length > 0 ? Math.max(...memoryContracts.map((c) => c.id)) + 1 : 1;
  const now = new Date().toISOString();
  const newContract: DbContract = {
    id: nextId,
    hotelId: data.hotelId,
    contractDate: data.contractDate || data.contractDateFrom,
    contractDateFrom: data.contractDateFrom,
    contractDateTo: data.contractDateTo,
    receptionDate: data.receptionDate,
    entryStatus: data.entryStatus,
    paymentTerms: data.paymentTerms || '',
    fileName: data.fileName,
    filePath: data.filePath,
    fileType: data.fileType,
    fileSize: data.fileSize,
    storageType: data.storageType || 'LOCAL',
    gcsBucket: data.gcsBucket,
    gcsKey: data.gcsKey,
    createdAt: now,
    updatedAt: now,
  };
  memoryContracts.push(newContract);
  writeJsonAtomic(CONTRACTS_FILE, memoryContracts);
  return newContract;
}

export async function updateContract(
  id: number,
  data: Partial<Omit<DbContract, 'id' | 'createdAt'>>
): Promise<DbContract | null> {
  if (isPostgresConnected) {
    try {
      const updateData: any = {};
      if (data.hotelId !== undefined) updateData.hotelId = data.hotelId;
      if (data.contractDate !== undefined) updateData.contractDate = data.contractDate;
      if (data.contractDateFrom !== undefined) updateData.contractDateFrom = data.contractDateFrom;
      if (data.contractDateTo !== undefined) updateData.contractDateTo = data.contractDateTo;
      if (data.receptionDate !== undefined) updateData.receptionDate = data.receptionDate;
      if (data.entryStatus !== undefined) updateData.entryStatus = data.entryStatus as EntryStatus;
      if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
      if (data.fileName !== undefined) updateData.fileName = data.fileName;
      if (data.filePath !== undefined) updateData.filePath = data.filePath;
      if (data.fileType !== undefined) updateData.fileType = data.fileType;
      if (data.fileSize !== undefined) updateData.fileSize = data.fileSize;
      if (data.storageType !== undefined) updateData.storageType = data.storageType;
      if (data.gcsBucket !== undefined) updateData.gcsBucket = data.gcsBucket;
      if (data.gcsKey !== undefined) updateData.gcsKey = data.gcsKey;

      const updated = await executePrisma(() =>
        prisma.contract.update({
          where: { id },
          data: updateData,
        })
      );

      return {
        id: updated.id,
        hotelId: updated.hotelId,
        contractDate: updated.contractDate || undefined,
        contractDateFrom: updated.contractDateFrom,
        contractDateTo: updated.contractDateTo,
        receptionDate: updated.receptionDate,
        entryStatus: updated.entryStatus as 'SAISI' | 'XML' | 'NON_SAISI',
        paymentTerms: updated.paymentTerms,
        fileName: updated.fileName,
        filePath: updated.filePath,
        fileType: updated.fileType,
        fileSize: updated.fileSize,
        storageType: updated.storageType,
        gcsBucket: updated.gcsBucket,
        gcsKey: updated.gcsKey,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('[DATABASE] Error in updateContract:', err);
      return null;
    }
  }

  const contract = memoryContracts.find((c) => c.id === id);
  if (!contract) return null;

  if (data.hotelId !== undefined) contract.hotelId = data.hotelId;
  if (data.contractDate !== undefined) contract.contractDate = data.contractDate;
  if (data.contractDateFrom !== undefined) contract.contractDateFrom = data.contractDateFrom;
  if (data.contractDateTo !== undefined) contract.contractDateTo = data.contractDateTo;
  if (data.receptionDate !== undefined) contract.receptionDate = data.receptionDate;
  if (data.entryStatus !== undefined) contract.entryStatus = data.entryStatus;
  if (data.paymentTerms !== undefined) contract.paymentTerms = data.paymentTerms;
  if (data.fileName !== undefined) contract.fileName = data.fileName;
  if (data.filePath !== undefined) contract.filePath = data.filePath;
  if (data.fileType !== undefined) contract.fileType = data.fileType;
  if (data.fileSize !== undefined) contract.fileSize = data.fileSize;
  if (data.storageType !== undefined) contract.storageType = data.storageType;
  if (data.gcsBucket !== undefined) contract.gcsBucket = data.gcsBucket;
  if (data.gcsKey !== undefined) contract.gcsKey = data.gcsKey;
  contract.updatedAt = new Date().toISOString();

  writeJsonAtomic(CONTRACTS_FILE, memoryContracts);
  return contract;
}

export async function deleteContract(id: number): Promise<DbContract | null> {
  if (isPostgresConnected) {
    try {
      const deleted = await executePrisma(() => prisma.contract.delete({ where: { id } }));
      return {
        id: deleted.id,
        hotelId: deleted.hotelId,
        contractDate: deleted.contractDate || undefined,
        contractDateFrom: deleted.contractDateFrom,
        contractDateTo: deleted.contractDateTo,
        receptionDate: deleted.receptionDate,
        entryStatus: deleted.entryStatus as 'SAISI' | 'XML' | 'NON_SAISI',
        paymentTerms: deleted.paymentTerms,
        fileName: deleted.fileName,
        filePath: deleted.filePath,
        fileType: deleted.fileType,
        fileSize: deleted.fileSize,
        storageType: deleted.storageType,
        gcsBucket: deleted.gcsBucket,
        gcsKey: deleted.gcsKey,
        createdAt: deleted.createdAt.toISOString(),
        updatedAt: deleted.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('[DATABASE] Error in deleteContract:', err);
      return null;
    }
  }

  const index = memoryContracts.findIndex((c) => c.id === id);
  if (index === -1) return null;
  const [removed] = memoryContracts.splice(index, 1);
  writeJsonAtomic(CONTRACTS_FILE, memoryContracts);
  return removed;
}
