# Décisions

Journal court. Date = jour où la décision est visible dans le changelog, une règle ou un compose. Le « pourquoi » est celui écrit dans le dépôt ; sinon **à compléter**.

| Date | Décision | Pourquoi (source) |
|------|----------|-------------------|
| 2026-11-15 | Toute l’activité de production et le métier sont en GMT (UTC+0, Lomé). Les timestamps se citent en GMT / UTC+0. On ne les convertit pas en heure Maurice : le propriétaire convertit lui-même. | Décision du propriétaire. `docs/diagnostic-fifo-entrees-sans-lot.md` demandait d’ajouter 4 h ; cette consigne est retirée. |
| 2026-11-15 | Un compte commercial a un historique d’affectation. Deux périodes ne se chevauchent ni sur un compte ni pour une personne. L’annuaire du personnel est distinct des utilisateurs de connexion. | Changelog backend 1.53.0, PR #228 |
| 2026-11-14 | La vente au comptant encaisse tout de suite et ne sort le stock qu’à la remise magasin. Une livraison incomplète est refusée. | Changelog backend 1.50.0 |
| 2026-11-14 | Le plafond d’une commande tontine est le solde prévisionnel ; la remise exige le solde disponible. | Changelog backend 1.51.0 |
| 2026-11-14 | Une demande de sortie validée (crédit ou tontine) peut être annulée tant qu’elle n’est pas livrée. | Changelog backend 1.49.1 |
| 2026-11-09 | Le prix unitaire et le montant de ligne suivent `RESTRICT_UNIT_PRICE_VISIBILITY`. Le total reste affiché. Cache 6 h côté clients. | Changelog frontend 2.44.3, mobile 2.36.2, espace client 0.17.2 |
| 2026-10-22 | `JWT_SECRET` est obligatoire (compose test, prod, DigitalOcean, modèles `.env`). Sans cette variable le backend ne démarre pas. | Changelog Docs & Infra |
| — | Mobile local-first : le CRUD métier écrit dans SQLite ; l’API sert au chargement et à la synchro. Les lectures sont filtrées par l’utilisateur connecté. | `.cursor/rules/mobile-local-first-architecture.mdc`, `user-specific-data-access.mdc`. Date d’origine : **à compléter** |
| — | Elykia IA ne lit pas le schéma Postgres live. Elle utilise `schema-catalog.json` et l’index RAG du guide, rechargés au démarrage. | Règle `update-ai-schema-catalog-on-ddl-change`. Date d’origine : **à compléter** |
| — | OTP : viser le starter Notification Hub. Le package `notificationhub/` reste un client HTTP local historique (starter non publié, Java 21 vs backend 17). | Règle `notification-hub-starter-first` |
| — | Déploiement Contabo : ELYKIA consomme Traefik, MinIO et la supervision d’`optimize-common-infra`. Un correctif seulement sur le VPS est écrasé par le CD. Les compose `docker-compose.DO*.yml` restent l’ancienne stack DigitalOcean. | `deploy/docker-compose.prod.yml`, `deploy/CONTABO_MIGRATION.md`, règle `contabo-patch-must-be-in-repo`. Date de bascule effective : **à compléter** |
| — | Versions SemVer indépendantes par composant, journal unique `docs/CHANGELOG.md`. | Skill `keep-changelog` |
| — | Guide utilisateur : une page par profil, libellés d’écran, pas de jargon technique, puis index RAG + HTML admin régénérés. | Règles `user-guide-writing-style`, `user-guide-rag-index-sync` |
| — | Confirmations de l’admin web uniquement via `AlertService`. | Règle `frontend-alert-service-modals` (changelog 2026-10-23) |
| — | Fournisseur LLM par défaut : aucun modèle cloud (stub). Ollama, Anthropic, OpenAI, Vertex, DeepSeek se branchent par configuration. | `application.yml` (`spring.ai`, commentaire « pas de clé API requise ») |

Ajouter une ligne seulement pour une décision qui engage la suite (pas pour chaque correctif).
