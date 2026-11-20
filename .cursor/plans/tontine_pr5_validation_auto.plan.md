# PR 5/7 — Validation automatique des commandes tontine

Chantier « commande et livraison tontine » (plan général : `.cursor/plans/tontine_commande_livraison_7_pr.plan.md`).

## Besoin (point 3)

Un paramètre permet d'activer ou de désactiver la validation automatique d'une commande créée : activé, le statut passe directement à « Validée » au lieu de rester « En attente ».
Précision du propriétaire : un paramètre applicatif comme ceux du prix unitaire (`init-data`), pas une propriété Spring ; documenter le mécanisme dans le memory-bank.

## Livré

- Backend 1.60.0 : `TONTINE_ORDER_AUTO_VALIDATION` (`init-data[14]`, défaut `false`, aussi dans le yml des tests), `TontineDeliveryService.validatesOnCreation` (création et fusion d'une seconde commande), 3 tests.
- Mobile 2.45.0 : statut VALIDATED du serveur appliqué à la synchronisation d'une commande hors ligne (`setStatus`), 2 tests.
- Memory-bank : section « Paramètres applicatifs » de `systemPatterns.md`, décision, contexte actif.
- Guide gestionnaire : « Validation automatique des commandes tontine ».
