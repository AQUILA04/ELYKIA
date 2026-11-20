# Contexte actif

Arrêt au **2026-11-20** (GMT). Prochaine lecture : `docs/CHANGELOG.md` (haut de chaque bloc) et `git log --oneline -20`.

## Versions en tête

- Frontend **2.54.0** — Backend **1.56.1** — Mobile **2.40.5** — Espace client **0.17.4** (dernier incrément espace client : 2026-11-20).

## Focus récent (changelog et PR)

- **Noms d'article > 255 caractères** (2026-11-20). Backend 1.56.1 : le nom composé `type: marque modèle nom` atteint ~300 caractères ; `item_name` / `article_name` des demandes de stock, livraisons, stocks et mouvements tontine passent en `TEXT` (migration `V043`, appliquée aussi à la main sur la base de test).

- **Prix unitaire scindé** (2026-11-20, branche `feat/unit-price-visibility-split`). Backend 1.56.0 / Frontend 2.54.0 / Espace client 0.17.4 : paramètres dédiés ventes comptant et espace client, déclarés dans `init-data` à `true`. Directives `*appIfUnitPrice="credit.type"`. Mobile inchangé (pas de vente comptant).
- **Nouveau rapport commerciaux** (2026-11-20, en cours, 3 PR empilées). PR 1 Backend 1.55.0 : endpoints `cockpit`, `commercials/{username}/summary`, `yearly-summary/team` (cache 5 min), totaux journal et versements, index `V042`, rattrapage explicite dans le versement (`catchupAmount`) et rattrapages saisis (`catchupEnteredAmount`) — plan `.cursor/plans/rattrapage_versement_et_kpi_b4436c59.plan.md`. Règle « dû à la caisse » = A Verser + rattrapages saisis hors période. PR 2 Frontend 2.52.0 : cockpit `/report/daily` et fiche `/report/daily/commercials/:username`, ancienne interface sur `/report/daily/classic`, visite guidée maison (`GuidedTourService`, vue une fois par utilisateur, désactivée sous Playwright), champ « Rattrapage » du versement. Karma n'est pas lancé en CI et `ng test` ne compile pas sur `main` (specs cassées hors rapport) : lancer les specs ciblées avec `--include`. PR 3 Frontend 2.53.0 : `/report/daily/deposits` (totaux, surplus, remise) et `/report/daily/journal` (totaux par type), guide gestionnaire réécrit. L'ancienne présentation reste à retirer plus tard, sur décision du métier.
0. **Total encaissé du rapport journalier** (2026-11-19). Frontend 2.51.0 / Backend 1.54.0 : le total encaissé se ventile en opérations de la période et rattrapages (cotisations de jours passés remises dans la période), par commercial et dans la Synthèse caisse. Constat COM005 du 18/11 : synthèse 376 950 = 362 650 (toutes caisses) + 14 300 de rattrapages COM005 ; le bloc COM005 n'affichait que 113 800.
1. **OTP espace client** (2026-11-18). Backend 1.53.5 : `NOTIFICATION_HUB_ENABLED` est `true` par défaut. Le message « envoi SMS OTP n'est pas activé » venait de ce défaut `false`. Prod : OAuth2, secret Keycloak `elykia` obligatoire au démarrage, `environment` vide → SMS réel. Checklist : `backend/docs/NOTIFICATION_HUB_LOCAL.md`. Effet de bord corrigé le 2026-11-19 : le workflow E2E (profil `prod`, sans secret) échouait au démarrage ; il passe `NOTIFICATION_HUB_ENABLED=false`.
2. **Annulation de ventes + reçu de commande** (2026-11-18). Frontend 2.50.5 / Backend 1.53.4 / Mobile 2.40.5 : filtres historique ; design system documents ; authenticité discrète (`receipt-order-lines`).
3. **Ruban / bandeau environnement** (2026-11-18). Frontend 2.50.4 / Mobile 2.40.4 : indicateur hors prod.

## Fuseau

Production et métier : GMT (UTC+0, Lomé). Citer les heures en GMT. Ne pas convertir en heure Maurice. Voir `decisions.md`.

## Travail en cours dans l’arbre

Branches `feat/report-cockpit-backend` → `feat/report-cockpit-frontend` → `feat/report-cockpit-deposits-journal` (PR empilées, à fusionner dans l'ordre).

## Quand on touche au code

Mettre à jour ce fichier dans la même PR : version, PR ou commit, et le parcours modifié en une ou deux phrases. Retirer les entrées devenues de l’historique (elles restent dans `docs/CHANGELOG.md`).
