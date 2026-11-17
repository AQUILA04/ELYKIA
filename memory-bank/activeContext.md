# Contexte actif

Arrêt au **2026-11-17** (GMT). Prochaine lecture : `docs/CHANGELOG.md` (haut de chaque bloc) et `git log --oneline -20`.

## Versions en tête

- Frontend **2.50.3** — Backend **1.53.2** — Mobile **2.40.1** — Espace client **0.17.3** (dernier incrément espace client : 2026-11-09).

## Focus récent (changelog et PR)

1. **RM sync-errors + libellé article tontine** (2026-11-17). Mobile 2.40.1 : le chef de recouvrement peut ouvrir `/sync-errors` (AuthGuard autorise les routes partagées). Frontend 2.50.3 : modale commande/livraison tontine affiche `commercialName`.
2. **Contrôle carnet tontine multi-commerciaux, mobile 2.40.0 / backend 1.53.2** (2026-11-16). Sur un mois déjà cotisé, **+** ajoute jusqu’à 2 lignes carnet.
3. **Pool JDBC prod / rapport tontine** (2026-11-16). Événement après commit, pool à 20, migration photo coupée au démarrage compose.

## Fuseau

Production et métier : GMT (UTC+0), Lomé. Citer les heures en GMT. Ne pas convertir en heure Maurice. Voir `decisions.md`.

## Travail en cours dans l’arbre

Branche `cursor/fix-rm-sync-errors-tontine-article-name-1655` : correctifs AuthGuard RM + affichage `commercialName` tontine admin.

## Quand on touche au code

Mettre à jour ce fichier dans la même PR : version, PR ou commit, et le parcours modifié en une ou deux phrases. Retirer les entrées devenues de l’historique (elles restent dans `docs/CHANGELOG.md`).
