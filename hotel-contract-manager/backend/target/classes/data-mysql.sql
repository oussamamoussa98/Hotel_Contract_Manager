-- ==============================================================================
-- Hotel Contract Manager - MySQL Demo Test Data
-- Clearly identifiable demo data (Not real business data)
-- ==============================================================================

USE `hotel_contract_manager`;

-- 1. Insert Demo Hotels
INSERT INTO `hotels` (`id`, `name`, `region`, `chain`, `created_at`, `updated_at`) VALUES
(1, 'Hotel Demo Hammamet', 'HAMMAMET', 'IBEROSTAR', NOW(), NOW()),
(2, 'Hotel Demo Sousse', 'SOUSSE', 'MARHABA', NOW(), NOW()),
(3, 'Hotel Demo Djerba', 'DJERBA', 'HASDRUBAL', NOW(), NOW());

-- 2. Insert Demo Contracts (Covering SAISI, XML, NON_SAISI)
INSERT INTO `contracts` 
(`id`, `hotel_id`, `contract_date`, `reception_date`, `entry_status`, `payment_terms`, `file_name`, `file_path`, `file_type`, `file_size`, `created_at`, `updated_at`) 
VALUES
-- Hotel Demo Hammamet - Contract 1 (SAISI)
(1, 1, '2026-01-15', '2026-01-18', 'SAISI', '30 jours fin de mois par virement bancaire', 'contrat_demo_iberostar_hammamet_2026.pdf', '/uploads/contracts/demo_hammamet_01.pdf', 'application/pdf', 1425000, NOW(), NOW()),

-- Hotel Demo Hammamet - Contract 2 (XML)
(2, 1, '2026-02-01', '2026-02-03', 'XML', 'Paiement direct à la réservation via passerelle de flux XML', 'flux_xml_demo_iberostar_2026.xml', '/uploads/contracts/demo_hammamet_02.xml', 'application/xml', 320000, NOW(), NOW()),

-- Hotel Demo Sousse - Contract 1 (NON_SAISI)
(3, 2, '2026-03-10', '2026-03-12', 'NON_SAISI', 'Acompte 20% à la confirmation de l allotment, solde 15 jours avant arrivée', 'contrat_demo_marhaba_sousse_draft.pdf', '/uploads/contracts/demo_sousse_01.pdf', 'application/pdf', 2150000, NOW(), NOW()),

-- Hotel Demo Djerba - Contract 1 (SAISI)
(4, 3, '2026-01-20', '2026-01-22', 'SAISI', 'Règlement bimensuel après réception des factures conformes', 'contrat_demo_hasdrubal_djerba_2026.pdf', '/uploads/contracts/demo_djerba_01.pdf', 'application/pdf', 1850000, NOW(), NOW()),

-- Hotel Demo Djerba - Contract 2 (NON_SAISI)
(5, 3, '2026-04-05', '2026-04-07', 'NON_SAISI', 'En attente de validation des conditions spéciales par la direction financière', NULL, NULL, NULL, NULL, NOW(), NOW());
