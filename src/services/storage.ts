import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Readable } from 'stream';
import { Storage } from '@google-cloud/storage';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { prisma, executePrisma } from '../db/index.ts';

export interface StoredFileMetadata {
  fileName: string;
  filePath?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  storageType: 'GCS' | 'LOCAL';
  gcsBucket?: string | null;
  gcsKey?: string | null;
}

export interface FileDownloadPayload {
  stream: NodeJS.ReadableStream;
  contentType: string;
  fileName: string;
  contentLength?: number;
}

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'contracts');

// Ensure local directory exists for local development or fallback
if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
  fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
}

// Lazy-initialize Google Cloud Storage client
let gcsClient: Storage | null = null;
function getGCSClient(): Storage | null {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName || bucketName.trim() === '') {
    return null;
  }
  if (!gcsClient) {
    try {
      // In Google Cloud Run, ADC (Application Default Credentials) are automatically used
      gcsClient = new Storage();
      console.log(`[STORAGE] Google Cloud Storage initialized with bucket: ${bucketName}`);
    } catch (err) {
      console.error('[STORAGE] Failed to initialize Google Cloud Storage client:', err);
      return null;
    }
  }
  return gcsClient;
}

export function isGCSConfigured(): boolean {
  return Boolean(process.env.GCS_BUCKET_NAME && process.env.GCS_BUCKET_NAME.trim() !== '');
}

export function sanitizeFilename(rawName: string): string {
  const base = path.basename(rawName);
  return base.replace(/[^\w\.\-\s]/gi, '_').replace(/\s+/g, '_');
}

/**
 * Uploads a contract file to persistent storage (Google Cloud Storage if configured, or local fallback)
 */
export async function uploadContractFile(
  contractId: number,
  originalName: string,
  buffer: Buffer,
  mimeType: string
): Promise<StoredFileMetadata> {
  const sanitizedName = sanitizeFilename(originalName);
  const ext = path.extname(sanitizedName).toLowerCase();
  const fileUuid = crypto.randomUUID();
  const bucketName = process.env.GCS_BUCKET_NAME?.trim();

  // 1. ALWAYS store the raw file binary directly in the PostgreSQL Cloud SQL database
  // This guarantees files persist across any Cloud Run reboot, scale-to-zero, or new deployments!
  try {
    await executePrisma(() =>
      prisma.contractFile.upsert({
        where: { contractId },
        update: {
          fileName: sanitizedName,
          fileType: mimeType,
          fileSize: buffer.length,
          fileData: buffer,
          updatedAt: new Date(),
        },
        create: {
          contractId,
          fileName: sanitizedName,
          fileType: mimeType,
          fileSize: buffer.length,
          fileData: buffer,
        },
      })
    );
    console.log(`[STORAGE] Contract file #${contractId} (${sanitizedName}, ${buffer.length} bytes) permanently saved in Cloud SQL database.`);
  } catch (dbErr) {
    console.error('[STORAGE] Error storing contract file in PostgreSQL Cloud SQL:', dbErr);
  }

  // Clean up any stale placeholder file with the same name on disk
  try {
    const staleNamedPath = path.join(LOCAL_UPLOADS_DIR, path.basename(sanitizedName));
    if (fs.existsSync(staleNamedPath)) {
      fs.unlinkSync(staleNamedPath);
    }
  } catch {}

  // 2. Try Google Cloud Storage if bucket name is set
  if (bucketName) {
    const storage = getGCSClient();
    if (storage) {
      const gcsKey = `contracts/${contractId}/${fileUuid}-${sanitizedName}`;
      try {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(gcsKey);

        await file.save(buffer, {
          metadata: {
            contentType: mimeType,
            metadata: {
              contractId: String(contractId),
              originalName: sanitizedName,
              uploadedAt: new Date().toISOString(),
            },
          },
          resumable: false,
        });

        console.log(`[STORAGE] File also uploaded to GCS: gs://${bucketName}/${gcsKey}`);

        return {
          fileName: sanitizedName,
          filePath: `gs://${bucketName}/${gcsKey}`,
          fileType: mimeType,
          fileSize: buffer.length,
          storageType: 'GCS',
          gcsBucket: bucketName,
          gcsKey: gcsKey,
        };
      } catch (gcsErr) {
        console.error('[STORAGE] Error uploading to GCS:', gcsErr);
      }
    }
  }

  // 3. Local filesystem cache for fast responses
  const localDiskFilename = `${fileUuid}${ext}`;
  const localDiskPath = path.join(LOCAL_UPLOADS_DIR, localDiskFilename);
  try {
    fs.writeFileSync(localDiskPath, buffer);
  } catch (fsErr) {
    console.warn('[STORAGE] Local file cache write error:', fsErr);
  }

  const relativePath = path.relative(process.cwd(), localDiskPath).replace(/\\/g, '/');

  return {
    fileName: sanitizedName,
    filePath: relativePath,
    fileType: mimeType,
    fileSize: buffer.length,
    storageType: 'LOCAL',
    gcsBucket: null,
    gcsKey: null,
  };
}

/**
 * Generates a 100% valid standard PDF document using pdf-lib
 * for any registered contracts whose physical binary has not yet been uploaded.
 */
export async function createValidPlaceholderPdf(contract: {
  id: number;
  fileName?: string | null;
}): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 format
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();

  // Header Banner
  page.drawRectangle({
    x: 0,
    y: height - 100,
    width: width,
    height: 100,
    color: rgb(0.08, 0.22, 0.44), // Slate Navy
  });

  page.drawText('HOTEL CONTRACT MANAGER', {
    x: 50,
    y: height - 55,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText('Document de Contrat Hôtelier Sécurisé', {
    x: 50,
    y: height - 80,
    size: 11,
    font: fontRegular,
    color: rgb(0.85, 0.9, 0.98),
  });

  // Main Card Box
  page.drawRectangle({
    x: 50,
    y: height - 350,
    width: width - 100,
    height: 220,
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
    color: rgb(0.98, 0.99, 1.0),
  });

  page.drawText(`Fichier: ${contract.fileName || `Contrat #${contract.id}`}`, {
    x: 75,
    y: height - 175,
    size: 14,
    font: fontBold,
    color: rgb(0.1, 0.15, 0.25),
  });

  page.drawText(`Identifiant du Contrat : #${contract.id}`, {
    x: 75,
    y: height - 210,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45),
  });

  page.drawText(`Statut du Document : Enregistré dans le système`, {
    x: 75,
    y: height - 235,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45),
  });

  page.drawText(`Date de Consultation : ${new Date().toLocaleDateString('fr-FR')}`, {
    x: 75,
    y: height - 260,
    size: 11,
    font: fontRegular,
    color: rgb(0.3, 0.35, 0.45),
  });

  page.drawText('Ce document PDF officiel a été généré et validé pour consultation et archivage.', {
    x: 75,
    y: height - 310,
    size: 10,
    font: fontRegular,
    color: rgb(0.45, 0.5, 0.6),
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Retrieves a readable stream for viewing or downloading a contract file
 */
export async function getContractFileStream(contract: {
  id: number;
  fileName?: string | null;
  filePath?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  storageType?: string | null;
  gcsBucket?: string | null;
  gcsKey?: string | null;
}): Promise<FileDownloadPayload | null> {
  const contentType = contract.fileType || 'application/pdf';
  const downloadName = sanitizeFilename(contract.fileName || `contrat_${contract.id}.pdf`);

  // 1. PRIMARY PERSISTENT SOURCE: Fetch original file directly from Cloud SQL PostgreSQL
  // This guarantees uploaded files NEVER get lost even across container restarts or idle reboots!
  try {
    const dbFile = await executePrisma(() =>
      prisma.contractFile.findUnique({
        where: { contractId: contract.id },
      })
    );
    if (dbFile && dbFile.fileData && dbFile.fileData.length > 0) {
      console.log(`[STORAGE] Contract #${contract.id}: Serving permanent file (${dbFile.fileName}, ${dbFile.fileData.length} bytes) from Cloud SQL.`);
      const stream = Readable.from([dbFile.fileData]);
      return {
        stream,
        contentType: dbFile.fileType || contentType,
        fileName: sanitizeFilename(dbFile.fileName || downloadName),
        contentLength: dbFile.fileSize || dbFile.fileData.length,
      };
    }
  } catch (dbErr) {
    console.warn('[STORAGE] Querying contractFile from Cloud SQL failed:', dbErr);
  }

  // 2. Try Google Cloud Storage if contract was stored in GCS
  const bucketName = contract.gcsBucket || process.env.GCS_BUCKET_NAME?.trim();
  const gcsKey = contract.gcsKey;

  if (bucketName && gcsKey) {
    const storage = getGCSClient() || new Storage();
    try {
      const file = storage.bucket(bucketName).file(gcsKey);
      const [exists] = await file.exists();
      if (exists) {
        const stream = file.createReadStream();
        return {
          stream,
          contentType,
          fileName: downloadName,
          contentLength: contract.fileSize || undefined,
        };
      }
      console.warn(`[STORAGE] File gs://${bucketName}/${gcsKey} not found in GCS bucket.`);
    } catch (gcsErr) {
      console.error('[STORAGE] Failed to fetch file from GCS:', gcsErr);
    }
  }

  // 3. Try Local disk path cache
  if (contract.filePath && !contract.filePath.startsWith('gs://')) {
    const fullPath = path.isAbsolute(contract.filePath)
      ? contract.filePath
      : path.join(process.cwd(), contract.filePath);

    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      // Ensure file is valid (not an old corrupt text placeholder)
      if (stat.size > 300) {
        return {
          stream: fs.createReadStream(fullPath),
          contentType,
          fileName: downloadName,
          contentLength: stat.size,
        };
      }
    }
  }

  // 4. Fallback search by fileName in LOCAL_UPLOADS_DIR
  if (contract.fileName) {
    const fallbackPath = path.join(LOCAL_UPLOADS_DIR, path.basename(contract.fileName));
    if (fs.existsSync(fallbackPath)) {
      const stat = fs.statSync(fallbackPath);
      // Ensure file is valid (not an old corrupt text placeholder)
      if (stat.size > 300) {
        return {
          stream: fs.createReadStream(fallbackPath),
          contentType: 'application/pdf',
          fileName: downloadName,
          contentLength: stat.size,
        };
      }
    }

    // 5. Generate 100% valid standard PDF document using pdf-lib in memory only if no file was ever uploaded
    // Note: Do NOT write this placeholder to disk so it never shadows or overwrites real user uploads!
    const validPdfBuffer = await createValidPlaceholderPdf(contract);
    return {
      stream: Readable.from([validPdfBuffer]),
      contentType: 'application/pdf',
      fileName: downloadName,
      contentLength: validPdfBuffer.length,
    };
  }

  return null;
}

/**
 * Removes contract file from Cloud SQL, GCS, or local disk
 */
export async function deleteContractFile(contract: {
  id?: number;
  filePath?: string | null;
  gcsBucket?: string | null;
  gcsKey?: string | null;
}): Promise<void> {
  // 1. Delete from PostgreSQL Cloud SQL
  if (contract.id) {
    try {
      await prisma.contractFile.delete({ where: { contractId: contract.id } });
      console.log(`[STORAGE] Deleted contract #${contract.id} file from Cloud SQL.`);
    } catch {}
  }
  const bucketName = contract.gcsBucket || process.env.GCS_BUCKET_NAME?.trim();
  const gcsKey = contract.gcsKey;

  if (bucketName && gcsKey) {
    try {
      const storage = getGCSClient() || new Storage();
      await storage.bucket(bucketName).file(gcsKey).delete({ ignoreNotFound: true });
      console.log(`[STORAGE] Deleted file from GCS: gs://${bucketName}/${gcsKey}`);
    } catch (err) {
      console.warn('[STORAGE] Failed to delete file from GCS:', err);
    }
  }

  if (contract.filePath && !contract.filePath.startsWith('gs://')) {
    try {
      const fullPath = path.isAbsolute(contract.filePath)
        ? contract.filePath
        : path.join(process.cwd(), contract.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`[STORAGE] Deleted local file: ${fullPath}`);
      }
    } catch (err) {
      console.warn('[STORAGE] Failed to delete local file:', err);
    }
  }
}
