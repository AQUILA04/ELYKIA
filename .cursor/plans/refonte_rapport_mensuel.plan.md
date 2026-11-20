---
name: Refonte du rapport mensuel
overview: Remplacer l'arborescence de fichiers de /report/monthly par un écran de clôture (mois calendaire ou période entre deux dates), refaire les PDF général (4 pages) et commercial (relevé signé) au design system documents, et générer en tâche de fond. Trois PR successives vers main.
todos:
  - id: pr-a-backend-periode
    content: "PR A Backend : période libre (migration), agrégation v2 typée, génération asynchrone, endpoints écran, ZIP, tests"
    status: pending
  - id: pr-b-backend-pdf
    content: "PR B Backend : PDF général 4 pages et relevé commercial au design system, tests de rendu et contrôle visuel"
    status: pending
  - id: pr-c-frontend
    content: "PR C Frontend : écran de clôture, ancienne présentation sur /classic, visite guidée, guide, RAG, changelog"
    status: pending
isProject: false
---

# Refonte du rapport mensuel

Plan rédigé le 2026-11-20 à partir du code de `main` (commit `29de8c87`) et des maquettes validées.
**Règle de travail : présenter ce plan à l'utilisateur et attendre son « oui » avant de coder** (mémoire « plan avant implémentation »). Les 5 décisions de la fin sont à lui faire trancher.

## Sources à lire en premier

- Maquettes validées (artifact Claude) : « Rapports mensuels — proposition », https://claude.ai/artifact/DbDwLdTNF5qcn9Eu4s1irN
  - `Main.dc.html` : écran « Clôture mensuelle ».
  - `PdfGeneral1/2/3.dc.html` : PDF général, pages 1 à 3 (synthèse direction ; équipe et caisse ; stock et dettes). La page 4 est l'annexe des entrées en stock.
  - `PdfCommercial.dc.html` : relevé mensuel commercial, signé.
- Demande métier ajoutée après les maquettes : **filtre de période**. Par défaut, le mois calendaire. Possibilité de choisir une période entre deux dates (ex. 05/06 → 05/07, 15/09 → 12/10). Les périodes générées sont conservées et réapparaissent dans l'écran.
- Travaux déjà livrés, à réutiliser (même design et mêmes règles) :
  - rapport commerciaux journalier / périodique (#246, #249, #251) ;
  - stock commercial (#253 backend fusionné, #254 et #256 frontend à fusionner dans cet ordre).

## Ce que fait le code aujourd'hui

| Élément | État actuel | Conséquence |
|---|---|---|
| `MonthlyReportController` `/api/v1/monthly-reports` | `GET` arbre année › mois › fichiers, `GET /{fileId}/download`, `POST /generate {year, month}`, `GET /runs` (ROLE_REPORT) | Aucune donnée chiffrée pour un écran |
| `MonthlyReportRun` | Contrainte unique `(year, month)`, totaux CA / achat / marge, progression par lots | Pas de période libre possible |
| `MonthlyReportJobOrchestrator` | Prépare (agrégation + snapshot), clôture les stocks du mois rapporté (corrigé en #253), PDF général, puis PDF commerciaux par lots de 5 sur 4 threads, outbox MinIO | `POST /generate` exécute tout **dans la requête HTTP** (minutes) |
| `MonthlyReportAggregationService` | `Map<String,Object>` non typée : ventes par type (crédit, comptant, tontine), entrées en stock, recouvrements, livraisons tontine, résumé journalier | N'utilise ni le rapprochement caisse, ni le stock commercial, ni les dettes |
| `listActiveCommercials` | Commerciaux des rapports journaliers **+ `creditRepository.findDistinctCollectors()`** (tous les commerciaux ayant un jour vendu) | Un PDF pour chaque ancien commercial, même inactif ce mois |
| PDF `monthly-report-general.html` / `monthly-report-commercial.html` | Ancien style (`monthly-report-styles.html`), `HtmlConverter` direct, `TemplateEngine` | Pas au design system `pdf/report-fragments.html`, pas de pied « Page n/N » |
| Écran `MonthlyReportsComponent` (`/report/monthly`) | Arborescence année › mois › PDF, bouton « Générer le mois précédent » | Aucun pilotage |
| Accès | Flag Remote Config `monthlyReports` (défaut `false`) + `ROLE_REPORT` | À conserver |
| Planification | `MonthlyReportScheduler` le 1er à 02:00 (ShedLock) pour le mois précédent | À conserver (mois calendaire) |

Données réutilisables, sans nouvelle règle métier :
- `CommercialCockpitService.cockpit(start, end, commercial, compare, includeCash)` donne, **pour n'importe quelle période** :
  - le dû à la caisse, le versé, le reste, les surplus et les manquants antérieurs ;
  - les recouvrements crédit et les collectes tontine ;
  - la synthèse caisse et les alertes, par commercial et pour l'équipe, avec la période précédente.
- `CommercialStockTeamService.overview(year, month, …)` et `toSettle(…)` (#253) : écoulement, restant, dette et recouvrement du stock par commercial ; mois à régulariser.
- `DebtDocument` et `DebtSettlement` (V013) : dettes constituées, règlements par mode (CASH, SURPLUS_OFFSET, WRITE_OFF), encours.
- `TontineStock` : pris, livré et restant de l'année.
- PDF :
  - `pdf/report-fragments.html` (bloc d'en-tête, cartes, `table.data`, signatures, `role="presentation"`, `lang`, `<title>`) ;
  - `PdfHtmlRenderer` avec `FooterStyle.MODERN` ;
  - `UnitPriceVisibility.apply(context)`.
- Frontend : module partagé `shared/report-ui` (visite guidée, pipe `fcfa`, styles `report-v2`), arrivé avec #254.

## PR A — Backend : période libre, agrégation v2, génération en tâche de fond

1. **Migration `V044__monthly_report_period.sql`** (vérifier le dernier numéro au moment de coder) :
   - sur `monthly_report_run` : ajouter `period_start DATE`, `period_end DATE`, `period_kind VARCHAR(16)` (`CALENDAR` | `CUSTOM`) et `label` ;
   - remplir les lignes existantes (1er et dernier jour du mois, `CALENDAR`) ;
   - remplacer la contrainte `uk_monthly_report_run_month` par une contrainte unique `(period_start, period_end)` ;
   - garder `year` / `month` (mois de `period_end`) pour le classement ;
   - ajouter les colonnes de tendance lues sans recalcul : `cash_due`, `deposited`, `recovered_amount`, `tontine_collected`, `deposit_rate`.
2. **`MonthlyClosingDto`** (records typés), stocké dans `monthly_report_snapshot.data` avec `schemaVersion: 2`. L'ancien format reste lisible : afficher seulement les fichiers. Sections :
   - `period` : début, fin, type, nombre de jours, période précédente de même durée, même période N-1 ;
   - `kpis` : CA, marge et taux, dû caisse, versé et taux de versement, recouvrements, collectes tontine. Chacun avec sa valeur précédente et sa valeur N-1 ;
   - `sales` : par type (crédit, comptant, tontine) : nombre, CA, coût d'achat, marge, taux, part du CA. Hors commandes en attente, comme aujourd'hui ;
   - `team` : une ligne par commercial :
     - chiffres : CA crédit, marge, recouvré, collectes tontine, dû, versé, reste, surplus, taux de versement, statut ;
     - rangs par CA, par marge et par taux de versement ;
   - `cash` : synthèse caisse du cockpit (encaissé, dépenses hors approvisionnement, approvisionnements, remis au gérant, solde) ;
   - `recovery` : recouvré dont chefs de recouvrement, crédits passés en retard dans la période, reste chez les clients ;
   - `tontine` : collectes, rattrapages, adhésions, livraisons ;
   - `stock` : écoulement crédit par commercial (pris, vendu, retourné, restant, dette, taux de recouvrement, état de régularisation) et stock tontine de l'année ;
   - `debts` : par type (marchandise, écart de caisse, inventaire, avoirs) :
     - constitué dans la période ;
     - réglé par mode (espèces, avoir, abandon) ;
     - encours à la fin de la période, dont plus de 60 jours ;
   - `stockEntries` : entrées en stock (requête actuelle, conservée) ;
   - `keyPoints` : 4 messages calculés par règles simples :
     - marge record ou en baisse ;
     - commerciaux avec un reste à verser ;
     - surplus non équilibrés ;
     - recouvrement en baisse et crédits passés en retard.
3. **`MonthlyClosingService.build(start, end)`** : compose les services existants, sans nouvelle règle de calcul :
   - le cockpit, pour la caisse, l'équipe et le recouvrement ;
   - les requêtes de ventes actuelles, passées de `(year, month)` à `(start, end)` ;
   - le stock commercial des mois couverts (voir décision 1) ;
   - les dettes, dans une requête groupée par type et par mode.
   Pas de N+1 : les commerciaux et leurs agrégats sont lus en lot. Cible : moins de 2 s pour 30 commerciaux, à mesurer avec les index existants (V042), et un index sur `debt_document(date_reg)` et `debt_settlement(performed_at)` si nécessaire.
4. **Liste des commerciaux du relevé** : ne garder que ceux qui ont une activité dans la période (rapport journalier, vente, stock du mois, versement), et non plus tous les commerciaux ayant un jour vendu.
5. **Génération en tâche de fond** :
   - `POST /generate {start, end}` crée ou réinitialise le run (`PENDING`) et répond tout de suite ;
   - l'orchestrateur tourne sur un exécuteur dédié (`@Async`, 1 thread, file courte) ;
   - le planificateur garde son appel synchrone ;
   - refuser une deuxième génération de la même période déjà en cours (409) ;
   - un mois calendaire passé clôture aussi les stocks du mois ;
   - une période libre ne clôture rien.
6. **Endpoints** (ROLE_REPORT, flag inchangé côté écran) :
   - `GET /api/v1/monthly-reports/periods?year=` : les 12 mois calendaires de l'année avec leur statut (généré, échec, en cours, mois en cours), plus les périodes libres enregistrées ;
   - `GET /api/v1/monthly-reports/closing?start&end` : le snapshot du run s'il existe. Sinon, calcul à la volée pour le mois en cours ou une période non générée, avec un cache de 5 min comme le cockpit ;
   - `GET /api/v1/monthly-reports/trend?end&months=12` : la tendance, lue sur les colonnes de `monthly_report_run` (mois calendaires) ;
   - `GET /api/v1/monthly-reports/runs/{id}` : statut et progression (pour le suivi à l'écran), plus les fichiers ;
   - `GET /api/v1/monthly-reports/runs/{id}/zip` : tous les PDF du run en ZIP (flux) ;
   - `DELETE /api/v1/monthly-reports/runs/{id}` : seulement pour une période libre (purge MinIO via `MonthlyReportRunCleanupService`). Voir décision 3.
   - Garder `GET /` (arbre) et `/{fileId}/download` pour l'ancienne présentation.
7. **Tests** :
   - `MonthlyClosingService` : comparaisons, règles des points clés, dettes par mode, période libre à cheval sur deux mois ;
   - migration et contrainte unique ;
   - génération asynchrone et refus 409 ;
   - liste des commerciaux actifs ;
   - suite complète avec Docker : `contextLoads` valide les requêtes.
8. **À livrer avec la PR** : CHANGELOG Backend (incrément de version), `memory-bank/activeContext.md`.

## PR B — Backend : PDF au design system

1. Créer `monthly-report-general.html` (nouveau, 4 pages) et `monthly-report-commercial.html` (relevé), sur la base de `pdf/report-fragments.html` :
   - uniquement des tableaux (iText) ;
   - les graphiques en barres sont des cellules de largeur fixe ;
   - `role="presentation"` sur les tableaux de mise en page (Sonar S5256), plus `lang` et `<title>` ;
   - supprimer `monthly-report-styles.html` s'il n'est plus utilisé.
2. **PDF général** :
   - p. 1 : synthèse direction (6 indicateurs avec leurs variations, tendance sur 12 mois, points clés, ventes et marge par type) ;
   - p. 2 : rapprochement caisse par commercial, caisse, recouvrement, tontine, principaux articles entrés ;
   - p. 3 : écoulement du stock crédit par commercial avec l'état de régularisation, stock tontine, dettes du mois et encours ;
   - p. 4 : annexe des entrées en stock complètes ;
   - visas du gérant et de la direction.
3. **Relevé commercial** :
   - p. 1 :
     - rapprochement (crédit + tontine + solde Nx + rattrapages = dû − versé) ;
     - reste à verser à la fin de la période ;
     - surplus, manquants antérieurs, stock restant et dette ;
     - 4 indicateurs avec la variation sur la période précédente ;
     - activité par semaine (semaines de la période, même libre) ;
     - phrase de reconnaissance et signatures ;
   - p. 2 : annexe jour par jour et mouvements de stock (`CommercialStockTraceabilityService` existant).
4. Rendu avec `SpringTemplateEngine`, `PdfHtmlRenderer` (`FooterStyle.MODERN`, « Page n/N ») et `UnitPriceVisibility.apply`. Référence du document : `RM-AAAA-MM-COMxxx` pour un mois, `RM-AAAAMMJJ-AAAAMMJJ-COMxxx` pour une période libre. Période affichée au format `dd/MM/yyyy`.
5. **Tests** :
   - rendu réel (texte extrait par page, présence des sections, « Page 1/4 », prix masqués) ;
   - aperçus écrits dans `backend/target/pdf-preview` ;
   - **contrôle visuel** : conversion en PNG avec pymupdf, puis lecture de l'image. Vérifier les en-têtes alignés à droite (`table.data th.r`, `<colgroup>`) et les titres de section en majuscules.
6. CHANGELOG Backend, mémoire.

## PR C — Frontend : écran « Clôture mensuelle »

1. **Routes** :
   - `/report/monthly` devient le nouvel écran (même flag et même `ROLE_REPORT`) ;
   - l'arborescence actuelle passe sur `/report/monthly/classic` ;
   - un lien dans chaque sens.
2. **`MonthlyClosingComponent`** (styles `report-v2`, briques `shared/report-ui`) :
   - **En-tête** : ‹ période › ; pastille d'état (clôturé et généré le…, échec, en cours, période personnalisée) ; boutons Comparer à…, Régénérer, Télécharger tout (ZIP) ; Visite guidée ; Ancienne présentation.
   - **Période** :
     - segment Mois calendaire / Entre deux dates ;
     - deux dates et « Générer le rapport de cette période » ;
     - rappel des comparaisons (période précédente de même durée, même période N-1) ;
     - liste des périodes enregistrées.
   - **Bandeau des 12 mois**, avec une pastille d'état par mois.
   - **6 indicateurs**, avec leurs variations sur la période précédente et sur N-1.
   - **Tendance sur 12 mois** : barres CA et encaissé, en CSS.
   - **Points clés**.
   - **Stock commercial et dettes** : écoulé, à régulariser, dettes constituées, réglées, encours. Un lien ouvre `/stock/my-stock?year&month` ; « à régulariser » ouvre le bandeau de #256.
   - **Classement des commerciaux** :
     - tri par CA, par marge ou par taux de versement ;
     - un clic sur une ligne ouvre la fiche du rapport `/report/daily/commercials/:username` sur la même période ;
     - un bouton télécharge son PDF.
   - **Documents** : rapport général, relevés commerciaux, ZIP.
   - **Historique de génération** : runs, statut, nombre de fichiers.
   - **Pendant une génération** : suivre `GET /runs/{id}` (toutes les 3 s, arrêt à l'état final ou en quittant la page) et afficher la progression (commerciaux traités / total).
3. **Visite guidée** `MONTHLY_TOUR` (période, indicateurs, points clés, stock et dettes, classement, documents, ancienne présentation).
4. **Tests** :
   - specs des utilitaires (période, comparaisons, tri, suivi) avec le lanceur ciblé `--include` : `ng test` ne compile pas sur main ;
   - E2E existants qui utilisent l'arborescence : les faire passer par `/classic`.
5. **À livrer** :
   - guide gestionnaire (`user-guide/docs/manager/reporting_config.md`, section « Rapports mensuels ») ;
   - `python user-guide/generate_print_docs.py`, `python user-guide/generate_rag_index.py` (commit de `backend/src/main/resources/ai/user-guide-index.json`) ;
   - `python -m mkdocs build -d ../frontend/src/user-guide` (guide publié ; seules les pages modifiées changent réellement après normalisation des fins de ligne) ;
   - CHANGELOG Frontend, mémoire.
6. Partir de `main` **après la fusion de #254 et #256** : ils déplacent la visite guidée, le pipe et les styles vers `shared/report-ui` et touchent `report.module.ts`.

## Décisions à faire trancher avant de coder

1. **Stock d'une période libre** (ex. 05/06 → 05/07) : le stock est mensuel.
   - Recommandé : additionner les mois calendaires touchés (juin + juillet), avec la mention « stocks de juin et juillet ».
   - Autre choix : prendre seulement le mois de la date de fin.
2. **Relevés commerciaux pour une période libre** : recommandé oui (mêmes PDF, référence avec les dates). Autre choix : rapport général seulement.
3. **Suppression d'une période libre** (fichiers compris) : recommandé oui, pour `ROLE_REPORT`. Les mois calendaires ne se suppriment pas, ils se régénèrent.
4. **Comparaisons** :
   - pour un mois calendaire : le mois précédent et le même mois N-1 ;
   - pour une période libre : la période précédente de même durée et les mêmes dates N-1.
   - À confirmer.
5. **Relevé visible par le commercial lui-même** : recommandé plus tard. Pour l'instant, réservé à ROLE_REPORT, comme aujourd'hui.

## Rappels pour la session qui implémente

- Travailler dans un **worktree séparé** (`git worktree add ../ELYKIA-wt-monthly -b feat/monthly-closing-backend origin/main`) : le dossier partagé sert à d'autres sessions.
  - Pour le frontend, lier `node_modules` avec `cmd /c mklink /J`, puis retirer le lien avec `cmd /c rmdir`, jamais `rm -rf`.
- JDK : `export JAVA_HOME='C:\env\jdk\jdk-17.0.13.11-hotspot'`, puis `mvn -q -o test`.
  - Docker Desktop est installé : la suite complète a besoin de Testcontainers. Le démarrer ou demander à l'utilisateur.
  - Un test qui dépend de `UnitPriceVisibility` doit remettre son instance statique à zéro (`ReflectionTestUtils.setField(UnitPriceVisibility.class, "instance", null)`) : l'ordre des tests diffère en CI.
- Specs frontend : tsconfig temporaire avec `--include` sur les seules specs concernées.
- **Une PR à la fois vers `main`, sans PR empilées** :
  - lire la CI (build-backend, Deploy gate, SonarCloud) après chaque push ;
  - Sonar : pas de promesse ignorée (`void`), pas d'`aria-hidden` sur un élément focusable, `role="presentation"` sur les tableaux de mise en page.
- Chaque PR met à jour `docs/CHANGELOG.md` (section du composant, version incrémentée dans `pom.xml` ou `package.json`) et `memory-bank/activeContext.md`. Toute PR qui touche une interface met aussi à jour le guide et l'index RAG.
- Les messages de commit se terminent par la ligne `Co-Authored-By` donnée par l'environnement. Le corps de chaque PR se termine par la ligne « Generated with Claude Code ».
