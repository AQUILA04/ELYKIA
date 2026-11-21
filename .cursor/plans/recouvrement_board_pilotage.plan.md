# Recouvrement terrain : board de pilotage

Date : 2026-11-21 (GMT). Statut : **à valider**.
Point de départ : `/report/daily/recovery` (PR #270, Frontend 2.65.0), qui reprend l'ancien onglet tel quel.
Profils : chef de recouvrement (`RECOVERY_MANAGER`, ex. `recov001`) et gestionnaire (`GESTIONNAIRE`, ex. `ges003`).

## 1. Constat

| Donnée | Source actuelle | Limite |
|---|---|---|
| Taux du mois | `GET /recovery-manager/kpi/monthly-recovery-rate` | Le dénominateur est le dû **live** de tous les retards délai. Un « taux du mois précédent » serait calculé sur le dû d'aujourd'hui : il ne serait pas historique. |
| Recouvré, opérations, à remettre par commercial | `report/summary`, `operations` (table `recovery_manager_operation`) | Un seul chef par appel. Sans nom, le serveur prend l'utilisateur connecté : pas de vue « tous les chefs ». |
| Activité terrain (contrôles, couverture, vérifications) | `report/activity` (`RecoveryManagerActivityService`) | 500 sans commercial (`lower(bytea)`) : corrigé par la session backend (`fix/recovery-manager-access`). |
| Retards | `CreditLateService.getLateCredits` (tri délai puis jours), `attachLatestControls` (dernier contrôle) | `GET /credits/late` renvoie **toute** la liste ; le dernier contrôle n'est joint que sur la liste terrain paginée (rôle chef seul). Les retards ne sont pas affectés à un chef : le portefeuille est commun. |
| Écarts de carnet | `CreditFieldControlRepository.findLatestEcarts`, `CarnetEcartRecontrolPolicy` (statut `PENDING` / `ACCEPTED` / `REJECTED`) | Liste non exposée au chef. |
| Argent recouvré « non remis » | Aucun suivi direct. Le cash du chef devient une mise du commercial (`CreditCollectionEvent`) et s'ajoute à son « à verser » ; `DailyCommercialReport.recoveryManagerCollectionsAmount` garde la part du chef. | On ne sait pas si le chef a remis l'argent. Seul indice : le versement du commercial ce jour-là est incomplet. |
| Tournée du jour | `RecoveryFieldDayPlan` (commerciaux et quartiers visés, statut) | Pas exposé au gestionnaire. |
| Objectifs (taux, couverture) | Aucun | Pas de source : le métier doit les définir. |

## 2. Maquette des zones

Maquette visuelle : artifact « Board recouvrement — proposition ».

### Chef de recouvrement (`recov001`)

1. **En-tête et filtres** (inchangés) : période, commercial.
2. **Points d'attention** (comme le cockpit, 6 au plus, cliquables) :
   - écarts de carnet en attente de décision du commercial (nombre, montant, commercial) → **Écarts de carnet** ;
   - gros retards jamais contrôlés ou non contrôlés depuis 30 jours → ligne du tableau des retards ;
   - couverture du mois sous le seuil (si un seuil est défini, voir choix C) ;
   - recouvré non versé (si le choix D le retient).
3. **Bande KPI** : Taux du mois (barre) · Recouvré sur la période · Recouvré depuis le 1er du mois **comparé au même nombre de jours du mois précédent** (flèche + écart) · À remettre · Retards délai (nombre, dû net).
4. **Tendance** : recouvré par jour sur les 30 derniers jours (barres), opérations en infobulle.
5. **Retards prioritaires** (10 lignes) : client, quartier, commercial, dû net, jours de retard, dernier contrôle (date, conforme / écart, « jamais »), bouton **Voir** (fiche crédit).
6. **Activité terrain** (existant, condensée sur une ligne).
7. **À remettre par commercial** (existant).
8. **Détail des opérations** (existant, en bas).

### Gestionnaire (`ges003`)

- Sélecteur **Chef de recouvrement** : nouvelle entrée **Tous les chefs**, choisie par défaut (remplace la présélection du premier chef).
- **Tous les chefs** :
  1. Points d'attention de l'équipe (mêmes règles, avec le nom du chef), plus « chef sans opération depuis N jours » (dernière opération dans `recovery_manager_operation`).
  2. KPI de l'équipe : taux du mois (somme des chefs), recouvré période, recouvré du mois vs mois précédent, à remettre, retards délai.
  3. **Tableau des chefs côte à côte** : chef · recouvré période · opérations · taux du mois · évolution vs M-1 · couverture crédit % · couverture tontine % · écarts · carnets vérifiés · tournée du jour (quartiers, ouverte / clôturée / aucune). Clic → vue du chef (`?manager=`).
  4. Tendance de l'équipe (30 jours).
  5. Retards prioritaires (communs à tous les chefs).
- **Un chef choisi** : même écran que le chef, plus le nom du chef dans les opérations.

## 3. Données et endpoints

Nouveau contrôleur **`RecoveryBoardController`** (`/api/v1/recovery-manager/board`), fichier séparé pour ne pas croiser le correctif en cours sur `RecoveryManagerController`.

| Endpoint | Contenu | Règle d'accès |
|---|---|---|
| `GET /board?startDate&endDate&commercial&recoveryManagerUsername` | `RecoveryBoardDto` : KPI, comparaison du mois, tendance 30 j, points d'attention, retards prioritaires, et `team[]` quand aucun chef n'est donné | Chef : forcé sur lui-même (paramètre ignoré). Gestionnaire / admin : un chef ou tous. |

Un seul appel, comme le cockpit (`cockpit`). Les opérations paginées et le PDF restent sur les endpoints existants. La liste des chefs vient des utilisateurs de profil `RECOVERY_MANAGER`, plus les chefs présents dans les opérations de la période.

Calculs :
- Tendance : `SUM(amountCollected) GROUP BY operationDate` sur 30 jours (nouvelle requête du dépôt des opérations).
- Mois vs M-1 : recouvré du 1er au jour J du mois de fin de période, comparé au 1er–J du mois précédent (borné à sa fin). Pas de taux M-1 (dénominateur non historique).
- Retards prioritaires : retards délai de `CreditLateService.getLateCredits(commercial)`, net du reliquat, tri selon le choix B, 10 premiers, dernier contrôle joint (`findLatestByCreditIds`).
- Écarts en attente : derniers contrôles en écart (crédit et tontine) dont la décision est `PENDING`.
- Activité par chef : `RecoveryManagerActivityService.getActivity` par chef (quelques chefs).
- Tournée du jour : `RecoveryFieldDayPlanRepository` par chef, date du jour.

Pas de migration Flyway, pas de DDL, pas de mobile.

## 4. Choix validés (2026-11-21)

- **A. Vue par défaut du gestionnaire** : **Tous les chefs**.
- **B. Ordre des retards prioritaires** : **dû net décroissant**, puis jours de retard.
- **C. Objectifs** : **deux paramètres applicatifs**, valeurs par défaut fixées par l'agent faute de valeur métier, réglables dans **Paramètres généraux** :
  - `RECOVERY_MONTHLY_RATE_TARGET` = `10` (taux du mois visé, en %) : repère sur le KPI Taux du mois et sur chaque ligne de chef ; point d'attention si le taux est sous l'objectif **au prorata des jours écoulés** du mois.
  - `RECOVERY_COVERAGE_TARGET` = `30` (part du portefeuille en cours, crédit et tontine, contrôlée dans le mois, en %) : repère sur les cartes de couverture ; point d'attention si la couverture du mois (du 1er à la fin de période) est sous l'objectif au prorata.
  - Valeur vide, nulle ou illisible : pas de repère, pas d'alerte.
- **D. « Recouvré non versé »** : **rien** dans ce chantier.

## 5. Découpage en PR

| PR | Contenu | Version | Base / dépendance |
|---|---|---|---|
| 1 — Backend | `RecoveryBoardController`, `RecoveryBoardService`, DTO, requête de tendance, tests (`RecoveryBoardServiceTest`, accès chef forcé) | Backend **1.64.0** | `main` ; empilée sur `fix/recovery-manager-access` (bug 2 nécessaire à la vue équipe) |
| 2 — Frontend | Board sur `/report/daily/recovery` (zones ci-dessus), modèle et service, visite guidée mise à jour, e2e de la page, guide chef et gestionnaire, index RAG, HTML, versions imprimables, memory-bank | Frontend **2.66.0** | `main` ; empilée sur #270 et la PR 1 |

Vérification : `mvn test` ciblé, `ng build`, `tsc -p tsconfig.spec.json`, écran vu avec `recov001` et `ges003` sur backend local (seed).

## 6. Hors champ, à signaler

- Les endpoints existants laissent un chef passer `recoveryManagerUsername` d'un autre chef : à fermer dans une PR à part (sécurité).
- Retrait de l'ancienne présentation : décision métier.
