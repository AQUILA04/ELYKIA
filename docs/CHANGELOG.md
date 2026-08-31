# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Sections are grouped **by component** (Frontend, Mobile, Backend, Customer-space, Docs & Infra).
Within each component, versions are ordered **descending** (most recent at the top).
Version numbers align with `package.json` (frontend apps) or `backend/pom.xml` (API).

## Frontend — [2.18.1] — 2026-08-19

### Fixed

- Compilation production : le filtre carnet tontine n’envoie plus `'ALL'` dans `TontineMemberQueryParams.carnetVerified`, et une accolade orpheline du SCSS dashboard est retirée.

## Frontend — [2.18.0] — 2026-08-19

### Added

- Onglet Remise : plage Du / Au pour remettre seulement les versements d’un intervalle, sans forcer tout le mois.

### Changed

- Les dépenses de type Approvisionnement ne sont plus proposées à la déduction d’une remise.

## Frontend — [2.17.0] — 2026-08-19

### Added

- Vérification de carnet tontine : badge sur la fiche membre, bouton Vérifier/Annuler, sélection en masse, filtre Carnet et exports PDF vérifiés / à vérifier (`ROLE_TONTINE_CARNET_VERIFY`).

## Mobile — [2.28.6] — 2026-08-31

### Fixed

- Nouvelle distribution : rafraîchissement hybride du stock commercial en ligne (SWR) — affichage immédiat du cache local puis mise à jour depuis l’API, avec réconciliation des ventes offline non synchronisées.

## Mobile — [2.28.5] — 2026-08-20

### Changed

- Menu Options de la liste Clients (`Clients à Recouvrer`) aligné sur `elyk-action-sheet`.

### Fixed

- Dashboard ne reste plus « Hors ligne » après login : `resetAppData` ne réinitialise plus le statut réseau ; ping d’init + refresh au login et à l’entrée du dashboard mettent à jour le store.

## Mobile — [2.28.4] — 2026-08-20

### Changed

- CTA sélection client (recouvrement) en outline plus discret ; footer Imprimer le Rapport en navy ; consentement journalier et menus ActionSheet tontine (dashboard + détail membre) alignés DS ; alertes tontine via `elyk-alert`.

### Fixed

- Chevauchements hero/search/KPI : search-overlap −28px, KPI sans double overlap après search (distributions, tontine) ; liste Articles avec hero+search dans le même flux.

## Mobile — [2.28.3] — 2026-08-20

### Changed

- Menu popover fiche client et écran Modifier le client alignés sur le design system Elykia navy (cartes, champs, footer).

### Fixed

- Tontine : recherche repositionnée sous le hero (plus de chevauchement sur la 2ᵉ rangée de KPI).
- Dashboard : marge basse suffisante pour que la dernière action rapide ne soit plus masquée par la tab bar.

## Mobile — [2.28.2] — 2026-08-20

### Changed

- Écran de connexion : labels des champs hors chevauchement (structure `.elyk-field`) ; actions « web » et « restaurer » en liens discrets sous le statut, pour laisser « SE CONNECTER » en focus principal.

## Mobile — [2.28.1] — 2026-08-20

### Changed

- Gestion des commandes derrière le feature flag `ordersManagement` (défaut `false`) : guard routes, section Plus et raccourci Distributions masqués tant que le flag n'est pas activé via Remote Config.

## Mobile — [2.28.0] — 2026-08-20

### Added

- Domaine Commandes : page détail (`/tabs/orders/detail/:id`) avec lignes articles, badges statut/sync et actions Modifier/Supprimer si PENDING.

### Changed

- Liste des commandes branchée sur NgRx paginé + item compact DS (réf, client, montant, date, statut) ; create/edit via `base-transaction` aligné navy.
- Édition commande : hydratation client, persistance `clientId`, garde statut PENDING ; retour vers le détail après modification.

### Fixed

- Raccourci « Nouvelle Commande » depuis la liste Distributions (stub `console.log` → `/tabs/orders/new`).

## Mobile — [2.27.0] — 2026-08-20

### Changed

- Domaine Recouvrement : nouveau (create + credit-card, amount-input, reliquat), détail modal et reçu alignés sur le design system Elykia navy.

### Fixed

- FAB liste des recouvrements : lien mort `/tabs/more/recovery` remplacé par `/recovery`.

## Mobile — [2.26.0] — 2026-08-20

### Changed

- Domaine Tontine commercial : dashboard, détail membre, cotisation, inscription, livraison et reçus alignés sur le design system Elykia navy (heroes, KPI, cartes, search, footer sticky) ; suppression du thème violet legacy `#667eea`.

## Mobile — [2.25.0] — 2026-08-20

### Changed

- Onglet Plus / Paramètres et écrans enfants (sync manuelle, erreurs sync, mot de passe, localités, articles, recouvrements, rapport journalier) alignés sur le design system Elykia navy ; primitives `.elyk-settings-group` / `.elyk-settings-row`.

## Mobile — [2.24.1] — 2026-08-20

### Changed

- Historique recouvrements (détail distribution) : section en carte `.elyk-card`, lignes alignées sur le pattern liste, états vide/chargement/erreur DS.

## Mobile — [2.24.0] — 2026-08-20

### Changed

- Domaine Distributions : liste, item, détail modal, historique recouvrements, nouvelle/édition et modal de confirmation alignés sur le design system Elykia navy (heroes, KPI, cartes, search overlap, footer sticky).

## Mobile — [2.23.1] — 2026-08-20

### Changed

- Modal `client-selector` : hero navy, search en overlap, cartes clientes et avatars navy-pale, alignée sur le design system Elykia.

## Mobile — [2.23.0] — 2026-08-20

### Changed

- Design system commercial : navy Elykia poussé au-delà du shell RM (heroes lumineux, verre, KPI en overlap, tab bar flottante, login éditorial) sur login, dashboard, clientes, nouveau client et à recouvrer.

## Mobile — [2.22.1] — 2026-08-19

### Fixed

- Smoke Playwright : le dashboard tontine est vérifié via son titre, pas le `ion-content` caché de la page login encore dans la pile Ionic.

## Mobile — [2.22.0] — 2026-08-19

### Added

- Chef de recouvrement : transfert de commercial (crédit / tontine, ventes en cours) depuis l’onglet Clients, en hybride online-first avec file hors-ligne et sync prioritaire depuis Plus.

## Mobile — [2.21.1] — 2026-08-19

### Fixed

- Smoke Playwright : le dashboard tontine s’ouvre par navigation interne (sans rechargement) pour conserver la session mockée.

## Mobile — [2.21.0] — 2026-08-19

### Added

- Terrain chef de recouvrement : vérification unitaire et en masse des carnets tontine, badge Vérifié, file d’attente hors-ligne et sync depuis Plus.

## Backend — [1.12.3] — 2026-08-25

### Fixed

- Opération journalière : le reste à payer (liste et PDF) est net du reliquat client, comme pour les crédits en retard.

## Backend — [1.12.2] — 2026-08-19

### Fixed

- Liste clients : le filtre commercial matche aussi `tontineCollector`, `agencyCollector` et `recoveryCollector`, pas seulement le commercial crédit (recherche Elasticsearch, liste, KPI et export PDF).

## Backend — [1.12.1] — 2026-08-19

### Added

- Pack terrain RM : le DTO client expose `tontineCollector` en plus du commercial crédit.

## Backend — [1.12.0] — 2026-08-19

### Added

- Remise de période : `startDate` / `endDate` optionnels sur le résumé, la soumission et l’initiation pour lier seulement les versements de la plage.

### Changed

- Les dépenses de type Approvisionnement sont exclues des candidats et refusées à l’association d’une remise.

## Backend — [1.11.0] — 2026-08-19

### Added

- Flag `carnetVerified` sur le membre tontine (session courante), droit `ROLE_TONTINE_CARNET_VERIFY`, API unitaire/bulk et export PDF 3 colonnes (ordre alphabétique colonne d’abord).

## Frontend — [2.16.28] — 2026-08-18

### Fixed

- Playwright : le projet `golden-path` est de nouveau déclaré à côté de `smoke` et `august-2026` (`npm run test:e2e:golden` / pipeline `e2e.yml`).

## Backend — [1.10.10] — 2026-08-18

### Changed

- `GET /api/v1/credits/collector-transfers` : le détail des passations est paginé (`page` / `size`, 25 par défaut) pour éviter de tout charger en mémoire.

## Frontend — [2.16.27] — 2026-08-18

### Changed

- Transfert Ventes : tableau « Détail des ventes » paginé côté serveur (`mat-paginator`), avec rechargement au clic sur un couple et conservation de la page.

## Backend — [1.10.9] — 2026-08-17

### Changed

- Profil chef de recouvrement : `ROLE_CONSULT_CLIENT`, `ROLE_EDIT_CLIENT`, `ROLE_ASSIGN_CLIENT_COLLECTOR` et `ROLE_ASSIGN_CREDIT_COLLECTOR` attribués par défaut (nouveaux comptes et comptes existants, migration Flyway `V95`).

## Frontend — [2.16.26] — 2026-08-17

### Added

- E2E `W-P1-15` / `W-P1-16` : retrait d’une dépense sur remise PENDING (net recalculé, sans accusé) et plusieurs remises par période (versements déjà remis exclus du reste à remettre).

## Frontend — [2.16.25] — 2026-08-17

### Added

- E2E `W-P1-13` / `W-P1-14` : bilan tontine annuel (collectes − versements) et répartition des cotisations par commercial avec badge Actuel.

## Frontend — [2.16.24] — 2026-08-17

### Added

- E2E `W-P1-10` / `W-P1-11` : transfert async des ventes `INPROGRESS` depuis la liste clients (historique collector, restauration COM020) et champs commerciaux gated à l’édition.

## Frontend — [2.16.23] — 2026-08-17

### Added

- E2E `W-P1-08` / `W-P1-09` : case recherche uniquement par référence, et lien stock mensuel source vers le modal des ventes.

## Frontend — [2.16.22] — 2026-08-17

### Added

- E2E `W-P1-05` à `W-P1-07` : exports PDF reste clients, stock mensuel (qté panneau = PDF) et fiche client navy.

## Frontend — [2.16.21] — 2026-08-17

### Added

- E2E `W-P1-01` à `W-P1-04` : bilan crédit annuel (2 rangées KPI, formule reste commercial, reste client live, modal infinie + lien fiche).

## Frontend — [2.16.20] — 2026-08-17

### Changed

- E2E août : `recov001` doit avoir la gestion clients et le changement de commercial (JWT + menu Clients + colonnes de sélection).

## Backend — [1.10.8] — 2026-08-17

### Fixed

- Collecte tontine : une `collectionDate` égale à aujourd’hui n’est plus traitée comme rattrapage (collecte live, comme si le champ était absent).

## Mobile — [2.20.9] — 2026-08-18

### Added

- E2E `RM-P1-04` : arrange API d’un membre tontine COM020 `SESSION_INPROGRESS` (session année en cours) avant le pack, puis contrôle mois-par-mois CONFORME/ECART + badge Terrain.
- E2E `RM-P1-05` à `RM-P1-08` : édition client (téléphone, GPS, quarter lecture seule, MLL dérivé), ordre de sync Plus, barre session limitée à Retards/Plus, KPI Clôturé du jour + badge file d’attente.

## Mobile — [2.20.8] — 2026-08-18

### Added

- E2E `RM-P1-01` à `RM-P1-03` : plafond 3 commerciaux + toast, modal localités avec recherche, contrôle carnet crédit CONFORME/ECART + badge du jour. `RM-P1-04` skip si le pack n’a aucun membre tontine pour l’année de session en cours.

## Mobile — [2.20.7] — 2026-08-18

### Added

- E2E `M-P1-01` à `M-P1-05` : création client online-first, fallback 4xx hors ligne, SWR listes, budget livraison V1/V2. `M-P1-03` skip si aucun crédit COM020 ; `M-P1-06` skip Playwright (onglets inaccessibles depuis la pile tontine).

## Mobile — [2.20.6] — 2026-08-17

### Added

- E2E `RM-P0-06` : clôture terrain hors-ligne (backend arrêté), file Plus, un POST `close-credits` à la reconnexion.

## Mobile — [2.20.5] — 2026-08-17

### Added

- E2E `RM-P0-04` : wizard plan du jour (commerciaux, localités, téléchargement pack) jusqu’au shell Retards/Terrain/Clients/Plus.

### Changed

- M-P0-03 (reload init-safe) n’est pas joué en navigateur : le reload Playwright efface le stockage local, contrairement à l’APK.

## Mobile — [2.20.4] — 2026-08-17

### Changed

- E2E `M-P0-02` : collecte tontine hors-ligne après arrêt réel du backend, sync manuelle à la relance, puis contrôle API (un seul POST 2xx).

## Mobile — [2.20.3] — 2026-08-17

### Fixed

- Sync des cotisations du jour : `collectionDate` n’est envoyée que pour un vrai rattrapage (date strictement antérieure), ce qui évite le rejet serveur « date de rattrapage ».
- Ping `/actuator/health` : timeout 4 s pour ne pas bloquer l’écran d’initialisation quand le backend est arrêté.
- Init hors-ligne : pose `initialization_complete` pour éviter la boucle `/initial-loading` ↔ `/tabs`.

### Added

- E2E hybrid tontine (`M-P0-01` online) et parcours in-app (Cotiser, onglet Plus → sync manuelle).

## Backend — [1.10.7] — 2026-08-17

### Fixed

- Changement de commercial : rejet si le nouveau username est identique à l’actuel (vente unitaire, bulk ventes, bulk clients, `assign-collector`).

## Frontend — [2.16.19] — 2026-08-17

### Fixed

- Contrôle UI du changement de commercial : avertissement si le commercial sélectionné est déjà celui des ventes/clients choisis (listes + fiche crédit).

## Frontend — [2.16.18] — 2026-08-17

### Added

- Suite E2E Playwright `august-2026` (permissions KPI / change-collector, paramètre tontine V1/V2) rejouable via `npm run test:e2e:august`.

## Mobile — [2.20.2] — 2026-08-17

### Added

- Suite E2E Playwright shell chef de recouvrement (`@rm` / `@august-2026`) : login `/rm`, gate plan, refus commercial.

## Backend — [1.10.6] — 2026-08-17

### Fixed

- Éviction des caches listes clients (`clients-page`, `clients-by-commercial-page`) après changement de commercial depuis les ventes (unitaire / bulk) et après le transfert async des crédits `INPROGRESS`.

## Backend — [1.10.5] — 2026-08-17

### Added

- Permission `ROLE_ASSIGN_CREDIT_COLLECTOR` (migration Flyway `V94`) pour le changement de commercial sur les ventes (liste bulk et fiche crédit).
- Transfert async des ventes `INPROGRESS` depuis le modal liste clients (`transferInProgressCredits`) : historisation `credit_collector_history` et mise à jour set-based par lots.

### Changed

- Édition client (`PUT /api/v1/clients/{id}`) et `assign-collector` : détection des changements `collector` / `tontineCollector` avec historisation `client_collector_history` (même flux que le bulk).
- Endpoints `change-collector` / `bulk-change-collector` crédits et `bulk-assign-collectors` clients protégés par `@PreAuthorize`.

## Backend — [1.10.4] — 2026-08-17

### Fixed

- Cycle de beans Spring entre `TontineAllocationMigrationService` et `TontineAllocationMigrationJobRunner` (injection `@Lazy` côté runner).

## Backend — [1.10.3] — 2026-08-14

### Added

- Permissions KPI financiers par page (`ROLE_KPI_FINANCIER_*`) : migration Flyway `V93` (rôles, profils cibles et copie sur les comptes existants, hors chef de recouvrement).

### Security

- Les agrégats financiers (CA, marges, totaux, bilans, KPI BI/dépenses) exigent désormais la permission de la page correspondante ; le chef de recouvrement conserve les listes opérationnelles et le recouvrement.

## Frontend — [2.16.17] — 2026-08-17

### Added

- Liste clients : case « Transférer automatiquement les ventes… » dans le modal de changement de commercial (ventes `INPROGRESS` transférées en async côté backend).

### Changed

- Changement de commercial ventes et fiche crédit : contrôle par `ROLE_ASSIGN_CREDIT_COLLECTOR` (plus masquage par profil promoteur / chef de recouvrement).
- Liste clients : bulk changement de commercial visible via `ROLE_ASSIGN_CLIENT_COLLECTOR` uniquement (feature flag `clientBulkAssignCollector` retiré de l’UI).
- Formulaire client (édition) : champs commerciaux crédit/tontine modifiables seulement avec `ROLE_ASSIGN_CLIENT_COLLECTOR`.

## Frontend — [2.16.16] — 2026-08-14

### Added

- Masquage des bandeaux KPI financiers selon la permission de chaque page ; le rapport journalier ne conserve que l’onglet Recouvrement terrain sans le rôle KPI.

### Changed

- Module `dashboard` migré en lazy-loading (`loadChildren`), URL `/home` inchangée.

## Backend — [1.10.2] — 2026-08-14

### Added
- `TontineCollectionRespDto` expose `societyShareAmount`, `advanceToNextMonth` et `contributionMonth` pour le mobile.

## Backend — [1.10.1] — 2026-08-14

### Changed
- Validation stricte de `TONTINE_SOCIETY_SHARE_VERSION` : seules les valeurs `V1` et `V2` sont acceptées (normalisation en majuscules).

## Backend — [1.10.0] — 2026-08-14

### Added
- Part société tontine V1/V2 : paramètre `TONTINE_SOCIETY_SHARE_VERSION` (défaut V1), politiques d’allocation extraites (`V1TontineAllocationPolicy`, `V2TontineAllocationPolicy`).
- V2 : prélèvement uniquement sur les mois réellement cotisés (y compris rattrapage), capital pouvant dépasser 31 jours/mois, flag API `advanceToNextMonth`.
- Job async de migration à la bascule : snapshot par membre, recalcul keyset (`id > lastId ORDER BY id`), verrouillage des écritures tontine pendant le job.
- Endpoints `GET /allocation-migration/status` et `POST /sessions/current/recalculate-allocations`.
- Migration `V92__tontine_collection_allocation_v2.sql` (champs collecte + tables run/snapshot).
- `ParameterUpdatedEvent` et `ParameterService.getValue`.

## Frontend — [2.16.15] — 2026-08-14

### Changed
- Paramètre `TONTINE_SOCIETY_SHARE_VERSION` : sélection V1/V2 (plus de saisie libre).
- Module `parameters` migré en lazy-loading (`loadChildren`).

## Frontend — [2.16.14] — 2026-08-14

### Added
- Bandeau d’alerte sur les pages tontine pendant le recalcul des parts société (progression, blocage des actions d’écriture).

## Backend — [1.9.16] — 2026-08-14

### Added
- Bilan tontine annuel par commercial : total des collectes réellement enregistrées, versements tontine et reste à verser.
- Répartition des cotisations d’un membre par commercial collecteur, avec identification du commercial actuellement en charge.
- Migration `V91__tontine_yearly_indexes` pour accélérer les agrégats annuels et le détail membre.

## Frontend — [2.16.13] — 2026-08-14

### Added
- Rapport journalier : carte « Bilan tontine » présentant les collectes, les versements et le reste annuel du commercial.
- Fiche membre tontine : répartition du total cotisé entre les commerciaux ayant enregistré les collectes, avec badge « Actuel ».

## Backend — [1.9.15] — 2026-08-14

### Added
- Migration `V90__yearly_portfolio_indexes` : indexes partiels sur `credit_collector_history`, `credit` et `credit_timeline` pour accélérer le bilan annuel (stock 01/01, créances reçues/cédées, reste live).

## Backend — [1.9.14] — 2026-08-14

### Changed
- Bilan annuel crédit (option B) : stock d'ouverture au 01/01, créances reçues/cédées (passations), portefeuille confié ; `remainingAtCommercialAmount` = portefeuille − versements.
- « Reste chez le client » : somme live de tous les crédits encore dus chez le commercial (sans filtre `beginDate` sur l'année) ; modal et export PDF alignés.

## Frontend — [2.16.12] — 2026-08-14

### Changed
- Bilan crédit du rapport journalier : deux rangées KPI (stock ouverture, ventes, reçues, cédées ; portefeuille confié, versements, reste commercial, reste client live).
- Modal « Reste chez le client » : libellés portefeuille live actuel, KPI portefeuille confié.

## Backend — [1.9.13] — 2026-08-13

### Changed
- Bilan annuel crédit : `remainingAtCommercialAmount` (ventes − versements) et `remainingAtClientAmount` (somme des `totalAmountRemaining`).

## Frontend — [2.16.11] — 2026-08-13

### Changed
- Bilan crédit du rapport journalier : KPI navy (4 cartes), libellés « Reste chez le commercial » / « Reste chez le client » (détail au clic).

## Backend — [1.9.12] — 2026-08-13

### Added
- Bilan annuel crédit : champ `totalCreditPaidOnCreditsAmount` (somme des `totalAmountPaid` des crédits débutés dans l’année).

## Frontend — [2.16.10] — 2026-08-13

### Added
- Rapport journalier : sous « Versements Crédit », affichage secondaire du payé consigné sur les crédits de l’année.

## Backend — [1.9.11] — 2026-08-13

### Fixed
- Export PDF « Reste chez les clients » : correction du formatage Thymeleaf (`formatDecimal` / séparateur `WHITESPACE`) qui provoquait une erreur 500 au parsing du template.

## Backend — [1.9.10] — 2026-08-13

### Fixed
- Export PDF stock mensuel (`GET /api/commercial-stocks/export/pdf`) : données lues depuis le `CommercialMonthlyStock` (collector/année/mois), alignées sur le dashboard, thème navy.

## Frontend — [2.16.9] — 2026-08-13

### Fixed
- Dashboard stock mensuel : export PDF paramétré par commercial/année/mois (mêmes quantités que le panneau) ; bouton **Télécharger rapport** en style navy `.btn-download`.

## Backend — [1.9.9] — 2026-08-13

### Added
- Endpoints `GET /api/daily-commercial-reports/yearly-remaining-credits` (pagination) et `/export/pdf` : liste allégée des crédits encore dus sur l’année (projection minimale, PDF navy).

## Frontend — [2.16.8] — 2026-08-13

### Added
- Rapport journalier : le KPI « Reste chez les clients » ouvre un modal paginé (infinite scroll) avec lien vers la fiche crédit et export PDF.

## Backend — [1.9.8] — 2026-08-13

### Changed
- Fiches PDF stock (demandes de sortie et retours, commercial et tontine) : pagination `n/N` en pied de page navy.

## Backend — [1.9.7] — 2026-08-13

### Added
- Export PDF `GET /api/v1/clients/by-commercial/{commercial}/export/pdf` (fiche client par commercial, KPIs, groupement par quartier).
- Thème PDF navy réutilisable (`PdfHtmlRenderer`, `PdfDocumentIdentity`) : en-tête AMENOUVEVE-YAVEH / TOKOIN HÔPITAL, pagination `n/N`.

## Frontend — [2.16.7] — 2026-08-13

### Added
- Liste clients : bouton **Fiche Client PDF** visible uniquement lorsqu’un commercial est sélectionné, pour télécharger la liste complète de ses clients.

## Backend — [1.9.6] — 2026-08-13

### Changed
- Rattrapage crédit : la date de début doit être comprise entre le 1er et le dernier jour du mois du stock source ; à défaut, le dernier jour du mois est utilisé.

## Frontend — [2.16.6] — 2026-08-13

### Changed
- Formulaire rattrapage : le datepicker de début est limité au mois du stock mensuel sélectionné (défaut = dernier jour du mois).

## Backend — [1.9.5] — 2026-08-13

### Fixed
- Recherche avancée crédits : les références contenant un tiret (ex. `RAT-YVG7ZNJ3`) ne sont plus interprétées comme une plage de dates et filtrent correctement les résultats.

### Added
- Recherche avancée : option `searchByReference` pour filtrer uniquement sur la référence crédit.
- Fiche crédit (`GET /credit/{id}`) : expose `sourceMonthlyStocks` (stock mensuel source déduit de `stock_item_id`).

## Backend — [1.9.4] — 2026-08-13

### Added
- Historique des remises : chaque ligne inclut la liste des versements liés (`deposits`) avec commercial, montants et référence.

## Frontend — [2.16.5] — 2026-08-13

### Fixed
- Liste crédits : recherche par référence rattrapage (`RAT-*`) retourne désormais le crédit attendu au lieu de toute la liste.

### Added
- Recherche avancée crédits : case « Rechercher uniquement par référence ».
- Fiche crédit : lien cliquable vers le stock mensuel source, ouvrant le modal des ventes du stock sur le dashboard.

## Frontend — [2.16.4] — 2026-08-13

### Added
- Historique des remises : ligne extensible affichant les versements par commercial pour chaque remise reçue.

## Backend — [1.9.3] — 2026-08-13

### Fixed
- Migration V89 : correction du backfill V88 qui liait tous les versements du mois à une remise déjà reçue ; seuls les versements antérieurs à la soumission et couverts par le montant de la remise restent liés.

## Frontend — [2.16.3] — 2026-08-13

### Fixed
- Historique des remises : statut « Reçu » pour une remise individuelle (au lieu de « Tout remis » réservé au résumé période).

## Backend — [1.9.2] — 2026-08-13

### Changed
- Remises mensuelles : plusieurs remises par période possibles ; seuls les versements non encore remis (`remittance_id` null) sont proposés.
- Migration V88 : lien `cash_deposit.remittance_id`, suppression contrainte unique `(year, month)`.
- Annulation versement : bloquée uniquement si le versement est déjà inclus dans une remise (PENDING ou RECEIVED).

## Frontend — [2.16.2] — 2026-08-13

### Changed
- Onglet Remise : affiche le reste à remettre et le montant déjà remis ; statut « Nouveau versement » quand des versements subsistent après une remise reçue.

## Backend — [1.9.1] — 2026-08-13

### Changed
- Historique des remises : tri par défaut `id DESC` (dernières remises en premier) avec pagination Spring (`page`, `size`).

## Frontend — [2.16.1] — 2026-08-13

### Changed
- Onglet Remise : historique paginé côté backend (10 par page), tri `id DESC`, contrôles de pagination.

## Backend — [1.9.0] — 2026-08-12

### Added
- Validation gestionnaire des entrées de stock : statuts `PENDING`, `VALIDATED`, `REFUSED`, `CANCELLED` sur `StockReception`.
- Endpoints `POST /api/v1/stock-receptions/{id}/validate` et `POST /api/v1/stock-receptions/{id}/refuse`.
- Migration V87 : champs audit (`validatedBy`, `refusedBy`, `cancelledBy`, etc.) et défaut `PENDING` pour les nouvelles réceptions.

### Changed
- `makeStockEntries` crée une réception `PENDING` sans impact stock, FIFO, historique ni dépense.
- `cancelReception` : abandon sans reverse si `PENDING` (créateur ou gestionnaire/admin) ; reverse stock réservé à l'ADMIN sur `VALIDATED`.

## Frontend — [2.16.0] — 2026-08-12

### Added
- Liste et détail réceptions : badges statut, filtre, KPI « en attente », actions Valider / Refuser / Abandonner / Annuler selon rôle.
- Entrée stock (`inventory-add`, quick entry) : message et redirection vers `/stock/receptions` en attente de validation.

## Backend — [1.8.0] — 2026-08-12

### Added
- Remise au gestionnaire : association de dépenses avec calcul du montant net (total versé − dépenses).
- Table de liaison `cash_period_remittance_expense` (migration V86) ; colonnes `expense_amount` / `net_amount`.
- Accusé réception (`acknowledge`) accepte un sous-ensemble de dépenses (retrait par le gestionnaire) avec recalcul.
- Verrou : update/delete dépense refusé si liée à une remise `RECEIVED`.

## Frontend — [2.15.0] — 2026-08-12

### Added
- Onglet Remise : sélecteur de dépenses (pré-cochées par période), KPIs Dépenses + Net en temps réel.
- Contrôle gestionnaire en `PENDING` : retrait de dépenses avec recalcul du net avant réception.
- Historique des remises : colonnes Dépenses et Net.
- Liste dépenses : badge « Comptabilisée » + actions éditer/supprimer désactivées si remise `RECEIVED`.
- Formulaire dépenses : mode lecture seule avec bannière si comptabilisée.

## Mobile — [2.20.1] — 2026-08-17

### Added

- Page Plus du chef de recouvrement : affichage de la version et bouton « Mettre à jour l'application » (même flux in-app Android que les commerciaux).

## Mobile — [2.20.0] — 2026-08-14

### Added
- Calcul local tontine V1/V2 selon le dernier `TONTINE_SOCIETY_SHARE_VERSION` synchronisé, avec replay des collectes hors-ligne.
- Persistance SQLite des champs d’allocation (`societyShareAmount`, `contributionMonth`, `advanceToNextMonth`) et des totaux membre (`societyShare`, `availableContribution`, `validatedMonths`, `currentMonthDays`).
- Payload de sync des collectes enrichi (`collectionDate`, `advanceToNextMonth`) et réconciliation online-first avec la réponse serveur.
- Indication « estimation hors-ligne » sur le reçu et le budget de livraison lorsque des collectes ne sont pas synchronisées.
- Retry manuel des erreurs de sync `tontine-collection`.

### Changed
- Chargement des paramètres désormais attendu jusqu’à l’écriture SQLite, et inclus dans `initializeAllData`.

## Mobile — [2.19.8] — 2026-08-12

### Changed
- Sync photos commercial hybride : téléchargement des thumbs MinIO (`profilPhotoThumbUrl` / `cardPhotoThumbUrl`) pour offline, avec fallback batch bytes PhotoStore pour les clients non migrés.

## Frontend — [2.14.8] — 2026-08-12

### Changed
- Fiche client : affichage photo via URL MinIO (`profilPhotoUrl` / thumb) en priorité, fallback stream PhotoStore legacy.

## Backend — [1.7.2] — 2026-08-12

### Added
- Migration PhotoStore → MinIO (`PhotoMigrationJob`, endpoint admin `POST /api/v1/admin/migrate-photos`, bootstrap optionnel `optimize.client.migrate-photo.enabled`).
- `ClientRespDto` / requêtes JPQL : exposition `profilPhotoThumbUrl` / `cardPhotoThumbUrl`.

## Mobile — [2.19.7] — 2026-08-12

### Added
- Liste Clients RM : avatar circulaire (thumbnail MinIO `profilPhotoThumbUrl`, fallback initiales).

## Backend — [1.7.1] — 2026-08-12

### Added
- Thumbnails MinIO (Thumbnailator) : upload original + `thumb.jpg`, outbox photo avec thumbs, URLs profil dans le pack offline RM (`profilPhotoUrl` / `profilPhotoThumbUrl`).

## Mobile — [2.19.6] — 2026-08-12

### Changed
- Barre de session RM limitée aux onglets **Retards** et **Plus** (retirée de Plan, Terrain, Clients).

## Mobile — [2.19.5] — 2026-08-12

### Added
- **RM session —** barre d’identité (username chef de recouvrement) + indicateur En ligne / Hors ligne (ping backend, refresh 30s) sur Plan, Retards, Terrain, Clients et Plus.

## Mobile — [2.19.4] — 2026-08-11

### Fixed
- Scroll RM (Retards / Terrain / Clients / Plus) : contenu enveloppé dans `ion-content`.

### Changed
- Recherche Clients RM : barre arrondie (navy) ; en-têtes de groupes libellés « Localité · … ».

## Mobile — [2.19.3] — 2026-08-11

### Changed
- Plan du jour RM : sélection des **localités** via modal multi-select + recherche (plus de chips exhaustifs) ; libellé métier « Localités » (champ `quarter` inchangé).
- Boutons Continuer en sticky pour rester accessibles.

## Mobile — [2.19.2] — 2026-08-11

### Fixed
- Typage `tontineFieldControlsToday` dans le pack RM (plus de `unknown[]` / erreur `status` sur Terrain).

## Mobile — [2.19.1] — 2026-08-11

### Fixed
- Compilation Terrain RM : typage du statut de contrôle tontine du jour (`unknown[]`).

## Mobile — [2.19.0] — 2026-08-11

### Added
- **RM contrôle carnet tontine (V2) —** pack offline avec membres + mois système, sheet mois-par-mois, file `rm_tontine_field_controls` + sync via `POST /tontines/members/{id}/field-controls`.
- Onglet Terrain : liste tontine par commercial/quartier + badge CONFORME/ECART du jour.
- Sync Plus : contacts → contrôles crédit → contrôles tontine → clôtures.

## Backend — [1.7.0] — 2026-08-11

### Added
- **Offline pack RM —** `includeTontine=true` peuplé : membres `SESSION_INPROGRESS` (filtre `tontineCollector` + quarters), mois 2–11 avec montants système, contrôles tontine du jour.

## Mobile — [2.18.0] — 2026-08-11

### Added
- **RM contrôle carnet crédit —** sheet hybrid (CONFORME/ECART), file offline + sync idempotente via `POST /credits/{id}/field-controls`.
- Bouton Contrôle sur le dashboard Retards + badge statut du jour.

## Mobile — [2.17.0] — 2026-08-11

### Added
- **RM clients —** édition hybrid téléphone + géoloc (`latitude`/`longitude`/`mll`) depuis l’onglet Clients.
- File offline contacts + sync (avant les clôtures) dans Plus.

## Backend — [1.6.2] — 2026-08-11

### Added
- **`PATCH /api/v1/recovery-manager/clients/{id}/contact`** — phone + géoloc, scoping au plan ACTIVE du jour.
- **ClientService.updatePhoneAndGeo** — mise à jour contact limitée (+ génération `mll`).

## Mobile — [2.16.0] — 2026-08-11

### Added
- **RM clôture hybrid —** sheet total/partiel, `OnlineFirstWriteCoordinator` → `close-credits`, file offline `rm_close_ops` + sync depuis Plus.
- KPI « Clôturé » du jour et badge file d’attente sur le dashboard Retards.

## Backend — [1.6.1] — 2026-08-11

### Added
- **close-credits —** champ `reference` optionnel (idempotence mobile) ; replay même référence = succès sans double écriture.
- Montant clôture en `@PositiveOrZero` (aligné cas restant net 0 / reliquat).

## Mobile — [2.15.0] — 2026-08-11

### Added
- **Chef de recouvrement —** shell mobile dédié (`/rm`) : tabs Retards / Terrain / Clients / Plus, design navy `#003366`.
- **Plan du jour —** wizard 1–3 commerciaux + quartiers (`client.quarter`) + téléchargement pack offline.
- **Feature flag** `recoveryManagerMobile` (actif par défaut) ; auth RM sans redirection SSO web.

## Backend — [1.6.0] — 2026-08-11

### Added
- **Field day plan —** table `recovery_field_day_plan` (V85) + APIs `field-plans` (CRUD jour, collector-stats, offline-pack).

## Docs & Infra — 2026-08-13

### Added
- Skill Cursor `elykia-pdf-style` : tout nouveau PDF backend doit utiliser le thème navy et `PdfHtmlRenderer`.

## Docs & Infra — 2026-08-11

### Added
- **Spec —** Chef de Recouvrement mobile : écrans premium (navy `#003366`) + contrats API + hybrid-first — `.kiro/specs/recovery-manager-mobile/screens-and-api.md`.

## Docs & Infra — 2026-08-10

### Added
- **Deploy —** migration DigitalOcean → Contabo : `migrate-do-to-contabo.sh`, compose slim `docker-compose.contabo-{prod,test}.yml`, guide `CONTABO_MIGRATION.md` (Postgres + MinIO → OCI, shared-traefik, Grafana/pgAdmin partagés).
- **Deploy —** exemple d’env Contabo `.env.contabo.prod.example`.

### Changed
- **Deploy —** README : liens migration Contabo ; landing-page DNS documenté en Proxied (aligné shared-traefik DNS-01).

## Backend — [1.5.6] — 2026-08-10

### Fixed
- Gestion des retards : le montant restant (liste, KPI, PDF) est net du reliquat client ; la clôture terrain consomme le reliquat pour solder le crédit tout en n’encaissant que le cash dû.

## Frontend — [2.14.7] — 2026-08-10

### Fixed
- Clôture des retards : validation autorisant un encaissement à 0 lorsque le restant net (après reliquat) est déjà soldé.

## Backend — [1.5.5] — 2026-08-10

### Changed
- Export PDF membres tontine par commercial : tri `quarter` / `lastname` / `firstname` ; requêtes allégées (projection + agrégats mensuels SQL) pour les gros portefeuilles.

## Frontend — [2.14.6] — 2026-08-08

### Changed
- Tontine : boutons d’export PDF protégés par le nouveau rôle `ROLE_TONTINE_MEMBER_PDF` (et `ROLE_ADMIN`).

## Backend — [1.5.4] — 2026-08-08

### Added
- Permission `ROLE_TONTINE_MEMBER_PDF` (constante + initialisation `application.yml`, assignée au profil ADMIN).

### Changed
- Export PDF membres par commercial : détail du nombre et du montant cotisé par mois pour chaque client ; endpoints protégés par `ROLE_TONTINE_MEMBER_PDF`.

## Frontend — [2.14.5] — 2026-08-08

### Added
- Tontine : bouton « Télécharger » (PDF) sur la liste des membres lorsqu’un commercial est sélectionné, et sur la fiche membre pour l’export des cotisations — visibles uniquement avec `ROLE_REPORT` ou `ROLE_ADMIN`.

## Backend — [1.5.3] — 2026-08-08

### Added
- Export PDF des membres tontine d’un commercial (session en cours : total contribué, part société, total disponible) et export PDF du détail des cotisations d’un membre (`GET /api/v1/tontines/members/export/pdf`, `GET /api/v1/tontines/members/{id}/export/pdf`).

## Docs & Infra — 2026-08-04

### Added
- `docs/sql/rapport_transferts_commerciaux.sql` : requêtes de rapport passation (synthèse COM014→COM013, détail, agrégats par couple / sortant / entrant), avec déduplication 1 crédit = 1 fois (dernière passation).
- `docs/sql/diagnostic_stock_recovery.sql` §9 : diagnostic disparité KPI stock vendu vs rapport créances (`begin_date`), cas COM007/mai, export périmètre stock.

### Changed
- `docs/sql/rapport_transferts_commerciaux.sql` : agrégats basés sur `DISTINCT ON (credit_id)` pour éviter le double comptage des ventes multi-passations.
- `backend/src/main/resources/db/business/request.sql` : export ventes aligné sur le périmètre stock mensuel (history + `stock_item_id`) au lieu de `begin_date` seul.

## Docs & Infra — 2026-08-02

### Added
- Pipeline CD (`cd.yml`) : après un promote manuel test → prod réussi, le job `promote-stop-test` arrête la stack test (`docker compose ... elykia-test ... down`).

## Frontend — [2.14.4] — 2026-08-04

### Changed
- Modal « Valeur stock vendu » : alignement à droite des en-têtes Montant total / Imputé stock ; lignes et références cliquables vers la fiche crédit.

## Frontend — [2.14.3] — 2026-08-04

### Changed
- Modal « Valeur stock vendu » : mise en forme alignée palette ELYKIA (header navy, KPI à bande, tableau, badges statut, bouton Fermer).
- Transfert Ventes : sous-titre précisant qu’un crédit n’est compté qu’une fois (dernière passation).

## Frontend — [2.14.2] — 2026-08-04

### Changed
- Page et menu renommés en « Transfert Ventes » ; alignement des en-têtes et montants (colonnes numériques à droite) sur les tableaux de passation.

## Frontend — [2.14.1] — 2026-08-04

### Changed
- Menu « Transfert Ventes » visible pour les profils `GESTIONNAIRE`, `SECRETARY`, `RECOVERY_MANAGER`, `ADMIN` et `SUPER_ADMIN` (aligné sur `application.yml`).

## Frontend — [2.14.0] — 2026-08-04

### Added
- Page `/credit/transferts-commerciaux` : rapport global des passations de commercial (KPI, filtres sortant/entrant/période, agrégat par couple, détail des ventes avec lien fiche crédit).

## Frontend — [2.13.0] — 2026-08-04

### Added
- Stock mensuel : clic sur le KPI « Valeur Stock Vendu » ouvre la liste des ventes liées (référence, client, montant, date, valeur imputée).

## Frontend — [2.12.16] — 2026-08-02

### Fixed
- E2E golden path : sélecteurs `e2e-credit-row` limités aux éléments `:visible` (évite le conflit table desktop / carte mobile)

## Frontend — [2.12.15] — 2026-08-02

### Changed
- Fiche membre tontine — contrôle terrain : détail mois en format lisible (`Mois` puis `Système | Carnet | Écart`), empilé sur mobile.

## Frontend — [2.12.14] — 2026-08-02

### Changed
- Modals contrôle terrain (crédit et tontine) : style aligné sur le modal de mise (header navy, bloc info avec bordure gauche, champs et boutons arrondis) sans KPI.

## Frontend — [2.12.13] — 2026-08-02

### Changed
- Contrôle terrain crédit et tontine : envoi API depuis la modal avec garde anti-double-clic (`isSubmitting`), référence d’idempotence générée une seule fois à l’ouverture, boutons désactivés pendant l’enregistrement.

## Frontend — [2.12.12] — 2026-07-30

### Added
- Fiche membre tontine : bouton « Contrôle terrain » (chef de recouvrement) pour saisir, mois par mois, le total marqué dans le carnet client.
- Modal de saisie terrain tontine : sélection multi-mois, montant carnet par mois, comparaison avec le total système du mois, note optionnelle.
- Fiche membre tontine : section conditionnelle « Contrôle terrain » (affichée uniquement si une saisie existe) avec totaux, écart, statut et détail mois par mois.

### Changed
- Service tontine : ajout des appels `createMemberFieldControl` et `getLatestMemberFieldControl` pour brancher la saisie et la visualisation terrain.

## Frontend — [2.12.11] — 2026-07-30

### Added
- Crédits en retard : action « Terrain » par ligne (desktop/mobile) pour enregistrer le total constaté dans le carnet client pendant le ratissage.
- Modal de saisie « Contrôle terrain » sur les crédits en retard (montant carnet + note optionnelle) avec envoi API dédié.
- Détail crédit : nouvelle section conditionnelle « Contrôle terrain » (affichée uniquement si une saisie terrain existe) avec comparaison système vs carnet, écart et statut conformité/disparité.

### Changed
- Service crédit : ajout des appels frontend `createFieldControl` et `getLatestFieldControl` pour brancher la saisie terrain et la visualisation dans le détail crédit.

## Frontend — [2.12.10] — 2026-07-30

### Added
- Listes demandes/retours stock (standard et tontine) : téléchargement PDF par demande depuis la ligne et la fenêtre détail.
- Listes demandes/retours stock (standard et tontine) : sélection multiple avec case « tout sélectionner » et export d’une fiche PDF commune pour les demandes sélectionnées.

### Changed
- Services frontend stock et stock tontine : nouvel appel d’export PDF avec paramètre `requestIds` pour cibler un lot précis de demandes/retours.

## Frontend — [2.12.9] — 2026-07-24

### Changed
- Rapport journalier : navigation par segments (boutons) à la place des onglets Material scrollables, grille 2×2 sur mobile

## Frontend — [2.12.8] — 2026-07-24

### Changed
- Liste clients : toolbar filtres harmonisée (labels au-dessus, champs alignés) ; en-tête non fixé sur mobile
- Fiche client : en-tête non fixé sur mobile (scroll page entière)

## Frontend — [2.12.7] — 2026-07-24

### Changed
- Rapport journalier — onglet Recouvrement terrain : tableaux « À remettre par commercial » et « Détail des opérations » en cartes sur mobile

## Frontend — [2.12.6] — 2026-07-24

### Changed
- Rapport journalier : barre de filtres globaux (période, dates, commercial) en toolbar structurée au-dessus des onglets ; sélecteur chef de recouvrement aligné sur l’onglet Recouvrement terrain

## Frontend — [2.12.5] — 2026-07-24

### Changed
- Mobile (&lt;768px) : listes ventes, clients, membres tontine et collectes tontine en cartes ; tableaux desktop conservés
- Filtres période (échéances, recouvrements, collecte tontine, ventes) : empilement mobile (pills, dates, commercial, Apply pleine largeur)

## Frontend — [2.12.4] — 2026-07-24

### Changed
- Détail crédit : tableau des articles en cartes sur mobile (nom, type, quantité, prix, total) ; tableau conservé sur desktop

## Frontend — [2.12.3] — 2026-07-24

### Changed
- Crédits en retard — filtres mobile : champs empilés (commercial, mois, localité, type) sans séparateurs desktop, pills type et téléchargement pleine largeur
- Modal clôture terrain : liste en cartes sur mobile (client, commercial, partiel, montant) ; tableau conservé sur desktop

## Frontend — [2.12.2] — 2026-07-23

### Changed
- Fiche client : historiques des achats et cotisations masqués sur mobile (sous 768px) ; visibles sur tablette/desktop

## Frontend — [2.12.1] — 2026-07-23

### Added
- Page crédits en retard (mobile) : bandeau « Tout sélectionner / Tout désélectionner » pour le chef de recouvrement au-dessus des cartes

## Frontend — [2.12.0] — 2026-07-23

### Added
- Connexion SSO depuis l’app mobile via hash `#sso=` (profil chef de recouvrement)
- Bouton « Voir sur Maps » sur la fiche client lorsque les coordonnées GPS sont renseignées
- Listes mobile (cartes) pour crédits en retard, échéances et recouvrements

### Changed
- Expérience mobile-first des écrans chef de recouvrement (crédits, client, listes tontine)
- Sidebar mobile : fermeture automatique après navigation, backdrop cliquable, zones tactiles agrandies
- Nom du client cliquable vers `/client/details/:id` depuis retards et détail crédit

## Frontend — [2.11.3] — 2026-07-21

### Changed
- Détail article — historique des mouvements : colonnes **Pour** (bénéficiaire) et **Demande** (référence + lien vers la demande de sortie/retour) à la place de la seule colonne auteur

### Added
- Deep link `?id=` sur les listes demandes de sortie, retours stock et demandes/retours tontine pour ouvrir le modal détail depuis l’historique article

### Fixed
- Lien demande de sortie depuis l’historique article : ouverture du modal détail (`/stock/request?id=`) au lieu du formulaire d’édition

## Frontend — [2.11.2] — 2026-07-21

### Changed
- Composant `permission-picklist` (fiche utilisateur) : refonte visuelle alignée palette ELYKIA, compteurs, états vides, boutons personnalisés ; mise en page une colonne sur mobile avec flèches verticales

## Frontend — [2.11.1] — 2026-07-20

### Changed
- Bouton « Historique inventaires » et routes associées (`/inventory/history`, détail, trajectoire) réservés au rôle `ROLE_CONSULT_INVENTORY_HISTORY`

## Backend — [1.5.2] — 2026-08-04

### Fixed
- Rapport passations commerciaux : un crédit n’est plus compté plusieurs fois s’il a subi plusieurs transferts — agrégats et détail sur la dernière passation du crédit (filtre inclus).

## Backend — [1.5.1] — 2026-08-04

### Changed
- Rapport passations commerciaux : accès étendu aux profils `GESTIONNAIRE` et `SECRETARY` (en plus de `RECOVERY_MANAGER` et `ADMIN`), conformément à `application.yml`.

## Backend — [1.5.0] — 2026-08-04

### Added
- API rapport passations commerciaux : `GET /api/v1/credits/collector-transfers/summary` et `GET /api/v1/credits/collector-transfers` (filtres old/new collector + période, rôles RECOVERY_MANAGER / MANAGER / ADMIN).

## Backend — [1.4.0] — 2026-08-04

### Added
- Endpoint `GET /api/commercial-stocks/{stockId}/linked-sales` : ventes liées au stock mensuel (history + `stock_item_id`), avec totaux de contrôle pour le drill-down KPI.

## Backend — [1.3.8] — 2026-08-02

### Added
- Contrôle terrain crédit/tontine : colonne `reference` unique (migration Flyway `V84`) et création idempotente — une même référence renvoie le contrôle déjà créé au lieu d’en dupliquer un.

## Backend — [1.3.7] — 2026-07-30

### Added
- Contrôle terrain tontine : tables `tontine_member_field_control` et `tontine_member_field_control_line` (migration Flyway `V83`) pour tracer les montants carnet mois par mois face aux collectes système.
- API membres tontine : `POST /api/v1/tontines/members/{id}/field-controls`, `GET .../field-controls/latest` et `GET .../field-controls` (création réservée à `RECOVERY_MANAGER`, `MANAGER`, `ADMIN`).

## Backend — [1.3.6] — 2026-07-30

### Added
- Contrôle terrain crédit : nouvelle table `credit_field_control` (migration Flyway `V82`) pour tracer le total carnet observé, le montant système, l’écart, le statut et l’auteur du contrôle.
- API crédits : création et consultation des contrôles terrain via `POST /api/v1/credits/{id}/field-controls`, `GET /api/v1/credits/{id}/field-controls/latest` et `GET /api/v1/credits/{id}/field-controls`.

### Changed
- Sécurisation de la création de contrôle terrain : endpoint restreint aux rôles recouvrement/management (`RECOVERY_MANAGER`, `MANAGER`, `ADMIN`) pour garantir l’intégrité des saisies terrain.

## Backend — [1.3.5] — 2026-07-30

### Added
- Endpoints d’export PDF stock (`/api/stock-requests/export/pdf`, `/api/stock-returns/export/pdf`, `/api/v1/stock-tontine-request/export/pdf`, `/api/v1/stock-tontine-return/export/pdf`) : support du paramètre optionnel `requestIds` pour générer une fiche par demande ou par lot de demandes.
- Templates PDF sortie/retour : en-tête **Référence(s)** en mode sélection (unitaire ou multi), à la place de la période.

### Changed
- Agrégations SQL d’export stock : filtrage optionnel par identifiants de demandes/retours (`IN :requestIds`) en complément des filtres période/commercial.
- Export par sélection : inclusion de tous les statuts pertinents (pas seulement livré/réceptionné) pour afficher les articles de la demande ciblée.

## Backend — [1.3.4] — 2026-07-23

### Added
- Champ `clientId` exposé dans `CreditLateDTO` pour navigation vers la fiche client

## Backend — [1.3.3] — 2026-07-21

### Fixed

- Création client (`POST /api/v1/clients`) : idempotence renforcée contre les doublons concurrents (sync mobile) — verrou advisory PostgreSQL sur téléphone/pièce, `saveAndFlush`, puis re-résolution du client existant en cas de violation d'unicité SQL au lieu de laisser passer un second enregistrement.
- Verrou advisory client : exécution via `EntityManager` (au lieu d'une requête native Spring Data retournant `Long`) pour éviter l'échec silencieux de création client en E2E.

## Backend — [1.3.2] — 2026-07-21

### Added
- Historique article (`article_history`) : champs `beneficiary` et `reference_label` (migration V81) ; types `STOCK_TONTINE_REQUEST` / `STOCK_TONTINE_RETURN`
- Enregistrement du bénéficiaire et de la référence demande lors des entrées, sorties (demande commerciale/tontine), retours stock et ajustements inventaire
- API `GET /api/v1/articles/{id}/history` : expose `beneficiary`, `referenceType`, `referenceId`, `referenceLabel`

## Backend — [1.3.1] — 2026-07-20

### Added
- Rôle `ROLE_CONSULT_INVENTORY_HISTORY` (attribué par défaut au profil ADMIN) pour la consultation de l’historique inventaires et des trajectoires

## Frontend — [2.11.0] — 2026-07-20

### Added
- Module inventaire lazy-loadé (`/inventory/list`, `/inventory/history`, `/inventory/history/:id`, `/inventory/trajectory/:itemId`)
- Consultation des inventaires passés (filtres statut / dates) et détail lecture seule
- Vue trajectoire article depuis un item d’inventaire jusqu’à une date T (timeline jalons + mouvements)

## Backend — [1.3.0] — 2026-07-20

### Added
- Trajectoire stock article depuis un `InventoryItem` (API `GET /api/v1/inventories/items/{itemId}/trajectory` et `GET /api/v1/articles/{id}/trajectory`)
- Enrichissement `article_history` (`occurred_at`, lien inventaire, référence métier) — migration V80
- Liste inventaires filtrée avec résumé (`itemCount`, `discrepancyCount`)

### Fixed
- Double écriture d’historique et `stockBefore` incorrect lors des réconciliations inventaire

## Backend — [1.2.33] — 2026-07-18

### Fixed

- Liste articles : clé de cache SpEL pointe vers `com.optimize.elykia.core.util.PageableCacheKeyHelper` (la classe `common-entities` n'était pas dans le JAR déployé → EL1005E / 500).

## Backend — [1.2.32] — 2026-07-18

### Changed

- Listes / recherche articles (`GET /api/v1/articles`, `/enabled`, `/all`, elasticsearch, out-of-stock) : retournent `ArticleListItemDto` (id, code, name, marque, model, type, commercialName, prix, stock, status) au lieu de l'entité complète (sans champs BI / audit). `GET /{id}` reste l'entité pour le détail / édition. Customer-space inchangé (`CustomerArticleDto` déjà dédié).

## Backend — [1.2.31] — 2026-07-18

### Changed

- `GET /api/v1/promoters` et `/promoters/all` : retournent `PromoterUserDto` (id, username, firstname, lastname, gender, phone, email) au lieu de l'entité `User` avec ses relations JPA.

## Backend — [1.2.30] — 2026-07-18

### Fixed

- Annulation de recouvrement : décrémente le `DailyCommercialReport` (et journalise) sur la date du recouvrement (`createdDate`), plus sur la date du jour.

## Backend — [1.2.29] — 2026-07-18

### Fixed

- Flyway `V79` : ajout de `CREDIT_COLLECTION_CANCEL` à la contrainte `daily_operation_log_type_check` (échec 500 à l'annulation de recouvrement).

## Frontend — [2.10.11] — 2026-07-18

### Changed

- Création / modification de demande de stock (crédit et tontine) : envoi de `article: { id }` uniquement, aligné sur le backend qui recharge l'article par id.

## Frontend — [2.10.10] — 2026-07-18

### Fixed

- Annulation de recouvrement : affichage du `message` backend (`error.error.message`) au lieu du message générique HttpClient.

## Mobile — [2.14.0] — 2026-08-11

### Added
- Localité create online-first (`postCreateLocality` + repli offline)
- Updates client/compte online-first : infos, GPS, solde (`postUpdateClient*` / `postUpdateAccount`)
- Upload photos client best-effort après save online (file batch inchangée en fallback)

### Changed
- Effects client/localité : dialogue hybrid sync + retry `forceOffline` sur erreur métier

## Mobile — [2.13.2] — 2026-08-11

### Changed
- Init tontine safe : pas de `forceCleanup` s'il existe des données locales non syncées ; offline → session locale uniquement
- Validation d'intégrité : compte uniquement `isSync=1` ; skip en mode sync incrémentale

### Fixed
- Init tontine : plus d'échec de validation dû aux collectes/membres/livraisons locaux en file d'attente

## Mobile — [2.13.1] — 2026-08-11

### Added
- Listes tontine SWR : membres, collectes, livraisons et stocks (local immédiat puis refresh API paginé)

### Changed
- `tontine.effects` : première page remplacée après refresh serveur ; pages suivantes upsert SQLite sans double append NgRx

## Mobile — [2.13.0] — 2026-08-11

### Added
- Tontine online-first : `TontineWriteService` + `postCreate*` sur membres, collectes et livraisons
- Écritures tontine hybrides avec repli offline (dialogue « Corriger » / « Enregistrer hors ligne »)

### Changed
- Inscription membre, enregistrement collecte et création livraison : API-first si backend joignable, sinon file locale `isSync=false`

## Mobile — [2.12.1] — 2026-08-11

### Added
- Listes localités SWR : cache local puis rafraîchissement paginé serveur (`GET /api/v1/localities`)
- Tests unitaires : `AutoSyncSchedulerService`, `OnlineListRefreshService`

### Changed
- Distribution et commande : dialogue « Corriger » / « Enregistrer hors ligne » en erreur métier online (aligné client/encaissement)

## Mobile — [2.12.0] — 2026-08-11

### Added
- Architecture sync hybride online-preferring : écritures API-first (client, encaissement+reliquat, distribution, commande) avec repli offline
- `ConnectivityService` (cache ping 120s), `OnlineFirstWriteCoordinator`, sync auto foreground (`AutoSyncSchedulerService`)
- Listes SWR : affichage local immédiat puis rafraîchissement serveur (clients, encaissements, crédits)
- Paramètres : toggle sync auto branché + fréquence configurable (30 min à 4 h)

### Changed
- En erreur métier online : dialogue « Corriger » / « Enregistrer hors ligne » (client et encaissement)

## Mobile — [2.11.2] — 2026-08-02

### Fixed
- E2E offline smoke : clic login avec `exact: true` pour ne plus confondre « SE CONNECTER » et « Se connecter sur le web »

## Mobile — [2.11.1] — 2026-07-24

### Fixed
- Connexion web / SSO : si `apiUrl` est `localhost` (ou `127.0.0.1`) sur le port Spring `8081`, redirection vers le frontend Angular sur le port `4200`

## Mobile — [2.11.0] — 2026-07-23

### Added
- Lien « Se connecter sur le web » sur l’écran de login (URL dérivée de `apiUrl` sans suffixe `/api`)
- Redirection SSO vers le frontend pour le profil `RECOVERY_MANAGER` après login (token transmis en hash)

### Changed
- Refonte hiérarchie login : CTA primaire unique ; web et restauration en actions secondaires

## Mobile — [2.10.11] — 2026-07-21

### Fixed

- Initialisation clients : déduplication automatique des doublons serveur dans un même lot API (`cardID` / `phone` / `code` identiques, IDs différents) avant UPSERT SQLite, avec journalisation du client conservé et du client ignoré.

## Mobile — [2.10.10] — 2026-07-21

### Fixed

- Initialisation clients : en cas d'échec de contrainte SQL pendant l'import, les logs remontent désormais les clients suspects avec `id`, `fullName`, `cardID`, `phone`, `code` et l'éventuelle ligne locale en conflit pour identifier rapidement l'enregistrement fautif.
- Réconciliation avant import : tous les doublons locaux détectés sur `phone`, `cardID` ou `code` sont fusionnés avant l'UPSERT serveur, ce qui réduit les erreurs récurrentes de contrainte `UNIQUE` sur les clients.

## Mobile — [2.10.9] — 2026-07-18

### Added

- Suppression locale des recouvrements et cotisations tontine non synchronisés (`isSync = false`) depuis la liste/détail des recouvrements et l'historique du détail membre, avec reverse des soldes distribution/reliquats et de `totalContribution`.

## Frontend — [2.10.9] — 2026-07-18

### Added

- Journal des opérations (rapport journalier) : filtre de colonne sur le type d'opération (liste sélectionnable), appliqué après les filtres globaux de période et commercial.
- Domaine `report` migré en lazy-loading (`/report`, `/report/daily`, `/report/monthly`).

## Backend — [1.2.28] — 2026-07-18

### Added

- API journal des opérations : paramètre optionnel `type` sur `GET /api/daily-operations` et l'export PDF, en complément des filtres période / commercial.

## Backend — [1.2.27] — 2026-07-18

### Changed

- Recouvrements web : les endpoints d'historique et d'annulation exposent `CreditTimelineRespDto` (projection JPQL) au lieu de l'entité `CreditTimeline`, avec chargement `JOIN FETCH` à l'annulation pour éviter le N+1.

## Backend — [1.2.26] — 2026-07-18

### Added

- Annulation de recouvrement : `DELETE /api/v1/credits/timelines/{id}` (`CreditTimelineService.cancelRecovery`), soft-delete du timeline, reverse de `totalAmountPaid` / `totalAmountRemaining` (réouverture si crédit soldé), reverse des reliquats, événement `CreditCollectionCancelledEvent` traité par `DailyReportEventListener` (décrémente `DailyCommercialReport`, journal `CREDIT_COLLECTION_CANCEL`).
- Permission `ROLE_CANCEL_RECOVERY` attribuée uniquement au profil ADMIN.

## Frontend — [2.10.8] — 2026-07-18

### Added

- Annulation de recouvrement (rôle `ROLE_CANCEL_RECOVERY`) sur la liste des recouvrements et l'historique dans le détail crédit.
- Domaine `credit` migré en lazy-loading (`/credit/list`, `/credit/add`, `/credit/details/:id`, `/credit/view/:id/:client-type`, `/credit/late`, `/credit/echeance`, `/credit/recouvrements`, `/credit/change-daily-stake/:id`, `/credit/create-tontine`, `/credit/distribute/:id`).

## Backend — [1.2.25] — 2026-07-18

### Fixed

- Vente comptant / livraison tontine : le recouvrement initial reste dans la transaction de création (`recordInitialSaleRecovery`) au lieu de `makeDailyStake` en `REQUIRES_NEW`, ce qui corrige `resource.not.found` sur le crédit non encore commit (golden-path étape 15).
- `AccountingDayService` : import manquant de `DailyAccountancy` (échec de compilation après 1.2.24).
- Compilation : réimport de `DailyAccountancy` dans `AccountingDayService` (retour de `closeCollectorOperation`).

## Backend — [1.2.24] — 2026-07-18

### Fixed

- Bascule journée comptable : fermeture des caisses ouvertes en un seul `UPDATE` SQL bulk (`is_opened = false`) au lieu d'itérer des centaines de milliers de lignes (timeout CPU/HTTP). Le nettoyage ne crée plus de nouvelles caisses via `finishedCollectorOperation`.

## Backend — [1.2.23] — 2026-07-17

### Fixed

- Recouvrement : la préparation de journée comptable (`ensure`, `NOT_SUPPORTED`) n'est plus appelée au milieu d'une transaction JPA — elle s'exécute avant, puis la mise en `REQUIRES_NEW`, ce qui corrige `Could not open JPA EntityManager for transaction`.

### Added

- Tests `CreditTimelineServiceRecoveryFlowTest` : ensure avant ouverture TX, isolation `REQUIRES_NEW` par mise sync, et absence d'ensure dans `dailyStakeFactor`.

## Backend — [1.2.22] — 2026-07-17

### Fixed

- Sync mobile des recouvrements : chaque mise s'exécute en `REQUIRES_NEW` pour supprimer le `UnexpectedRollbackException` qui masquait l'erreur métier quand une unité échouait dans le lot.
- Journalisation complète (stacktrace) des échecs de recouvrement web/sync, de la préparation de journée comptable, et de l'ouverture de caisse ; handler dédié pour exposer la cause racine d'un `UnexpectedRollbackException`.

## Backend — [1.2.21] — 2026-07-17

### Fixed

- Recouvrements (web / sync mobile) : `ensureAccountingReadyForOperations` garantit une journée `OPENED` et un `DailyAccounting CURRENT` alignés avant chaque mise (fast-path lecture seule si déjà cohérent ; bascule bornée à 366 jours sous verrou sinon).
- `hasOpenedDay` : restauration en lecture seule réelle (plus de stub toujours `true`), sans ouverture/fermeture automatique pour éviter la saturation CPU.
- Réparation des états partiels : `DailyAccountingService.ensureCurrentRecordForDate` réactive ou crée le `CURRENT`, et ferme un `CURRENT` orphelin lors des bascules incomplètes.

## Backend — [1.2.20] — 2026-07-16

### Fixed

- Réception des retours stock commercial et livraison/réception stock tontine : verrouillage pessimiste pendant le traitement pour empêcher un double impact concurrentiel.

## Frontend — [2.10.7] — 2026-07-16

### Fixed

- Build production : correction du double binding structurel (`*ngIf` + `*ngxPermissionsOnly`) sur le bouton d’affectation commerciale en lot, et export du pipe `statusBadge` via `SharedComponentsModule` pour le module lazy `client`.

## Frontend — [2.10.6] — 2026-07-16

### Fixed

- Listes demandes/retours stock et stock tontine : protection des boutons Livrer / Réceptionner contre le double-clic pendant le traitement.

## Backend — [1.2.19] — 2026-07-16

### Fixed

- Livraison des demandes de stock commercial : verrouillage pessimiste de la demande pendant la livraison pour empêcher deux appels concurrents d'impacter deux fois le stock mensuel du commercial.

## Frontend — [2.10.5] — 2026-07-14

### Added

- Liste clients : changement de commercial en lot (sélection par cases, modal crédit + tontine) sous feature flag `clientBulkAssignCollector`, rôle `ROLE_ASSIGN_CLIENT_COLLECTOR`.

### Changed

- Domaine `client` migré en lazy-loading (`/client/list`, `/client/add`, `/client/details/:id`, `/client/view/:id`).

## Backend — [1.2.18] — 2026-07-14

### Fixed

- Changement commercial client en lot : validation des IDs, mise à jour uniquement des clients réellement modifiés, contrôle du nombre de lignes affectées avant publication de l'historique.

## Backend — [1.2.17] — 2026-07-14

### Fixed

- Historique commercial client : séparation du gate `@TransactionalEventListener(AFTER_COMMIT)` et du `@Async` (service dédié) pour garantir la persistance après commit sans ambiguïté d'ordre des aspects.

## Backend — [1.2.16] — 2026-07-14

### Added

- Historique asynchrone des changements de commercial client (`ClientCollectorsChangedEvent` → `client_collector_history`) avec traçabilité commercial X → Y pour crédit et tontine.

## Backend — [1.2.15] — 2026-07-14

### Added

- `POST /api/v1/clients/bulk-assign-collectors` : réaffectation batch des commerciaux crédit et/ou tontine sans charger les entités client (`ClientRepository.bulkUpdateCollector` / `bulkUpdateTontineCollector`).
- Rôle `ROLE_ASSIGN_CLIENT_COLLECTOR` (profils SECRETARY, GESTIONNAIRE, ADMIN, SUPER_ADMIN).

## Frontend — [2.10.4] — 2026-07-12

### Added

- Gestion utilisateurs : action admin pour exiger le changement de mot de passe (`mustChangePassword`) depuis la fiche utilisateur et en sélection multiple sur la liste (case à cocher + tout sélectionner).

## Frontend — [2.10.3] — 2026-07-12

### Fixed

- Sélection client (`app-client-select`) : correction du scroll infini (lecture de `data.page.totalPages`) et de la recherche backend lorsqu'un commercial est sélectionné (endpoint Elasticsearch avec filtre commercial).
- Formulaire **Nouvelle vente** : le commercial désactivé (agent) est bien transmis au sélecteur client via `getRawValue()`.

## Frontend — [2.10.2] — 2026-07-11

### Changed

- Formulaire offre **Recrutement** : champs custom (`field-input`) et zone d'upload image stylée (aperçu, overlay, retrait) à la place des composants Material / input file natif.

## Frontend — [2.10.1] — 2026-07-11

### Changed

- Module **Recrutement** : refonte UI alignée sur le style standard ELYKIA (header-card, KPIs, toolbar, tableau, boutons navy, états vide/chargement) pour les pages offres, candidatures et formulaires.

## Frontend — [2.10.0] — 2026-07-11

### Added

- Module **Recrutement** (lazy, feature flag `recruitment`) : gestion des offres d'emploi (CRUD, publication, image multipart) et consultation des candidatures avec téléchargement CV.

## Docs & Infra — 2026-07-11

### Added

- Site vitrine : section recrutement dynamique (offres API publique, modal candidature multipart), injection `ELYKIA_API_BASE` au démarrage Docker, documentation `docs/RECRUITMENT.md`.
- Deploy test : origine CORS `https://site.amenouveve-yaveh.com` pour les appels API depuis le site test.

## Frontend — [2.9.32] — 2026-07-11

### Added

- Configuration **Mobile Money** (menu Configuration) : numéros Mixx by YAS et Moov Money par commercial, avec repli sur les numéros globaux société.

## Frontend — [2.9.31] — 2026-07-10

### Fixed

- Mon stock : calcul de la plage mensuelle d'export PDF via `moment` (mois calendaire 1–12, aligné sur `stock-period.util`).

### Changed

- Règle lazy-loading : domaine `user` retiré de la liste eager (déjà migré : `user.module.ts`, routes `/user/...`).

## Frontend — [2.9.30] — 2026-07-10

### Added

- Stock tontine : filtre période **Hier** sur les listes demandes de sortie et retours.
- Stock tontine : **fiche sortie PDF** (demandes livrées, `deliveryDate`) et **fiche retours PDF** (réceptions, `receivedDate`).
- Stock tontine annuel : téléchargement du rapport PDF par panneau commercial/année sur **Mon stock tontine**.

### Changed

- Toasts des exports PDF stock / stock tontine : passage par `AlertService` (`toastSuccess` / `toastError`) au lieu de `ToastrService` direct.
- Listes retours stock / retours tontine : colonnes **Date demande** et **Date réception** (réception affichée « — » tant que le retour n'est pas réceptionné).

## Frontend — [2.9.29] — 2026-07-10

### Added

- Filtres période des listes **Demandes de sortie** et **Retours stock** : option **Hier** (jour calendaire précédent).

## Frontend — [2.9.28] — 2026-07-10

### Changed

- Changement de mot de passe obligatoire : sidebar réduite à la section Aide (changement + déconnexion), encart explicatif dans le menu et bannière sur la page de définition du nouveau mot de passe.

## Frontend — [2.9.27] — 2026-07-10

### Changed

- Mon stock : export PDF déplacé sur chaque panneau commercial/mois (plus de filtre période global) ; le téléchargement couvre le mois complet du stock affiché (courant ou historique).

## Frontend — [2.9.26] — 2026-07-10

### Fixed

- Mon stock : bouton « Télécharger rapport » aligné sur le style `historic-btn` (bleu marine #003366) et disposition sur une seule ligne avec le filtre période.

## Frontend — [2.9.25] — 2026-07-10

### Fixed

- Modal SweetAlert « Réinitialiser le mot de passe » : champ temporaire contenu dans le popup (largeur, `box-sizing`, classes `custom-swal-popup--form`).

## Frontend — [2.9.24] — 2026-07-09

### Changed

- Export PDF du rapport stock commercial (pris, vendu, retourné, restant) déplacé vers **Mon stock** (`my-stock-dashboard`) avec filtre période et commercial.
- Liste des demandes de sortie : export remplacé par une **fiche sortie** (articles, quantités et valeurs sorties, basée sur la date de livraison).
- Liste des retours stock : ajout du téléchargement **fiche retours PDF** (basée sur la date de réception).

## Frontend — [2.9.23] — 2026-07-09

### Fixed

- Validation JSR-303 du changement de mot de passe : `@AssertTrue` sur `ChangePasswordDto` pour exiger `oldPassword` lorsque `forced` n'est pas actif.
- Migration lazy-loading des domaines `user` (`/user/list`, `/user/add`, `/user/details/:id`, `/user/change-password`) et `accounting-day` (`loadChildren`).

## Frontend — [2.9.22] — 2026-07-09

### Added

- Réinitialisation du mot de passe utilisateur par l'admin depuis la fiche utilisateur (`PATCH /api/v1/users/{id}/reset-password`, permission `ROLE_EDIT_USER`).
- Flux de changement de mot de passe obligatoire à la première connexion après reset : redirection automatique vers `/change-password?forced=true`, garde d'accès et formulaire sans ancien mot de passe.

## Mobile — [2.10.8] — 2026-07-16

### Fixed

- Initialisation clients : une erreur SQL (ex. FK 787) bloque désormais la suite de l’init au lieu d’être avalée comme « mode hors ligne » ; le message d’erreur détaille la contrainte / tables enfants en cause.
- Purge clients avant ré-init : suppression préalable des `client_reliquats` (et orders legacy) pour éviter le conflit FK ; sauvegarde clients en UPSERT (`ON CONFLICT DO UPDATE`) au lieu de `INSERT OR REPLACE`.
- Migration v29 : reconstruction de `client_reliquats` sans `FOREIGN KEY(clientId)`.
- Validation post-init : écart critique sur le nombre de clients bloque la complétion (plus de passage au dashboard avec portefeuille incorrect).

## Mobile — [2.10.7] — 2026-07-13

### Fixed

- Changement de compte commercial : le dashboard et la page Paramètres affichent désormais le promoteur connecté (chargement local filtré par `username` au lieu de `LIMIT 1`), et plus de déconnexion erronée après reconnexion.
- Action legacy `loadClients` : relecture de la première page clients depuis SQLite via `loadFirstPageClients` (le store NgRx se resynchronise après init / sync).
- Recouvrement : chargement du client manquant du store par `getClientById` au lieu d’attendre un `loadClientsSuccess` qui n’était plus émis.

## Mobile — [2.10.6] — 2026-07-13

### Fixed

- Reçu de distribution : affichage du nom complet du client (`fullName`) au lieu de « null » lorsque `firstname` / `lastname` ne sont pas renseignés en base locale.

## Mobile — [2.10.5] — 2026-07-13

### Fixed

- Reçu de recouvrement : correction du calcul « Ancien solde » / « Nouveau solde » lorsque la distribution affichée n’était pas encore mise à jour après le paiement (ex. vente 14 200 FCFA, avance 200, recouvrement 2 000 → ancien 14 000, nouveau 12 000).

## Mobile — [2.10.4] — 2026-07-09

### Added

- Écran `/change-password` pour le changement obligatoire après reset admin, avec blocage de la navigation tant que le mot de passe n'est pas redéfini.
- Connexion hors ligne bloquée tant que `mustChangePassword` est actif ; mise à jour du hash local après changement réussi.

## Backend — [1.2.14] — 2026-07-14

### Fixed

- Création de compte client : réactivation du compte précédemment supprimé (même `client_id`) avec le nouveau solde et numéro de compte, au lieu d'échouer sur la contrainte d'unicité (`AccountService.createAccount` / `syncAccount`).

## Backend — [1.2.13] — 2026-07-12

### Added

- Endpoints admin `PATCH /api/v1/users/{id}/require-password-change` et `PATCH /api/v1/users/require-password-change` (sélection multiple) pour imposer `mustChangePassword` sans réinitialiser le mot de passe (`common-securities` 1.2.1).

## Backend — [1.2.12] — 2026-07-12

### Fixed

- Comptabilisation journalière : borne de fin de journée alignée sur le standard `atTime(23, 59, 59)` dans `DailyAccountingService` et `DailyAccountancyService` (au lieu de `23:59:00`).

## Backend — [1.2.11] — 2026-07-12

### Fixed

- Bascule journée comptable : lectures repository (`findByStatus`, `existsByStatusAndAccountingDate`, `findById`, caisses ouvertes) déléguées à `AccountingDayStepExecutor` en `REQUIRES_NEW` read-only, compatibles avec l'orchestration `NOT_SUPPORTED` sans `TransactionRequiredException`.

## Backend — [1.2.10] — 2026-07-12

### Fixed

- Snapshot BI quotidien : garde-fous sur les projections natives `SalesMetricsProjection` et `PortfolioMetricsProjection` lorsque les requêtes SQL ne retournent aucune ligne (évite `NullPointerException` sur base vide ou sans données du jour).

## Backend — [1.2.9] — 2026-07-12

### Fixed

- Bascule journée comptable : `openAccountingDay` / `closeAccountingDay` / `ensureCurrentAccountingDay` en `NOT_SUPPORTED` pour éviter une transaction Hibernate englobante pendant les étapes `REQUIRES_NEW` ; fermeture basée sur une seule résolution de la journée ouverte.
- Sécurité : retrait du wildcard `/api/v1/**` en `permitAll` ; seuls les endpoints publics explicites (releases APK, auth, etc.) restent ouverts, les routes admin recrutement exigent une authentification HTTP.
- Snapshot BI stock faible : comptage aligné sur le seuil de réapprovisionnement (`stockQuantity <= reorderPoint`) au lieu d'un seuil fixe à 6 unités.

## Backend — [1.2.8] — 2026-07-12

### Fixed

- Distribution mobile (`applyMobileFinancialTerms`) : à la création, `totalAmountPaid` est initialisé uniquement à partir de l'avance ; les montants payés/restant envoyés par le mobile (recouvrements locaux non encore synchronisés) ne sont plus recopiés, afin que les `CreditTimeline` puissent se synchroniser correctement.
- `BiScheduler` : suppression de l'import `Slf4j` dupliqué.
- `CronManager.updatePromoterCreditStatus` : ajout de `@SchedulerLock` pour éviter l'exécution concurrente en environnement distribué.
- `WebSecurityConfig` : endpoints publics explicites pour les mises à jour APK espace client et mobile (`/api/v1/customer/app/release/**`, `/api/v1/mobile/app/release/**`).

## Backend — [1.2.7] — 2026-07-11

### Fixed

- Bascule journée comptable (`rollForwardAccountingDay`) : transactions courtes par caisse/étape (`REQUIRES_NEW`) et `flushMode=COMMIT` sur les sommes SQL natives, pour éviter l'auto-flush Hibernate de milliers de `Credit` qui saturait le CPU (`scheduling-1` à 100 % pendant des heures).
- Fermeture journalière comptable : agrégat SQL natif au lieu de charger tous les `CreditTimeline` en mémoire.

## Backend — [1.2.6] — 2026-07-11

### Changed

- `updateDailyPaidForCredit` : `UPDATE` SQL natif sur `credit` (sans chargement Hibernate des entités), avec `clearAutomatically` et filtre `daily_paid = true` pour limiter les écritures disque.

## Backend — [1.2.5] — 2026-07-11

### Changed

- Performance des tâches planifiées : pool scheduler dédié (4 threads), ShedLock sur les jobs lourds, logs de durée.
- `autoCancelOldRequests` : mise à jour bulk SQL au lieu de charger/sauver chaque demande stock.
- `DailyBusinessSnapshotService` : agrégations SQL sans charger tout le portefeuille en mémoire.
- `MetricsScheduler` : intervalle porté à 15 minutes (au lieu de 5) pour réduire la charge CPU continue.
- `MonthlyReportJobOrchestrator` : correction d'une boucle busy-wait (`Thread.yield`) qui pouvait saturer un cœur CPU à 100 %.

## Backend — [1.2.4] — 2026-07-11

### Fixed

- Démarrage JPA : `@EntityScan("com.optimize.elykia")` pour enregistrer les entités du modulith `recruitment` (`JobOffer`, `JobApplication`).

## Backend — [1.2.3] — 2026-07-11

### Added

- Modulith **recruitment** (`site` / `admin` / `shared`) : API publique offres + candidatures, API admin CRUD offres et consultation CV, stockage MinIO bucket `elykia-recruitment`, migration Flyway V77, permission `ROLE_RECRUITMENT`.

## Backend — [1.2.2] — 2026-07-11

### Added

- Configuration Mobile Money : numéros globaux société (`app.customer.mobile-money.mixx-number` / `moov-number` dans `application.yml`), table `commercial_mobile_money_config`, API admin `/api/v1/commercial-mobile-money-config` et endpoint client `GET /api/customer/purchases/{id}/mobile-money-recipients` (repli global si aucun numéro commercial).

## Backend — [1.2.1] — 2026-07-10

### Fixed

- Téléchargement APK espace client : le manifest MinIO n'est plus chargé 4 fois par requête (`prepareLatestApkDownload`).

## Backend — [1.2.0] — 2026-07-10

### Added

- API release espace client (`GET /api/v1/customer/app/release/latest`, `GET /api/v1/customer/app/release/download`) avec bucket MinIO `elykia-customer-space-releases` et canal `CUSTOMER_SPACE_RELEASE_CHANNEL`.

## Backend — [1.1.5] — 2026-07-10

### Fixed

- Listes et KPI stock (demandes/retours, classique et tontine) : filtre période sur `COALESCE(date métier, date demande)` — les enregistrements **CREATED** sans date de livraison/réception réapparaissent dans la liste (corrige golden-path étape 3). Les exports PDF restent filtrés sur `deliveryDate` / `receivedDate` uniquement.

## Backend — [1.1.4] — 2026-07-10

### Added

- `StockExportService` — exports PDF stock tontine :
  - `GET /api/v1/stock-tontine-request/export/pdf` — fiche sortie (livraisons, `deliveryDate`).
  - `GET /api/v1/stock-tontine-return/export/pdf` — fiche retours (réceptions, `receivedDate`).
  - `GET /api/v1/tontines/stock/export/pdf` — rapport stock tontine annuel par commercial et année.

### Fixed

- KPI retours stock tontine : filtre période aligné sur `receivedDate` (cohérent avec la liste).
- Listes retours stock et retours tontine : `findFilteredList` expose `returnDate` et `receivedDate` (filtre période toujours sur `receivedDate`).
- Export PDF retours stock tontine : total montant basé sur `StockRequestExportDTO.getTotalAmount()` (aligné requête SQL et export stock classique).

## Backend — [1.1.3] — 2026-07-10

### Fixed

- Export PDF retours stock : `findAggregatedStockReturns` calcule désormais `totalAmount` via `SUM(quantity * unitPrice)` (aligné sur les sorties stock) ; template et `StockExportService` utilisent `item.totalAmount` comme source unique.

## Backend — [1.1.2] — 2026-07-09

### Added

- `StockExportService` et endpoints PDF dédiés :
  - `GET /api/commercial-stocks/export/pdf` — rapport stock commercial (pris / vendu / retourné / restant).
  - `GET /api/stock-requests/export/pdf` — fiche sortie (livraisons, filtre `deliveryDate`).
  - `GET /api/stock-returns/export/pdf` — fiche retours (réceptions, filtre `receivedDate`).

## Backend — [1.1.1] — 2026-07-09

### Added

- Colonne `must_change_password` sur `uacc`, flag exposé dans `JwtResponse` et sur le modèle utilisateur.
- Endpoint admin `PATCH /api/v1/users/{id}/reset-password` (mot de passe temporaire + `mustChangePassword=true`).
- Changement de mot de passe forcé via `PATCH /api/v1/users/change-password` avec `forced=true` (sans ancien mot de passe, nouveau mot de passe différent du temporaire).
- Nouveaux comptes créés via signup : `mustChangePassword=true` à la première connexion.

## Customer-space — [0.0.6] — 2026-07-08

## Customer-space — [0.2.4] — 2026-07-11

### Added

- Paiement Mobile Money : affichage des numéros Mixx by YAS et Moov Money du commercial (collector) avec repli sur la configuration globale société.

## Customer-space — [0.2.3] — 2026-07-11

### Added

- Feature flag Firebase Remote Config `customerSpaceAvailable` : vérification à la soumission du numéro sur la page de connexion ; si désactivé, message d'indisponibilité avec invitation à contacter l'agence Amenouveve-Yaveh.

## Customer-space — [0.2.2] — 2026-07-10

### Fixed

- Mise à jour in-app : résolution du chemin APK via `Filesystem.getUri()` avant vérification SHA-256 et installation native (chemin absolu au lieu du chemin relatif cache).

## Customer-space — [0.2.1] — 2026-07-10

### Fixed

- Mise à jour in-app : suppression du fichier APK en cache si l'installation échoue après vérification SHA-256 réussie.
- Pipeline APK : `validate-customer-space-pipeline.sh` vérifie aussi `config.xml` et `network_security_config.xml` (copiés par CI/release).

## Customer-space — [0.2.0] — 2026-07-10

### Added

- Pipelines CI/CD APK espace client : build test/prod (`build-customer-space-apk.yml`), job `build-customer-space` dans `ci-customer-space.yml`, promote manuel test → prod, publication MinIO (`elykia-customer-space-releases`).
- API backend `GET /api/v1/customer/app/release/latest` et `/download` avec manifest MinIO dédié (`CUSTOMER_SPACE_RELEASE_CHANNEL`).
- Mise à jour in-app Android : `AppUpdateService`, plugin natif `AppUpdate`, vérification automatique sur le dashboard (proposition ou mise à jour obligatoire).
- Affichage de la version courante sur la page de connexion et dans le profil (bouton « Mettre à jour l'application »).

## Customer-space — [0.1.0] — 2026-07-09

### Added

- Parcours tontine client en lecture seule : nouvelles routes `/tontines`, `/tontines/:id`, `/tontines/:id/timeline` avec navigation dashboard + tab bar, pages liste/detail/timeline et branchement API customer.
- Vue metier "carnet de mises" en pastilles numerotees mensuelles (composant partage `tontine-monthly-pills`) pour reprendre la logique de carnet connue des clients.
- Contrats frontend tontine (`CustomerTontineContribution*`, `CustomerTontinePayment*`), endpoints API client integres dans `CustomerApiService`, tests unitaires + spec E2E Playwright `tontine-readonly`.

### Changed

- Dashboard customer-space : ajout du raccourci "Tontine" dans les quick actions pour acces direct au suivi des mises.

## Customer-space — [0.0.6] — 2026-07-08

### Fixed

- Sécurité : credentials Firebase retirés des fichiers versionnés ; injection via `firebase.config.local.ts` (gitignored) et secrets CI.
- Version : `app-version.ts` synchronisé depuis `package.json` (`npm run sync:version`) — plus de décalage environment / package.
- Dashboard : état paiement (`canPayNext`, `paymentQueryParams`) calculé après chargement API, sans getters dépendant d'un `dashboard` null.

## Customer-space — [0.0.5] — 2026-07-07

### Fixed

- Dashboard : le bouton **Payer** ouvre directement le formulaire Mobile Money (`/payment/:id`) au lieu de la liste des achats ; champs `nextPaymentCreditId` et `nextInstallmentNumber` exposés par l'API dashboard.

## Customer-space — [0.0.4] — 2026-07-07

### Added

- Catalogue commande : affichage `commercialName + name` (champs `displayName` / `commercialName` API), filtres rapides par top 10 types d'articles les plus vendus (`GET /api/customer/articles/top-types`).

## Customer-space — [0.0.3] — 2026-07-07

### Fixed

- Déconnexion : retour à l'écran téléphone (wizard auth réinitialisé) au lieu de l'étape « Créer votre PIN » conservée en cache Ionic.

## Customer-space — [0.0.2] — 2026-07-07

### Fixed

- Auth OTP SMS : conteneur reCAPTCHA présent dès l'écran téléphone (avant `sendOtp`), config Firebase Web SDK (`appId` web), messages d'erreur Firebase explicites (`auth/configuration-not-found`, etc.).

## Docs & Infra — 2026-07-07

### Added

- Enforcement lazy-loading frontend : règle Cursor renforcée (checklist obligatoire inline, globs domaines eager), hook `postToolUse` (`.cursor/hooks/lazy-loading-reminder.py`), garde CI `.github/scripts/check-frontend-lazy-loading.py`, script local `npm run check:lazy-loading` dans `frontend/`.

## Backend — [1.1.0] — 2026-07-09

### Added

- API customer tontine read-only : `GET /api/customer/tontine/contributions`, `GET /api/customer/tontine/contributions/{memberId}`, `GET /api/customer/tontine/contributions/{memberId}/payments` avec verification d'ownership par client JWT.
- DTOs customer-space tontine (liste, detail, paiements pagines, synthese mensuelle "carnet") et aggregation mensuelle backend pour afficher les pastilles numerotees cote client.
- Migration `V74__customer_tontine_tracking_indexes.sql` pour les index de lecture tontine (`tontine_member(client_id, tontine_session_id)` et `tontine_collection(tontine_member_id, collection_date DESC)`).

## Backend — [1.0.29] — 2026-07-09

### Fixed

- `GET /api/v1/stock-receptions/{id}/items` : restauration du tri par défaut `id ASC` via `@PageableDefault` ; tie-breaker `sri.id` ajouté au tri article (type → marque → modèle → nom) pour une pagination stable.

## Backend — [1.0.28] — 2026-07-09

### Fixed

- KPI commandes (`GET /api/v1/orders/kpis`) : le champ `pendingOrders` est aligné sur le contrat frontend (au lieu de `pendingOrdersCount`), corrigeant l'affichage « Commandes en attente » à 0 alors que des commandes PENDING existent.

## Backend — [1.0.27] — 2026-07-09

### Fixed

- Détail stock (`getById` / `getItemsById`) : suppression du remplacement de la collection `items` sur l'entité JPA (erreur Hibernate `all-delete-orphan`) ; tri appliqué uniquement sur la `List` renvoyée par `/{id}/items`.

## Backend — [1.0.26] — 2026-07-09

### Added

- `GET /{id}/items` sur demandes/retours stock (standard et tontine) : lignes article triées en tableau JSON pour les modales de détail.

## Backend — [1.0.25] — 2026-07-09

### Changed

- `GET /api/stock-returns`, `/api/v1/stock-tontine-request` et `/api/v1/stock-tontine-return` : projections liste sans items ; `GET /{id}` pour le détail avec articles triés.

## Backend — [1.0.24] — 2026-07-09

### Changed

- Réception stock : articles triés par type → marque → modèle → nom sur `GET /api/v1/stock-receptions/{id}/items` (détail frontend) et sur le PDF `stock-reception-sheet.html` (via `getReceptionByIdWithItems`).

## Backend — [1.0.23] — 2026-07-09

### Changed

- `GET /api/stock-requests` : projection `StockRequestListDto` sans chargement des lignes article (performance liste).
- `GET /api/stock-requests/{id}` : articles triés par type, marque, modèle et nom.
- Export PDF stock : agrégation et tri alignés sur type → marque → modèle → nom (requêtes + fusion Java) ; endpoint `/export/pdf` inchangé côté contrat.

## Backend — [1.0.22] — 2026-07-08

### Fixed

- Rapport journalier : marge « Ventes à Crédit » recalculée via `calculTotalPurchase()` lorsque `totalPurchase` est absent ou nul (cas `mobileFinancialTermsLocked`) — évite une marge égale au montant de vente.
- Migration `V73__backfill_daily_report_credit_sales_margin.sql` : recalcul historique de `credit_sales_margin` dans `daily_commercial_report` depuis les crédits source (même formule que le correctif Java).

## Backend — [1.0.21] — 2026-07-07

### Added

- Espace client dashboard : champs `nextPaymentCreditId` et `nextInstallmentNumber` pour initier un paiement depuis l'accueil sans passer par la liste des achats.

## Backend — [1.0.20] — 2026-07-07

### Added

- Espace client : `GET /api/customer/articles/top-types` (top types d'articles vendus via crédits), champs `commercialName` et `displayName` sur `CustomerArticleDto`.

## Backend — [1.0.19] — 2026-07-07

### Fixed

- Espace client `check-phone` : un numéro n'est reconnu que s'il est lié à un dossier client (`customer_user_mapping` ou fiche `client` active) — évite l'échec `client.not.found` après OTP sur `setup-pin`.
- Résolution client : recherche téléphone tolérante aux formats (`92181351`, `+228…`, `0…`).

## Backend — [1.0.18] — 2026-07-07

### Fixed

- `PdfService.generateStockReceptionPdf` : utilise `getReceptionByIdWithItems` pour inclure toutes les lignes article dans le PDF, sans réintroduire les items dans l'endpoint API fiche.

## Frontend — [2.9.21] — 2026-07-09

### Fixed

- Permissions prod : `loadPermissions` ne reçoit plus `undefined` quand `user.roles` est absent (sidebar, accounting-day) ; normalisation centralisée dans `AuthService.setPermissions`.

## Frontend — [2.9.20] — 2026-07-09

### Fixed

- Remote Config prod : initialisation explicite de l'app Firebase modulaire (`initializeApp`) avant `getRemoteConfig` ; suppression de `AngularFireModule` compat qui n'enregistrait pas l'app `[DEFAULT]` attendue par le SDK v9+.

## Frontend — [2.9.19] — 2026-07-09

### Fixed

- `StockRequestStatus` (stock et stock-tontine) : ajout du statut `REFUSED` aligné sur l'API backend, corrigeant les incohérences de typage et l'affichage des demandes refusées.

## Frontend — [2.9.18] — 2026-07-09

### Fixed

- Modales détail stock (demandes, retours, tontine) : chargement explicite via `GET /{id}` + `GET /{id}/items` (plus de lignes vides) ; libellé article retour corrigé (`type: marque modèle nom`).

## Frontend — [2.9.17] — 2026-07-09

### Changed

- Listes retours stock, demandes tontine et retours tontine : listes allégées sans items ; détail chargé via `GET /{id}` à l'ouverture du modal.

## Frontend — [2.9.16] — 2026-07-09

### Changed

- Liste demandes de sortie stock : consommation de `StockRequestListDto` (sans items) ; chargement du détail via `GET /api/stock-requests/{id}` à l'ouverture du modal.

## Frontend — [2.9.15] — 2026-07-07

### Added

- Fiche article : modal d'historique complet des mouvements de stock accessible via « +x mouvements supplémentaires » lorsque la liste dépasse 6 entrées.

### Changed

- Domaine `article` migré en lazy-loading : module dédié, routes `/article/list`, `/article/add`, `/article/add/:id`, `/article/details/:id` ; sidebar et navigations internes alignées.

## Frontend — [2.9.14] — 2026-07-07

### Fixed

- `StockReceptionListComponent` : affichage lisible de la liste d'articles en stock insuffisant lors de l'échec d'une annulation (message backend sur plusieurs lignes).

## Backend — [1.0.17] — 2026-07-07

### Fixed

- `StockReceptionService.cancelReception` : validation préalable du stock avant annulation ; si un ou plusieurs articles n'ont pas la quantité suffisante, une `CustomValidationException` liste tous les articles concernés (disponible vs requis) au lieu d'échouer sur la contrainte `@PositiveOrZero` de `stockQuantity`.

## Frontend — [2.9.13] — 2026-07-07

### Changed

- `StockReceptionListComponent` : consommation du DTO liste backend (`StockReceptionListItem`) sans mapping défensif côté client ; les items ne transitent plus par la liste.

## Frontend — [2.9.12] — 2026-07-07

### Changed

- `StockReceptionDetailComponent` : chargement des lignes article découplé de la fiche, avec pagination serveur (30 par page), accumulation progressive et déclenchement automatique au scroll (infinite scroll) pour éviter les saturations mémoire sur les réceptions volumineuses.

### Fixed

- `StockReceptionListComponent` : normalisation défensive de la réponse pour ignorer toute collection `items` résiduelle côté liste et limiter l’empreinte mémoire affichage (remplacé en 2.9.13 par un DTO liste dédié côté backend).

## Frontend — [2.9.11] — 2026-07-06

### Fixed

- `DailyReport` : filtre commercial corrigé (`ng-select` avec `bindValue` renvoie une chaîne, pas un objet) — un seul panneau rapport affiché pour le commercial sélectionné.
- `DailyReport` : bilan crédit annuel affiche **0 FCFA** lorsque les valeurs sont absentes ou l'API ne renvoie pas de données.

## Frontend — [2.9.10] — 2026-07-06

### Added

- `DailyReport` : bilan crédit annuel (ventes, versements crédit remis au secrétaire, reste chez les clients) affiché lorsqu'un commercial est sélectionné, alimenté par l'agrégation mensuelle backend.

### Changed

- `MyStockDashboard` : rétablissement du taux de recouvrement (%) à la place des versements crédit sur le stock mensuel.

## Frontend — [2.9.9] — 2026-07-06

### Fixed

- édition demande de sortie stock : chargement des articles sans `setTimeout` ni dépendance au `ViewChild` ; le spinner reste affiché jusqu'à l'application complète des valeurs du formulaire.

## Frontend — [2.9.8] — 2026-07-06

### Added

- `StockRequestList` & `StockRequestCreate` : Ajout de la possibilité de modifier une demande de sortie de stock (CREATED ou VALIDATED). L'édition est protégée par le Feature Flag `editStockRequest` et le rôle `ROLE_EDIT_STOCK_REQUEST`. Toute demande validée repasse en `CREATED` après modification.

## Frontend — [1.0.5] — 2026-07-06

### Changed

- `MovementTableComponent` : Traduction de l'opération `CANCEL_RECEPTION` en "ANNUL. RÉCEPTION", formatage correct des montants et ajout du scroll horizontal sur la table d'historique.

## Backend — [1.0.16] — 2026-07-07

### Added

- `StockReceptionListDto` : DTO liste sans collection `items`, alimenté par des requêtes JPQL en projection (`SELECT new ...`) pour ne charger que les colonnes affichées (référence, date, reçu par, montant, statut).

### Changed

- `StockReceptionService` : les endpoints liste/recherche retournent `Page<StockReceptionListDto>` au lieu de mapper l'entité complète `StockReception`.

## Backend — [1.0.15] — 2026-07-07

### Added

- `StockReceptionController` : nouvel endpoint `GET /api/v1/stock-receptions/{id}/items` paginé pour récupérer les articles d’une réception à la demande.

### Changed

- `StockReceptionService.getReceptionById` : la fiche de réception renvoie désormais un DTO léger sans collection `items`; les lignes sont servies par endpoint dédié paginé.

## Backend — [1.0.14] — 2026-07-07

### Fixed

- `common-securities` : sérialisation JSON sécurisée sur la relation `UserAccount` ↔ `AccountPermission` via `@JsonManagedReference`/`@JsonBackReference`, pour empêcher toute récursion infinie lors de la conversion Jackson.

## Backend — [1.0.13] — 2026-07-07

### Fixed

- `common-securities` : exclusion des relations bidirectionnelles dans `toString()` de `UserAccount` et `AccountPermission` pour éviter la récursion infinie (`StackOverflowError`) lors des logs/sérialisations d'entités JPA.

## Backend — [1.0.12] — 2026-07-06

### Added

- Table `commercial_report_monthly` et service d'agrégation mensuelle des rapports journaliers (ventes crédit, versements crédit) avec backfill Flyway `V72` et synchronisation automatique à chaque mise à jour du rapport journalier.
- API `GET /api/daily-commercial-reports/yearly-summary` : totaux annuels ventes crédit, versements crédit et reste chez les clients pour un commercial.

### Fixed

- `V72` : reclassement sur `daily_commercial_report` des montants tontine migrés à tort en versement crédit (pré-split catégories V57), avant le backfill mensuel — sans toucher à `cash_deposit`.

## Backend — [1.0.11] — 2026-07-06

### Changed

- `ArticleHistoryRepository` : Remplacement du tri par `operation_date DESC` par `id DESC` (`findByArticles_IdOrderByIdDesc`) pour garantir que les opérations réalisées le même jour s'affichent correctement dans l'ordre chronologique inverse (la plus récente en premier) dans l'historique des mouvements.

## Backend — [1.0.10] — 2026-07-06

### Fixed

- `StockReceptionService` : Création de l'entrée d'historique `ArticleHistory` *avant* la mise à jour effective du stock lors de l'annulation d'une réception. Cela garantit que la quantité initiale capturée dans l'historique est correcte (stock avant annulation) et non le stock final.

## Backend — [1.0.9] — 2026-07-06

### Changed

- `StockReceptionController` : Ordonnancement par défaut de la liste des réceptions de stock par `id DESC` (des plus récentes aux plus anciennes) via `@PageableDefault`.

## Backend — [1.0.8] — 2026-07-06

### Fixed

- `ArticleHistory` : Ajout d'une migration Flyway `V71__update_article_history_operation_type_constraint.sql` pour autoriser la nouvelle valeur `CANCEL_RECEPTION` dans la contrainte `CHECK` de la colonne `operation_type`, corrigeant l'erreur SQL lors de l'annulation d'une réception.

## Backend — [1.0.7] — 2026-07-06

### Fixed

- `StockReception` : Ajout d'une migration Flyway `V70__add_status_to_stock_reception.sql` pour ajouter la colonne `status` (valeur par défaut 'VALIDATED') qui manquait dans la base de données après la modification de l'entité.

## Backend — [1.0.6] — 2026-07-06

### Fixed

- annulation réception stock : comparaison du statut `ReceptionStatus` via `.equals()` au lieu de `==`.

## Backend — [1.0.5] — 2026-07-06

### Fixed

- `ClientService` : validation explicite téléphone / pièce d'identité rétablie sur `updateClient`, `updateClientInfo` et `updateClientPhoto` ; contrôle d'incohérence croisée téléphone vs pièce conservé à la création et en mise à jour.

## Backend — [1.0.4] — 2026-07-06

### Added

- `StockRequestService` & `StockRequestController` : Ajout d'une API d'édition `PUT /api/stock-requests/{id}` et `GET /api/stock-requests/{id}` pour les demandes en statut `CREATED` ou `VALIDATED`. Repasse automatiquement la demande en `CREATED`.


## Frontend — [2.9.7] — 2026-07-04

### Fixed

- recherche avancée de la liste des ventes : les listes déroulantes restent au-dessus du tableau sans se détacher au scroll grâce à une hiérarchie de `z-index` locale sur la zone filtres, sans attache au `body`.

## Frontend — [2.9.6] — 2026-07-03

### Added

- fiche client : aperçu agrandi de la photo de profil (clic sur l'avatar ou bouton « Voir ») dans une modale avec backdrop, titre « Photo de profil de … » et fermeture par Échap ou clic extérieur.

## Frontend — [2.9.5] — 2026-07-02

### Fixed

- modales détail stock (retours, demandes, tontine) : bouton « Fermer » stylisé navy (fond, padding, coins arrondis) via feuille de style partagée `stock-detail-modal.scss`.

## Frontend — [2.9.4] — 2026-07-02

### Added

- retour stock historique : bouton et case d'en-tête « Tout sélectionner » pour cocher en masse les articles disponibles (quantité restante préremplie).

## Frontend — [2.9.3] — 2026-07-02

### Fixed

- `ArticleSelectorComponent` : pagination lazy-load (`totalPages` depuis la réponse API), recherche client sur marque/modèle/type, `data-article-id` sur les options pour les E2E.
- E2E golden path : `selectArticleInSelector` compatible chargement paginé serveur (debounce, termes partiels, sélection par id).

## Frontend — [2.9.2] — 2026-07-02

### Fixed

- modal livraison tontine : alignement des types articles sur `ItemService` (plus de cast vers `tontine.types.Article`) et pagination `totalPages` depuis la réponse paginée API.

## Frontend — [2.9.1] — 2026-07-02

### Added

- composant réutilisable `ClientSelectComponent` : pagination 20, infinite scroll et recherche serveur pour remplacer les chargements massifs de clients.
- chargement paginé des articles (20 par page, infinite scroll + recherche serveur) dans `ArticleSelectorComponent` pour les formulaires de demande de stock, inventaire, ventes comptant et livraisons tontine.
- saisie PU achat prérempli (entrées stock, inventaire, fiche article) lorsque le flag FIFO est actif ; onglet lots FIFO sur la fiche article ; libellés KPI inventaire adaptés en mode FIFO.
- contrôle des appareils autorisés pour l'app mobile : registre `user_authorized_device`, enforcement au login et sur les requêtes API (`X-Device-Id`), API admin `/api/v1/users/{id}/devices`, paramètre `ENABLED_MOBILE_DEVICE_RESTRICTION`, toggle par utilisateur `mobileDeviceRestrictionEnabled` ; flags Firebase `mobileDeviceManagement` (admin) et `mobileDeviceRestriction` (mobile) ; mobile **2.10.0** avec `@capacitor/device`.
- onglet « Statistiques » dans `/ai-chat` (requêtes fréquentes, SQL rejetés, distribution intents) pour `ROLE_AI_REPORT`.
- refonte UI liste des ventes (skill frontend-ui-style) : bandeaux KPI décisionnels, sélecteur de période (jour/semaine/mois/personnalisé), persistance `sessionStorage`, recherche avancée intégrée à la toolbar.
- refonte UI formulaire d'ajout de vente (`credit-add`) : structure breadcrumb + header-card + sections formulaire, palette navy, boutons `.btn-primary` / `.btn-outline`.
- refonte UI composant `article-selector` : lignes article en cartes navy-xpale, montants en FCFA (DM Mono), barre total cyan, badges stock palette skill, boutons SVG.
- correctif `article-selector` : rafraîchissement liste articles au chargement stock commercial (`ngOnChanges`), affichage sous-total/total vente comptant (`showPrices` respecté), recherche articles sans champ `name`.
- modal de versement avec répartition crédit / tontine / solde Nx comptes ; KPIs et historique par catégorie sur le rapport journalier ; onglet « Remise au gestionnaire ».
- stock mensuel : carte « Versements Crédit » remplace le taux de recouvrement %.
- fiche membre tontine : nouvelle section « Historique des montants de mise » affichant les périodes `tontine_member_amount_history` (dates, montant journalier, statut).
- modal de collecte de rattrapage tontine : ajout du champ « mise journalière du mois ciblé » transmis au backend avant calcul de la collecte.
- modal de rattrapage tontine : prévisualisation explicite avant soumission (mois ciblé, mise applicable, état verrouillé/modifiable) avec indicateurs visuels vert/orange.
- page « Archives collectes » sous Tontines : archivage PDF seul ou archivage + réinitialisation (ADMIN), consultation et téléchargement des archives.
- fiche détail commande : refonte UI alignée sur le style ELYKIA (sections client, commande, articles, historique conservées).
- synthèse mensuelle des collectes : équivalent en jours calculé collecte par collecte via l'historique des montants (plus le montant courant en repli).
- feature flag `dualCreditAuthorization` (Remote Config, défaut `false`) : habilitation client, sélecteur finalité à la vente, historique sur fiche client.
- feature flag `printReceiptAfterSale` (Firebase Remote Config / Local defaults) désactivé par défaut.
- modal d'aperçu du reçu (Cash et Crédit) pour la compagnie AMENOUVEVE-YAVEH, avec détails des articles, totaux, avances, reste à payer et mise journalière.
- intégration des actions d'impression Windows (`window.print()`) et de sauvegarde locale HTML via `file-saver` depuis le modal.
- tests E2E Playwright golden path **phase 6** : rattrapage crédit sur stock antérieur (seed API, distribution COM020, crédit `RAT-`, décrémentation stock résiduel) ; fixture `rattrapage-helpers`.
- `data-testid` E2E sur la page rattrapage crédit et lien sidebar Rattrapages.
- tests E2E Playwright golden path **phases 4–5** : retour stock commercial, vente comptant, contrôle totaux stock/rapport ; parcours tontine complet (membre, collecte, demande stock tontine, livraison client) avec validation KPIs ; fixtures `stock-return-helpers`, `stock-tontine-helpers`, `tontine-helpers`.
- `data-testid` E2E sur retours stock, stock tontine, tontine (membre, collecte, livraison) et KPIs tontine du rapport journalier.
- tests E2E Playwright (web admin) : golden path **phases 1–3** — après sortie stock, enchaînement vente à crédit, mise journalière (recouvrement), liste recouvrements, rapport journalier (filtre Aujourd'hui + COM020), versement caisse (billetage) et contrôle stock mensuel agrégé ; fixtures `credit-helpers`, extensions API crédits/recouvrements/rapport/stock.
- `data-testid` E2E sur vente crédit (`credit-add`, `credit-list`, modal mise), rapport journalier, versement caisse, billetage, recouvrements et lignes stock mensuel.
- tests E2E Playwright (web admin) : golden path phases 1–2 avec flux sortie stock ordonné (CREATED → validation **ges003** → livraison **mag001** → stock mensuel COM020), assertions API + UI sur les statuts, pagination liste demandes ; fixtures `stock-request-helpers`, API `getStockRequestStatus`.
- KPIs de recouvrement sur le dashboard stock mensuel (montant recouvré, reste à recouvrer, taux de recouvrement).
- nouvelle page `/monthly-reports` avec accordéons année/mois/fichiers et téléchargement direct des PDF, exposée dans le menu pour les profils `ROLE_REPORT`.
- feature flag `monthlyReports` (Firebase Remote Config) pour activer progressivement les rapports mensuels : guard de route, masquage du menu sidebar.
- page `/monthly-reports` alignée sur le style projet (header-card, KPIs, toolbar, tableau) ; skill `.cursor/skills/frontend-ui-style/` pour imposer ce pattern sur les futures pages UI.

### Changed

- sélection de clients : fin du chargement massif (`size=10000` / `100000`) sur ventes, comptes, distributions, rattrapage, **commandes** et **modal membre tontine** ; pagination 20 + infinite scroll + recherche serveur via `ClientSelectComponent`.
- sélection d'articles : fin du chargement massif (`size=10000`) ; pagination 20 + infinite scroll via `ItemService.getEnabledArticlesPage` ; `order.service` et modal livraison tontine alignés.
- modal de versement : colonne surplus, alertes informatives manquant/surplus sans blocage de validation ; historique des versements enrichi.
- opération journalière : pagination connectée à l'API (`page` / `size`) au lieu d'un chargement massif côté client.
- refonte UI du modal de versement caisse, du composant billetage et de l'onglet « Remise au gestionnaire » (palette navy, KPI strip, tableaux et boutons alignés sur le style pro du projet).
- fiche membre tontine : refonte du modal de modification de mise (header navy, résumé membre, champs et actions alignés au design standard ELYKIA) et remplacement des notifications `MatSnackBar` par des toasts `AlertService` sur les soumissions.
- page archives collectes : barre d'actions masquée pour le GESTIONNAIRE (consultation et téléchargement conservés).
- formulaire commande : refonte UI alignée sur le style formulaire ELYKIA (sections client/articles/résumé, autocomplétion conservée).
- tableau de bord commandes : refonte UI (KPI, toolbar, onglets) et liste `order-table` alignée sur le style tableau ELYKIA (data-table, pastilles, btn-detail, pagination corrigée).
- liste comptes : KPI métier (actifs, inactifs, solde total actifs) en complément du total enregistré, via l'endpoint dédié.
- formulaire compte : numéro de compte en lecture seule (`readonly`) en création et édition.
- listes localités, types d'article et inventaire : persistance session de la recherche et de la pagination au retour depuis formulaire ou détail.
- formulaire entrées stock (`inventory-add`) : refonte UI alignée sur le style formulaire ELYKIA.
- liste inventaire : refonte UI alignée sur `client-list` avec section dédiée aux actions inventaire (workflow + opérations stock).
- listes et formulaires localités / types d'article : refonte UI alignée sur `client-list` (palette navy, KPI, toolbar, `mat-paginator`, formulaires standard).
- pages types de dépense (liste et formulaire) : refonte UI alignée sur le module dépenses (KPI, tableau natif, pagination, persistance session, formulaire standard).
- listes demandes et retours stock tontine : refonte UI (KPI, filtres période/commercial, pagination, persistance session) alignée sur le stock classique.
- listes demandes de sortie et retours stock : refonte UI (KPI, filtres période/commercial, pagination, persistance session) alignée sur le style liste ELYKIA.
- fiche membre tontine : synthèse mensuelle affiche des pastilles numérotées (1, 2, 3…) — une pastille par jour collecté.
- modal collecte de rattrapage tontine : refonte UI alignée sur le design ELYKIA (header navy, champs et boutons standard).
- formulaire d'ajout de vente (`credit-add`) : remplacement de la popup de succès SweetAlert par un toast et affichage de l'aperçu du reçu si le feature flag `printReceiptAfterSale` est actif.
- livraison tontine : le bouton « Marquer comme Livré » est réservé au gestionnaire (`ROLE_REPORT`) et au commercial (`ROLE_EDIT_TONTINE`), plus au magasinier ; `data-article-id` sur les options du modal livraison ; golden path E2E étape 26 par COM020.
- golden path E2E : 31/31 étapes vertes — client dédié rattrapage (sans crédit en cours), mise journalière min. 200 FCFA, sélection article stock tontine/livraison alignée sur `testArticle`.

### Fixed

- `ArticleSelectorComponent` : nettoyage des abonnements `valueChanges` par ligne (PU achat) et des requêtes HTTP lazy-load à la destruction, suppression ou nouvelle recherche — évite les fuites mémoire.
- `ClientSelectComponent` : binding via `FormControl` interne (CVA pur, sans `ngModel`) ; annulation des requêtes HTTP paginées et de préchargement client à la destruction ou nouvelle recherche.
- modal livraison tontine : pagination articles (20/page) avec scroll infini dans l'autocomplete.
- `ArticleSelectorComponent` : snapshot des articles sélectionnés avant vidage de l'index ; garde sur `articleId` null dans `attachPurchasePriceSync`.
- `ClientSelectComponent` : chargement déclenché via `ngOnChanges` uniquement ; re-fetch du client sélectionné si absent de l'index après reset.
- `ClientService.getClients()` : suppression du double paramètre `username` sur la requête GET.
- vente comptant (`credit-add`) : clients crédit filtrés par commercial uniquement ; lazy-load articles au passage comptant ; reçu basé sur la réponse API si l'article n'est pas en cache local.
- `AddMemberModalComponent` : désabonnement de `amount.valueChanges` à la fermeture de la modale.
- `AccountAddComponent` : `combineLatest(params, queryParams)` pour éviter la course entre abonnements route.
- E2E golden-path étape 15 : sélecteur vente comptant aligné sur `credit-add` (`label.segment-btn` + `data-testid="e2e-credit-sale-type-cash"`) après refonte UI.
- accès chat/statistiques basé sur `ROLE_AI_CHAT` / `ROLE_AI_REPORT` (plus `ROLE_REPORT`).
- module lazy `ai-chat` (`/ai-chat`) avec sidebar sessions, fil de discussion, preview DATA et sources HOW_TO ; bouton header « Ask AI » et entrée sidebar « Elykia IA » ; feature flag `elykiaAi` + `environment.aiChatEnabled`.
- bulle des messages envoyés — conflit avec la classe globale `.content` (layout sidebar) corrigé ; la bulle s'adapte à la largeur du texte.
- bouton header « Ask AI » — contour réduit (override hauteur `nav-link` 70px, padding et icône plus compacts).
- liste des ventes : checkboxes sélection navy ; modal changement commercial restylé (tokens CSS autonomes hors page).
- téléchargement PDF opération journalière : nom de fichier avec date du jour et collecteur (plus de `Daily_Operation_null.pdf` lorsque `username` est absent du localStorage).
- modal de modification de mise tontine : scroll vertical activé sur petits écrans (hauteur max du dialog + corps scrollable) pour garder le bouton de validation accessible.
- fiche membre tontine : ajout d’un bouton « Annuler » sur l’historique des collectes avec appel API d’annulation et rafraîchissement des soldes.
- les formulaires de collecte tontine (normale et rattrapage), de mise journalière et de versement caisse envoient un `reference` stable par session de formulaire pour éviter les doubles soumissions métier.
- formulaire rattrapage : date de début par défaut = fin du mois stock source, message d'information recouvrement.
- page réinitialisation collectes tontine : colonne action élargie (libellé « Télécharger » vertical), spinner de téléchargement isolé, états de chargement et anti double-clic sur archivage/réinitialisation.
- listes retours et demandes stock : correction du chevauchement du bouton « Réinitialiser » sous le sélecteur commercial.
- fiche membre tontine : section livraison masquée lorsqu'aucune livraison n'existe (404 API), au lieu d'afficher un bloc vide.
- modal livraison tontine : recherche locale de repli quand l'API articles ne retourne rien (autocomplete vide en CI).
- tests E2E golden path étape 25 : sélection article livraison tontine stabilisée (attente chargement API, recherche par id/nom).
- tests E2E golden path étape 8 : ouverture journée comptable avant mise journalière et validation explicite du recouvrement.
- tests E2E golden path étape 7 : soumission vente à crédit stabilisée (skip Remote Config, modal reçu, erreurs Swal, libellé article aligné stock commercial).
- correction du reçu de vente en mode Comptant (Cash) : masquage de la mise journalière de relance ("Payez régulièrement vos mises") dans l'aperçu, l'impression Windows et le fichier HTML téléchargé (auparavant affichée en raison d'une mauvaise interpolation des variables interpolées avec backslash dans le template d'impression/sauvegarde).
- tests E2E golden path : robustesse mise journalière, KPIs journaliers, autocomplete livraison tontine, collecte 50 000 FCFA, réouverture session tontine en `beforeAll` ; ventes comptant via `COM001` ; collecte tontine par `COM020`.

## Mobile — [2.10.3] — 2026-07-09

### Changed

- Détail des opérations stock (demandes/retours standard et tontine) : chargement par ID depuis l'API.

## Mobile — [2.10.2] — 2026-07-09

### Changed

- Détail demande de sortie stock standard : chargement via `GET /api/stock-requests/{id}` (liste allégée sans items côté API).

## Mobile — [2.10.1] — 2026-07-02

### Added

- contrôle des appareils autorisés pour l'app mobile : registre `user_authorized_device`, enforcement au login et sur les requêtes API (`X-Device-Id`), API admin `/api/v1/users/{id}/devices`, paramètre `ENABLED_MOBILE_DEVICE_RESTRICTION`, toggle par utilisateur `mobileDeviceRestrictionEnabled` ; flags Firebase `mobileDeviceManagement` (admin) et `mobileDeviceRestriction` (mobile) ; mobile **2.10.0** avec `@capacitor/device`.
- design system Espace Client : composants shared `elyk-decor-header`, `elyk-overlap-card`, `elyk-outlined-field` ; tokens header/overlap ; variants boutons navy/gold ; skill et `design-system.md` alignés sur les maquettes S-01 à S-11.
- feature flag `dualCreditAuthorization` : persistance des champs habilitation client à l'initialisation, sélecteur PERSONAL/BUSINESS à la distribution, envoi `creditPurpose` à la synchronisation.
- mise à jour in-app depuis Paramètres : bouton « Mettre à jour l'application », vérification de version, téléchargement APK, contrôle SHA-256 et lancement de l'installation Android.
- synchronisation des fiches client modifiées (`updatedInfo`) via le nouvel endpoint, distincte des flux photo et localisation.

### Changed

- page de connexion : demande automatique de l'autorisation d'accès aux fichiers (stockage) à l'arrivée sur l'écran de login si elle n'est pas encore accordée (sauvegardes, logs, photos).
- CI E2E : suite smoke consolidée (1 login partagé par worker), retries réduits, fail-fast et suppression du `npm cache clean` pour accélérer le pipeline `build-mobile`.
- filtres liste clients : puce « Crédit en cours » → `hasActiveDistribution` ; « Nouveau » → `isLocal` ; « Par quartier » → tri par quartier (correction du passage erroné en `clientType`).
- édition complète d'un client déjà synchronisé : formulaire sans photos (gérées via le menu dédié), avec synchronisation différée des informations texte.
- purge conservatrice des clients synchronisés (`ClientRepository.deleteSyncedForReinit`) déclenchée après le succès de la première page API, avant l'insertion paginée ; préserve les clients locaux non synchronisés et ceux avec modifications en attente (`updated`, `updatedPhoto`, `updatedPhotoUrl`).
- même stratégie de purge conservatrice (`AccountRepository.deleteSyncedForReinit`) et fetch paginé (20 éléments/page) à la place d'un chargement unique de 2000 comptes.

### Fixed

- synchronisation et initialisation clients : fusion des doublons locaux (UUID) avec l'ID serveur avant import paginé ; `markAsSynced` gère le cas où la ligne serveur existe déjà (contraintes UNIQUE/PK) ; les erreurs d'import client ne sont plus masquées lors de l'initialisation.
- SQLite après mise à jour in-app (2.8.5 → 2.9.x) : `allowBackup=false`, `androidIsEncryption=false`, enregistrement explicite du plugin dans `MainActivity` ; guards redirigent vers `/initial-loading` si la DB n'est pas prête (évite le dashboard + déconnexion).
- initialisation SQLite : attente `Platform.ready()` et jeep-sqlite (web), détection plugin natif absent (`CapacitorSQLitePlugin: null`), asset `sql-wasm.wasm`, message explicite si rebuild `cap sync` requis.
- sync stock commercial à l'initialisation : réessai automatique si SQLite n'est pas prête (`ensureReady`), vérification avant le chargement initial, logs d'erreur détaillés (message SQLite, contexte article/commercial) à la place de `{}`.
- E2E smoke : `baseURL` et viewport transmis au contexte worker Playwright ; sélecteurs Ionic 8 (`getByPlaceholder`) pour le login ; navigation via `/` + fallback SPA sur `http-server`.
- CI E2E Playwright : démarrage via build statique + `http-server` (évite le timeout `webServer` de `ionic serve` à 120 s).
- correctif compilation E2E : accès `creditPurpose` sur `Record<string, unknown>` (TS4111).
- liste « Clients à recouvrer » : filtre sur les distributions avec `remainingAmount > 0` (au lieu du flag `creditInProgress` ignoré ou obsolète) ; exclusion des clients déjà recouvrés aujourd'hui conservée.
- badge « Crédit en cours » (liste clients) : affiché uniquement si une distribution active existe ; réconciliation automatique de `creditInProgress` en base lors de l'init (après distributions), de la sync et du chargement paginé (page 0).
- correction de l'écrasement de l'état `isLocal`/`isSync` lors de la modification d'un client synchronisé.
- suppression des entités synchronisées « fantômes » ou périmées lors de la ré-initialisation quotidienne, afin de refléter la dernière version serveur sans charger l'intégralité des clients en mémoire.

## Backend — [1.0.3] — 2026-07-03

### Fixed

- `ClientService` : validation d'unicité téléphone / pièce d'identité avant `update` (HTTP 400 explicite) ; création idempotente conservée pour la sync mobile (rejeu POST après timeout : retour du client existant si même prénom, nom, téléphone et `cardID`, afin de récupérer l'id serveur).

## Backend — [1.0.2] — 2026-07-02

### Fixed

- `StockReturnService.createHistoriqueReturn` : persistance des lignes `StockReturnItem` pour tous les profils sans déduction du stock cible tant que le retour n'est pas validé ; déduction du stock historique et réintégration magasin uniquement à la création pour magasinier/admin, ou à la validation pour les autres profils.

## Backend — [1.0.1] — 2026-07-02

### Added

- champ `code` sur les articles avec génération automatique à la création (`type`×3 + `marque`×2 + `model`×2 + initiales du `name` + `creditSalePrice`) ; migration Flyway `V69` pour ajouter la colonne et backfiller les articles existants sans code ; recherche elasticsearch étendue au code.

## Backend — [1.0.0] — 2026-07-02

### Added

- cache Caffeine sur les clients paginés par commercial (`GET /api/v1/clients/by-commercial/{commercial}`) et sur la liste paginée (`GET /api/v1/clients`).
- cache Caffeine (5 min) sur la liste des commerciaux (`GET /api/v1/promoters/all`) et sur les listes/p pages articles (`/api/v1/articles`, `/enabled`, `/all`).
- colonne `society_share_amount` sur `tontine_collection` et KPI `totalSocietyShare` sur `/api/v1/tontine-collections/web/summary` ; `lowStockCount` sur `/api/v1/articles/stock-kpis`.
- valorisation FIFO du stock magasin derrière le paramètre `ENABLED_FIFO_STOCK_VALUATION` (désactivé par défaut) : lots `article_stock_lot`, façade `StockValuationFacade`, service FIFO, activation/backfill admin (`POST /api/v1/stock/fifo/activate`), endpoints consultation lots et KPIs FIFO.
- colonne `unit_purchase_cost` sur les lignes crédit pour figer le coût d'achat à la distribution.
- contrôle des appareils autorisés pour l'app mobile : registre `user_authorized_device`, enforcement au login et sur les requêtes API (`X-Device-Id`), API admin `/api/v1/users/{id}/devices`, paramètre `ENABLED_MOBILE_DEVICE_RESTRICTION`, toggle par utilisateur `mobileDeviceRestrictionEnabled` ; flags Firebase `mobileDeviceManagement` (admin) et `mobileDeviceRestriction` (mobile) ; mobile **2.10.0** avec `@capacitor/device`.
- few-shot SQL par domaine (`sql-examples.json`, `SqlExamplesService`), RAG hybride embeddings Ollama + fallback mots-clés (`GuideVectorSearch`), métriques Micrometer (`AiMetricsService`), journal `ai_query_log` (migration V62), API admin `/api/v1/ai/admin/stats`, tests `SqlExamplesServiceTest`.
- endpoint `POST /api/v1/credits/list-summary` : KPIs ventes clôturées (SETTLED) par type crédit/cash/tontine (CA + marge FCFA), encours crédit (snapshot INPROGRESS) et total recouvré sur période, filtrable via recherche avancée.
- versements caisse scindés en 3 catégories (`creditAmount`, `tontineAmount`, `newBalanceAmount`) avec conservation du total `amount` ; sous-totaux déposés sur `DailyCommercialReport` ; calculateur `CashDepositCategoryCalculator` (solde nouveaux comptes distinct du crédit).
- remise périodique secrétaire → gestionnaire (`CashPeriodRemittance`) : soumission mensuelle, accusé de réception par le gestionnaire ou initiation directe ; migrations Flyway V57/V58.
- stock mensuel : agrégation `totalCreditDepositedAmount` depuis les versements crédit du mois.
- réinitialisation des collectes tontine de la session en cours : archivage PDF par commercial tontine et quartier (MinIO), remise à zéro des contributions membres, ajustement des rapports journaliers commerciaux (`totalAmountToDeposit`, collectes tontine), permissions dédiées consultation et exécution.
- endpoint `GET /api/v1/tontines/members/{id}/amount-history` : historique des montants journaliers d'un membre.
- dual-crédit : `creditPurpose` (PERSONAL/BUSINESS), habilitation business client (GESTIONNAIRE), historique, unicité par finalité ; rétrocompatibilité si `creditPurpose` absent (comportement actuel).
- migration Flyway V52, endpoints `POST/DELETE/GET .../business-credit-authorization`.
- API mobile release (`GET /api/v1/mobile/app/release/latest`, `GET /api/v1/mobile/app/release/download`) avec manifest et APK hébergés dans MinIO (`elykia-mobile-releases`).
- endpoint `POST /api/v1/tontines/sessions/current/reopen` pour réouvrir la session tontine entre deux exécutions E2E.
- endpoint `POST /api/v1/commercial-stock/e2e/seed-residual` pour préparer un stock résiduel du mois précédent (tests E2E rattrapage crédit).
- endpoint `POST /api/v1/tontines/sessions/current/close` pour clôturer la session tontine en cours (prérequis livraison E2E et opérations admin).
- agrégation de recouvrement sur le stock mensuel commercial (`recoverySummary`) : montant recouvré, reste à recouvrer et taux, calculés via l'historique de ventes (`deltaValue`) et les totaux crédit (`totalAmountPaid` / `totalAmountRemaining`).
- endpoint `PATCH /api/v1/clients/info-update` pour la mise à jour des informations client depuis le mobile, sans toucher aux photos.
- système complet de rapport mensuel avec entités `MonthlyReportRun`/`MonthlyReportFile`/`MonthlyReportSnapshot`/`MonthlyReportOutboxEntry`, API REST (`GET tree`, `GET download`, `POST generate`, `GET runs`) et génération PDF global + par commercial.

### Changed

- livraison des demandes de sortie (crédit et tontine) : prix de vente catalogue et prix d'achat courants appliqués à la livraison (FIFO : coût moyen consommé ; legacy : PU achat catalogue), au lieu de conserver les prix figés à la création.
- export PDF sorties/retours de stock : filtrage des sorties sur la date de livraison et des retours sur la date de réception (au lieu de la date de demande / création du retour).
- livraison des demandes de stock : le stock mensuel du commercial est rattaché au mois de la date de livraison (et non plus à la date de création de la demande).
- versements caisse : colonne `surplusAmount` (migration V59) pour tracer l'écart positif entre billetage physique et répartition système ; validation assouplie (manquant autorisé via versements partiels successifs).
- endpoints `/api/v1/credits/by-collector`, `/by-collector/all` et `/by-collector/all-grouped` : retour d'un DTO léger `DailyUnrecoveredCreditDto` (client, mise, reste à payer) plutôt que l'entité `Credit` complète.
- endpoints `/api/v1/articles/detailed-stock-value` et `/stock-kpis` : ajout de `sellingSaleTotal` et `sellingMargin` / `estimatedSellingMargin`.
- espace client `/api/customer/*` : auth (`check-phone`, `login`, `setup-pin`), dashboard, achats, recouvrements, catalogue, commandes, soumission Mobile Money (statut INITIÉ).
- profil `CLIENT` / permission `ROLE_CLIENT`, flag `pin_configured` sur `UserAccount`, table `customer_user_mapping` (orchestration core).
- provisioning automatique des comptes clients (`username` = numéro local, email `firstname.lastname@amenouveve-yaveh.com`), sync téléphone via `ClientPhoneUpdatedEvent`.
- intégration Firebase Admin (`FirebaseTokenVerifier`) pour validation OTP lors du setup PIN.
- `common-security-service` 1.2.0, migrations Flyway V55/V56.
- rattrapage tontine : la collecte peut désormais appliquer une mise journalière spécifique au mois passé ciblé si aucune collecte n'existe encore sur ce mois, sinon la modification est bloquée.
- ajout d'un endpoint de prévisualisation de rattrapage (`memberId` + `collectionDate`) pour retourner la mise applicable et indiquer si le mois est verrouillé.
- permissions archives collectes tontine : `ROLE_CONSULT_TONTINE_COLLECTION_RESET` (consultation/téléchargement, GESTIONNAIRE) séparée de `ROLE_RESET_TONTINE_COLLECTIONS` (archivage et réinitialisation, ADMIN uniquement).
- endpoints stock-tontine-request et stock-tontine-return : filtres date/commercial et KPIs dédiés.
- endpoints stock-requests et stock-returns : filtres `startDate`/`endDate`/`collector` sur la liste et KPIs dédiés (`/kpis`).
- rapports mensuels : régénération idempotente — purge des fichiers, outbox et snapshots existants (MinIO + base) avant une nouvelle génération pour le même mois.
- rapports mensuels : noms de fichiers téléchargeables suffixés par mois et année (`general-05-2026.pdf`, `commercial-COM001-05-2026.pdf`).
- templates PDF rapports mensuels : style aligné sur le rapport journalier (en-tête bleu, KPIs, tableaux), libellés métier sans références techniques (CreditTimeline, TontineDelivery, etc.), montants en FCFA.
- scheduler outbox rapports mensuels : logs INFO à chaque exécution (début, MinIO indisponible, volume à traiter, succès/échec par entrée, bilan).
- `PUT /api/v1/clients/{id}` : préservation des photos et URLs si le corps de requête ne les fournit pas.
- intégration MinIO étendue avec bucket dédié `elykia-reports`, clé de stockage normalisée des rapports et opérations génériques upload/download/delete réutilisables.
- enrichissement de la traçabilité `CommercialStockMovement` (prix achat/vente unitaires, marge ligne, source fonctionnelle) alimenté à l’écriture dans les flux sortie/retour/crédit.

### Fixed

- `ArticlesService` : `@CacheEvict` sur enable/disable utilise les noms de cache en littéral (tableau inline) — corrige l'échec de compilation CI (`String[]` non utilisable comme constante d'annotation Java), qui masquait des centaines d'erreurs Lombok fantômes.
- `ClientService` : invalidation cache clients paginés (`@EvictClientListCaches`, `beforeInvocation = true`) pour éviter des listes obsolètes après échec de `delete` ou mutation partielle.
- `ClientService` : invalidation cache clients paginés sur mise à jour localisation, photos (URL, binaire, batch).
- clé cache `ClientService.getAll()` : filtre commercial normalisé via `ClientCacheKeyHelper` (alignée sur `effectiveUsername` réellement utilisé en requête).
- `ArticlesService.disableArticle` / `enableArticle` : `@CacheEvict` direct sur les méthodes single-ID (appel à `doDisableArticle` / `doEnableArticle`) — suppression du proxy `@Lazy` auto-injecté.
- `AccountingDayService.getCurrentAccountingDate` : lecture seule (plus de fermeture/ouverture automatique à chaque appel) ; bascule journalière via `ensureCurrentAccountingDay()` (endpoint `/current`, cron 00:05) ; correction `openAccountingDay` (journée ouverte périmée, boucle bornée) pour éviter la saturation CPU ; verrou unique + méthodes internes sans `synchronized` imbriqué.
- `distributeArticlesV2` : conservation explicite du `totalAmount` mobile via `mobileFinancialTermsLocked` (après application du PMP stock).
- `POST /api/auth/refreshtoken` : champ `deviceRestrictionActive` aligné sur le signin.
- `Credit.start()` : initialisation défensive de `remainingDaysCount` (défaut 30 jours) avant calcul de `expectedEndDate` — évite une NPE si `start()` est appelé avant `@PrePersist` sans passage par `checkAdvance()`.
- sync distribution mobile (`distributeArticlesV2`) : conservation de la mise, de l'avance et de la date de fin (`endDate`) calculées et imprimées sur le mobile — le backend ne recalcule plus la mise via `checkAdvance()` ; flag persisté `mobile_financial_terms_locked` ; validation des montants mobile ; application unique dans `buildDistribution`.
- mode legacy stock (`ENABLED_FIFO_STOCK_VALUATION` OFF) : contrat `registerEntry()` documenté — retourne volontairement `null` (aucun lot créé), sans NPE côté appelants.
- refresh token : la chaîne `Optional` filtre désormais un `User` null (token orphelin / état DB corrompu) au lieu de provoquer une `NullPointerException` dans la validation device.
- livraison stock tontine : en mode legacy (FIFO désactivé), `purchasePrice` des lignes est désormais renseigné depuis le prix catalogue article à la livraison, aligné sur `StockRequestService` — corrige un `totalPurchasePrice` à 0 si le prix n'était pas figé à la création.
- ventes crédit : `totalMargeValue` sur le stock commercial cumule désormais la marge (`qty × (prix vente − PMP achat)`) et non le coût d'achat ; migration de rattrapage des données historiques.
- providers cloud **OpenAI** (`elykia.ai.provider=openai`) et **Gemini/Vertex AI** (`elykia.ai.provider=gemini`) ; doc mise à jour dans `AI_ASSISTANT.md`.
- provider cloud **Anthropic (Claude)** câblé (`elykia.ai.provider=anthropic`) ; doc providers cloud dans `AI_ASSISTANT.md`.
- rate limit cumulatif — **15/min** (anti-abus) + quotas **20/jour** et **120/semaine** ; rôles dédiés `ROLE_AI_CHAT` et `ROLE_AI_REPORT` (API + auto-init profils GESTIONNAIRE/ADMIN).
- rate limiting par utilisateur (`AiRateLimiter`), audit structuré (`AiAuditService`), tests `AiRateLimiterTest`.
- enrichissement `schema-catalog.json` (stock : `stock_request`, `stock_return`, `commercial_monthly_stock`, `commercial_stock_movement`, `article_history`, `cash_deposit`, rapport journalier étendu) ; filtre row-level par colonne catalogue (`collector` ou `commercial_username`).
- module `core/ai` avec Spring AI + provider stub/Ollama, orchestrateur dual pipeline (Text-to-SQL sécurisé + RAG user-guide), catalogue schéma (`schema-catalog.json`), validateur SQL (JSqlParser), filtre row-level commercial, sessions persistées (`ai_conversation` / `ai_message`, migration V61), API REST `/api/v1/ai/*` testable via Swagger, doc `backend/docs/AI_ASSISTANT.md`.
- démarrage sans clé OpenAI — désactivation explicite des modèles audio/image/moderation Spring AI (`spring.ai.model.audio.speech: none`, etc.) et ordre corrigé de `AiProviderEnvironmentPostProcessor`.
- démarrage avec plusieurs starters Spring AI — conflit `EmbeddingModel` (Ollama + OpenAI) résolu via `AiEmbeddingConfiguration`, `@Qualifier` dans `GuideVectorSearch` et `spring.ai.model.embedding: none` par défaut.
- KPI liste des ventes (`list-summary`) : requêtes SQL corrigées (`c.visibility` au lieu de `c.state`, colonne réelle en base).
- opération journalière caisse : la liste et le PDF des crédits non recouvrés s'appuient sur l'absence de ligne `CreditTimeline` pour la journée comptable courante, au lieu du flag `dailyPaid` (source de données incorrecte malgré le cron).
- opération journalière : requête optimisée (anti-join `LEFT JOIN` au lieu de `NOT EXISTS` corrélé), filtre sur la journée via `LocalDate.now()`, index Flyway V60 sur `credit_timeline` et `credit`.
- fiche PDF réception de stock : libellé article combinant désormais nom commercial et nom (`commercialName` + `name`) ; en-tête AMENOUVEVE - YAVEH, date de génération et copyright Elykia en pied de page.
- modification de mise tontine : les scopes `FUTURE_ONLY` et `CURRENT_AND_FUTURE` n'altèrent plus les allocations historiques (part société/contribution passées) ; seul `GLOBAL` déclenche un recalcul rétroactif des collectes.
- calcul de la mise applicable par date : prise en compte de `endDate` dans l'historique des montants pour éviter des sélections de montant hors période.
- annulation d’une collecte tontine (normale ou rattrapage) : suppression logique de la collecte, recalcul complet des contributions du membre, ajustement des agrégations `DailyCommercialReport` et journalisation d’une opération négative dédiée.
- nouvelle permission `ROLE_CANCEL_TONTINE_COLLECTION` attribuée au profil ADMIN pour contrôler l’action d’annulation.
- les opérations financières web de versement caisse et de mise journalière réutilisent désormais la première opération en cas de renvoi du même `reference` (idempotence anti-doublon sur réseau instable).
- recouvrement stock mensuel : exclusion explicite des crédits `RAT-*` non rattachés aux items du stock courant ; suppression migration V54 erronée (rattrapage avril ≠ stock mai).
- création crédit rattrapage : marqueur `RATTRAPAGE_STOCK` sur `oldReference`, validation de la date de début vs mois stock source.
- listes stock (demandes/retours) : requêtes filtrées compatibles PostgreSQL (paramètres date nullable via SpEL).
- entité `Credit` : suppression du `DEFAULT` dans `columnDefinition` de `credit_purpose` (DDL Hibernate incompatible PostgreSQL ; défaut géré par Flyway V52 et valeur Java).
- requêtes JPQL `CreditRepository` et `TontineMemberRepository` : constructeur `ClientRespDto` aligné sur les champs dual-crédit (démarrage application).
- `CreditRespDto` : champ `advance` exposé dans les réponses API et requêtes JPQL `CreditRepository` (sync mobile des distributions) ; corrige l'avance toujours à 0 dans le détail distribution après initialisation.
- KPI recouvrement stock mensuel : correction sur-attribution (retrait du rapprochement article/mois trop large, plafond sur `totalSoldValue`, invariant recouvré + reste = total dû) ; script SQL `docs/sql/diagnostic_stock_recovery.sql`.
- ventes comptant : valorisation du stock commercial corrigée (`totalSoldValue`, PMP, prix d'achat) avec repli sur `sellingPrice` si `unitPrice` absent, et migration `V50` de rattrapage des données historiques.
- ventes crédit/comptant : le `unitPrice` des lignes `CreditArticles` est figé dès le passage en `INPROGRESS` (setter, garde JPA `@PreUpdate`, blocage du recalcul catalogue dans `totalAmount`) pour éviter l'écrasement des prix historiques lors d'évolutions tarifaires.
- rapports mensuels : clôture des stocks mensuels hors transaction `prepare` (une transaction `REQUIRES_NEW` par commercial) pour éviter le rollback silencieux lorsque la clôture échoue pour un commercial.
- rapports mensuels : génération parallèle des PDF commerciaux — le run est commité avant les écritures outbox/fichiers (transactions `REQUIRES_NEW` par worker) pour éviter la violation de clé étrangère `run_id`.
- rapports mensuels : colonnes d'audit alignées sur `date_reg` / `reg_user_id` (convention `BaseEntity`) dans les migrations et requêtes SQL natives ; migration corrective `V49` pour les environnements déjà déployés.

## Customer-space — [0.0.1] — 2026-07-02

### Added

- infrastructure tests : Playwright (E2E mobile), Karma headless, skill `customer-space-testing`, workflow CI découplé `ci-customer-space.yml`.
- splash S-01, auth S-02, dashboard S-03, navigation par onglets bas (`CustomerTabBarComponent`).
- parcours achats S-04/05/06 (filtres, détail, timeline pastilles, lien paiement) avec tests unitaires et E2E `purchases-flow`.
- paiement Mobile Money S-07/08 (préremplissage montant/mise, confirmation) avec tests et E2E `mobile-money`.
- commande S-09/10/11 : `CartService`, catalogue, panier, confirmation API ; E2E `order-flow`.
- profil client (déconnexion) et Capacitor `com.optimize.elykia.customer` ; E2E `logout`.
- skill Cursor `customer-space-ui-style` aligné sur les maquettes wireflow (design tokens Playfair/DM Sans, patterns Ionic premium).
- thème global (`variables.scss`, `global.scss`, fonts) et wizard auth multi-étapes (téléphone local → PIN ou OTP Firebase + configuration PIN).
- utilitaire `PhoneNormalizer` (+228 côté Firebase uniquement) et intégration Firebase Phone Auth (SDK).
- E2E `auth/setup-pin` (OTP mocké via `window.__E2E__`) ; tests unitaires `catalog`, `cart`, `order-confirmation`.
- script `firebase:configure`, doc `docs/FIREBASE_SETUP.md`, job CI `build-customer-space-prod` avec secrets `CUSTOMER_SPACE_GOOGLE_SERVICES_JSON` / `CUSTOMER_SPACE_FIREBASE_WEB_CONFIG`.

### Fixed

- splash post-auth : redirection vers `/dashboard` uniquement depuis `/` ou `/auth` (ne bloque plus les deep links E2E `/catalog`, `/purchases`, etc.).
- `FirebaseAuthService` : court-circuit OTP en mode E2E pour le parcours setup PIN sans Firebase réel.

## Docs & Infra

### Fixed

- `bootstrap_server.sh` : service systemd `elykia.service` aligné sur `deploy.sh` (`--project-name elykia-prod`, `--env-file /opt/elykia/prod/.env`) pour ne plus recréer la stack fantôme `deploy-db-1` au boot.
- `import-db.sh` : heuristique de sélection du conteneur Postgres exclut le projet Compose legacy `deploy`.
- `README.md` / `EXPLOITATION.md` : exemples et dépannage mis à jour (`elykia-test-db-1` / `elykia-prod-db-1` au lieu de `deploy-db-1`).

### Changed

- CI `build-frontend` / `build-backend` : actions Docker mises à jour vers les majors Node.js 24 (`setup-buildx-action@v4`, `login-action@v4`, `metadata-action@v6`, `build-push-action@v7`).

### Added

- skill et règle Cursor `mobile-version-bump` : incrément obligatoire de la version mobile (`package.json`, `environment.ts`, `environment.prod.ts`) à chaque modification sous `mobile/`.
- skill Cursor `frontend-lazy-loading-migration` + règle `frontend/**` : activation automatique sur toute tâche frontend ; migration progressive lazy-loading (un domaine eager par tâche, URLs `/{domaine}/...`).
- `CreditListSummaryServiceTest`, specs composants `credit-list-kpi` et `credit-list`.
- `CashDepositCategoryCalculatorTest`, `CashPeriodRemittanceServiceTest`, spec modèle `daily-commercial-report.model`.
- publication automatique de l'APK test/prod vers MinIO et mise à jour du manifest après build release (`publish-mobile-apk.sh`).
- variables `MINIO_MOBILE_RELEASES_BUCKET` et `MOBILE_RELEASE_CHANNEL` (test/prod) pour le canal de distribution mobile.
- workflow GitHub Actions `e2e.yml` (ELYKIA QA — E2E Web) : smoke + golden path Playwright après déploiement TEST CD, en parallèle du build APK mobile.
- `README.md` racine (vue fonctionnelle, structure, démarrage dev) et `docs/README_E2E_TEST.md` (documentation complète des tests E2E).
- `db_restore_from_drive.sh` : restauration manuelle prod depuis le dernier backup Google Drive (reprise après incident), via `import-db.sh`.
- `docker-compose.dev.yml` : MinIO local sur les ports 19000 (API) et 19001 (console), sans Traefik, ports configurables via `MINIO_API_PORT` / `MINIO_CONSOLE_PORT`.
- skill Cursor `.cursor/skills/keep-changelog/` — impose la mise à jour du changelog après chaque tâche agent (équivalent projet de `.agent/skills/keep-changelog/`).
- `docs/CHANGELOG.md` — journal des modifications du monorepo ELYKIA (format Keep a Changelog).
- Skill `.agent/skills/keep-changelog/` — impose la mise à jour du changelog après chaque tâche agent.

### Changed

- script `diagnostic_stock_recovery.sql` : libellé article via `CONCAT(type, marque, model)` (requêtes 6–7), ajout requête 7 pré-déploiement (attribution history + `stock_item_id`).
- skill `frontend-ui-style` : règle obligatoire de persistance d'état liste (`sessionStorage`).
- CI/CD : le mobile est découplé du gate de déploiement (`ci-mobile.yml` indépendant de `ci.yml`) ; le CD ne bloque plus sur un échec mobile, l'APK release attend les deux workflows.
- spec dual-crédit : révocation possible même avec crédit BUSINESS en cours (bloque seulement les futures créations) ; historique immuable des habilitations/révocations (`BusinessCreditAuthorizationEvent`).
- pipeline CD : détection automatique des changements dans `deploy/` ; les jobs test, prod et promote passent `-fu` à `deploy.sh` pour resynchroniser `/opt/elykia/deploy` sur le serveur avant le déploiement.
- build APK test/prod : synchronisation de `versionName` et `versionCode` depuis `mobile/package.json` vers `android/app/build.gradle` avant `assembleRelease` (script `sync-android-version.sh`).
- convention d'ordre descendant des sections du changelog (date la plus récente en haut).
- skill `keep-changelog` : journal versionné par composant (`package.json` / `pom.xml`) à la place de `[Unreleased]` ; migration du contenu historique.

### Fixed

- `rollback.sh` : lecture/écriture des releases et du pointeur `*_current.txt` sous `/opt/elykia/<env>/releases/` (aligné sur `deploy.sh`), mise à jour de `/opt/elykia/<env>/.env` et `docker compose` avec `--project-name` / `--env-file` ; extraction des images tolérante (`grep || true`) ; `--last` basé sur le pointeur courant et l'ordre chronologique des fichiers (plus le tri `mtime`) pour enchaîner plusieurs rollbacks — corrige l'échec « No current release pointer found » en prod.
- service Ollama optionnel dans `deploy/docker-compose.dev.yml`.
- `SqlValidatorTest`, `SqlRowLevelFilterTest`, `AiOrchestratorServiceTest`.
- guide Ollama dev et dépannage TLS (`deploy/OLLAMA_DEV.md`).
- diagnostic recouvrement requête 7 : colonnes PMP, `quantity_sold`, `pmp × qty` et écart vs `total_sold_value`.
- pipeline E2E : seed automatique des articles de référence (`V14__insert_articles.sql`) après démarrage du backend sur Postgres vierge, corrigeant l'échec `ensureArticleWithStock` quand `/api/v1/articles/enabled` est vide.
- labels Traefik MinIO (test/prod) : liaison explicite router → service pour la console (port 9001) et l'API S3 (port 9000), corrigeant le 404 sur `minio*.amenouveve-yaveh.com` avec Traefik v3.
- `db_backup_upload.sh` : recherche des dumps alignée sur le nom réel produit par `db_backup.sh` (`elykia_db_backup_prod_*.dump` au lieu de `prod_*.dump`).
- réintégration de la configuration MinIO S3 depuis `feature/s3` : service MinIO dans les docker-compose test/prod, labels Traefik (console + API), variables d'environnement backend et templates `.env` dans `setup-server.sh` (conservation des ajouts rclone).
