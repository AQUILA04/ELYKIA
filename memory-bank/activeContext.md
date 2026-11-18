# Contexte actif

Arrêt au **2026-11-18** (GMT). Prochaine lecture : `docs/CHANGELOG.md` (haut de chaque bloc) et `git log --oneline -20`.

## Versions en tête

- Frontend **2.50.4** — Backend **1.53.3** — Mobile **2.40.4** — Espace client **0.17.3** (dernier incrément espace client : 2026-11-09).

## Focus récent (changelog et PR)

1. **Ruban / bandeau environnement** (2026-11-18). Frontend 2.50.4 : ruban oblique rouge top-left hors prod (`APP_ENV` / fallback hôte). Mobile 2.40.4 : bandeau rouge global + chip connexion ; `envName` au build APK.
2. **Collecte à la livraison en session CLOSED** (2026-11-18). Mobile : **Compléter le solde** reste possible après clôture ; cotisation normale masquée dès `CLOSED` ; refus seulement en `ENDED`.
3. **Design system documents / PDF** (2026-11-18). Skills `elykia-document-design` + `elykia-pdf-style`.

## Fuseau

Production et métier : GMT (UTC+0), Lomé. Citer les heures en GMT. Ne pas convertir en heure Maurice. Voir `decisions.md`.

## Travail en cours dans l’arbre

Branche `cursor/env-ribbon-banner-7a6f` : indicateur d’environnement hors prod (frontend + mobile).

## Quand on touche au code

Mettre à jour ce fichier dans la même PR : version, PR ou commit, et le parcours modifié en une ou deux phrases. Retirer les entrées devenues de l’historique (elles restent dans `docs/CHANGELOG.md`).
