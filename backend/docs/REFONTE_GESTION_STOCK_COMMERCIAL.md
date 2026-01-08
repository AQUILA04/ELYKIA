# 📄 Documentation Technique : Refonte Gestion des Sorties & Stock Commercial

## 1. Contexte et Objectifs
L'objectif était de séparer la gestion des **sorties de stock magasin** (approvisionnement des commerciaux) de la gestion des **ventes aux clients** (distribution).
*   **Avant :** Les sorties étaient considérées comme des ventes à crédit (`Credit`) au commercial.
*   **Après :** Introduction d'entités dédiées pour gérer le cycle de vie des sorties, le suivi du stock mensuel par commercial, et les retours, tout en historisant les prix.

---

## 2. Backend (Java / Spring Boot)

### A. Nouvelles Entités (Modèle de Données)

1.  **`StockRequest` (Demande de Sortie)**
    *   Représente une demande d'approvisionnement ponctuelle.
    *   **Statuts :** `CREATED` (Brouillon) $\rightarrow$ `VALIDATED` (Par le gestionnaire) $\rightarrow$ `DELIVERED` (Par le magasinier).
    *   **Champs clés :** `reference`, `collector`, `requestDate`, `validationDate`, `deliveryDate`.

2.  **`StockRequestItem` (Ligne de Demande)**
    *   Lien entre la demande et l'article.
    *   **Historisation des prix :** Enregistre `unitPrice` (Prix vente crédit) et `purchasePrice` (Prix d'achat) **au moment de la création** de la demande pour figer la valeur comptable.

3.  **`CommercialMonthlyStock` (Stock Mensuel)**
    *   Entité pivot qui consolide tout le stock d'un commercial pour un mois/année donné.
    *   Permet de savoir exactement ce que le commercial détient, a vendu ou a rendu.

4.  **`CommercialMonthlyStockItem` (Détail Stock Mensuel)**
    *   Suit les compteurs pour chaque article :
        *   `quantityTaken` : Cumul des sorties validées.
        *   `quantitySold` : Cumul des ventes clients (Distributions).
        *   `quantityReturned` : Cumul des retours au magasin.
        *   `quantityRemaining` : Stock théorique actuel (`Taken` - `Sold` - `Returned`).
    *   **Valorisation :** Calcule et met à jour le **Prix Moyen Pondéré (PMP)** (`weightedAverageUnitPrice`) à chaque nouvelle sortie pour gérer les fluctuations de prix au cours du mois.

5.  **`StockReturn` (Retour Stock)**
    *   Gère le processus de retour de marchandises du commercial vers le magasin.
    *   **Statuts :** `CREATED` $\rightarrow$ `RECEIVED`.

### B. Services Métier

1.  **`StockRequestService`**
    *   `createRequest` : Crée la demande et fige les prix des articles.
    *   `validateRequest` : Validation managériale.
    *   `deliverRequest` :
        *   Décrémente le stock physique du magasin (`Articles`).
        *   Met à jour (ou crée) le `CommercialMonthlyStock`.
        *   Recalcule le PMP du stock commercial.

2.  **`StockReturnService`**
    *   `validateReturn` :
        *   Vérifie que le commercial a assez de stock restant.
        *   Incrémente le stock physique du magasin.
        *   Met à jour `quantityReturned` dans le stock mensuel.

3.  **`CreditService` (Mise à jour)**
    *   Ajout de la méthode **`distributeArticlesV2`** :
        *   Nouvelle logique de vente client.
        *   Vérifie la disponibilité directement dans `CommercialMonthlyStock`.
        *   Incrémente `quantitySold` et décrémente le stock restant du commercial.
        *   Ne dépend plus d'un `Credit` parent.

### C. API REST (Controllers)
*   `StockRequestController` : Endpoints pour créer, valider, livrer et lister les demandes.
*   `StockReturnController` : Endpoints pour gérer les retours.
*   `CommercialMonthlyStockController` : Endpoints pour consulter le stock actuel (Dashboard).

---

## 3. Frontend (Angular)

### A. Nouveau Module : `StockModule`
Création d'un module dédié chargé via **Lazy Loading** sur la route `/stock`.

### B. Fonctionnalités & Pages

1.  **Demandes de Sortie (`/stock/request`)**
    *   **Liste :** Affiche les demandes avec des badges de statut (Couleurs différentes pour Created, Validated, Delivered).
    *   **Création :** Formulaire permettant au commercial de sélectionner des articles et quantités. Affiche le prix unitaire à titre indicatif.
    *   **Actions :** Boutons "Valider" (Manager) et "Livrer" (Magasinier) visibles selon les rôles.

2.  **Mon Stock (`/stock/my-stock`)**
    *   **Dashboard :** Tableau de bord pour le commercial.
    *   Affiche pour le mois en cours : Quantité Prise, Vendue, Retournée, Restante.
    *   Affiche la **Valeur du stock restant** (basée sur le PMP).

3.  **Retours (`/stock/return`)**
    *   **Création :** Formulaire intelligent qui ne propose que les articles où `quantityRemaining > 0`.
    *   **Validation :** Empêche de saisir une quantité de retour supérieure au stock détenu.

### C. Intégration
*   **Sidebar :** Ajout d'un menu "Stock Commercial" déroulant, visible pour les Commerciaux et Magasiniers.
*   **Routing :** Configuration des routes et des Guards (Authentification).

---

## 4. Flux de Travail (Workflow)

### Scénario 1 : Sortie de Stock (Approvisionnement)
1.  **Commercial :** Crée une demande via "Nouvelle Demande". (Statut: `CREATED`, Prix figés).
2.  **Manager :** Vérifie la liste et clique sur "Valider". (Statut: `VALIDATED`).
3.  **Magasinier :** Prépare les articles, clique sur "Livrer". (Statut: `DELIVERED`).
    *   $\Rightarrow$ Stock Magasin diminue.
    *   $\Rightarrow$ Stock Commercial (`quantityTaken`) augmente.

### Scénario 2 : Vente au Client (Distribution)
1.  **Commercial :** Initie une vente (via le formulaire de crédit/vente).
2.  **Système (`distributeArticlesV2`) :**
    *   Vérifie si `Quantité Demandée` $\le$ `Stock Commercial Restant`.
    *   Si OK : Enregistre la vente (`Credit`) et met à jour le stock commercial (`quantitySold` +1).

### Scénario 3 : Retour en Magasin
1.  **Commercial :** Crée un retour pour des invendus.
2.  **Magasinier :** Vérifie la marchandise physique et valide le retour.
    *   $\Rightarrow$ Stock Magasin augmente.
    *   $\Rightarrow$ Stock Commercial (`quantityReturned`) augmente, le restant diminue.

---

## 5. Prochaines Étapes (Migration)

1.  **Déploiement :** Mettre en production le nouveau module.
2.  **Transition :** Demander aux commerciaux d'utiliser le menu "Stock Commercial" pour leurs nouvelles sorties.
3.  **Bascule Vente :** Remplacer l'appel à l'ancienne méthode de distribution par `distributeArticlesV2` dans le composant `CreditAddComponent` (ou équivalent) une fois que les stocks mensuels sont initialisés.
