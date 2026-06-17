# Spécifications Techniques et Fonctionnelles — Espace Client ELYKIA (v1.0)

## 📋 Vue d'Ensemble
L'Espace Client ELYKIA est un nouveau module intégré à l'application mobile existante (Angular + Ionic + Capacitor). Il permet aux clients finaux de consulter leurs achats à crédit, de suivre l'état de leurs recouvrements, d'effectuer des paiements via Mobile Money (processus manuel pour la v1), et de passer de nouvelles commandes. L'objectif est d'offrir une expérience fluide et autonome, réduisant la charge opérationnelle des agences.

## 🎯 Périmètre Fonctionnel

### 1. Authentification
- Connexion via numéro de téléphone et code PIN (S-01, S-02).
- Maintien de session sécurisé.

### 2. Tableau de Bord (Home)
- Vue synthétique du crédit en cours (S-03).
- Barre de progression du remboursement global.
- Actions rapides : Payer, Commander, Historique.

### 3. Gestion des Achats et Recouvrements
- **Historique** : Liste filtrée des achats passés et en cours (S-04).
- **Détail Achat** : Vue des articles, montants, et statuts (S-05).
- **Timeline Recouvrements** : Suivi visuel des mises (S-06).
  - Pastilles numérotées (1 à 31) avec code couleur strict :
    - **Vert** : Validé (confirmé par l'agence).
    - **Orange** : Initié (en attente de validation).
    - **Rouge** : Retard.
    - **Gris** : Restant (à venir).

### 4. Paiement Mobile Money (v1 Manuelle)
- Saisie manuelle par le client après transfert Mobile Money (S-07).
- Champs requis : Numéro d'envoi, Montant envoyé, Référence du transfert.
- Création du recouvrement à l'état `INITIÉ` (S-08).
- Le statut passe à `VALIDÉ` uniquement après action d'un agent dans le back-office.

### 5. Nouvelle Commande
- **Catalogue** : Liste des articles avec recherche et filtrage par catégorie (S-09).
- **Panier** : Gestion des quantités et résumé financier (S-10).
- **Soumission** : Commande créée à l'état `INITIÉ` (S-11).
- Le crédit ne démarre qu'après validation de l'agence et livraison effective (`LIVRÉ`).

## 📐 Architecture Technique

### 1. Intégration au Code Base Existant
Le module est intégré directement dans le monorepo existant `mobile/src/app/features/customer-space/`.
L'application cible une base de code unique (Angular + Ionic) compilée pour Android (via Capacitor) et Web.

### 2. Structure des Dossiers
```
mobile/src/app/features/customer-space/
├── components/          # Composants UI réutilisables (bottom-nav, recovery-pills, etc.)
├── pages/               # Écrans routables (auth, dashboard, purchases, payment, catalog)
├── services/            # Appels API spécifiques à l'espace client
├── models/              # Interfaces TypeScript (si différentes du core)
├── guards/              # Protection des routes (CustomerAuthGuard)
└── store/               # Gestion d'état NgRx (actions, reducers, effects, selectors)
```

### 3. Modèles de Données Impliqués
- `Client` : Utilisateur connecté.
- `Order` / `Distribution` : Achats à crédit.
- `Recovery` : Mises de recouvrement (avec ajout du statut `INITIÉ`).
- `Article` : Produits du catalogue.

### 4. API (Contrats)
De nouveaux endpoints (ou adaptation des existants) seront nécessaires :
- `POST /api/customer/auth/login`
- `GET /api/customer/dashboard`
- `GET /api/customer/distributions`
- `POST /api/customer/recoveries` (Création avec statut `INITIÉ`)
- `GET /api/customer/articles`
- `POST /api/customer/orders` (Création avec statut `INITIÉ`)

## 🎨 Design System et UI/UX

### 1. Principes
- **Mobile-First** : Optimisation prioritaire pour les écrans mobiles (390px).
- **Esthétique** : Moderne, épurée, type SaaS Premium.

### 2. Typographie
- Titres : **Playfair Display** (700).
- Corps de texte : **DM Sans** (300, 400, 500, 600).

### 3. Palette de Couleurs
- Primaire : Navy (`#0D1B2A`), Navy Mid (`#1A2E42`).
- Secondaire : Gold (`#C9922A`), Gold Light (`#F0C66A`).
- Fond : Cream (`#FAF6EE`), White (`#FFFFFF`), Gray BG (`#F1F4F8`).
- Statuts : Vert (`#22C55E`), Orange (`#F97316`), Rouge (`#EF4444`), Gris (`#94A3B8`).

### 4. Composants Clés
- **Cartes** : Fond blanc, border-radius 16px, ombre douce (`0 4px 24px rgba(13,27,42,0.10)`).
- **Boutons** : Pleine largeur, arrondis.
- **Bottom Navigation** : 5 onglets (Home, Achats, Commandes, Paiements, Profil).

## 🚀 Plan de Déploiement et Prochaines Étapes
1. **Validation des Wireflows** : Validation par le Product Owner (Francis AHONSU).
2. **Développement Frontend** : Intégration des composants UI et des pages dans Angular/Ionic.
3. **Développement Backend** : Implémentation des endpoints API sécurisés pour le rôle client.
4. **Tests E2E** : Validation des parcours avec Playwright.
5. **Déploiement** : Release via le pipeline CI/CD existant (GitHub Actions).

---
*Auteur : Francis AHONSU*
