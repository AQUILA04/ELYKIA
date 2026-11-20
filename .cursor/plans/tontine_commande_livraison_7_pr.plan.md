# Commande et livraison tontine — chantier en 7 PR

Validé le 2026-11-20. Chaque branche part de `origin/main` (la PR 4 se construit sur la PR 3 si celle-ci n'est pas fusionnée).
Chaque PR : changelog + version, guide utilisateur et index RAG si écran ou règle change, memory-bank, ce plan.

## Constats sur `main`

- `tontine_delivery` : une commande par membre (`tontine_member_id` unique). Une deuxième création est refusée (« Ce membre a déjà une livraison. »).
- `deliverDelivery` ne vérifie pas que la commande est déjà livrée : deux remises synchronisées par deux tablettes créent deux crédits tontine et versent deux fois le reliquat.
- Validation automatique codée en dur pour GESTIONNAIRE / ADMIN (`persistNewDelivery`).
- Reçus (PDF `TontineOrderReceiptPdfDto`, ticket mobile) : total seulement, ni solde, ni reste à payer, ni reliquat.
- Paramètres applicatifs : `app.security.parameter.init-data` (insérés seulement s'ils n'existent pas), lus par `ParameterService.isEnabled(clé)` et `/api/parameters/enabled/{clé}`.

## PR

| # | Points | Contenu | Composants |
|---|--------|---------|------------|
| 1 | 4 | « Marquer comme livré » inactif après la remise (ligne locale jumelle restée en PENDING) | Mobile |
| 2 | 5 | Doublons multi-tablettes (même compte sur plusieurs appareils non synchronisés) : deuxième commande fusionnée si le solde couvre le total, sinon refusée ; deuxième remise toujours refusée ; livraison directe refusée si une commande non livrée existe ; journal des doublons consultable par le gestionnaire ; message clair à la synchro mobile | Backend, Web, Mobile |
| 3 | 1 | Solde net cotisé, total commande, reste à payer, reliquat sur tous les reçus et détails de commande | Backend, Web, Mobile |
| 4 | 2 | Bouton « Livrer » → récapitulatif (compléter le solde / réduire la commande) → « Confirmer la livraison » ; reçu : total cotisé, utilisé, restant ; aperçu avant confirmation sur le web | Web, Mobile |
| 5 | 3 | Paramètre `TONTINE_ORDER_AUTO_VALIDATION` (init-data, défaut `false`) ; documenter le mécanisme des paramètres dans le memory-bank | Backend |
| 6 | 6 | Date de livraison planifiée optionnelle (migration, schema-catalog, SQLite, synchro, formulaires, reçu) ; PDF des membres à livrer pour une date choisie sur la page des livraisons, sans les membres déjà livrés | Backend, Web, Mobile |
| 7 | 7 | Commande : filtre « Mon stock tontine / Catalogue », réservation indicative (disponible, réservé par les commandes en attente, libre), sans sortie de stock. Remise : stock du commercial uniquement (débité) | Backend, Web, Mobile |

## Décisions

- Réservation indicative : calculée, ne bloque rien.
- Paramètre de validation automatique désactivé par défaut ; la validation automatique GESTIONNAIRE / ADMIN reste.
- Commande VALIDATED complétée par une deuxième saisie : repasse en PENDING, sauf validation automatique active ou saisie gestionnaire.

## PR 1 — détail (Mobile 2.41.7)

- `TontineDeliveryRepository.deleteLocalTwin(localId)` ; appelé par `persistMarkDelivered` quand l'ID change.
- `pickMemberTontineDelivery` : une ligne `DELIVERED` l'emporte.
- `MemberDetailPage.hasPendingDeliveryToMark` : faux si le membre est `DELIVERED`.
- Tests : util, `TontineWriteService`, `MemberDetailPage`.
