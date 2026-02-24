# Rapport d'Implémentation : Historisation des Montants Tontine

Ce document résume les travaux techniques réalisés pour permettre la gestion de l'historique des montants de cotisation des membres de la tontine, afin de garantir un calcul précis de la "Part Société" et du budget disponible, tant côté Backend que Mobile (Offline).

## 1. Documentation
*   **Restauration** : Le fichier `docs/TONTINE_SOCIETY_SHARE_LOGIC_UPDATE.md` a été restauré à son état initial pour conserver l'historique de la logique précédente.
*   **Nouvelle Analyse** : Création de `docs/TONTINE_MEMBER_AMOUNT_HISTORY_LOGIC.md` détaillant :
    *   La problématique du changement de montant en cours de session.
    *   Les 3 cas de modification (Rétroactif, Courant+Futur, Futur uniquement).
    *   L'algorithme de calcul basé sur l'historique.
    *   La stratégie de synchronisation Mobile/Backend.

## 2. Backend (Spring Boot)

### Base de Données
*   **Migration Flyway** : Création du script `V24__create_tontine_member_amount_history.sql`.
    *   Création de la table `tontine_member_amount_history`.
    *   Initialisation automatique de l'historique pour les membres existants (basé sur le montant actuel et la date de début de session).

### Entités & DTOs
*   **Nouvelle Entité** : `TontineMemberAmountHistory` (montant, date début, date fin, membre).
*   **Mise à jour Entité** : `TontineMember` possède désormais une relation `OneToMany` vers son historique.
*   **Nouvel Enum** : `TontineMemberUpdateScope` (`GLOBAL`, `CURRENT_AND_FUTURE`, `FUTURE_ONLY`).
*   **Mise à jour DTO** : `TontineMemberDto` inclut le champ `updateScope` pour transmettre l'intention de l'utilisateur lors de la modification.

### Logique Métier (Services & Repositories)
*   **Nouveau Repository** : `TontineMemberAmountHistoryRepository`.
*   **TontineService** :
    *   **Injection** : Utilisation de l'injection par Setter pour `TontineMemberAmountHistoryRepository` afin d'éviter la limite de paramètres du constructeur (SonarQube).
    *   **Enregistrement** : Initialisation de la première entrée d'historique lors de la création d'un membre.
    *   **Mise à jour (`updateMember`)** : Gestion intelligente de l'historique selon le `updateScope` choisi (clôture des périodes précédentes, création de nouvelles entrées).
    *   **Calcul Financier (`processCollectionAllocation`)** : Refonte de l'algorithme pour itérer mois par mois et récupérer le montant applicable à chaque période depuis l'historique, garantissant un calcul exact de la dette envers la société.
    *   **Exposition Historique** : Ajout de la méthode `getMembersHistory` filtrée par commercial et session active.

### API (Controller)
*   **TontineController** :
    *   Exposition du nouvel endpoint `GET /api/v1/tontines/members/history` pour permettre au mobile de récupérer l'historique.
    *   Gestion automatique de l'utilisateur connecté pour filtrer les données.

## 3. Mobile (Ionic/Angular - Offline First)

### Base de Données Locale (SQLite)
*   **Schéma** : Ajout de la table `tontine_member_amount_history` dans `DatabaseService`.
*   **Migration** : Ajout de la migration `V14` pour ajouter la colonne `updateScope` à la table `tontine_members` (pour stocker l'intention de modification en offline).
*   **Repositories** :
    *   Création de `TontineMemberAmountHistoryRepository` (Mobile).
    *   Mise à jour de `TontineMemberRepository` pour gérer le champ `updateScope`.

### Logique Métier & Synchronisation
*   **TontineService (Mobile)** :
    *   Mise à jour de `initializeTontine` pour télécharger l'historique des montants depuis le backend (`/members/history`) et le stocker localement.
*   **TontineCalculationService** :
    *   Injection du repository d'historique.
    *   Refonte de `calculateMemberStatus` pour utiliser l'historique local. Cela permet de calculer correctement la "Part Société" et le "Budget Disponible" pour les livraisons, même en mode hors ligne, évitant ainsi les erreurs de caisse lors des livraisons terrain.

### Interface Utilisateur (Frontend Mobile)
*   **Page d'Enregistrement/Modification** :
    *   Détection dynamique du changement de montant.
    *   Affichage conditionnel du sélecteur de portée (`updateScope`) : "Mois en cours et futurs", "Futurs uniquement", "Rétroactif".
    *   Validation du formulaire adaptée.

## 4. Frontend Web (Angular)

### Interface Utilisateur
*   **Modal d'Ajout/Modification Membre (`AddMemberModalComponent`)** :
    *   Mise à jour pour supporter le mode "Édition".
    *   Détection dynamique du changement de montant.
    *   Affichage conditionnel du sélecteur de portée (`updateScope`) lorsque le montant est modifié.
    *   Valeur par défaut définie sur `FUTURE_ONLY` (Mois futurs uniquement).
    *   Transmission du `updateScope` au backend lors de la soumission.

## Conclusion
L'architecture mise en place permet une gestion robuste des changements de montants de cotisation. Le Backend reste la source de vérité comptable, mais le Mobile dispose désormais de toutes les données nécessaires (historique) pour effectuer des calculs précis en autonomie, sécurisant ainsi les opérations de livraison sur le terrain. Le Frontend Web offre une interface intuitive pour gérer ces changements.
