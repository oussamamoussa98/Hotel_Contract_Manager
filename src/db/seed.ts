import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), 'data');

async function seed() {
  console.log('--- Starting Database Seed from existing JSON data ---');

  // 1. Seed Users
  const usersPath = path.join(DATA_DIR, 'users.json');
  if (fs.existsSync(usersPath)) {
    const raw = fs.readFileSync(usersPath, 'utf-8');
    const users = JSON.parse(raw);
    console.log(`Found ${users.length} users to seed...`);

    for (const u of users) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: {}, // SAFE: Never overwrite existing production user data
        create: {
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          passwordHash: u.passwordHash,
          active: u.active ?? true,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
        },
      });
    }
    console.log('✓ Users seeded successfully.');
  }

  // 2. Seed Hotels
  const hotelsPath = path.join(DATA_DIR, 'hotels.json');
  if (fs.existsSync(hotelsPath)) {
    const raw = fs.readFileSync(hotelsPath, 'utf-8');
    const hotels = JSON.parse(raw);
    console.log(`Found ${hotels.length} hotels to seed...`);

    for (const h of hotels) {
      await prisma.hotel.upsert({
        where: { id: h.id },
        update: {}, // SAFE: Never overwrite existing production hotel data
        create: {
          id: h.id,
          name: h.name,
          region: h.region,
          chain: h.chain,
          createdAt: h.createdAt ? new Date(h.createdAt) : new Date(),
          updatedAt: h.updatedAt ? new Date(h.updatedAt) : new Date(),
        },
      });
    }
    console.log('✓ Hotels seeded successfully.');
  }

  // 3. Seed Contracts
  const contractsPath = path.join(DATA_DIR, 'contracts.json');
  if (fs.existsSync(contractsPath)) {
    const raw = fs.readFileSync(contractsPath, 'utf-8');
    const contracts = JSON.parse(raw);
    console.log(`Found ${contracts.length} contracts to seed...`);

    for (const c of contracts) {
      await prisma.contract.upsert({
        where: { id: c.id },
        update: {}, // SAFE: Never overwrite existing production contract data
        create: {
          id: c.id,
          hotelId: c.hotelId,
          contractDate: c.contractDate || c.contractDateFrom || '',
          contractDateFrom: c.contractDateFrom || c.contractDate || '',
          contractDateTo: c.contractDateTo || c.contractDate || '',
          receptionDate: c.receptionDate,
          entryStatus: c.entryStatus,
          paymentTerms: c.paymentTerms || '',
          fileName: c.fileName || null,
          filePath: c.filePath || null,
          fileType: c.fileType || null,
          fileSize: c.fileSize || null,
          storageType: 'LOCAL',
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
          updatedAt: c.updatedAt ? new Date(c.updatedAt) : new Date(),
        },
      });
    }
    console.log('✓ Contracts seeded successfully.');
  }

  // Synchronize PostgreSQL sequences
  try {
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE(MAX(id), 1)) FROM users;`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('hotels', 'id'), COALESCE(MAX(id), 1)) FROM hotels;`);
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('contracts', 'id'), COALESCE(MAX(id), 1)) FROM contracts;`);
    console.log('✓ PostgreSQL auto-increment sequences synchronized.');
  } catch (seqErr) {
    // Non-fatal if sequences differ
  }

  console.log('--- Database seeding completed successfully ---');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
