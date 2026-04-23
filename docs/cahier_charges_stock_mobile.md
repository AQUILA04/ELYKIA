# Cahier des Charges - Module de Gestion des Stocks (Application Mobile)

## 1. Contexte et Objectifs
Ce document détaille les spécifications fonctionnelles et techniques pour l'intégration des fonctionnalités de gestion de stock dans l'application mobile ELYKIA. L'objectif est de permettre aux agents commerciaux (collecteurs) sur le terrain de gérer leurs demandes de dotation (sortie) et de restitution (retour) de stock, tant pour les articles standards que pour les articles liés aux tontines.

## 2. Périmètre Fonctionnel

L'application mobile devra implémenter les 4 flux suivants :
1. **Demande de sortie de stock (Standard)**
2. **Demande de retour en stock (Standard)**
3. **Demande de sortie de stock (Tontine)**
4. **Demande de retour en stock (Tontine)**

### 2.1. Demandes de Sortie de Stock (Standard et Tontine)
- **Consultation :**
  - Affichage de la liste des demandes de sortie (filtrées par le collecteur connecté).
  - Possibilité de filtrer l'historique par statut (En attente, Validé, Livré, Annulé, Refusé).
- **Création :**
  - Formulaire de saisie pour demander la dotation de nouveaux articles (sélection d'articles, quantités, dates de demande).
- **Annulation :**
  - Possibilité pour l'agent d'annuler sa propre demande de sortie de stock, à condition que celle-ci n'ait pas encore été validée ou expédiée par le back-office.

### 2.2. Demandes de Retour en Stock (Standard et Tontine)
- **Consultation :**
  - Affichage de la liste des demandes de retour (filtrées par le collecteur connecté).
- **Création :**
  - Formulaire de saisie pour déclarer la restitution d'articles au dépôt principal ou à l'agence.
- **Annulation :**
  - Possibilité pour l'agent d'annuler une demande de retour initiée par erreur *(Note technique : la fonctionnalité d'annulation devra être reflétée côté backend si elle est absente sur certains flux de retour)*.

## 3. Exigences Techniques et Contraintes Architecturales

Le développement mobile devra **strictement** respecter les standards de l'architecture existante de l'application :

### 3.1. Accès en Ligne Direct (Online-First)
- **Connexion Directe à l'API :** Pour ces nouvelles fonctionnalités de gestion de stock, l'application ne fonctionnera pas en mode offline. Les requêtes (création, consultation, annulation) s'effectueront directement vers le backend en temps réel.
- **Gestion de l'Indisponibilité du Serveur :** En cas de perte de connexion réseau ou d'inaccessibilité du backend, l'interface devra intercepter l'erreur et afficher un composant d'état visuel (State/Empty State) "Serveur Indisponible" pour l'utilisateur.

### 3.2. Ségrégation et Filtrage des Données
- Le principe de sécurité de l'accès aux données doit être respecté : **toutes les requêtes d'affichage** de listes (sorties, retours) doivent filtrer les données pour n'afficher que celles appartenant à l'utilisateur connecté (`commercialUsername`, `commercial` ou `commercialId`).
- Ce filtrage doit être intégré dans les appels API correspondants vers le backend.

### 3.4. Bonnes Pratiques Frontend (Angular/Ionic)
- **Composants Angular :** La propriété `standalone: false` du décorateur `@Component` ne doit **jamais** être supprimée lors de la création ou de la modification des composants.
- **Traçabilité :** L'ajout de logs dans le code mobile doit impérativement utiliser un double format : appel au service de log interne (`this.log.log(...)`) couplé à la console native (`console.log(...)`).

## 4. Interfaces de Communication Backend (API)

Le développement mobile devra s'interfacer avec les contrôleurs existants du back-office :
- **Stock Standard :**
  - Création/Annulation/Liste : `/api/stock-requests`
  - Création/Annulation/Liste : `/api/stock-returns`
- **Stock Tontine :**
  - Création/Annulation/Liste : `/api/v1/stock-tontine-request`
  - Création/Liste : `/api/v1/stock-tontine-return`

---
*Ce cahier des charges s'inscrit dans les normes qualité du projet ELYKIA et fait office de référence technique pour l'implémentation des modules par le prestataire.*
