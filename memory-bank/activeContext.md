# Contexte actif

Arrêt au **2026-11-18** (GMT). Prochaine lecture : `docs/CHANGELOG.md` (haut de chaque bloc) et `git log --oneline -20`.

## Versions en tête

- Frontend **2.50.3** — Backend **1.53.3** — Mobile **2.40.2** — Espace client **0.17.3** (dernier incrément espace client : 2026-11-09).

## Focus récent (changelog et PR)

1. **Collecte à la livraison en session CLOSED** (2026-11-18). Mobile 2.40.2 : **Compléter le solde** reste possible après clôture ; cotisation normale masquée dès `CLOSED` ; refus seulement en `ENDED`. Backend 1.53.3 : tests de non-régression du même contrat.
2. **RM sync-errors + libellé article tontine** (2026-11-17). Mobile 2.40.1 / Frontend 2.50.3.
3. **Contrôle carnet tontine multi-commerciaux** (2026-11-16). Mobile 2.40.0 / backend 1.53.2.

## Fuseau

Production et métier : GMT (UTC+0), Lomé. Citer les heures en GMT. Ne pas convertir en heure Maurice. Voir `decisions.md`.

## Travail en cours dans l’arbre

Branche `cursor/fix-tontine-delivery-collection-closed-2d0b` : correctif collecte à la livraison en session clôturée.

## Quand on touche au code

Mettre à jour ce fichier dans la même PR : version, PR ou commit, et le parcours modifié en une ou deux phrases. Retirer les entrées devenues de l’historique (elles restent dans `docs/CHANGELOG.md`).
