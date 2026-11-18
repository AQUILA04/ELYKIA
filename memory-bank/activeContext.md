# Contexte actif

Arrêt au **2026-11-18** (GMT). Prochaine lecture : `docs/CHANGELOG.md` (haut de chaque bloc) et `git log --oneline -20`.

## Versions en tête

- Frontend **2.50.3** — Backend **1.53.5** — Mobile **2.40.3** — Espace client **0.17.3** (dernier incrément espace client : 2026-11-09).

## Focus récent (changelog et PR)

1. **OTP espace client** (2026-11-18). Backend 1.53.5 : `NOTIFICATION_HUB_ENABLED` est `true` par défaut. Le message « envoi SMS OTP n'est pas activé » venait de ce défaut `false`. Prod : OAuth2, secret Keycloak `elykia` obligatoire au démarrage, `environment` vide → SMS réel. Checklist : `backend/docs/NOTIFICATION_HUB_LOCAL.md`.
2. **Complément livraison sans plafond + édition commande** (2026-11-18). Mobile 2.40.3 / Backend 1.53.4.

## Fuseau

Production et métier : GMT (UTC+0), Lomé. Citer les heures en GMT. Ne pas convertir en heure Maurice. Voir `decisions.md`.

## Travail en cours dans l’arbre

Branche `cursor/fix-tontine-delivery-topup-edit-2d0b` : complément livraison sans plafond + édition commande.

## Quand on touche au code

Mettre à jour ce fichier dans la même PR : version, PR ou commit, et le parcours modifié en une ou deux phrases. Retirer les entrées devenues de l’historique (elles restent dans `docs/CHANGELOG.md`).
