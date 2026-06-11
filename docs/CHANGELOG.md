# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Sections are ordered **descending by date**: most recent at the top, oldest at the bottom.
`[Unreleased]` always appears first, immediately after this header.

## [Unreleased]

### Added

- **CI/CD —** workflow GitHub Actions `e2e.yml` (ELYKIA QA — E2E Web) : smoke + golden path Playwright après déploiement TEST CD, en parallèle du build APK mobile.
- **Docs —** `README.md` racine (vue fonctionnelle, structure, démarrage dev) et `docs/README_E2E_TEST.md` (documentation complète des tests E2E).
- **Backend —** endpoint `POST /api/v1/tontines/sessions/current/reopen` pour réouvrir la session tontine entre deux exécutions E2E.
- **Backend —** endpoint `POST /api/v1/commercial-stock/e2e/seed-residual` pour préparer un stock résiduel du mois précédent (tests E2E rattrapage crédit).
- **Frontend —** tests E2E Playwright golden path **phase 6** : rattrapage crédit sur stock antérieur (seed API, distribution COM020, crédit `RAT-`, décrémentation stock résiduel) ; fixture `rattrapage-helpers`.
- **Frontend —** `data-testid` E2E sur la page rattrapage crédit et lien sidebar Rattrapages.
- **Backend —** endpoint `POST /api/v1/tontines/sessions/current/close` pour clôturer la session tontine en cours (prérequis livraison E2E et opérations admin).
- **Frontend —** tests E2E Playwright golden path **phases 4–5** : retour stock commercial, vente comptant, contrôle totaux stock/rapport ; parcours tontine complet (membre, collecte, demande stock tontine, livraison client) avec validation KPIs ; fixtures `stock-return-helpers`, `stock-tontine-helpers`, `tontine-helpers`.
- **Frontend —** `data-testid` E2E sur retours stock, stock tontine, tontine (membre, collecte, livraison) et KPIs tontine du rapport journalier.
- **Frontend —** tests E2E Playwright (web admin) : golden path **phases 1–3** — après sortie stock, enchaînement vente à crédit, mise journalière (recouvrement), liste recouvrements, rapport journalier (filtre Aujourd'hui + COM020), versement caisse (billetage) et contrôle stock mensuel agrégé ; fixtures `credit-helpers`, extensions API crédits/recouvrements/rapport/stock.
- **Frontend —** `data-testid` E2E sur vente crédit (`credit-add`, `credit-list`, modal mise), rapport journalier, versement caisse, billetage, recouvrements et lignes stock mensuel.
- **Frontend —** tests E2E Playwright (web admin) : golden path phases 1–2 avec flux sortie stock ordonné (CREATED → validation **ges003** → livraison **mag001** → stock mensuel COM020), assertions API + UI sur les statuts, pagination liste demandes ; fixtures `stock-request-helpers`, API `getStockRequestStatus`.
- **Backend —** agrégation de recouvrement sur le stock mensuel commercial (`recoverySummary`) : montant recouvré, reste à recouvrer et taux, calculés via l'historique de ventes (`deltaValue`) et les totaux crédit (`totalAmountPaid` / `totalAmountRemaining`).
- **Frontend —** KPIs de recouvrement sur le dashboard stock mensuel (montant recouvré, reste à recouvrer, taux de recouvrement).
- **Deploy —** `docker-compose.dev.yml` : MinIO local sur les ports 19000 (API) et 19001 (console), sans Traefik, ports configurables via `MINIO_API_PORT` / `MINIO_CONSOLE_PORT`.
- **Docs —** skill Cursor `.cursor/skills/keep-changelog/` — impose la mise à jour du changelog après chaque tâche agent (équivalent projet de `.agent/skills/keep-changelog/`).
- **Backend —** endpoint `PATCH /api/v1/clients/info-update` pour la mise à jour des informations client depuis le mobile, sans toucher aux photos.
- **Mobile —** synchronisation des fiches client modifiées (`updatedInfo`) via le nouvel endpoint, distincte des flux photo et localisation.
- **Backend —** système complet de rapport mensuel avec entités `MonthlyReportRun`/`MonthlyReportFile`/`MonthlyReportSnapshot`/`MonthlyReportOutboxEntry`, API REST (`GET tree`, `GET download`, `POST generate`, `GET runs`) et génération PDF global + par commercial.
- **Frontend —** nouvelle page `/monthly-reports` avec accordéons année/mois/fichiers et téléchargement direct des PDF, exposée dans le menu pour les profils `ROLE_REPORT`.
- **Frontend —** feature flag `monthlyReports` (Firebase Remote Config) pour activer progressivement les rapports mensuels : guard de route, masquage du menu sidebar.
- **Frontend —** page `/monthly-reports` alignée sur le style projet (header-card, KPIs, toolbar, tableau) ; skill `.cursor/skills/frontend-ui-style/` pour imposer ce pattern sur les futures pages UI.

### Fixed

- **Frontend —** tests E2E golden path : robustesse mise journalière, KPIs journaliers, autocomplete livraison tontine, collecte 50 000 FCFA, réouverture session tontine en `beforeAll` ; ventes comptant via `COM001` ; collecte tontine par `COM020`.

### Changed

- **Frontend —** livraison tontine : le bouton « Marquer comme Livré » est réservé au gestionnaire (`ROLE_REPORT`) et au commercial (`ROLE_EDIT_TONTINE`), plus au magasinier ; `data-article-id` sur les options du modal livraison ; golden path E2E étape 26 par COM020.
- **Frontend —** golden path E2E : 31/31 étapes vertes — client dédié rattrapage (sans crédit en cours), mise journalière min. 200 FCFA, sélection article stock tontine/livraison alignée sur `testArticle`.
- **Backend —** rapports mensuels : régénération idempotente — purge des fichiers, outbox et snapshots existants (MinIO + base) avant une nouvelle génération pour le même mois.
- **Backend —** rapports mensuels : noms de fichiers téléchargeables suffixés par mois et année (`general-05-2026.pdf`, `commercial-COM001-05-2026.pdf`).
- **Backend —** templates PDF rapports mensuels : style aligné sur le rapport journalier (en-tête bleu, KPIs, tableaux), libellés métier sans références techniques (CreditTimeline, TontineDelivery, etc.), montants en FCFA.
- **Backend —** scheduler outbox rapports mensuels : logs INFO à chaque exécution (début, MinIO indisponible, volume à traiter, succès/échec par entrée, bilan).
- **Mobile —** édition complète d'un client déjà synchronisé : formulaire sans photos (gérées via le menu dédié), avec synchronisation différée des informations texte.
- **Backend —** `PUT /api/v1/clients/{id}` : préservation des photos et URLs si le corps de requête ne les fournit pas.
- **Backend —** intégration MinIO étendue avec bucket dédié `elykia-reports`, clé de stockage normalisée des rapports et opérations génériques upload/download/delete réutilisables.
- **Backend —** enrichissement de la traçabilité `CommercialStockMovement` (prix achat/vente unitaires, marge ligne, source fonctionnelle) alimenté à l’écriture dans les flux sortie/retour/crédit.

### Fixed

- **Backend —** KPI recouvrement stock mensuel : prise en compte des ventes comptant sans `stock_item_id` (rapprochement article/commercial/mois), recouvrement intégral au montant vendu pour le type `CASH`, et cohérence du reste à recouvrer ; migration `V51` de rattrapage des `stock_item_id` (syntaxe PostgreSQL corrigée).
- **Backend —** ventes comptant : valorisation du stock commercial corrigée (`totalSoldValue`, PMP, prix d'achat) avec repli sur `sellingPrice` si `unitPrice` absent, et migration `V50` de rattrapage des données historiques.
- **Backend —** ventes crédit/comptant : le `unitPrice` des lignes `CreditArticles` est figé dès le passage en `INPROGRESS` (setter, garde JPA `@PreUpdate`, blocage du recalcul catalogue dans `totalAmount`) pour éviter l'écrasement des prix historiques lors d'évolutions tarifaires.
- **Deploy —** réintégration de la configuration MinIO S3 depuis `feature/s3` : service MinIO dans les docker-compose test/prod, labels Traefik (console + API), variables d'environnement backend et templates `.env` dans `setup-server.sh` (conservation des ajouts rclone).
- **Backend —** rapports mensuels : clôture des stocks mensuels hors transaction `prepare` (une transaction `REQUIRES_NEW` par commercial) pour éviter le rollback silencieux lorsque la clôture échoue pour un commercial.
- **Backend —** rapports mensuels : génération parallèle des PDF commerciaux — le run est commité avant les écritures outbox/fichiers (transactions `REQUIRES_NEW` par worker) pour éviter la violation de clé étrangère `run_id`.
- **Backend —** rapports mensuels : colonnes d'audit alignées sur `date_reg` / `reg_user_id` (convention `BaseEntity`) dans les migrations et requêtes SQL natives ; migration corrective `V49` pour les environnements déjà déployés.
- **Mobile —** correction de l'écrasement de l'état `isLocal`/`isSync` lors de la modification d'un client synchronisé.

## [2026-06-09]

### Added

- `docs/CHANGELOG.md` — journal des modifications du monorepo ELYKIA (format Keep a Changelog).
- Skill `.agent/skills/keep-changelog/` — impose la mise à jour du changelog après chaque tâche agent.

### Changed

- **Mobile — initialisation clients** : purge conservatrice des clients synchronisés (`ClientRepository.deleteSyncedForReinit`) déclenchée après le succès de la première page API, avant l'insertion paginée ; préserve les clients locaux non synchronisés et ceux avec modifications en attente (`updated`, `updatedPhoto`, `updatedPhotoUrl`).
- **Mobile — initialisation comptes** : même stratégie de purge conservatrice (`AccountRepository.deleteSyncedForReinit`) et fetch paginé (20 éléments/page) à la place d'un chargement unique de 2000 comptes.
- **Docs —** convention d'ordre descendant des sections du changelog (date la plus récente en haut).

### Fixed

- **Mobile — données clients/comptes obsolètes** : suppression des entités synchronisées « fantômes » ou périmées lors de la ré-initialisation quotidienne, afin de refléter la dernière version serveur sans charger l'intégralité des clients en mémoire.
