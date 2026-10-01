-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'AGENT_SAISIE');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('SAISI', 'XML', 'NON_SAISI');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'AGENT_SAISIE',
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" SERIAL NOT NULL,
    "hotelId" INTEGER NOT NULL,
    "contractDate" TEXT,
    "contractDateFrom" TEXT NOT NULL,
    "contractDateTo" TEXT NOT NULL,
    "receptionDate" TEXT NOT NULL,
    "entryStatus" "EntryStatus" NOT NULL DEFAULT 'NON_SAISI',
    "paymentTerms" TEXT NOT NULL DEFAULT '',
    "fileName" TEXT,
    "filePath" TEXT,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "storageType" TEXT NOT NULL DEFAULT 'LOCAL',
    "gcsBucket" TEXT,
    "gcsKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "contracts_hotelId_idx" ON "contracts"("hotelId");

-- CreateIndex
CREATE INDEX "contracts_entryStatus_idx" ON "contracts"("entryStatus");

-- CreateIndex
CREATE INDEX "contracts_receptionDate_idx" ON "contracts"("receptionDate");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
