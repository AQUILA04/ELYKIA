# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Sections are grouped **by component** (Frontend, Mobile, Backend, Customer-space, Docs & Infra).
Within each component, versions are ordered **descending** (most recent at the top).
Version numbers align with `package.json` (frontend apps) or `backend/pom.xml` (API).

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

## Mobile — [2.10.4] — 2026-07-09

### Added

- Écran `/change-password` pour le changement obligatoire après reset admin, avec blocage de la navigation tant que le mot de passe n'est pas redéfini.
- Connexion hors ligne bloquée tant que `mustChangePassword` est actif ; mise à jour du hash local après changement réussi.

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
