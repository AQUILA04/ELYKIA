# Contexte actif

Arrêt au **2026-11-18** (GMT). Prochaine lecture : `docs/CHANGELOG.md` (haut de chaque bloc) et `git log --oneline -20`.

## Versions en tête

- Frontend **2.50.3** — Backend **1.53.4** — Mobile **2.40.3** — Espace client **0.17.3** (dernier incrément espace client : 2026-11-09).

## Focus récent (changelog et PR)

1. **Complément livraison sans plafond + édition commande** (2026-11-18). Mobile 2.40.3 / Backend 1.53.4 : complément à la livraison libre ; alerte remise → Compléter / Modifier ; **Modifier la commande** tant que non livré.
2. **CI mobile Gradle 429 retry** (2026-11-18). `assembleDebug` retente 3 fois.
3. **Collecte à la livraison en session CLOSED** (2026-11-18). Mobile 2.40.2 / Backend 1.53.3.

## Fuseau

Production et métier : GMT (UTC+0), Lomé. Citer les heures en GMT. Ne pas convertir en heure Maurice. Voir `decisions.md`.

## Travail en cours dans l’arbre

Branche `cursor/fix-tontine-delivery-topup-edit-2d0b` : complément livraison sans plafond + édition commande.

## Quand on touche au code

Mettre à jour ce fichier dans la même PR : version, PR ou commit, et le parcours modifié en une ou deux phrases. Retirer les entrées devenues de l’historique (elles restent dans `docs/CHANGELOG.md`).
