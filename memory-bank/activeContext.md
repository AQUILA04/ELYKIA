# Contexte actif

Arrêt au **2026-11-16** (GMT). Prochaine lecture : `docs/CHANGELOG.md` (haut de chaque bloc) et `git log --oneline -20`.

## Versions en tête

- Frontend **2.50.1** — Backend **1.53.2** — Mobile **2.39.4** — Espace client **0.17.3** (dernier incrément espace client : 2026-11-09).

Prod, 16 nov. 2026, vers 18:07 GMT : le pool JDBC (10) était saturé. Une acceptation de carnet tontine tenait le rapport journalier et mettait à jour ce même rapport dans une seconde transaction, sans jamais committer. Correctif : événement après le commit, pool prod à 20, migration photo au démarrage coupée dans le compose.

## Focus récent (changelog et PR mergées)

1. **Contrôle carnet tontine, mobile 2.39.4** (2026-11-16). Les mois déjà cotisés par un autre commercial ne s’affichent plus en stub « Système : 0 » grisé dans les autres blocs. Les mois vraiment vides restent cochables avec commercial + mise par mois.
2. **Fiche membre tontine, mobile 2.39.3** (2026-11-16). Menu **⋮** : **Commande de tontine** / **Livraison Fin d’Année** selon la session.
3. **Commerciaux** (PR #228, 2026-11-15). Annuaire du personnel et historiques d’affectation.
4. **Reçu de commande tontine** (PR #230). Ticket mobile, PDF web, code `ELY-XXXX-XXXX`.
5. **Carnet tontine** (PR #222). Mois à zéro : commercial et mise au contrôle.

Mobile 2.39.4 : correctif affichage des mois au contrôle carnet RM.

## Fuseau

Production et métier : GMT (UTC+0), Lomé. Citer les heures en GMT. Ne pas convertir en heure Maurice. Voir `decisions.md`.

## Travail en cours dans l’arbre

Le reçu de commande tontine est sur `main` (PR #230). Décision durable : tout reçu ou facture futur suit cette authenticité (règle `receipt-authenticity`).

Feuille de route au-delà du changelog : **à compléter**.

## Quand on touche au code

Mettre à jour ce fichier dans la même PR : version, PR ou commit, et le parcours modifié en une ou deux phrases. Retirer les entrées devenues de l’historique (elles restent dans `docs/CHANGELOG.md`).
