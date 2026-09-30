-- ==============================================================================
-- Hotel Contract Manager - MySQL DDL Schema
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `hotel_contract_manager`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `hotel_contract_manager`;

-- ------------------------------------------------------------------------------
-- Table: hotels
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hotels` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(150) NOT NULL,
    `region` VARCHAR(50) NOT NULL,
    `chain` VARCHAR(50) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Performance Indexes for filtering and searching
    INDEX `idx_hotels_region` (`region`),
    INDEX `idx_hotels_chain` (`chain`),
    INDEX `idx_hotels_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- Table: contracts
-- Relationship: Hotel 1 -> N Contracts
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `contracts` (
    `id` BIGINT AUTO_INCREMENT PRIMARY KEY,
    `hotel_id` BIGINT NOT NULL,
    `contract_date` DATE NOT NULL,
    `reception_date` DATE NOT NULL,
    `entry_status` VARCHAR(30) NOT NULL DEFAULT 'NON_SAISI',
    `payment_terms` TEXT,
    `file_name` VARCHAR(255),
    `file_path` VARCHAR(500),
    `file_type` VARCHAR(100),
    `file_size` BIGINT,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign Key Constraint (Cascade delete when hotel is deleted)
    CONSTRAINT `fk_contracts_hotel` 
        FOREIGN KEY (`hotel_id`) 
        REFERENCES `hotels` (`id`) 
        ON DELETE CASCADE,

    -- Performance Indexes for search and query filtering
    INDEX `idx_contracts_hotel_id` (`hotel_id`),
    INDEX `idx_contracts_entry_status` (`entry_status`),
    INDEX `idx_contracts_reception_date` (`reception_date`),
    INDEX `idx_contracts_contract_date` (`contract_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
