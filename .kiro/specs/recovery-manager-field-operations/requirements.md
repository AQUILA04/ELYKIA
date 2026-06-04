# Requirements Document

## Introduction

Cette fonctionnalité introduit le rôle **RECOVERY_MANAGER** (Chef de Recouvrement) dans ELYKIA. Ce profil effectue des recouvrements terrain sur les crédits en retard (date de fin dépassée), enregistre ces opérations à son retour, et dispose d'un rapport dédié traçant ses collectes par commercial et par période. Le flux financier reste inchangé : le chef remet l'argent au commercial, qui verse au gestionnaire le soir.

## Glossary

| Terme | Définition |
|---|---|
| Crédit en retard | Crédit dont la date de fin attendue est dépassée et qui n'est pas encore soldé |
| Clôture terrain | Action du chef de recouvrement d'enregistrer un recouvrement sur un crédit en retard |
| Recouvrement total | Collecte du montant restant intégral du crédit |
| Recouvrement partiel | Collecte d'un montant inférieur au montant restant |
| RecoveryManagerOperation | Entité d'audit propre aux opérations du chef de recouvrement |
| recoveryManagerCollectionsAmount | Champ additionnel dans DailyCommercialReport pour isoler les collectes du chef |
| Collecte effective du commercial | `collectionsAmount - recoveryManagerCollectionsAmount` |

## Requirements

### Requirement 1: Sélection et clôture de crédits en retard

**User Story:** En tant que chef de recouvrement, je veux sélectionner un ou plusieurs crédits en retard depuis la page "Crédits en retard" et les clôturer (enregistrer un recouvrement), afin de tracer mes collectes terrain au retour.

#### Acceptance Criteria

1. WHEN le profil de l'utilisateur connecté est RECOVERY_MANAGER, THEN une checkbox de sélection s'affiche en début de chaque ligne de la table des crédits en retard.
2. WHEN aucune ligne n'est sélectionnée, THEN la barre d'action groupée est masquée.
3. WHEN au moins une ligne est sélectionnée, THEN une barre d'action flottante apparaît en bas de page affichant le nombre de crédits sélectionnés, le montant total concerné, et le bouton "Clôturer la sélection".
4. WHEN l'utilisateur clique sur l'icône "Clôturer" d'une ligne individuelle, THEN ce crédit est pré-sélectionné et le modal de confirmation s'ouvre immédiatement.
5. WHEN l'utilisateur clique sur "Clôturer la sélection" dans la barre flottante, THEN le modal de confirmation s'ouvre avec tous les crédits sélectionnés.
6. IF le profil n'est pas RECOVERY_MANAGER, THEN les checkboxes et boutons de clôture ne s'affichent pas.

### Requirement 2: Modal de confirmation de clôture

**User Story:** En tant que chef de recouvrement, je veux voir un modal de confirmation détaillé avant de valider la clôture, afin de vérifier les montants engagés et d'indiquer si le recouvrement est partiel.

#### Acceptance Criteria

1. WHEN le modal de confirmation s'ouvre, THEN il affiche la liste de tous les crédits à clôturer avec pour chacun : référence client, nom du client, commercial rattaché, montant restant (`totalAmountRemaining`).
2. WHEN le modal s'ouvre, THEN chaque ligne est initialisée en mode "recouvrement total" avec le montant pré-rempli à `totalAmountRemaining`.
3. WHEN l'utilisateur coche le toggle "Recouvrement partiel" sur une ligne, THEN le champ montant de cette ligne devient éditable et l'utilisateur peut saisir un montant inférieur.
4. WHEN l'utilisateur modifie un montant partiel, THEN le résumé financier en bas du modal se met à jour en temps réel (total des montants engagés, nombre de crédits totaux vs partiels).
5. WHEN le montant saisi pour un recouvrement partiel est supérieur au `totalAmountRemaining` ou égal à zéro, THEN le bouton "Confirmer" est désactivé et un message d'erreur s'affiche sur la ligne concernée.
6. WHEN l'utilisateur clique "Confirmer", THEN une requête est envoyée pour chaque crédit sélectionné via l'API `POST /api/v1/recovery-manager/close-credits` avec le montant concerné et le flag partiel.
7. WHEN toutes les requêtes réussissent, THEN le modal se ferme, la table se recharge, et une notification de succès s'affiche.
8. IF une requête échoue pour un crédit parmi plusieurs, THEN les crédits réussis sont confirmés, le crédit en erreur est signalé dans un message d'erreur persistant dans le modal.

### Requirement 3: Enregistrement de l'opération de recouvrement (backend)

**User Story:** En tant que système, je veux tracer chaque opération de clôture terrain dans une table dédiée et mettre à jour les compteurs du rapport journalier du commercial concerné, afin de permettre une réconciliation précise.

#### Acceptance Criteria

1. WHEN une clôture terrain est confirmée, THEN une entrée est créée dans la table `RecoveryManagerOperation` avec : `recoveryManagerUsername`, `commercialUsername`, `creditId`, `creditTimelineId`, `amountCollected`, `isPartial`, `originalAmountRemaining`, `operationDate`, `reference` (unique).
2. WHEN une clôture terrain est confirmée, THEN le champ `collector` du `CreditTimeline` créé est renseigné avec le username du chef de recouvrement.
3. WHEN une clôture terrain est confirmée, THEN `DailyCommercialReport.collectionsAmount` du commercial concerné s'incrémente du montant collecté (comportement existant conservé).
4. WHEN une clôture terrain est confirmée, THEN `DailyCommercialReport.recoveryManagerCollectionsAmount` du commercial concerné s'incrémente également du même montant.
5. WHEN une clôture terrain est confirmée, THEN `DailyCommercialReport.totalAmountToDeposit` du commercial concerné s'incrémente du montant collecté.
6. THE collecte effective du commercial SHALL être calculable à tout moment via `collectionsAmount - recoveryManagerCollectionsAmount`.

### Requirement 4: Rapport du Chef de Recouvrement

**User Story:** En tant que chef de recouvrement, je veux consulter mes opérations de collecte par période et savoir combien je dois remettre à chaque commercial, afin de préparer mes remises en fin de journée.

#### Acceptance Criteria

1. WHEN l'utilisateur connecté est RECOVERY_MANAGER ou MANAGER, THEN un onglet "RECOUVREMENT TERRAIN" est visible dans la page de rapport journalier.
2. WHEN l'onglet est actif, THEN les filtres de période existants (Aujourd'hui, Cette Semaine, Ce Mois, Personnalisé) s'appliquent aux données de l'onglet.
3. WHEN le profil est MANAGER, THEN un sélecteur de chef de recouvrement est affiché pour filtrer par agent.
4. WHEN l'onglet est actif, THEN un tableau "Opérations" affiche : date et heure, référence crédit, client, commercial rattaché, montant collecté, type (Total / Partiel).
5. WHEN l'onglet est actif, THEN un tableau "À remettre par commercial" affiche pour chaque commercial concerné : nom, nombre d'opérations, montant total à remettre sur la période.
6. WHEN l'onglet est actif, THEN des KPIs sont visibles : total collecté, nombre d'opérations, nombre de commerciaux concernés.
7. WHEN l'utilisateur clique "Exporter PDF", THEN un PDF du rapport est généré incluant les opérations, le tableau "À remettre par commercial" et les KPIs pour la période sélectionnée.
8. IF aucune opération n'existe pour la période, THEN un message "Aucune opération de recouvrement pour cette période" est affiché.

### Requirement 5: Nouveaux endpoints API

**User Story:** En tant que système, je veux exposer des endpoints dédiés aux opérations du chef de recouvrement, afin de séparer clairement la logique métier et faciliter le contrôle d'accès par rôle.

#### Acceptance Criteria

1. THE système SHALL exposer `POST /api/v1/recovery-manager/close-credits` acceptant une liste de `{ creditId, amount, isPartial }`, sécurisé par le rôle RECOVERY_MANAGER.
2. THE système SHALL exposer `GET /api/v1/recovery-manager/operations` avec paramètres `startDate`, `endDate`, `recoveryManagerUsername` optionnel, retournant la liste paginée des opérations.
3. THE système SHALL exposer `GET /api/v1/recovery-manager/report/summary` retournant les KPIs agrégés et le tableau "à remettre par commercial" pour une période donnée.
4. THE système SHALL exposer `GET /api/v1/recovery-manager/report/pdf` générant le PDF du rapport, sécurisé par rôle RECOVERY_MANAGER ou MANAGER.
5. WHEN un utilisateur sans le rôle RECOVERY_MANAGER tente d'appeler `POST /api/v1/recovery-manager/close-credits`, THEN une réponse 403 Forbidden est retournée.

### Requirement 6: Intégrité des données et non-régression

**User Story:** En tant que système, je veux garantir que l'introduction du rôle RECOVERY_MANAGER ne modifie pas le comportement existant des commerciaux et managers.

#### Acceptance Criteria

1. WHEN une clôture terrain est effectuée, THEN le rapport journalier du commercial s'incrémente normalement comme si c'était une collecte standard.
2. WHEN un manager consulte l'onglet "VUE D'ENSEMBLE" du rapport journalier, THEN `collectionsAmount` affiché inclut les collectes terrain du chef (comportement conservé).
3. IF le même crédit est clôturé deux fois par le chef de recouvrement sur la même journée, THEN la deuxième opération est refusée avec un message d'erreur explicite.
4. THE champ `recoveryManagerCollectionsAmount` ne SHALL jamais dépasser `collectionsAmount` pour un même commercial sur une même journée.
5. IF un commercial consulte ses propres données dans l'application mobile, THEN aucun changement de comportement n'est visible pour lui.
