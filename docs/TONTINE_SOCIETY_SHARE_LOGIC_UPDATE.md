# Mise à jour de la Logique de Part Société (Tontine)

## Contexte
La logique initiale de calcul de la "Part Société" (frais de gestion) dans le module Tontine était basée sur le volume total des cotisations. Cela posait problème pour les paiements "Backward" (rattrapage) et "Forward" (avance), car la part société n'était pas priorisée temporellement.

## Nouvelle Exigence
La part société doit être prélevée en priorité sur les cotisations, en fonction du temps écoulé (mois entamés), indépendamment du fait que le client ait terminé de payer le mois précédent ou non.

## Changements Implémentés

### 1. Backend (`TontineService.java`)

*   **Nouvelle Logique de Calcul (`processCollectionAllocation`) :**
    *   Lors de l'enregistrement d'une collecte, le système calcule d'abord le nombre de mois entamés depuis le début de la session (ou la date d'inscription du membre).
    *   `TargetSocietyShare` = `MoisEntamés` * `MontantJournalier` (Plafonné à 10 mois).
    *   `SocietyShareDeficit` = `TargetSocietyShare` - `CurrentSocietyShare`.
    *   Le montant de la collecte est alloué en priorité pour combler ce déficit.
    *   Le reste est ajouté au capital du membre.

*   **Paramètre Global :**
    *   Introduction du paramètre `USE_MEMBER_REGISTRATION_DATE_FOR_SHARE`.
    *   Si activé, le calcul des mois entamés commence à la date d'inscription du membre (si elle est postérieure au début de la session), sinon à la date de début de session.

### 2. Frontend (`member-details.component.ts` & `.html`)

*   **Affichage Amélioré :**
    *   La section "Part Société" affiche désormais "Payé / Dû" (ex: `5000 / 10000 FCFA`).
    *   Le montant dû est calculé localement en miroir de la logique backend pour donner un feedback immédiat.
    *   Si le montant payé est inférieur au montant dû, le texte s'affiche en rouge (classe `text-warn`).

### 3. Mobile (`DatabaseService.ts`, `TontineCalculationService.ts`, `DeliveryCreationPage.ts`)

*   **Synchronisation des Paramètres :**
    *   Création de la table `parameters` dans la base de données locale SQLite.
    *   Mise à jour du `DatabaseService` (version 13) pour inclure cette table.
    *   Création de `ParameterRepository` et `ParameterService` pour gérer la synchronisation et l'accès aux paramètres globaux depuis le mobile.
    *   Mise à jour de `DataInitializationService` et `InitialLoadingPage` pour charger les paramètres au démarrage.

*   **Logique de Calcul Mobile (`TontineCalculationService`) :**
    *   Création d'un service dédié pour répliquer la logique financière du backend sur le mobile.
    *   Permet de calculer `societyShare` et `availableBudget` en mode hors ligne.

*   **Protection à la Livraison (`DeliveryCreationPage`) :**
    *   Lors de la création d'une livraison, le budget disponible n'est plus simplement la somme des collectes.
    *   Le système déduit désormais la part société théorique (basée sur la date du jour) avant de déterminer le montant disponible pour l'achat de marchandises.
    *   Cela empêche les pertes financières dues à des livraisons qui incluraient les frais de gestion non encore déduits.

## Impact
*   **Fiabilité Financière :** Garantit que l'entreprise perçoit ses frais de gestion en priorité.
*   **Transparence Client :** Le client voit clairement ce qui part en frais et ce qui reste en capital.
*   **Sécurité Mobile :** Empêche les commerciaux de livrer plus de marchandises que le client n'a réellement épargné (net de frais).
