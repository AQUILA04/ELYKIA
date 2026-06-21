# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Sections are ordered **descending by date**: most recent at the top, oldest at the bottom.
`[Unreleased]` always appears first, immediately after this header.

## [Unreleased]

### Added

- **Backend —** versements caisse scindés en 3 catégories (`creditAmount`, `tontineAmount`, `newBalanceAmount`) avec conservation du total `amount` ; sous-totaux déposés sur `DailyCommercialReport` ; calculateur `CashDepositCategoryCalculator` (solde nouveaux comptes distinct du crédit).
- **Backend —** remise périodique secrétaire → gestionnaire (`CashPeriodRemittance`) : soumission mensuelle, accusé de réception par le gestionnaire ou initiation directe ; migrations Flyway V57/V58.
- **Backend —** stock mensuel : agrégation `totalCreditDepositedAmount` depuis les versements crédit du mois.
- **Frontend —** modal de versement avec répartition crédit / tontine / solde Nx comptes ; KPIs et historique par catégorie sur le rapport journalier ; onglet « Remise au gestionnaire ».
- **Frontend —** stock mensuel : carte « Versements Crédit » remplace le taux de recouvrement %.
- **Tests —** `CashDepositCategoryCalculatorTest`, `CashPeriodRemittanceServiceTest`, spec modèle `daily-commercial-report.model`.

### Fixed

- **Backend —** opération journalière caisse : la liste et le PDF des crédits non recouvrés s'appuient sur l'absence de ligne `CreditTimeline` pour la journée comptable courante, au lieu du flag `dailyPaid` (source de données incorrecte malgré le cron).

### Changed

- **Backend —** endpoints `/api/v1/credits/by-collector`, `/by-collector/all` et `/by-collector/all-grouped` : retour d'un DTO léger `DailyUnrecoveredCreditDto` (client, mise, reste à payer) plutôt que l'entité `Credit` complète.
- **Frontend —** opération journalière : pagination connectée à l'API (`page` / `size`) au lieu d'un chargement massif côté client.

- **Backend —** endpoints `/api/v1/articles/detailed-stock-value` et `/stock-kpis` : ajout de `sellingSaleTotal` et `sellingMargin` / `estimatedSellingMargin`.

- **Frontend —** refonte UI du modal de versement caisse, du composant billetage et de l'onglet « Remise au gestionnaire » (palette navy, KPI strip, tableaux et boutons alignés sur le style pro du projet).

- **Customer-space —** infrastructure tests : Playwright (E2E mobile), Karma headless, skill `customer-space-testing`, workflow CI découplé `ci-customer-space.yml`.
- **Customer-space —** splash screen S-01 (logo ELYKIA, redirect auth/dashboard), barre d'onglets basse, routing `app.routes.ts` branché sur `AppRoutingModule` + `HttpClientModule`.
- **Customer-space —** dashboard S-03 enrichi (états vide/erreur, activités récentes, carte crédit, actions rapides) ; tests unitaires et E2E smoke/auth/dashboard.
- **Customer-space —** skill Cursor `customer-space-ui-style` aligné sur les maquettes wireflow (design tokens Playfair/DM Sans, patterns Ionic premium).
- **Customer-space —** thème global (`variables.scss`, `global.scss`, fonts) et wizard auth multi-étapes (téléphone local → PIN ou OTP Firebase + configuration PIN).
- **Customer-space —** utilitaire `PhoneNormalizer` (+228 côté Firebase uniquement) et intégration Firebase Phone Auth (SDK).
- **Backend —** espace client `/api/customer/*` : auth (`check-phone`, `login`, `setup-pin`), dashboard, achats, recouvrements, catalogue, commandes, soumission Mobile Money (statut INITIÉ).
- **Backend —** profil `CLIENT` / permission `ROLE_CLIENT`, flag `pin_configured` sur `UserAccount`, table `customer_user_mapping` (orchestration core).
- **Backend —** provisioning automatique des comptes clients (`username` = numéro local, email `firstname.lastname@amenouveve-yaveh.com`), sync téléphone via `ClientPhoneUpdatedEvent`.
- **Backend —** intégration Firebase Admin (`FirebaseTokenVerifier`) pour validation OTP lors du setup PIN.
- **Backend-lib —** `common-security-service` 1.2.0, migrations Flyway V55/V56.

### Fixed

- **Frontend —** page inventaire : correction d'une balise HTML mal fermée dans la bande KPI qui cassait la mise en page (sections actions, recherche et tableau imbriquées dans une carte KPI).

- **Backend —** fiche PDF réception de stock : libellé article combinant désormais nom commercial et nom (`commercialName` + `name`) ; en-tête AMENOUVEVE - YAVEH, date de génération et copyright Elykia en pied de page.

- **Frontend —** modal de modification de mise tontine : scroll vertical activé sur petits écrans (hauteur max du dialog + corps scrollable) pour garder le bouton de validation accessible.
- **Backend —** modification de mise tontine : les scopes `FUTURE_ONLY` et `CURRENT_AND_FUTURE` n'altèrent plus les allocations historiques (part société/contribution passées) ; seul `GLOBAL` déclenche un recalcul rétroactif des collectes.
- **Backend —** calcul de la mise applicable par date : prise en compte de `endDate` dans l'historique des montants pour éviter des sélections de montant hors période.
- **Backend —** annulation d’une collecte tontine (normale ou rattrapage) : suppression logique de la collecte, recalcul complet des contributions du membre, ajustement des agrégations `DailyCommercialReport` et journalisation d’une opération négative dédiée.
- **Frontend —** fiche membre tontine : ajout d’un bouton « Annuler » sur l’historique des collectes avec appel API d’annulation et rafraîchissement des soldes.
- **Security —** nouvelle permission `ROLE_CANCEL_TONTINE_COLLECTION` attribuée au profil ADMIN pour contrôler l’action d’annulation.
- **Backend —** les opérations financières web de versement caisse et de mise journalière réutilisent désormais la première opération en cas de renvoi du même `reference` (idempotence anti-doublon sur réseau instable).
- **Frontend —** les formulaires de collecte tontine (normale et rattrapage), de mise journalière et de versement caisse envoient un `reference` stable par session de formulaire pour éviter les doubles soumissions métier.
- **Backend —** recouvrement stock mensuel : exclusion explicite des crédits `RAT-*` non rattachés aux items du stock courant ; suppression migration V54 erronée (rattrapage avril ≠ stock mai).
- **Backend —** création crédit rattrapage : marqueur `RATTRAPAGE_STOCK` sur `oldReference`, validation de la date de début vs mois stock source.
- **Frontend —** formulaire rattrapage : date de début par défaut = fin du mois stock source, message d'information recouvrement.
- **Docs —** diagnostic recouvrement requête 7 : colonnes PMP, `quantity_sold`, `pmp × qty` et écart vs `total_sold_value`.

- **Frontend —** page réinitialisation collectes tontine : colonne action élargie (libellé « Télécharger » vertical), spinner de téléchargement isolé, états de chargement et anti double-clic sur archivage/réinitialisation.

### Added

- **Frontend —** fiche membre tontine : nouvelle section « Historique des montants de mise » affichant les périodes `tontine_member_amount_history` (dates, montant journalier, statut).
- **Frontend —** modal de collecte de rattrapage tontine : ajout du champ « mise journalière du mois ciblé » transmis au backend avant calcul de la collecte.
- **Frontend —** modal de rattrapage tontine : prévisualisation explicite avant soumission (mois ciblé, mise applicable, état verrouillé/modifiable) avec indicateurs visuels vert/orange.

- **Backend —** réinitialisation des collectes tontine de la session en cours : archivage PDF par commercial tontine et quartier (MinIO), remise à zéro des contributions membres, ajustement des rapports journaliers commerciaux (`totalAmountToDeposit`, collectes tontine), permissions dédiées consultation et exécution.
- **Frontend —** page « Archives collectes » sous Tontines : archivage PDF seul ou archivage + réinitialisation (ADMIN), consultation et téléchargement des archives.

- **Frontend —** fiche détail commande : refonte UI alignée sur le style ELYKIA (sections client, commande, articles, historique conservées).

### Changed

- **Frontend —** fiche membre tontine : refonte du modal de modification de mise (header navy, résumé membre, champs et actions alignés au design standard ELYKIA) et remplacement des notifications `MatSnackBar` par des toasts `AlertService` sur les soumissions.
- **Backend —** rattrapage tontine : la collecte peut désormais appliquer une mise journalière spécifique au mois passé ciblé si aucune collecte n'existe encore sur ce mois, sinon la modification est bloquée.
- **Backend —** ajout d'un endpoint de prévisualisation de rattrapage (`memberId` + `collectionDate`) pour retourner la mise applicable et indiquer si le mois est verrouillé.

- **Backend —** permissions archives collectes tontine : `ROLE_CONSULT_TONTINE_COLLECTION_RESET` (consultation/téléchargement, GESTIONNAIRE) séparée de `ROLE_RESET_TONTINE_COLLECTIONS` (archivage et réinitialisation, ADMIN uniquement).
- **Frontend —** page archives collectes : barre d'actions masquée pour le GESTIONNAIRE (consultation et téléchargement conservés).
- **Docs —** script `diagnostic_stock_recovery.sql` : libellé article via `CONCAT(type, marque, model)` (requêtes 6–7), ajout requête 7 pré-déploiement (attribution history + `stock_item_id`).

- **Frontend —** formulaire commande : refonte UI alignée sur le style formulaire ELYKIA (sections client/articles/résumé, autocomplétion conservée).
- **Frontend —** tableau de bord commandes : refonte UI (KPI, toolbar, onglets) et liste `order-table` alignée sur le style tableau ELYKIA (data-table, pastilles, btn-detail, pagination corrigée).
- **Frontend —** liste comptes : KPI métier (actifs, inactifs, solde total actifs) en complément du total enregistré, via l'endpoint dédié.

### Changed

- **Frontend —** formulaire compte : numéro de compte en lecture seule (`readonly`) en création et édition.
- **Frontend —** listes localités, types d'article et inventaire : persistance session de la recherche et de la pagination au retour depuis formulaire ou détail.
- **Docs —** skill `frontend-ui-style` : règle obligatoire de persistance d'état liste (`sessionStorage`).
- **Frontend —** formulaire entrées stock (`inventory-add`) : refonte UI alignée sur le style formulaire ELYKIA.
- **Frontend —** liste inventaire : refonte UI alignée sur `client-list` avec section dédiée aux actions inventaire (workflow + opérations stock).
- **Frontend —** listes et formulaires localités / types d'article : refonte UI alignée sur `client-list` (palette navy, KPI, toolbar, `mat-paginator`, formulaires standard).
- **Frontend —** pages types de dépense (liste et formulaire) : refonte UI alignée sur le module dépenses (KPI, tableau natif, pagination, persistance session, formulaire standard).
- **Frontend —** listes demandes et retours stock tontine : refonte UI (KPI, filtres période/commercial, pagination, persistance session) alignée sur le stock classique.
- **Backend —** endpoints stock-tontine-request et stock-tontine-return : filtres date/commercial et KPIs dédiés.
- **Frontend —** listes demandes de sortie et retours stock : refonte UI (KPI, filtres période/commercial, pagination, persistance session) alignée sur le style liste ELYKIA.
- **Backend —** endpoints stock-requests et stock-returns : filtres `startDate`/`endDate`/`collector` sur la liste et KPIs dédiés (`/kpis`).
- **Docs —** CI/CD : le mobile est découplé du gate de déploiement (`ci-mobile.yml` indépendant de `ci.yml`) ; le CD ne bloque plus sur un échec mobile, l'APK release attend les deux workflows.
- **Frontend —** version `2.9.0` (`package.json`).
- **Mobile —** version `2.9.0` (`package.json`).
- **Frontend —** fiche membre tontine : synthèse mensuelle affiche des pastilles numérotées (1, 2, 3…) — une pastille par jour collecté.
- **Frontend —** modal collecte de rattrapage tontine : refonte UI alignée sur le design ELYKIA (header navy, champs et boutons standard).

### Fixed

- **Frontend —** listes retours et demandes stock : correction du chevauchement du bouton « Réinitialiser » sous le sélecteur commercial.
- **Backend —** listes stock (demandes/retours) : requêtes filtrées compatibles PostgreSQL (paramètres date nullable via SpEL).
- **Mobile —** CI E2E Playwright : démarrage via build statique + `http-server` (évite le timeout `webServer` de `ionic serve` à 120 s).
- **Mobile —** correctif compilation E2E : accès `creditPurpose` sur `Record<string, unknown>` (TS4111).
- **Frontend —** fiche membre tontine : section livraison masquée lorsqu'aucune livraison n'existe (404 API), au lieu d'afficher un bloc vide.

### Added

- **Backend —** endpoint `GET /api/v1/tontines/members/{id}/amount-history` : historique des montants journaliers d'un membre.
- **Frontend —** synthèse mensuelle des collectes : équivalent en jours calculé collecte par collecte via l'historique des montants (plus le montant courant en repli).

### Changed

- **Docs —** spec dual-crédit : révocation possible même avec crédit BUSINESS en cours (bloque seulement les futures créations) ; historique immuable des habilitations/révocations (`BusinessCreditAuthorizationEvent`).

### Added

- **Backend —** dual-crédit : `creditPurpose` (PERSONAL/BUSINESS), habilitation business client (GESTIONNAIRE), historique, unicité par finalité ; rétrocompatibilité si `creditPurpose` absent (comportement actuel).
- **Backend —** migration Flyway V52, endpoints `POST/DELETE/GET .../business-credit-authorization`.
- **Frontend —** feature flag `dualCreditAuthorization` (Remote Config, défaut `false`) : habilitation client, sélecteur finalité à la vente, historique sur fiche client.
- **Mobile —** feature flag `dualCreditAuthorization` : persistance des champs habilitation client à l'initialisation, sélecteur PERSONAL/BUSINESS à la distribution, envoi `creditPurpose` à la synchronisation.

### Fixed

- **Backend —** entité `Credit` : suppression du `DEFAULT` dans `columnDefinition` de `credit_purpose` (DDL Hibernate incompatible PostgreSQL ; défaut géré par Flyway V52 et valeur Java).
- **Backend —** requêtes JPQL `CreditRepository` et `TontineMemberRepository` : constructeur `ClientRespDto` aligné sur les champs dual-crédit (démarrage application).
- **Frontend —** modal livraison tontine : recherche locale de repli quand l'API articles ne retourne rien (autocomplete vide en CI).
- **Frontend —** tests E2E golden path étape 25 : sélection article livraison tontine stabilisée (attente chargement API, recherche par id/nom).
- **Frontend —** tests E2E golden path étape 8 : ouverture journée comptable avant mise journalière et validation explicite du recouvrement.
- **Frontend —** tests E2E golden path étape 7 : soumission vente à crédit stabilisée (skip Remote Config, modal reçu, erreurs Swal, libellé article aligné stock commercial).
- **CI/CD —** pipeline E2E : seed automatique des articles de référence (`V14__insert_articles.sql`) après démarrage du backend sur Postgres vierge, corrigeant l'échec `ensureArticleWithStock` quand `/api/v1/articles/enabled` est vide.
- **Deploy —** labels Traefik MinIO (test/prod) : liaison explicite router → service pour la console (port 9001) et l'API S3 (port 9000), corrigeant le 404 sur `minio*.amenouveve-yaveh.com` avec Traefik v3.

### Changed

- **CI/CD —** pipeline CD : détection automatique des changements dans `deploy/` ; les jobs test, prod et promote passent `-fu` à `deploy.sh` pour resynchroniser `/opt/elykia/deploy` sur le serveur avant le déploiement.
- **CI/CD —** build APK test/prod : synchronisation de `versionName` et `versionCode` depuis `mobile/package.json` vers `android/app/build.gradle` avant `assembleRelease` (script `sync-android-version.sh`).

### Added

- **Mobile —** mise à jour in-app depuis Paramètres : bouton « Mettre à jour l'application », vérification de version, téléchargement APK, contrôle SHA-256 et lancement de l'installation Android.
- **Backend —** API mobile release (`GET /api/v1/mobile/app/release/latest`, `GET /api/v1/mobile/app/release/download`) avec manifest et APK hébergés dans MinIO (`elykia-mobile-releases`).
- **CI/CD —** publication automatique de l'APK test/prod vers MinIO et mise à jour du manifest après build release (`publish-mobile-apk.sh`).
- **Deploy —** variables `MINIO_MOBILE_RELEASES_BUCKET` et `MOBILE_RELEASE_CHANNEL` (test/prod) pour le canal de distribution mobile.

- **Frontend —** feature flag `printReceiptAfterSale` (Firebase Remote Config / Local defaults) désactivé par défaut.
- **Frontend —** modal d'aperçu du reçu (Cash et Crédit) pour la compagnie AMENOUVEVE-YAVEH, avec détails des articles, totaux, avances, reste à payer et mise journalière.
- **Frontend —** intégration des actions d'impression Windows (`window.print()`) et de sauvegarde locale HTML via `file-saver` depuis le modal.
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
- **Deploy —** `db_restore_from_drive.sh` : restauration manuelle prod depuis le dernier backup Google Drive (reprise après incident), via `import-db.sh`.
- **Deploy —** `docker-compose.dev.yml` : MinIO local sur les ports 19000 (API) et 19001 (console), sans Traefik, ports configurables via `MINIO_API_PORT` / `MINIO_CONSOLE_PORT`.
- **Docs —** skill Cursor `.cursor/skills/keep-changelog/` — impose la mise à jour du changelog après chaque tâche agent (équivalent projet de `.agent/skills/keep-changelog/`).
- **Backend —** endpoint `PATCH /api/v1/clients/info-update` pour la mise à jour des informations client depuis le mobile, sans toucher aux photos.
- **Mobile —** synchronisation des fiches client modifiées (`updatedInfo`) via le nouvel endpoint, distincte des flux photo et localisation.
- **Backend —** système complet de rapport mensuel avec entités `MonthlyReportRun`/`MonthlyReportFile`/`MonthlyReportSnapshot`/`MonthlyReportOutboxEntry`, API REST (`GET tree`, `GET download`, `POST generate`, `GET runs`) et génération PDF global + par commercial.
- **Frontend —** nouvelle page `/monthly-reports` avec accordéons année/mois/fichiers et téléchargement direct des PDF, exposée dans le menu pour les profils `ROLE_REPORT`.
- **Frontend —** feature flag `monthlyReports` (Firebase Remote Config) pour activer progressivement les rapports mensuels : guard de route, masquage du menu sidebar.
- **Frontend —** page `/monthly-reports` alignée sur le style projet (header-card, KPIs, toolbar, tableau) ; skill `.cursor/skills/frontend-ui-style/` pour imposer ce pattern sur les futures pages UI.

### Fixed

- **Backend —** `CreditRespDto` : champ `advance` exposé dans les réponses API et requêtes JPQL `CreditRepository` (sync mobile des distributions) ; corrige l'avance toujours à 0 dans le détail distribution après initialisation.
- **Mobile —** liste « Clients à recouvrer » : filtre sur les distributions avec `remainingAmount > 0` (au lieu du flag `creditInProgress` ignoré ou obsolète) ; exclusion des clients déjà recouvrés aujourd'hui conservée.
- **Mobile —** badge « Crédit en cours » (liste clients) : affiché uniquement si une distribution active existe ; réconciliation automatique de `creditInProgress` en base lors de l'init (après distributions), de la sync et du chargement paginé (page 0).
- **Frontend —** correction du reçu de vente en mode Comptant (Cash) : masquage de la mise journalière de relance ("Payez régulièrement vos mises") dans l'aperçu, l'impression Windows et le fichier HTML téléchargé (auparavant affichée en raison d'une mauvaise interpolation des variables interpolées avec backslash dans le template d'impression/sauvegarde).
- **Deploy —** `db_backup_upload.sh` : recherche des dumps alignée sur le nom réel produit par `db_backup.sh` (`elykia_db_backup_prod_*.dump` au lieu de `prod_*.dump`).
- **Frontend —** tests E2E golden path : robustesse mise journalière, KPIs journaliers, autocomplete livraison tontine, collecte 50 000 FCFA, réouverture session tontine en `beforeAll` ; ventes comptant via `COM001` ; collecte tontine par `COM020`.

### Changed

- **Mobile —** filtres liste clients : puce « Crédit en cours » → `hasActiveDistribution` ; « Nouveau » → `isLocal` ; « Par quartier » → tri par quartier (correction du passage erroné en `clientType`).
- **Frontend —** formulaire d'ajout de vente (`credit-add`) : remplacement de la popup de succès SweetAlert par un toast et affichage de l'aperçu du reçu si le feature flag `printReceiptAfterSale` est actif.
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

- **Backend —** KPI recouvrement stock mensuel : correction sur-attribution (retrait du rapprochement article/mois trop large, plafond sur `totalSoldValue`, invariant recouvré + reste = total dû) ; script SQL `docs/sql/diagnostic_stock_recovery.sql`.
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
