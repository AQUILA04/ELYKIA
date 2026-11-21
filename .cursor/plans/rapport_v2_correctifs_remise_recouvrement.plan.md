# Nouvelle interface rapport et stock : correctifs, remise et recouvrement

Plan préparé le 2026-11-21, à traiter dans une autre session. Branche tirée de `origin/main`, après la fusion de #266. Chaque PR suit les règles du dépôt : changelog avec montée de version, memory-bank, guide utilisateur avec index RAG et HTML régénérés, style UI frontend.

## Retours du métier

1. Sur « Stock commercial mensuel » (`/stock/my-stock`), la liste des commerciaux s'ouvre sous la carte « Mois clôturés à régulariser ». Même défaut sur « Pilotage des commerciaux » (`/report/daily`), où la liste passe sous les cartes KPI.
2. « Bilan tontine » : supprimer la parenthèse « (saisie hors application ou reprise du solde de l'année précédente) ». L'écart vient de collectes faites chez des membres non enregistrés ; le contrôle carnet les révèle. Aucun commentaire de remplacement.
3. La remise au gestionnaire n'a pas été traitée dans la nouvelle interface.
4. Le recouvrement du chef de recouvrement n'a pas été traité dans la nouvelle interface.

## Analyse

### 1. Liste déroulante masquée

- Les pages v2 animent leurs cartes avec les classes `a1` à `a4` (`fadeUp … both`). L'animation garde un `transform` après sa fin, et chaque carte suivante crée son propre contexte d'empilement, peint après la carte d'en-tête. Le panneau de `ng-select`, rendu dans l'en-tête, passe donc dessous.
- Concernés :
  - `frontend/src/app/stock/pages/stock-team/stock-team.component.html` (`ng-select` « Toute l'équipe ») ;
  - `frontend/src/app/report/components/report-filter-bar/report-filter-bar.component.html`, partagé par le cockpit, la fiche, les versements et le journal.
- Correctif : `appendTo="body"` sur ces `ng-select`, comme `stock/rattrapage/rattrapage-credit-add` et `stock-return-historique`. Ajouter au besoin la classe de style du panneau, car il quitte le composant et l'encapsulation SCSS ne l'atteint plus.
- Passer en revue les autres `ng-select` des pages v2 avec `grep -rn "ng-select" app/report app/stock/pages` : `stock-sheet`, `stock-regularisation`, `stock-tontine-team`.
- Ne pas retirer l'animation : le correctif doit rester local.

### 2. Phrase du bilan tontine

- Dans `frontend/src/app/report/components/commercial-yearly/commercial-yearly.component.html`, ligne 44, garder « À vérifier : les versements dépassent les collectes de X » et retirer la parenthèse.
- Vérifier qu'aucun test e2e ni guide utilisateur ne cite la phrase : `grep -rn "saisie hors application"` dans `frontend`, `mobile/e2e`, `user-guide`.

### 3. Remise au gestionnaire

Existant :

- Composant `report/components/cash-period-remittance-tab`, d'environ 350 lignes. Ses montants passent par `currency:'XOF'`, d'où l'affichage « F CFA5,184,100 » au format anglais.
- Il est utilisé dans l'onglet « Remise » de l'ancienne page (`/report/daily/classic`), réservé au gestionnaire et au secrétaire. Il est aussi intégré tel quel dans `/report/daily/deposits`, vue « Remise secrétaire → gérant » (`setView('remittance')`).
- Le cockpit (`report-cockpit.component.ts`, `ngOnInit`) renvoie vers `/report/daily/classic` tout utilisateur sans `ROLE_KPI_FINANCIER_RAPPORT_JOURNALIER`. Un secrétaire sans cette permission ne voit donc jamais la nouvelle interface.

À faire :

- Créer une page v2 dédiée `/report/daily/remittance`, avec la structure `report-v2` : fil d'Ariane, carte d'en-tête, carte filtre de période, KPI, dépenses et tableau.
- Contenu attendu :
  - **KPI :** reste à remettre, crédit, tontine, solde nouveaux comptes, dépenses et montant net ;
  - **Actions :** soumission par le secrétaire, réception directe par le gestionnaire.
- Reprendre la logique du composant existant dans un service ou un composant de présentation, plutôt que de la dupliquer. Montants via le pipe `fcfa`, période via le style du `report-filter-bar` et dates françaises.
- Accès :
  - un lien « Remise au gestionnaire » dans l'en-tête du cockpit, visible pour le gestionnaire et le secrétaire ;
  - dans `ngOnInit` du cockpit, envoyer un secrétaire sans KPI financiers vers `/report/daily/remittance`, et non vers l'ancienne interface ;
  - dans `/report/daily/deposits`, faire de la vue « Remise » un lien vers la nouvelle page, ou garder le composant partagé une fois restylé.
- Laisser l'onglet de l'ancienne interface inchangé : son retrait relève d'une décision métier.
- Backend : a priori aucun changement, les endpoints de remise existent déjà. À confirmer en lisant `cash-period-remittance-tab.component.ts` et le service qu'il appelle.

### 4. Recouvrement du chef de recouvrement

Existant :

- Composant `report/components/recovery-manager-report-tab`, d'environ 220 lignes de HTML.
- Il appelle `recoveryManagerService` : `getActivity`, `getReportSummary`, `getMonthlyRecoveryRate`, `getOperations` et `downloadReportPdf`.
- Il affiche trois blocs : « Activité terrain », « À remettre par commercial » et « Détail des opérations ».
- Le chef de recouvrement, sans KPI financiers, est renvoyé vers `/report/daily/classic`, onglet recouvrement. Le cockpit n'a qu'un bouton « Recouvrement terrain » qui ouvre l'ancienne page.

À faire :

- Créer une page v2 `/report/daily/recovery` :
  - même en-tête et même `report-filter-bar` (période et commercial) ;
  - KPI : taux de recouvrement du mois, montant recouvré, montant à remettre, nombre d'opérations ;
  - cartes « À remettre par commercial », avec lien vers la fiche commercial quand l'utilisateur y a droit ;
  - tableau des opérations paginé ;
  - bouton PDF ;
  - visite guidée.
- Redirection : dans `ngOnInit` du cockpit, envoyer le profil `RECOVERY_MANAGER` sans KPI financiers vers `/report/daily/recovery`. Le bouton « Recouvrement terrain » du cockpit pointe désormais vers cette page.
- Le paramètre `?tab=recovery` de l'ancienne page reste valable.
- Lien « Ancienne présentation » sur la nouvelle page, comme ailleurs.

## Découpage en PR

| PR | Contenu | Composants |
|----|---------|------------|
| A | Points 1 et 2 : `appendTo="body"` sur les `ng-select` v2 et phrase du bilan tontine | Frontend |
| B | Point 3 : page `/report/daily/remittance`, redirection du secrétaire, lien depuis le cockpit et les versements, pipe `fcfa` | Frontend, et Backend seulement si un endpoint manque |
| C | Point 4 : page `/report/daily/recovery`, redirection du chef de recouvrement, bouton du cockpit | Frontend |

La PR A est indépendante et rapide. Les PR B et C touchent toutes deux `report-cockpit.component.ts` (`ngOnInit` et en-tête) et `report-routing.module.ts`. Les faire l'une après l'autre, ou isoler ces deux fichiers dans la seconde.

## Vérifications

- `ng build` du frontend.
- Specs ciblées : `tsc -p tsconfig.spec.json`, Karma ne compilant pas sur le dépôt. Specs ou e2e existants : `e2e-report-*`, `e2e-stock-team-*`.
- À l'écran, pour chaque profil (gestionnaire, secrétaire, chef de recouvrement, commercial), avec les comptes de seed :
  - la liste des commerciaux passe au-dessus des cartes sur `/stock/my-stock` et `/report/daily` ;
  - chaque profil arrive sur la bonne page.
- Guide utilisateur :
  - pages gestionnaire, secrétaire et chef de recouvrement à mettre à jour ;
  - captures et visite guidée de la nouvelle page ;
  - index RAG et HTML régénérés.

## Hors périmètre

- Le retrait de l'ancienne présentation (`/report/daily/classic`), qui reste une décision métier.
- L'explication de l'écart tontine : le contrôle carnet la donne déjà.

## Plan affiné (2026-11-21, après lecture du code)

Choix validés par l'utilisateur le 2026-11-21 : héritage pour la remise, sélecteur Mois + Du/Au, vue Remise conservée dans Versements, liste déroulante des chefs de recouvrement.

### Constats

- Aucun `ng-select` dans `stock-sheet`, `stock-regularisation` ni `stock-tontine-team`. Les seuls `ng-select` des pages v2 sont ceux de `stock-team` et de `report-filter-bar`. Aucun style de panneau propre à ces deux composants : le thème global de `ng-select` s'applique encore une fois le panneau rattaché à `<body>`.
- Sur le cockpit, le conteneur de page porte lui-même `a1` ; la barre de filtres (`a3`) et la bande KPI (`a3`) sont deux contextes d'empilement frères, la bande KPI peinte après. D'où le défaut.
- La phrase « saisie hors application » n'apparaît que dans `commercial-yearly.component.html` (ni e2e, ni guide).
- Remise : la période est **un mois** (`year`, `month`) et une plage `Du / Au` comprise dans ce mois (`getSummary`, `submit`, `initiate`). Les préréglages du `report-filter-bar` (jour, semaine…) ne s'y prêtent pas. Les e2e remise (`e2e/specs/august-2026/remittance-*.spec.ts`) passent par `/report/daily/classic`, onglet Remise : non touchés.
- Recouvrement : le gestionnaire filtre aujourd'hui par un champ texte « Username du chef de recouvrement ». Le chef de recouvrement voit ses seules opérations (`recoveryManagerUsername` = lui-même).

### PR A — Frontend 2.63.0

- `appendTo="body"` sur les `ng-select` de `stock-team` et `report-filter-bar`.
- Retrait de la parenthèse dans `commercial-yearly.component.html`.
- Changelog, memory-bank (`activeContext.md`), guide : pas de changement de parcours, seulement si une page cite le défaut. RAG et HTML régénérés si le guide change.

### PR B — Frontend 2.64.0 : `/report/daily/remittance`

- `ReportRemittanceComponent` (page v2, `ViewEncapsulation.None`, styles `report-v2`). Logique reprise sans duplication : la page **hérite** de `CashPeriodRemittanceTabComponent` (états, calcul du net, actions). L'ancien composant reste tel quel.
- Période : navigateur de mois ‹ Novembre 2026 › au style des boutons segmentés, puis `Du / Au` bornés au mois, dates françaises. État dans l'URL (`?year=&month=&start=&end=`).
- KPI (pipe `fcfa`) : reste à remettre, crédit, tontine, solde nouveaux comptes, dépenses, net. Carte dépenses cochables, carte actions (Soumettre / Accuser réception / Initier la réception), historique paginé avec détail des versements.
- Visite guidée `REMITTANCE_TOUR`. Lien « Ancienne présentation » vers `/report/daily/classic?tab=remittance` (ajout de la lecture de `tab=remittance` dans l'ancienne page, pour le gestionnaire et le secrétaire).
- Accès : route sans garde supplémentaire, la page renvoie vers `/report/daily` un profil qui n'est ni gestionnaire ni secrétaire (comme `canRemit` de Versements).
- Cockpit : bouton « Remise au gestionnaire » (gestionnaire, secrétaire) ; dans `ngOnInit`, secrétaire sans KPI financiers → `/report/daily/remittance`.
- Versements : la vue « Remise secrétaire → gérant » reste intégrée telle quelle (choix validé le 2026-11-21).
- Guide gestionnaire et secrétaire, captures, RAG, HTML.

### PR C — Frontend 2.65.0 : `/report/daily/recovery`

- `ReportRecoveryComponent` (v2), appels de `RecoveryManagerService` repris du composant `recovery-manager-report-tab` (même stratégie d'héritage, ou extraction si l'héritage gêne les `@Input`).
- `report-filter-bar` (période, commercial). Pour le gestionnaire, choix du chef de recouvrement par `ng-select` (`appendTo="body"`) alimenté par la liste des utilisateurs au profil `RECOVERY_MANAGER`, à la place du champ texte.
- KPI : taux du mois, montant recouvré, à remettre, nombre d'opérations ; bloc « Activité terrain » ; cartes « À remettre par commercial » avec lien vers la fiche si KPI financiers ; tableau des opérations paginé ; bouton PDF ; visite guidée ; lien « Ancienne présentation » (`?tab=recovery`).
- Cockpit : `RECOVERY_MANAGER` sans KPI financiers → `/report/daily/recovery` ; bouton « Recouvrement terrain » vers la nouvelle page.
- Guide chef de recouvrement et gestionnaire, RAG, HTML.

### Vérifications par PR

- `ng build`, `tsc -p tsconfig.spec.json`.
- À l'écran : backend local (Postgres Docker, profil avec amorçage des comptes démo) et `npm start`, puis connexion avec les comptes de seed gestionnaire, secrétaire, chef de recouvrement et commercial.
