# Contexte actif

Arrêt au **2026-11-19** (GMT). Prochaine lecture : `docs/CHANGELOG.md` (haut de chaque bloc) et `git log --oneline -20`.

## Versions en tête

- Frontend **2.51.0** — Backend **1.54.0** — Mobile **2.40.5** — Espace client **0.17.3** (dernier incrément espace client : 2026-11-09).

## Focus récent (changelog et PR)

0. **Total encaissé du rapport journalier** (2026-11-19). Frontend 2.51.0 / Backend 1.54.0 : le total encaissé se ventile en opérations de la période et rattrapages (cotisations de jours passés remises dans la période), par commercial et dans la Synthèse caisse. Constat COM005 du 18/11 : synthèse 376 950 = 362 650 (toutes caisses) + 14 300 de rattrapages COM005 ; le bloc COM005 n'affichait que 113 800.
1. **OTP espace client** (2026-11-18). Backend 1.53.5 : `NOTIFICATION_HUB_ENABLED` est `true` par défaut. Le message « envoi SMS OTP n'est pas activé » venait de ce défaut `false`. Prod : OAuth2, secret Keycloak `elykia` obligatoire au démarrage, `environment` vide → SMS réel. Checklist : `backend/docs/NOTIFICATION_HUB_LOCAL.md`. Effet de bord corrigé le 2026-11-19 : le workflow E2E (profil `prod`, sans secret) échouait au démarrage ; il passe `NOTIFICATION_HUB_ENABLED=false`.
2. **Annulation de ventes + reçu de commande** (2026-11-18). Frontend 2.50.5 / Backend 1.53.4 / Mobile 2.40.5 : filtres historique ; design system documents ; authenticité discrète (`receipt-order-lines`).
3. **Ruban / bandeau environnement** (2026-11-18). Frontend 2.50.4 / Mobile 2.40.4 : indicateur hors prod.

## Fuseau

Production et métier : GMT (UTC+0, Lomé). Citer les heures en GMT. Ne pas convertir en heure Maurice. Voir `decisions.md`.

## Travail en cours dans l’arbre

Branche `cursor/fix-customer-otp-hub-0d60` : OTP SMS activé, aligné sur `main` (PR #240 et ruban #242).

## Quand on touche au code

Mettre à jour ce fichier dans la même PR : version, PR ou commit, et le parcours modifié en une ou deux phrases. Retirer les entrées devenues de l’historique (elles restent dans `docs/CHANGELOG.md`).
