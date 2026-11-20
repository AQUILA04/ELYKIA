# PR 2/7 — Doublons tontine multi-téléphones

Chantier « commande et livraison tontine » (plan général : `.cursor/plans/tontine_commande_livraison_7_pr.plan.md`, livré avec la PR 1).

## Besoin

Sur le terrain, plusieurs personnes utilisent le même compte commercial (ex. COM005) sur plusieurs tablettes non synchronisées. Un client peut être servi deux fois. Le serveur doit contrôler toute seconde saisie pour éviter les triches.

## Constat

- `deliverDelivery` ne refusait pas une commande déjà livrée : deux remises synchronisées créaient deux crédits tontine et versaient deux fois le reliquat.
- `validateDelivery` pouvait repasser une commande livrée en VALIDATED.
- Une seconde commande était refusée par un message générique ; le mobile proposait alors de l'enregistrer hors ligne.

## Règles

| Seconde saisie | Décision |
|---|---|
| Commande, première non livrée, solde prévisionnel couvre les deux | Fusion (lignes ajoutées), repasse PENDING sauf saisie gestionnaire |
| Commande, total au-dessus du prévisionnel | Refus 409 `BALANCE_EXCEEDED` |
| Toute saisie, membre déjà livré | Refus 409 `ALREADY_DELIVERED` |
| Livraison directe, commande non livrée | Refus 409 `ORDER_ALREADY_PENDING` |
| Même référence, ou référence déjà fusionnée | Rejeu idempotent, rien n'est ajouté |

## Livré

- Backend 1.58.0 : `TontineDeliveryService` (contrôles), `TontineDeliveryConflictService` (journal, `REQUIRES_NEW`, `attempts`), `TontineDeliveryDuplicateException` + `TontineDeliveryDuplicateAdvice` (409), `V044__tontine_delivery_conflict.sql`, `GET /api/v1/tontines/deliveries/conflicts`, reçu fusionné vérifiable (`incoming_authenticity_code`), `schema-catalog.json`.
- Frontend 2.57.0 : page `/tontine/doublons`, menu **Tontines > Doublons**, message dans **Vérifier un reçu**.
- Mobile 2.42.0 : `OnlineWriteError.status` / `isServerConflict`, pas de repli hors ligne sur 409, `applyMergedOrder` (en ligne et synchro), `deleteLocalTwin` (identique à la PR 1).
- Guide : `manager/tontine_doublons.md`, `commercial/mobile_app.md`, index RAG, HTML.

## Limites connues

- Une remise rejouée après une perte de réponse réseau est journalisée comme doublon (pas d'identifiant d'opération).
- Les lignes d'une commande fusionnée sont ajoutées telles quelles (même article possible sur deux lignes).
- Après fusion, le mobile reçoit des lignes sans détail de pack (quantité en unités).
