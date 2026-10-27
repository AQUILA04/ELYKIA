---
name: Sessions de tontine multiples
overview: Remplacer la session annuelle unique par autant de sessions datées que le métier le souhaite (Pâques, vacances, événement), un client pouvant adhérer à plusieurs sessions en parallèle. Chaque session garde son propre cycle ouvert, clôturé, terminé.
todos:
  - id: lot-1-modele
    content: Migration (nom, code, type annuelle ou complémentaire, dates). L’annuelle se crée seule si elle manque ; les autres sont créées par GESTIONNAIRE, ADMIN ou SUPER_ADMIN
    status: pending
  - id: lot-2-adhesion
    content: Adhésion par session, écritures (cotisation, commande, livraison, carnet) contrôlées sur la session du membre
    status: pending
  - id: lot-3-parcours
    content: Web, mobile et Espace Client — choix de session à la création, à l’inscription et à la consultation
    status: pending
  - id: lot-4-cloture-stock
    content: Clôture par date de fin, stock par session, archives ciblées, guide, index RAG et catalog IA
    status: pending
isProject: false
---

# Sessions de tontine multiples

## Besoin

Aujourd’hui l’agence ne mène qu’une campagne par année civile (ouverte en pratique du 1er février au 30 novembre). Le métier veut ouvrir d’autres campagnes dans la même année — fêtes de Pâques, vacances, événement spécial — sans fermer la campagne annuelle.

Règles demandées :

- Créer autant de sessions que nécessaire.
- Chaque session a une date de début et une date de fin.
- Un client peut être membre de plusieurs sessions en même temps.
- Chaque adhésion conserve sa mise, ses cotisations, son carnet et sa livraison.
- La session annuelle de l’année civile est créée automatiquement dès qu’elle n’existe pas encore.
- Les autres sessions (Pâques, vacances, événement) sont créées volontairement par un gestionnaire, un admin ou un super-admin.

## Constat dans le code

Une session est déjà une entité (`TontineSession`) et une adhésion (`TontineMember`) pointe déjà vers une session. Les cotisations, la commande et la livraison sont portées par l’adhésion, donc par une session. Le blocage n’est pas l’absence de lien : c’est l’hypothèse « une seule session = l’année ».

| Verrou | Où | Effet |
| --- | --- | --- |
| `UNIQUE (year)` sur `tontine_session` | `V000__init_schema.sql`, contrainte `ukg7b9f4xtwknlon44a4websnw9` | Impossible d’enregistrer deux sessions la même année |
| Création automatique | `TontineService.getActiveSession()` | Si aucune ligne pour l’année civile, crée le 1er février → 30 novembre, statut `ACTIVE` |
| Recherche par année | `TontineSessionRepository.findByYear` renvoie un `Optional` | Inscription, cotisation, Espace Client, carnet, export, reset et comparaison supposent une seule ligne |
| Doublon client | `findByTontineSession_YearAndClient_Id` | « Déjà inscrit pour la session de cette année » bloque toute seconde adhésion, même pour une autre campagne |
| Dates | `updateCurrentSession` | Début et fin doivent tomber dans l’année civile en cours |
| Fin d’année | `TontineSessionScheduler.endYearlyTontineSessions` | Le 31 décembre, toutes les sessions `CLOSED` passent `ENDED`, quelle que soit leur date de fin |
| Mois de carnet | `TontineMemberFieldControlService` | Seuls février à novembre sont acceptés |
| Plafond d’épargne | politiques d’allocation V1 et V2 | 10 mois de 31 jours, calés sur la campagne annuelle |
| Drapeau client | `updateTontineStatus(true)` à l’inscription, `false` à la livraison | Livrer une campagne retire le statut tontine alors qu’une autre adhésion est encore ouverte |
| Stock | unicité `(commercial, article_id, year)` | Le stock tontine est un pot annuel. `tontineSessionId` est stocké mais ne sépare pas les campagnes |
| Mobile | `getTontineSession()` : `ORDER BY year DESC LIMIT 1` | Une seule session en mémoire, alors que la table locale `tontine_sessions` peut en contenir plusieurs |
| Web | sélecteur de session | Le libellé affiché est l’année ; la session `ACTIVE` est prise par défaut |
| Espace Client | `getCurrentTontineSession()` | Une carte « session de l’année » ; déjà membre = impossible de rejoindre une autre campagne |
| Archives | `TontineCollectionResetService` | Archive et remise à zéro de « la » session active, sans choix |

Le cycle déjà en place reste le bon cycle, à appliquer **par session** et non plus pour l’année :

- `ACTIVE` : inscription, cotisation, commande.
- `CLOSED` : plus d’écriture d’épargne ni de commande ; remise des marchandises.
- `ENDED` : plus aucune écriture.

La clôture quotidienne (session `ACTIVE` dont `endDate` est passée → `CLOSED`, adhérents `SESSION_INPROGRESS` → `PENDING`) est déjà écrite dans `closeExpiredTontineSessions`. Elle fonctionne pour plusieurs sessions. Le job du 31 décembre, lui, est annuel et doit disparaître.

## Cible

```mermaid
flowchart TB
  annee[Année civile 2026]
  annee --> annuelle["Session annuelle · 1 fév – 30 nov"]
  annee --> paques["Session Pâques · 1 mar – 20 avr"]
  annee --> vacances["Session vacances · 1 jui – 31 aoû"]
  client[Client]
  client --> m1[Adhésion annuelle]
  client --> m2[Adhésion Pâques]
  m1 --> annuelle
  m2 --> paques
  m1 --> cot1[Cotisations, carnet, commande, livraison]
  m2 --> cot2[Cotisations, carnet, commande, livraison]
```

Une session est une campagne nommée, avec un début, une fin et son propre stock d’adhérents. L’année reste un regroupement (année de la date de début), plus une identité.

Deux sessions peuvent se chevaucher. Pâques tombe pendant la campagne annuelle : le client cotise les deux, sur deux adhésions, deux mises, deux carnets.

## Décisions proposées

1. **Identité.** Colonnes ajoutées : `name` (obligatoire, ex. « Session Pâques »), `code` (stable, unique, ex. `PAQUES-2026`). `year` = année de `startDate`, conservé pour les archives et les tris. La contrainte d’unicité sur `year` est retirée. Unicité nouvelle : `code`.
2. **Dates.** `startDate` et `endDate` restent obligatoires, avec `endDate` strictement après `startDate`. Une session peut traverser le 31 décembre (vacances de fin d’année) : `year` est alors l’année du début. Le contrôle « les deux dates dans l’année civile en cours » est retiré.
3. **Chevauchement.** Autorisé. À la création, l’écran signale les sessions ouvertes dont les dates se croisent, sans bloquer.
4. **Adhésion.** Unicité `(client_id, tontine_session_id)` pour les adhésions actives. Le même client a une ligne `TontineMember` par session. Mise, fréquence, part société, mois validés, carnet et livraison restent sur cette ligne.
5. **Commercial tontine.** Inchangé : le commercial est celui du client (`tontineCollector`). Pas de commercial différent par session dans ce lot.
6. **Statut tontine du client.** Vrai tant qu’il existe au moins une adhésion active non livrée. La livraison d’une session ne retire le statut que si aucune autre adhésion n’est ouverte.
7. **Écritures.** Inscription, cotisation, rattrapage, contrôle de carnet, commande et livraison lisent le statut de la session de l’adhésion. Une cotisation n’est acceptée que si sa date tombe dans `[startDate, endDate]` de cette session et que la session est `ACTIVE`.
8. **Carnet.** Les mois proposés sont les mois calendaires couverts par `[startDate, endDate]`, plus la liste fixe février–novembre. Une session de décembre ou de janvier devient contrôlable. Le plafond de 10 × 31 jours reste un maximum : une session courte valide moins de mois parce qu’elle a moins de jours.
9. **Stock.** L’unicité passe à `(commercial, article_id, tontine_session_id)`. Chaque campagne a son stock de livraison. Les lignes actuelles sont rattachées à la session annuelle de leur année (la colonne `tontineSessionId` existe déjà).
10. **Session annuelle, création automatique.** Une colonne `kind` distingue `ANNUAL` et `EXTRA`. Pour chaque année civile, il existe au plus une session `ANNUAL` (index unique partiel sur `year` où `kind = ANNUAL`). `ensureAnnualSession(year)` reprend le comportement actuel de `getActiveSession()` : si cette ligne manque, le système la crée, statut `ACTIVE`, du 1er février au 30 novembre, nom `Session annuelle {year}`, code `ANNUELLE-{year}`. Cela se produit au premier besoin de l’année (inscription, cotisation, ouverture du tableau de bord, synchro mobile), que d’autres sessions existent déjà ou non. Personne ne la saisit à la main. Elle ne se recrée pas si elle est déjà là, y compris lorsqu’elle est `CLOSED` ou `ENDED`.
11. **Autres sessions, création volontaire.** Pâques, vacances et événement sont des sessions `EXTRA`. Seuls les profils `GESTIONNAIRE`, `ADMIN` et `SUPER_ADMIN` peuvent les créer (`UserProfilConstant`). Le formulaire demande le nom, le début et la fin. Le code est proposé, modifiable, unique. Un commercial, un magasinier, un secrétaire ou un client ne voit pas l’action et l’API la refuse. L’endpoint refuse aussi un second `kind = ANNUAL` pour la même année.
12. **Modification.** Ces trois profils peuvent ajuster le nom et les dates d’une session `ACTIVE`, annuelle comprise, si aucune cotisation ne tombe hors du nouvel intervalle. Ils ne peuvent pas supprimer l’annuelle. Une session complémentaire avec adhérents ne se supprime pas. Une session complémentaire vide peut être désactivée.
13. **Clôture.** La tâche quotidienne ferme chaque session dont la date de fin est passée. Le passage à `ENDED` se fait quand toutes les livraisons sont faites, ou par une action manuelle des trois profils. Le job du 31 décembre est retiré.
14. **Quelle session par défaut.** Sans `sessionId`, l’inscription, l’Espace Client historique et le mobile ancien visent la session annuelle de l’année, créée au besoin par `ensureAnnualSession`. Dès qu’un écran envoie un `sessionId`, ou qu’une cotisation porte un `memberId`, c’est la session de cette adhésion qui s’applique. `getActiveSession()` devient cet assureur de l’annuelle : il ne choisit pas une session Pâques au motif qu’elle est `ACTIVE`.
15. **Archives.** « Archiver » et « Archiver et réinitialiser » exigent une session choisie. La réinitialisation efface les cotisations de cette session seulement. Elle ne sert pas à ouvrir Pâques. L’action reste réservée aux profils qui lancent déjà cette opération.
16. **Reconduction.** Le guide dit que les membres n’ont pas à être réinscrits d’une année sur l’autre. Le code, lui, remet à zéro la session en cours et laisse la session de l’année suivante vide. Ce lot ne change pas ce geste en copie automatique. Une action ultérieure « Reconduire les membres » copiera client et mise d’une session close vers une session nouvelle, en créant de nouvelles adhésions, sans effacer l’historique.

Hors de ce lot : mise minimum ou part société différente par session, commercial différent par session, fusion de deux campagnes, paiement unique ventilé automatiquement sur plusieurs adhésions.

## Modèle

```text
tontine_session
  id, name, code UNIQUE, kind (ANNUAL | EXTRA), year, start_date, end_date, status, total_revenue
  UNIQUE (year) WHERE kind = 'ANNUAL'

tontine_member
  id, tontine_session_id, client_id
  UNIQUE (client_id, tontine_session_id) WHERE visibility = ENABLED
  mise, cotisations, carnet, livraison  -- inchangés, déjà par adhésion

tontine_stock
  UNIQUE (commercial, article_id, tontine_session_id)
```

Migration des lignes existantes :

- `name` = `Session annuelle {year}`
- `code` = `ANNUELLE-{year}`
- `kind` = `ANNUAL`
- dates déjà présentes, on ne les réécrit pas
- puis suppression de l’unicité sur `year`, ajout de l’unicité sur `code`, `name` obligatoire

Le catalog IA (`tontine_session.description` = « Session annuelle tontine ») est mis à jour dans le même commit que la migration : nom, code, dates, et la relation membre → session.

## Parcours

### Gestionnaire, admin ou super-admin — ouvrir une campagne en plus

La session annuelle de l’année est déjà là. Si elle manque, elle apparaît au premier accès, du 1er février au 30 novembre, sans formulaire.

1. Menu Tontines → Sessions → Nouvelle session. Le bouton n’est visible que pour `GESTIONNAIRE`, `ADMIN` et `SUPER_ADMIN`.
2. Saisir le nom, le début et la fin. Le code est proposé à partir du nom et de l’année, modifiable. Le type enregistré est complémentaire (`EXTRA`), jamais annuelle.
3. Enregistrer. La session apparaît dans le sélecteur sous la forme « Pâques 2026 · 1 mar – 20 avr · Ouverte », à côté de « Session annuelle 2026 ».
4. Les indicateurs, la liste, l’export et la comparaison suivent la session choisie, par identifiant. Le sélecteur s’ouvre sur l’annuelle de l’année.

### Commercial — inscrire et encaisser

1. Le tableau de bord affiche la session choisie. Le mobile en télécharge plusieurs : toutes les `ACTIVE` et les `CLOSED` pas encore `ENDED`.
2. Inscription : la session cible est celle affichée. Si le client y est déjà, le message cite le nom de la session. S’il est seulement dans une autre, l’inscription est acceptée.
3. Cotisation : l’adhésion choisie porte la session. Deux cotisations le même jour pour deux campagnes font deux lignes de caisse. Le versement du jour continue d’additionner la tontine encaissée, toutes campagnes confondues.
4. Commande pendant que cette session est ouverte. Remise une fois cette session clôturée. Une session Pâques clôturée en avril se livre en avril, pendant que l’annuelle est encore ouverte.

### Client — Espace Client

1. « Mes tontines » liste chaque adhésion : nom de la session, dates, mise, total cotisé, statut de livraison.
2. « Rejoindre une session » liste les sessions ouvertes dont la fin n’est pas passée et dont il n’est pas déjà membre.
3. L’inscription et le premier paiement visent l’identifiant de session choisi.

### Contrôle terrain

Le formulaire de carnet s’ouvre sur une adhésion. Les mois cochables sont ceux de sa session. Le libellé affiche le nom de la session à côté de l’année.

## Lots de livraison

### Lot 1 — Modèle et création

- Migration et catalog IA, avec `kind`.
- `ensureAnnualSession(year)` crée la session `ANNUAL` du 1er février au 30 novembre lorsqu’elle manque, et la retrouve lorsqu’elle existe.
- API créer une session `EXTRA` : réservée à `GESTIONNAIRE`, `ADMIN`, `SUPER_ADMIN`. Refus pour les autres profils. Refus d’une seconde annuelle la même année.
- Les lectures actuelles par année continuent de résoudre l’annuelle `ANNUELLE-{year}` tant que les lots 2 et 3 ne sont pas livrés, pour ne pas casser le mobile déjà en magasin.
- Tests : l’annuelle manquante est créée au premier appel ; un second appel ne duplique pas ; Pâques peut exister sans empêcher la création de l’annuelle ; un commercial reçoit 403 sur la création ; fin ≤ début et code déjà pris sont refusés ; la session historique reste lisible et marquée `ANNUAL`.

### Lot 2 — Adhésion et écritures

- Inscription avec `sessionId`. Doublon = même client dans la même session.
- Cotisation, rattrapage, contrôle de carnet, commande, livraison : garde sur la session du membre et sur l’intervalle de dates.
- Statut tontine du client recalculé.
- Mois de carnet dérivés des dates de la session.
- Tests déjà présents sur `getActiveSession` / `findByYear` réécrits vers la session cible. Cas ajoutés : client dans deux sessions ; cotisation refusée hors dates ; livraison de Pâques autorisée alors que l’annuelle est `ACTIVE` ; livraison de l’annuelle refusée tant qu’elle est `ACTIVE`.

### Lot 3 — Écrans

- Web : bouton Nouvelle session limité à `GESTIONNAIRE`, `ADMIN` et `SUPER_ADMIN` ; sélecteur nom + dates + statut, ouvert sur l’annuelle ; listes et stats filtrées par id ; comparaison par sessions (l’API `compare` prend des ids ; l’année reste un filtre d’affichage).
- Mobile : plusieurs sessions locales, sélecteur, synchro des sessions ouvertes et en livraison. `getTontineSession()` ne renvoie plus « la dernière année ».
- Espace Client : liste des sessions rejoignables et détail par adhésion.
- Guide utilisateur (gestionnaire, commercial, client), index RAG, HTML du guide, changelog des composants touchés.

### Lot 4 — Stock, clôture, archives

- Unicité du stock par session, rattachement des lignes existantes.
- Retrait du job du 31 décembre. `ENDED` quand les livraisons sont terminées ou sur action.
- Archives et réinitialisation : session obligatoire dans l’écran.
- Rapports et textes IA qui disent « la session de l’année » alignés sur le nom de session.

## Risques

- **`getActiveSession()` est appelé partout** (inscription, cotisation, carnet, export, reset, portail, migration d’allocation). Il reste l’assureur de l’annuelle et continue de la créer si elle manque. Un oubli enverrait une cotisation Pâques sur l’annuelle. Le lot 2 liste chaque appelant : avec un membre ou un `sessionId`, c’est cette session ; sans cible, c’est l’annuelle.
- **Mobile hors ligne.** Un APK ancien ne connaît qu’une session. Le repli `ANNUELLE-{year}` du lot 1 évite de perdre la campagne annuelle. Les sessions supplémentaires n’apparaissent qu’avec l’application du lot 3. Le documenter dans le changelog mobile.
- **Caisse.** Deux cotisations le même jour pour le même client sont deux encaissements. L’écran doit nommer la session sur la ligne, sinon le commercial croit à un doublon.
- **Réinitialisation.** Lancée sur la mauvaise session, elle efface les cotisations. L’écran demande le nom de la session et une confirmation.
- **Stock partagé aujourd’hui.** Basculer l’unicité sans rattacher `tontineSessionId` casserait les livraisons en cours. La migration rattache d’abord, puis change la contrainte.
- **Contrôle carnet décembre / janvier.** Tant que le lot 2 n’est pas livré, une session hors février–novembre ne peut pas être contrôlée. Ne pas ouvrir ce type de session en production avant ce lot.
- **Indicateurs « membres tontine ».** Aujourd’hui ce sont des clients. Avec plusieurs adhésions, le tableau de bord tontine compte les adhésions de la session affichée ; les indicateurs clients continuent de compter les personnes ayant au moins une adhésion ouverte.

## Vérification attendue en fin de chantier

- Au premier accès d’une année vide, la session annuelle existe, du 1er février au 30 novembre, sans saisie.
- Un commercial ne peut pas créer de session. Un gestionnaire, un admin ou un super-admin crée « Pâques » et « Vacances » la même année, chacune avec début et fin. Une seconde annuelle est refusée.
- Inscrire le même client aux trois. Trois fiches, trois mises.
- Encaisser sur Pâques sans mouvement sur l’annuelle.
- Clôturer Pâques à sa date de fin : commande bloquée, livraison possible, annuelle toujours ouverte.
- Espace Client : deux cartes, et un bouton pour rejoindre la troisième si elle est ouverte.
- Mobile : changer de session et ne voir que ses membres.
- Session historique 2024/2025 inchangée, libellée « Session annuelle », consultable en lecture seule.
