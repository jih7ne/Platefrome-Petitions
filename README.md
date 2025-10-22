# PLATEFORME DE PÉTITIONS

# A simple PHP & MySQL project that allows users to create, sign, and manage online petitions.

## TABLE SCHEMA

- Create these tables in order to use the APP

```sql
-- Base de données Petition
CREATE DATABASE IF NOT EXISTS petition_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE petition_db;

-- Table Utilisateurs
CREATE TABLE IF NOT EXISTS Utilisateur (
    IDU INT AUTO_INCREMENT PRIMARY KEY,
    Email VARCHAR(255) UNIQUE NOT NULL,
    MotDePasse VARCHAR(255) NOT NULL,
    Nom VARCHAR(100) NOT NULL,
    Prenom VARCHAR(100) NOT NULL,
    DateInscription DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table Petition
CREATE TABLE IF NOT EXISTS Petition (
    IDP INT AUTO_INCREMENT PRIMARY KEY,
    TitreP VARCHAR(255) NOT NULL,
    DescriptionP TEXT NOT NULL,
    DateAjoutP DATETIME DEFAULT CURRENT_TIMESTAMP,
    DateFinP DATE,
    NomPorteurP VARCHAR(100) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    IDU INT,
    FOREIGN KEY (IDU) REFERENCES Utilisateur(IDU) ON DELETE SET NULL
);

-- Table Signature
CREATE TABLE IF NOT EXISTS Signature (
    IDS INT AUTO_INCREMENT PRIMARY KEY,
    IDP INT NOT NULL,
    NomS VARCHAR(100) NOT NULL,
    PrenomS VARCHAR(100) NOT NULL,
    PaysS VARCHAR(100) NOT NULL,
    DateS DATETIME DEFAULT CURRENT_TIMESTAMP,
    HeureS TIME DEFAULT (CURRENT_TIME),
    EmailS VARCHAR(255) NOT NULL,
    FOREIGN KEY (IDP) REFERENCES Petition(IDP) ON DELETE CASCADE
);


-- Données de test
INSERT INTO Utilisateur (Email, MotDePasse, Nom, Prenom) VALUES
('admin@petition.ma', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'Système'),
('user@example.ma', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Utilisateur', 'Test');
-- Mot de passe: password

INSERT INTO Petition (TitreP, DescriptionP, DateFinP, NomPorteurP, Email, IDU) VALUES
('Pour un campus plus vert', 'Nous demandons la plantation de plus d\'arbres et la mise en place de poubelles de tri sélectif dans tout le campus universitaire.', '2025-12-31', 'Ahmed Bennani', 'ahmed.b@ensa.ma', 1),
('Amélioration de la connexion WiFi', 'Pétition pour améliorer la qualité et la couverture du réseau WiFi dans les bâtiments académiques.', '2025-11-30', 'Fatima Alaoui', 'fatima.a@ensa.ma', 1),
('Extension des heures de bibliothèque', 'Demande d\'extension des horaires d\'ouverture de la bibliothèque jusqu\'à 22h en période d\'examens.', '2025-10-31', 'Youssef Tahiri', 'youssef.t@ensa.ma', 2);

INSERT INTO Signature (IDP, NomS, PrenomS, PaysS, EmailS) VALUES
(1, 'El Amrani', 'Sara', 'Maroc', 'sara.e@gmail.com'),
(1, 'Benkirane', 'Omar', 'Maroc', 'omar.b@gmail.com'),
(1, 'Chakir', 'Meryem', 'Maroc', 'meryem.c@gmail.com'),
(2, 'Tazi', 'Karim', 'Maroc', 'karim.t@gmail.com'),
(2, 'Fassi', 'Leila', 'Maroc', 'leila.f@gmail.com'),
(3, 'Benjelloun', 'Hamza', 'Maroc', 'hamza.b@gmail.com');

```

## Environment Variables

- Create a .env file in the root of the project
- Define the following varibles

```dotenv
DB_HOST=localhost
DB_NAME=petition_db
DB_USER=root
DB_PASS=
PORT=3306
SESSION_LIFETIME=3600
APP_ENV=development
APP_DEBUG=true

```
