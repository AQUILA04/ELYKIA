# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Sections are ordered **descending by date**: most recent at the top, oldest at the bottom.
`[Unreleased]` always appears first, immediately after this header.

## [Unreleased]

### Added

- **Backend —** cache Caffeine sur les clients paginés par commercial (`GET /api/v1/clients/by-commercial/{commercial}`) et sur la liste paginée (`GET /api/v1/clients`).
- **Frontend —** composant réutilisable `ClientSelectComponent` : pagination 20, infinite scroll et recherche serveur pour remplacer les chargements massifs de clients.
- **Backend —** cache Caffeine (5 min) sur la liste des commerciaux (`GET /api/v1/promoters/all`) et sur les listes/p pages articles (`/api/v1/articles`, `/enabled`, `/all`).
- **Frontend —** chargement paginé des articles (20 par page, infinite scroll + recherche serveur) dans `ArticleSelectorComponent` pour les formulaires de demande de stock, inventaire, ventes comptant et livraisons tontine.
- **Backend —** colonne `society_share_amount` sur `tontine_collection` et KPI `totalSocietyShare` sur `/api/v1/tontine-collections/web/summary` ; `lowStockCount` sur `/api/v1/articles/stock-kpis`.
- **Backend —** valorisation FIFO du stock magasin derrière le paramètre `ENABLED_FIFO_STOCK_VALUATION` (désactivé par défaut) : lots `article_stock_lot`, façade `StockValuationFacade`, service FIFO, activation/backfill admin (`POST /api/v1/stock/fifo/activate`), endpoints consultation lots et KPIs FIFO.
- **Frontend —** saisie PU achat prérempli (entrées stock, inventaire, fiche article) lorsque le flag FIFO est actif ; onglet lots FIFO sur la fiche article ; libellés KPI inventaire adaptés en mode FIFO.
- **Backend —** colonne `unit_purchase_cost` sur les lignes crédit pour figer le coût d'achat à la distribution.
- **Backend / Mobile / Frontend —** contrôle des appareils autorisés pour l'app mobile : registre `user_authorized_device`, enforcement au login et sur les requêtes API (`X-Device-Id`), API admin `/api/v1/users/{id}/devices`, paramètre `ENABLED_MOBILE_DEVICE_RESTRICTION`, toggle par utilisateur `mobileDeviceRestrictionEnabled` ; flags Firebase `mobileDeviceManagement` (admin) et `mobileDeviceRestriction` (mobile) ; mobile **2.10.0** avec `@capacitor/device`.
- **Docs —** skill et règle Cursor `mobile-version-bump` : incrément obligatoire de la version mobile (`package.json`, `environment.ts`, `environment.prod.ts`) à chaque modification sous `mobile/`.
- **Docs —** skill Cursor `frontend-lazy-loading-migration` + règle `frontend/**` : activation automatique sur toute tâche frontend ; migration progressive lazy-loading (un domaine eager par tâche, URLs `/{domaine}/...`).
- **Mobile —** design system Espace Client : composants shared `elyk-decor-header`, `elyk-overlap-card`, `elyk-outlined-field` ; tokens header/overlap ; variants boutons navy/gold ; skill et `design-system.md` alignés sur les maquettes S-01 à S-11.
- **Backend — Elykia IA (Phase 2)** : few-shot SQL par domaine (`sql-examples.json`, `SqlExamplesService`), RAG hybride embeddings Ollama + fallback mots-clés (`GuideVectorSearch`), métriques Micrometer (`AiMetricsService`), journal `ai_query_log` (migration V62), API admin `/api/v1/ai/admin/stats`, tests `SqlExamplesServiceTest`.
- **Frontend — Elykia IA (Phase 2)** : onglet « Statistiques » dans `/ai-chat` (requêtes fréquentes, SQL rejetés, distribution intents) pour `ROLE_AI_REPORT`.

### Changed

- **Frontend —** sélection de clients : fin du chargement massif (`size=10000` / `100000`) sur ventes, comptes, distributions, rattrapage, **commandes** et **modal membre tontine** ; pagination 20 + infinite scroll + recherche serveur via `ClientSelectComponent`.
- **Frontend —** sélection d'articles : fin du chargement massif (`size=10000`) ; pagination 20 + infinite scroll via `ItemService.getEnabledArticlesPage` ; `order.service` et modal livraison tontine alignés.
- **Mobile —** page de connexion : demande automatique de l'autorisation d'accès aux fichiers (stockage) à l'arrivée sur l'écran de login si elle n'est pas encore accordée (sauvegardes, logs, photos).
- **Backend —** export PDF sorties/retours de stock : filtrage des sorties sur la date de livraison et des retours sur la date de réception (au lieu de la date de demande / création du retour).
- **Backend —** livraison des demandes de stock : le stock mensuel du commercial est rattaché au mois de la date de livraison (et non plus à la date de création de la demande).
- **Mobile —** CI E2E : suite smoke consolidée (1 login partagé par worker), retries réduits, fail-fast et suppression du `npm cache clean` pour accélérer le pipeline `build-mobile`.

### Fixed

- **Frontend —** `ArticleSelectorComponent` : nettoyage des abonnements `valueChanges` par ligne (PU achat) et des requêtes HTTP lazy-load à la destruction, suppression ou nouvelle recherche — évite les fuites mémoire.
- **Frontend —** `ClientSelectComponent` : binding via `FormControl` interne (CVA pur, sans `ngModel`) ; annulation des requêtes HTTP paginées et de préchargement client à la destruction ou nouvelle recherche.
- **Backend —** clés de cache paginées articles/clients : `PageableCacheKeyHelper.sortKey()` normalise le tri (`property:DIRECTION`) au lieu de `Sort.toString()`.
- **Frontend —** `ArticleSelectorComponent` : snapshot des articles sélectionnés avant vidage de l'index ; garde sur `articleId` null dans `attachPurchasePriceSync`.
- **Frontend —** `ClientSelectComponent` : chargement déclenché via `ngOnChanges` uniquement ; re-fetch du client sélectionné si absent de l'index après reset.
- **Frontend —** `ClientService.getClients()` : suppression du double paramètre `username` sur la requête GET.
- **Frontend —** vente comptant (`credit-add`) : clients crédit filtrés par commercial uniquement ; lazy-load articles au passage comptant ; reçu basé sur la réponse API si l'article n'est pas en cache local.
- **Frontend —** `AddMemberModalComponent` : désabonnement de `amount.valueChanges` à la fermeture de la modale.
- **Frontend —** `AccountAddComponent` : `combineLatest(params, queryParams)` pour éviter la course entre abonnements route.
- **Backend —** `disableArticle` / `enableArticle` : délégation via proxy Spring vers les méthodes batch (`disableArticles` / `enableArticles`) pour une seule invalidation cache par opération.
- **Deploy —** `rollback.sh` : lecture/écriture des releases et du pointeur `*_current.txt` sous `/opt/elykia/<env>/releases/` (aligné sur `deploy.sh`), mise à jour de `/opt/elykia/<env>/.env` et `docker compose` avec `--project-name` / `--env-file` ; extraction des images tolérante (`grep || true`) ; `--last` basé sur le pointeur courant et l'ordre chronologique des fichiers (plus le tri `mtime`) pour enchaîner plusieurs rollbacks — corrige l'échec « No current release pointer found » en prod.
- **Backend —** `AccountingDayService.getCurrentAccountingDate` : lecture seule (plus de fermeture/ouverture automatique à chaque appel) ; bascule journalière via `ensureCurrentAccountingDay()` (endpoint `/current`, cron 00:05) ; correction `openAccountingDay` (journée ouverte périmée, boucle bornée) pour éviter la saturation CPU ; verrou unique + méthodes internes sans `synchronized` imbriqué.
- **Backend —** `distributeArticlesV2` : conservation explicite du `totalAmount` mobile via `mobileFinancialTermsLocked` (après application du PMP stock).
- **Backend —** `POST /api/auth/refreshtoken` : champ `deviceRestrictionActive` aligné sur le signin.
- **Backend —** `Credit.start()` : initialisation défensive de `remainingDaysCount` (défaut 30 jours) avant calcul de `expectedEndDate` — évite une NPE si `start()` est appelé avant `@PrePersist` sans passage par `checkAdvance()`.
- **Frontend —** E2E golden-path étape 15 : sélecteur vente comptant aligné sur `credit-add` (`label.segment-btn` + `data-testid="e2e-credit-sale-type-cash"`) après refonte UI.
- **Backend —** sync distribution mobile (`distributeArticlesV2`) : conservation de la mise, de l'avance et de la date de fin (`endDate`) calculées et imprimées sur le mobile — le backend ne recalcule plus la mise via `checkAdvance()` ; flag persisté `mobile_financial_terms_locked` ; validation des montants mobile ; application unique dans `buildDistribution`.
- **Backend —** mode legacy stock (`ENABLED_FIFO_STOCK_VALUATION` OFF) : contrat `registerEntry()` documenté — retourne volontairement `null` (aucun lot créé), sans NPE côté appelants.
- **Backend —** refresh token : la chaîne `Optional` filtre désormais un `User` null (token orphelin / état DB corrompu) au lieu de provoquer une `NullPointerException` dans la validation device.
- **Backend —** livraison stock tontine : en mode legacy (FIFO désactivé), `purchasePrice` des lignes est désormais renseigné depuis le prix catalogue article à la livraison, aligné sur `StockRequestService` — corrige un `totalPurchasePrice` à 0 si le prix n'était pas figé à la création.
- **Backend —** ventes crédit : `totalMargeValue` sur le stock commercial cumule désormais la marge (`qty × (prix vente − PMP achat)`) et non le coût d'achat ; migration de rattrapage des données historiques.
- **Mobile —** synchronisation et initialisation clients : fusion des doublons locaux (UUID) avec l'ID serveur avant import paginé ; `markAsSynced` gère le cas où la ligne serveur existe déjà (contraintes UNIQUE/PK) ; les erreurs d'import client ne sont plus masquées lors de l'initialisation.
- **Mobile —** SQLite après mise à jour in-app (2.8.5 → 2.9.x) : `allowBackup=false`, `androidIsEncryption=false`, enregistrement explicite du plugin dans `MainActivity` ; guards redirigent vers `/initial-loading` si la DB n'est pas prête (évite le dashboard + déconnexion).
- **Mobile —** initialisation SQLite : attente `Platform.ready()` et jeep-sqlite (web), détection plugin natif absent (`CapacitorSQLitePlugin: null`), asset `sql-wasm.wasm`, message explicite si rebuild `cap sync` requis.
- **Mobile —** sync stock commercial à l'initialisation : réessai automatique si SQLite n'est pas prête (`ensureReady`), vérification avant le chargement initial, logs d'erreur détaillés (message SQLite, contexte article/commercial) à la place de `{}`.
- **Mobile —** E2E smoke : `baseURL` et viewport transmis au contexte worker Playwright ; sélecteurs Ionic 8 (`getByPlaceholder`) pour le login ; navigation via `/` + fallback SPA sur `http-server`.


- **Backend — Elykia IA :** providers cloud **OpenAI** (`elykia.ai.provider=openai`) et **Gemini/Vertex AI** (`elykia.ai.provider=gemini`) ; doc mise à jour dans `AI_ASSISTANT.md`.

- **Backend — Elykia IA :** provider cloud **Anthropic (Claude)** câblé (`elykia.ai.provider=anthropic`) ; doc providers cloud dans `AI_ASSISTANT.md`.

- **Backend — Elykia IA :** rate limit cumulatif — **15/min** (anti-abus) + quotas **20/jour** et **120/semaine** ; rôles dédiés `ROLE_AI_CHAT` et `ROLE_AI_REPORT` (API + auto-init profils GESTIONNAIRE/ADMIN).
- **Frontend — Elykia IA :** accès chat/statistiques basé sur `ROLE_AI_CHAT` / `ROLE_AI_REPORT` (plus `ROLE_REPORT`).

- **Frontend — Elykia IA (Phase 1)** : module lazy `ai-chat` (`/ai-chat`) avec sidebar sessions, fil de discussion, preview DATA et sources HOW_TO ; bouton header « Ask AI » et entrée sidebar « Elykia IA » ; feature flag `elykiaAi` + `environment.aiChatEnabled`.
- **Backend — Elykia IA (Phase 1)** : rate limiting par utilisateur (`AiRateLimiter`), audit structuré (`AiAuditService`), tests `AiRateLimiterTest`.
- **Infra —** service Ollama optionnel dans `deploy/docker-compose.dev.yml`.

- **Backend — Elykia IA :** enrichissement `schema-catalog.json` (stock : `stock_request`, `stock_return`, `commercial_monthly_stock`, `commercial_stock_movement`, `article_history`, `cash_deposit`, rapport journalier étendu) ; filtre row-level par colonne catalogue (`collector` ou `commercial_username`).

- **Backend — Elykia IA (Phase 0)** : module `core/ai` avec Spring AI + provider stub/Ollama, orchestrateur dual pipeline (Text-to-SQL sécurisé + RAG user-guide), catalogue schéma (`schema-catalog.json`), validateur SQL (JSqlParser), filtre row-level commercial, sessions persistées (`ai_conversation` / `ai_message`, migration V61), API REST `/api/v1/ai/*` testable via Swagger, doc `backend/docs/AI_ASSISTANT.md`.
- **Tests —** `SqlValidatorTest`, `SqlRowLevelFilterTest`, `AiOrchestratorServiceTest`.

### Changed

- **Backend —** versements caisse : colonne `surplusAmount` (migration V59) pour tracer l'écart positif entre billetage physique et répartition système ; validation assouplie (manquant autorisé via versements partiels successifs).
- **Frontend —** modal de versement : colonne surplus, alertes informatives manquant/surplus sans blocage de validation ; historique des versements enrichi.

### Added

- **Backend —** endpoint `POST /api/v1/credits/list-summary` : KPIs ventes clôturées (SETTLED) par type crédit/cash/tontine (CA + marge FCFA), encours crédit (snapshot INPROGRESS) et total recouvré sur période, filtrable via recherche avancée.
- **Frontend —** refonte UI liste des ventes (skill frontend-ui-style) : bandeaux KPI décisionnels, sélecteur de période (jour/semaine/mois/personnalisé), persistance `sessionStorage`, recherche avancée intégrée à la toolbar.
- **Frontend —** refonte UI formulaire d'ajout de vente (`credit-add`) : structure breadcrumb + header-card + sections formulaire, palette navy, boutons `.btn-primary` / `.btn-outline`.
- **Frontend —** refonte UI composant `article-selector` : lignes article en cartes navy-xpale, montants en FCFA (DM Mono), barre total cyan, badges stock palette skill, boutons SVG.
- **Frontend —** correctif `article-selector` : rafraîchissement liste articles au chargement stock commercial (`ngOnChanges`), affichage sous-total/total vente comptant (`showPrices` respecté), recherche articles sans champ `name`.
- **Tests —** `CreditListSummaryServiceTest`, specs composants `credit-list-kpi` et `credit-list`.

- **Backend —** versements caisse scindés en 3 catégories (`creditAmount`, `tontineAmount`, `newBalanceAmount`) avec conservation du total `amount` ; sous-totaux déposés sur `DailyCommercialReport` ; calculateur `CashDepositCategoryCalculator` (solde nouveaux comptes distinct du crédit).
- **Backend —** remise périodique secrétaire → gestionnaire (`CashPeriodRemittance`) : soumission mensuelle, accusé de réception par le gestionnaire ou initiation directe ; migrations Flyway V57/V58.
- **Backend —** stock mensuel : agrégation `totalCreditDepositedAmount` depuis les versements crédit du mois.
- **Frontend —** modal de versement avec répartition crédit / tontine / solde Nx comptes ; KPIs et historique par catégorie sur le rapport journalier ; onglet « Remise au gestionnaire ».
- **Frontend —** stock mensuel : carte « Versements Crédit » remplace le taux de recouvrement %.
- **Tests —** `CashDepositCategoryCalculatorTest`, `CashPeriodRemittanceServiceTest`, spec modèle `daily-commercial-report.model`.

### Fixed

- **Docs —** guide Ollama dev et dépannage TLS (`deploy/OLLAMA_DEV.md`).

- **Frontend — Elykia IA :** bulle des messages envoyés — conflit avec la classe globale `.content` (layout sidebar) corrigé ; la bulle s'adapte à la largeur du texte.
- **Frontend — Elykia IA :** bouton header « Ask AI » — contour réduit (override hauteur `nav-link` 70px, padding et icône plus compacts).

- **Backend — Elykia IA :** démarrage sans clé OpenAI — désactivation explicite des modèles audio/image/moderation Spring AI (`spring.ai.model.audio.speech: none`, etc.) et ordre corrigé de `AiProviderEnvironmentPostProcessor`.

- **Backend — Elykia IA :** démarrage avec plusieurs starters Spring AI — conflit `EmbeddingModel` (Ollama + OpenAI) résolu via `AiEmbeddingConfiguration`, `@Qualifier` dans `GuideVectorSearch` et `spring.ai.model.embedding: none` par défaut.

- **Frontend —** liste des ventes : checkboxes sélection navy ; modal changement commercial restylé (tokens CSS autonomes hors page).

- **Backend —** KPI liste des ventes (`list-summary`) : requêtes SQL corrigées (`c.visibility` au lieu de `c.state`, colonne réelle en base).

- **Backend —** opération journalière caisse : la liste et le PDF des crédits non recouvrés s'appuient sur l'absence de ligne `CreditTimeline` pour la journée comptable courante, au lieu du flag `dailyPaid` (source de données incorrecte malgré le cron).
- **Frontend —** téléchargement PDF opération journalière : nom de fichier avec date du jour et collecteur (plus de `Daily_Operation_null.pdf` lorsque `username` est absent du localStorage).
- **Backend —** opération journalière : requête optimisée (anti-join `LEFT JOIN` au lieu de `NOT EXISTS` corrélé), filtre sur la journée via `LocalDate.now()`, index Flyway V60 sur `credit_timeline` et `credit`.

### Changed

- **Backend —** endpoints `/api/v1/credits/by-collector`, `/by-collector/all` et `/by-collector/all-grouped` : retour d'un DTO léger `DailyUnrecoveredCreditDto` (client, mise, reste à payer) plutôt que l'entité `Credit` complète.
- **Frontend —** opération journalière : pagination connectée à l'API (`page` / `size`) au lieu d'un chargement massif côté client.
- **Backend —** endpoints `/api/v1/articles/detailed-stock-value` et `/stock-kpis` : ajout de `sellingSaleTotal` et `sellingMargin` / `estimatedSellingMargin`.

- **Frontend —** refonte UI du modal de versement caisse, du composant billetage et de l'onglet « Remise au gestionnaire » (palette navy, KPI strip, tableaux et boutons alignés sur le style pro du projet).

- **Customer-space —** infrastructure tests : Playwright (E2E mobile), Karma headless, skill `customer-space-testing`, workflow CI découplé `ci-customer-space.yml`.
- **Customer-space —** splash S-01, auth S-02, dashboard S-03, navigation par onglets bas (`CustomerTabBarComponent`).
- **Customer-space —** parcours achats S-04/05/06 (filtres, détail, timeline pastilles, lien paiement) avec tests unitaires et E2E `purchases-flow`.
- **Customer-space —** paiement Mobile Money S-07/08 (préremplissage montant/mise, confirmation) avec tests et E2E `mobile-money`.
- **Customer-space —** commande S-09/10/11 : `CartService`, catalogue, panier, confirmation API ; E2E `order-flow`.
- **Customer-space —** profil client (déconnexion) et Capacitor `com.optimize.elykia.customer` ; E2E `logout`.
- **Customer-space —** skill Cursor `customer-space-ui-style` aligné sur les maquettes wireflow (design tokens Playfair/DM Sans, patterns Ionic premium).
- **Customer-space —** thème global (`variables.scss`, `global.scss`, fonts) et wizard auth multi-étapes (téléphone local → PIN ou OTP Firebase + configuration PIN).
- **Customer-space —** utilitaire `PhoneNormalizer` (+228 côté Firebase uniquement) et intégration Firebase Phone Auth (SDK).
- **Customer-space —** E2E `auth/setup-pin` (OTP mocké via `window.__E2E__`) ; tests unitaires `catalog`, `cart`, `order-confirmation`.
- **Customer-space —** script `firebase:configure`, doc `docs/FIREBASE_SETUP.md`, job CI `build-customer-space-prod` avec secrets `CUSTOMER_SPACE_GOOGLE_SERVICES_JSON` / `CUSTOMER_SPACE_FIREBASE_WEB_CONFIG`.
- **Backend —** espace client `/api/customer/*` : auth (`check-phone`, `login`, `setup-pin`), dashboard, achats, recouvrements, catalogue, commandes, soumission Mobile Money (statut INITIÉ).
- **Backend —** profil `CLIENT` / permission `ROLE_CLIENT`, flag `pin_configured` sur `UserAccount`, table `customer_user_mapping` (orchestration core).
- **Backend —** provisioning automatique des comptes clients (`username` = numéro local, email `firstname.lastname@amenouveve-yaveh.com`), sync téléphone via `ClientPhoneUpdatedEvent`.
- **Backend —** intégration Firebase Admin (`FirebaseTokenVerifier`) pour validation OTP lors du setup PIN.
- **Backend-lib —** `common-security-service` 1.2.0, migrations Flyway V55/V56.

### Fixed

- **Customer-space —** splash post-auth : redirection vers `/dashboard` uniquement depuis `/` ou `/auth` (ne bloque plus les deep links E2E `/catalog`, `/purchases`, etc.).
- **Customer-space —** `FirebaseAuthService` : court-circuit OTP en mode E2E pour le parcours setup PIN sans Firebase réel.

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
