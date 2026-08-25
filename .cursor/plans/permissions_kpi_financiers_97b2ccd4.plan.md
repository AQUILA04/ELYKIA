---
name: Permissions KPI financiers
overview: Ajouter une permission par page affichant des KPI financiers (montants CA, marges, totaux), les masquer côté UI et API, et ne pas les attribuer au profil RECOVERY_MANAGER — tout en laissant visibles l’onglet Recouvrement terrain et la page Recouvrements.
todos:
  - id: backend-roles
    content: Constantes Java + application.yml (permissions + profil-permissions) + Flyway V93 (uperm, upro_perms, uacc_perms)
    status: completed
  - id: backend-preauthorize
    content: Protéger les endpoints d'agrégats KPI (list-summary, yearly-summary, search daily report, KPI tontine/dashboard)
    status: completed
  - id: frontend-constant
    content: Constante KpiFinancierPermissions + masquage ngxPermissionsOnly + skip des appels API sans rôle
    status: completed
  - id: daily-report-tabs
    content: "Rapport journalier : cacher tous les onglets sauf Recouvrement terrain + bilans ; default tab recovery si pas le rôle"
    status: completed
  - id: dashboard-lazy
    content: Migrer le domaine dashboard en lazy-loading (obligatoire car eager et touché)
    status: completed
  - id: changelog
    content: Bump versions frontend/backend + CHANGELOG
    status: completed
isProject: false
---

# Permissions KPI financiers par page

## Intention

Le chef de recouvrement (`RECOVERY_MANAGER`) conserve l’accès aux listes opérationnelles (ventes, retards, tontine, etc.) et au recouvrement, mais **ne voit plus les agrégats financiers** (CA, marges, totaux, bilans). Chaque page a son propre rôle, retirable indépendamment.

Le JWT ne contient que les permissions **compte** (`UACC_PERMS`), pas celles du profil. Un simple ajout dans `application.yml` ne les donnerait pas aux utilisateurs existants. Une migration Flyway doit donc créer les rôles, les lier aux profils cibles **et** les copier sur les comptes existants de ces profils — sinon gestionnaires et admins perdraient les KPI au déploiement.

## Rôles à créer

Attribués à `SUPER_ADMIN`, `ADMIN`, `GESTIONNAIRE`, `SECRETARY`, `PROMOTER`. **Jamais** à `RECOVERY_MANAGER`, `STOREKEEPER`, `USER`, `CLIENT`.

Pages accessibles aujourd’hui par le chef de recouvrement (`ROLE_CONSULT_CREDIT` / `ROLE_CONSULT_TONTINE` / `ROLE_CONSULT_DASHBOARD` + menu Rapport journalier) :

- `ROLE_KPI_FINANCIER_VENTE` — [credit-list.component.html](frontend/src/app/credit/credit-list/credit-list.component.html) (`app-credit-list-kpi` + filtre « Période KPI »)
- `ROLE_KPI_FINANCIER_RETARD` — [credit-late-kpi.component.html](frontend/src/app/credit/credit-late/components/credit-late-kpi/credit-late-kpi.component.html)
- `ROLE_KPI_FINANCIER_ECHEANCE` — [credit-echeance-kpi.component.html](frontend/src/app/credit/credit-echeance/components/credit-echeance-kpi/credit-echeance-kpi.component.html)
- `ROLE_KPI_FINANCIER_DASHBOARD` — [dashboard-v2.component.html](frontend/src/app/dashboard/dashboard-v2/dashboard-v2.component.html) (grille KPI + graphique ventes + panel ventes récentes)
- `ROLE_KPI_FINANCIER_RAPPORT_JOURNALIER` — [daily-report.component.html](frontend/src/app/report/pages/daily-report/daily-report.component.html) : onglets Vue d’ensemble, Journal, Versements, Remise **et** blocs Bilan crédit / Bilan tontine. **Onglet Recouvrement terrain inchangé.**
- `ROLE_KPI_FINANCIER_TONTINE` — bandeau KPI [tontine-dashboard.component.html](frontend/src/app/tontine/pages/tontine-dashboard/tontine-dashboard.component.html)
- `ROLE_KPI_FINANCIER_TONTINE_COLLECTE` — [tontine-collecte.component.html](frontend/src/app/tontine/collecte/tontine-collecte.component.html)
- `ROLE_KPI_FINANCIER_TONTINE_LIVRAISON` — KPI montants [tontine-delivery-list.component.html](frontend/src/app/tontine/pages/delivery-list/tontine-delivery-list.component.html)
- `ROLE_KPI_FINANCIER_TRANSFERT_VENTE` — KPI [collector-transfers.component.html](frontend/src/app/credit/collector-transfers/collector-transfers.component.html)

Pages financières hors accès par défaut du chef, mais gated pour le même mécanisme :

- `ROLE_KPI_FINANCIER_BI_DASHBOARD` / `_BI_VENTES` / `_BI_RECOUVREMENT` / `_BI_STOCK`
- `ROLE_KPI_FINANCIER_DEPENSE` — [expense/pages/dashboard](frontend/src/app/expense/pages/dashboard/dashboard.component.html)

**Laissés visibles (hors scope)** : page Recouvrements + son KPI ; onglet Recouvrement terrain ; fiches unitaires (détail crédit, client, membre tontine) nécessaires au terrain ; bandeaux de **comptage** (liste clients, rapports mensuels, demandes de stock).

## Comportement UI

Masquer uniquement les bandeaux / grilles KPI (et les onglets financiers du rapport journalier). Les tableaux et listes restent.

Rapport journalier sans le rôle :

- cacher les boutons d’onglets overview / journal / deposits / remittance et leurs panneaux (y compris bilans)
- garder Recouvrement si `isRecoveryManager || isManager`
- si l’utilisateur n’a pas le rôle KPI, forcer `activeTab = 'recovery'` au chargement
- ne pas appeler `loadReports` / `loadYearlySummary` sans le rôle (évite 403)

Liste des ventes : `*ngxPermissionsOnly` autour de `app-credit-list-kpi` et du groupe « Période KPI » ; `loadSummary()` seulement si le rôle est présent.

Pattern : `*ngxPermissionsOnly="['ROLE_KPI_FINANCIER_…']"` (déjà utilisé partout, `NgxPermissionsModule` déjà importé dans credit / report / tontine).

Constante frontend : [frontend/src/app/shared/constants/kpi-financier-permission.constant.ts](frontend/src/app/shared/constants/kpi-financier-permission.constant.ts) (même style que [ai-permission.constant.ts](frontend/src/app/shared/constants/ai-permission.constant.ts)).

## Backend

Constantes dans [UserPermissionConstant.java](backend/src/main/java/com/optimize/elykia/core/util/UserPermissionConstant.java).

Déclaration + mapping profils dans [backend/src/main/resources/application.yml](backend/src/main/resources/application.yml) (`security.config.permissions` et `profil-permissions`). `initPermissions` / `initProfilesPermissions` couvrent les nouveaux environnements.

Flyway `V93__kpi_financier_permissions.sql` :

1. `INSERT` dans `uperm` (comme [V77__recruitment.sql](backend/src/main/resources/db/migration/V77__recruitment.sql))
2. `INSERT` dans `upro_perms` pour les profils cibles
3. `INSERT` dans `uacc_perms` pour les comptes dont `upro.name` est dans ces profils — **sans** `RECOVERY_MANAGER`

`@PreAuthorize("hasAuthority('ROLE_KPI_FINANCIER_…')")` sur les endpoints d’agrégats uniquement (la liste métier reste ouverte) :

- `POST /api/v1/credits/list-summary`
- `GET /api/daily-commercial-reports/search`, `/yearly-summary`, `/yearly-tontine-summary` (+ PDF bilan / remaining-at-clients)
- endpoints KPI tontine collecte / livraison
- endpoint dashboard v2 si distinct

Les APIs recouvrement (`RecoveryManagerController`) restent en `ROLE_RECOVERY_MANAGER`.

## Dashboard lazy-loading

`dashboard/` est encore eager ([app.module.ts](frontend/src/app/app.module.ts)). La règle projet impose de le migrer dès qu’on le touche : `dashboard.module.ts` + routing `loadChildren`, extraire les déclarations dashboard-v2, mettre à jour les `routerLink`. `credit`, `tontine` et `report` sont déjà lazy.

## Versions / changelog

- Frontend `2.16.15` → `2.16.16` (PATCH : contrôle d’accès, pas nouvelle page)
- Backend `1.10.2` → `1.10.3`
- Entrées [docs/CHANGELOG.md](docs/CHANGELOG.md)

## Vérification

- Compte GESTIONNAIRE : KPI toujours visibles après migration
- Compte RECOVERY_MANAGER : listes OK, KPI masqués, onglet Recouvrement terrain + page Recouvrements OK, appels `/list-summary` et `/yearly-summary` en 403
- E2E golden-path (gestionnaire) : KPI rapport journalier / ventes toujours visibles
