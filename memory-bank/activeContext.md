# Contexte actif

Arrêt au **2026-11-16** (GMT). Prochaine lecture : `docs/CHANGELOG.md` (haut de chaque bloc) et `git log --oneline -20`.

## Versions en tête

- Frontend **2.50.2** — Backend **1.53.2** — Mobile **2.40.0** — Espace client **0.17.3** (dernier incrément espace client : 2026-11-09).

Prod, 16 nov. 2026, vers 18:07 GMT : le pool JDBC (10) était saturé. Une acceptation de carnet tontine tenait le rapport journalier et mettait à jour ce même rapport dans une seconde transaction, sans jamais committer. Correctif : événement après le commit, pool prod à 20, migration photo au démarrage coupée dans le compose.

## Focus récent (changelog et PR mergées)

1. **Contrôle carnet tontine multi-commerciaux, mobile 2.40.0 / backend 1.53.2** (2026-11-16). Sur un mois déjà cotisé, **+** ajoute jusqu’à 2 lignes carnet (autre commercial, mise figée, système 0). Les stubs « Système : 0 » grisés restent omis.
2. **Contrôle carnet tontine, mobile 2.39.4** (2026-11-16). Les mois déjà cotisés par un autre commercial ne s’affichent plus en stub « Système : 0 » grisé.
3. **Fiche membre tontine, mobile 2.39.3** (2026-11-16). Menu **⋮** : **Commande de tontine** / **Livraison Fin d’Année** selon la session.
4. **Commerciaux** (PR #228, 2026-11-15). Annuaire du personnel et historiques d’affectation.
5. **Reçu de commande tontine** (PR #230). Ticket mobile, PDF web, code `ELY-XXXX-XXXX`.

## Fuseau

Production et métier : GMT (UTC+0), Lomé. Citer les heures en GMT. Ne pas convertir en heure Maurice. Voir `decisions.md`.

## Travail en cours dans l’arbre

Branche `cursor/feat-tontine-carnet-month-duplicate-98e4` : doublon carnet même mois (mobile + backend). Inclut le correctif d’affichage des stubs (ex-`fix-tontine-carnet-month-lock`).

## Quand on touche au code

Mettre à jour ce fichier dans la même PR : version, PR ou commit, et le parcours modifié en une ou deux phrases. Retirer les entrées devenues de l’historique (elles restent dans `docs/CHANGELOG.md`).
