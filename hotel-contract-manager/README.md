# Hotel Contract Manager

Plateforme interne de centralisation, saisie et suivi des contrats hôteliers pour les agents d'agence de voyage.

---

## Structure du Projet

```
hotel-contract-manager/
├── backend/
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/com/travelagency/contractmanager/
│       │   │   ├── HotelContractManagerApplication.java
│       │   │   ├── domain/
│       │   │   │   ├── enums/
│       │   │   │   │   ├── Region.java       (13 régions fixes)
│       │   │   │   │   ├── Chain.java        (17 chaînes fixes)
│       │   │   │   │   └── EntryStatus.java  (SAISI, XML, NON_SAISI)
│       │   │   │   └── model/
│       │   │   │       ├── Hotel.java        (Entité Hotel)
│       │   │   │       └── Contract.java     (Entité Contract, 1 -> N)
│       │   │   ├── repository/
│       │   │   │   ├── HotelRepository.java
│       │   │   │   └── ContractRepository.java (Recherches & Filtres indexés)
│       │   │   └── config/
│       │   │       └── DataInitializer.java (Initialisation des données de démo)
│       │   └── resources/
│       │       ├── application.properties
│       │       ├── schema-mysql.sql          (Script DDL MySQL avec index)
│       │       └── data-mysql.sql            (Script DML données de test démo)
│       └── test/
│           ├── java/com/travelagency/contractmanager/
│           │   └── DatabaseModelTest.java    (Tests d'intégration JPA et relations)
│           └── resources/
│               └── application.properties    (Base de test H2 in-memory MySQL mode)
└── README.md
```

---

## Modèle de Données (Phase 2)

### 1. Entité `Hotel`
* `id` : Identifiant unique auto-incrémenté (`BIGINT`).
* `name` : Nom de l'hôtel (non unique car un même hôtel peut avoir des contrats pour différentes saisons ou années).
* `region` : Énumération parmi les 13 régions officielles.
* `chain` : Énumération parmi les 17 chaînes officielles.
* `createdAt` / `updatedAt` : Horodatages automatiques.
* `contracts` : Relation 1 → N vers `Contract`.

### 2. Entité `Contract`
* `id` : Identifiant unique auto-incrémenté (`BIGINT`).
* `hotel` : Référence vers l'hôtel associé (`@ManyToOne`, clé étrangère `hotel_id`).
* `contractDate` : Date du contrat (`LocalDate`).
* `receptionDate` : Date de réception du contrat par l'agence (`LocalDate`).
* `entryStatus` : Statut de saisie (`SAISI`, `XML`, `NON_SAISI`).
* `paymentTerms` : Conditions de paiement (`TEXT`).
* `fileName`, `filePath`, `fileType`, `fileSize` : Métadonnées du fichier joint.
* `createdAt` / `updatedAt` : Horodatages automatiques.

### 3. Énumérations Immuables
* **Régions (13)** : `HAMMAMET`, `MAHDIA`, `SOUSSE`, `MONASTIR`, `DJERBA`, `SFAX`, `TUNIS`, `TABARKA`, `DOUZ`, `TOZEUR`, `BIZERTE`, `KAIROUAN`, `DIVERS`.
* **Chaînes (17)** : `IBEROSTAR`, `EL_MOURADI`, `BHR`, `KHAYAM`, `MARHABA`, `AZUR`, `VINCCI`, `TMK`, `HASDRUBAL`, `TTS`, `MEDINA`, `MAGIC_LIFE`, `THALASSA`, `MZABI`, `CONCORDE`, `SHT`, `INDEPENDANT`.
* **Statuts (3)** : `SAISI` (Badge vert ✓), `XML` (Badge bleu), `NON_SAISI` (Badge rouge).

### 4. Index de Performance
* Index `hotels` : `region`, `chain`, `name`.
* Index `contracts` : `hotel_id`, `entry_status`, `reception_date`, `contract_date`.

---

## Données de Test (Démo)

Des données de démonstration clairement identifiables sont incluses :
* **Hotel Demo Hammamet** (Région : HAMMAMET, Chaîne : IBEROSTAR)
  * Contrat 1 : Statut **SAISI** (Date réception : 2026-01-18, Fichier : `contrat_demo_iberostar_hammamet_2026.pdf`)
  * Contrat 2 : Statut **XML** (Date réception : 2026-02-03, Fichier : `flux_xml_demo_iberostar_2026.xml`)
* **Hotel Demo Sousse** (Région : SOUSSE, Chaîne : MARHABA)
  * Contrat 1 : Statut **NON_SAISI** (Date réception : 2026-03-12, Fichier : `contrat_demo_marhaba_sousse_draft.pdf`)
* **Hotel Demo Djerba** (Région : DJERBA, Chaîne : HASDRUBAL)
  * Contrat 1 : Statut **SAISI** (Date réception : 2026-01-22, Fichier : `contrat_demo_hasdrubal_djerba_2026.pdf`)
  * Contrat 2 : Statut **NON_SAISI** (Date réception : 2026-04-07, Sans fichier)

---

## Commandes d'Exécution & Tests

### 1. Lancer les tests unitaires et d'intégration :
```bash
cd backend
mvn test
```

### 2. Démarrer le backend avec MySQL :
1. Assurez-vous que MySQL est démarré et que la base de données existe :
   ```sql
   CREATE DATABASE hotel_contract_manager CHARACTER SET utf8mb4;
   ```
2. Configurez vos identifiants dans `application.properties` ou via variables d'environnement :
   ```bash
   export SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/hotel_contract_manager
   export SPRING_DATASOURCE_USERNAME=root
   export SPRING_DATASOURCE_PASSWORD=votre_mot_de_passe
   ```
3. Démarrez l'application :
   ```bash
   mvn spring-boot:run
   ```

---

## Interface Utilisateur & Connexion API (Phase 4)

L'interface web moderne, rapide et responsive a été connectée aux endpoints de l'API REST (`/api/contracts` et `/api/hotels`).

### 1. Menu Principal
* **Dashboard** : Indicateurs temps réel (total contrats, contrats urgents à saisir, saisis validés, flux XML), répartition géographique par région et alertes.
* **Contrats** (`/contracts`) : Registre complet avec filtrage multicritères, recherche textuelle et tableau de bord opérationnel.
* **À saisir** : Accès direct filtré sur les contrats au statut `NON_SAISI` pour un traitement prioritaire.
* **Hôtels** : Répertoire centralisé des établissements par chaîne et région avec décompte des contrats rattachés.

### 2. Tableau Professionnel des Contrats
* **Colonnes** : Hôtel, Région, Chaîne, Date contrat, Date réception, Saisie, Paiement, Contrat, Actions.
* **Badges de Statut** :
  * `SAISI` → coche verte (`✓ Saisi`, bordure et fond émeraude).
  * `XML` → badge bleu (`XML`, icône flux).
  * `NON_SAISI` → badge rouge (`Non Saisi`, fond rose/rouge).
* **Actions rapides** : Bascule de statut en un clic pour une saisie accélérée par les agents.

### 3. Formulaire d'Ajout et d'Édition ("+ Ajouter un contrat")
* Champs conformes : Région (13), Chaîne (17), Nom hôtel, Date contrat, Date réception (par défaut à aujourd'hui), État de saisie, Modalités de paiement (avec modèles prédéfinis), Fichier contrat (prêt pour la Phase 5).
* Validation en temps réel côté client et traitement exhaustif des retours d'erreurs API (HTTP 400 Bad Request, HTTP 404 Not Found).

