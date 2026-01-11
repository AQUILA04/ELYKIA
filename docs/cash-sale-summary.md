# Résumé de l'implémentation de la Vente au Comptant (CASH)

Ce document résume les modifications techniques apportées pour intégrer la fonctionnalité de vente au comptant (`OperationType.CASH`) dans le système ELYKIA.

## 1. Vue d'ensemble

La vente au comptant permet de vendre des articles directement à un client (`ClientType.CLIENT`) sans passer par le cycle de crédit habituel.
- **Paiement** : Le montant total est considéré comme payé immédiatement (Pas de reste à payer, pas d'échéancier).
- **Stock** : Le stock est déduit du magasin central et ajouté au stock mensuel du commercial (`CommercialMonthlyStock`) au moment de la livraison (`startCredit`), où il est immédiatement considéré comme "vendu".
- **Commercial** : Utilise le champ `agencyCollector` du client s'il est défini, sinon le `collector` habituel.

## 2. Modifications des Entités

### `com.optimize.elykia.core.enumaration.OperationType`
- Ajout de la valeur `CASH`.

### `com.optimize.elykia.core.entity.Credit`
- **Attributs** : Utilisation de l'attribut `agencyCommercial` pour stocker le commercial d'agence si applicable.
- **Méthode `checkAdvance()`** :
  - Adaptation pour le type `CASH`.
  - Force `totalAmountPaid = totalAmount`.
  - Force `totalAmountRemaining = 0.0`.
  - Force `remainingDaysCount = 0`.
  - Force `expectedEndDate = beginDate`.
- **Méthode `getTotalAmountByCalcul()`** :
  - Prise en compte du type `CASH` pour le calcul basé sur le prix unitaire standard (ou prix de vente crédit selon la règle métier, ici configuré sur `unitPrice`).

### `com.optimize.elykia.client.entity.Client`
- Utilisation du champ `agencyCollector` pour déterminer le vendeur lors d'une vente en agence.

## 3. Modifications des Services

### `com.optimize.elykia.core.service.CreditService`

#### Nouvelle méthode : `createCashSale(CreditDto creditDto)`
- Crée une vente avec le statut `VALIDATED`.
- Définit le type sur `OperationType.CASH`.
- Assigne le `collector` en priorité via `client.getAgencyCollector()`.
- Initialise les montants : `Total = Payé`, `Reste = 0`.
- Déclenche l'enrichissement BI si disponible.

#### Mise à jour : `startCredit(Long creditId, Boolean distribution)`
- Ajout d'une logique spécifique pour `OperationType.CASH`.
- Lors du démarrage (livraison) :
  1. Récupère ou crée le `CommercialMonthlyStock` pour le mois courant et le commercial concerné.
  2. Pour chaque article :
     - Crée ou met à jour `CommercialMonthlyStockItem`.
     - Incrémente `quantityTaken` (Pris du stock central).
     - Incrémente `quantitySold` (Vendu immédiatement).
     - Met à jour le stock restant (`updateRemaining`).

#### Mise à jour : `updateCredit(CreditDto creditDto, Long id)`
- Ajout d'une vérification du type de l'opération existante.
- Redirection vers `updateCashSale` si le type est `CASH`.

#### Nouvelle méthode : `updateCashSale(CreditDto creditDto, Long id)`
- Permet la modification d'une vente au comptant tant qu'elle est au statut `VALIDATED`.
- Recalcule les montants et réinitialise les paramètres spécifiques au CASH (pas de dette).
- Gère la mise à jour des articles (suppression des anciens, ajout des nouveaux).

## 4. Flux de données

1. **Création** : `CreditService.createCashSale` -> `Credit` (Status: VALIDATED, Type: CASH).
2. **Livraison/Démarrage** : `CreditService.startCredit` ->
   - Déduction stock `Articles`.
   - Mise à jour `CommercialMonthlyStock` (Entrée + Sortie immédiate).
   - `Credit` (Status: INPROGRESS/SETTLED selon la logique, ici traité comme une vente terminée comptablement mais active dans le suivi).

## 5. Fichiers impactés
- `backend/src/main/java/com/optimize/elykia/core/service/CreditService.java`
- `backend/src/main/java/com/optimize/elykia/core/entity/Credit.java`
- `backend/src/main/java/com/optimize/elykia/core/enumaration/OperationType.java`
- `backend-lib/optimize-elykia-client/src/main/java/com/optimize/elykia/client/entity/Client.java`
