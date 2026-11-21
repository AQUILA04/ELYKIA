# Rapports d'activité, Assistant ELYKIA IA & Paramètres (Guide Gestionnaire & Analyste)

Ce guide détaille l'ensemble des modules d'analyse, d'archivage mensuel, d'interrogation par intelligence artificielle et de paramétrage des référentiels d'agence.

---

## 1. Rapport Journalier d'activité

Pour y accéder, rendez-vous dans le menu latéral et cliquez sur **Rapport Journalier**.

Le menu ouvre la **nouvelle présentation** du rapport : un cockpit qui montre en un écran ce que l'équipe doit remettre en caisse, ce qui a été versé et qui est en écart. L'**ancienne présentation**, organisée en onglets, reste disponible (voir plus bas).

### Nouvelle présentation : pilotage des commerciaux

<!-- CAPTURE À INSÉRER : Cockpit équipe avec les 4 chiffres, les points d'attention et le tableau équipe. -->

#### Visite guidée
À la première ouverture de chaque écran (cockpit, fiche commercial, versements, journal), une **visite guidée** présente les zones une par une : cliquez sur **Suivant**, **Précédent** ou **Passer** (la touche **Échap** ferme la visite, les flèches du clavier font avancer ou reculer). Elle n'est proposée qu'une fois ; le bouton **Visite guidée** en haut de l'écran la relance à tout moment.

#### Filtres
* **Période** : **Aujourd'hui**, **Semaine** (depuis lundi), **Mois**, ou **Dates** pour choisir une plage puis **Appliquer**.
* **Commercial** : laisser vide pour toute l'équipe, ou choisir un commercial.
* Les filtres suivent l'utilisateur d'un écran à l'autre (fiche, versements, journal) et restent dans l'adresse de la page : un lien copié rouvre le rapport sur la même période.

#### Cockpit équipe
1. **Les 4 chiffres à lire en premier** :
   * **Dû à la caisse** : ce que les commerciaux doivent remettre pour la période. C'est l'« A Verser » des opérations de la période **plus les rattrapages saisis** pendant la période pour des jours passés. La sous-ligne détaille **Opérations · Rattrapages** et la variation par rapport à la période précédente de même durée (**vs hier** pour Aujourd'hui).
   * **Versé au secrétariat** : total des versements portés sur la période, avec le surplus éventuel.
   * **Reste à verser** : ce qui n'est pas encore rentré. À zéro, tout l'argent dû est en caisse.
   * **Taux de versement** : part du dû déjà versée. Les **manquants antérieurs** (jours avant la période) sont rappelés dessous.
2. **Points d'attention** : les écarts, du plus gros montant au plus petit — argent non versé, rattrapages non versés, surplus à équilibrer, manquants antérieurs. Un clic ouvre la fiche du commercial, ou l'écran Versements pour un surplus.
3. **Tableau équipe** : une ligne par commercial, les commerciaux en retard en haut. Colonnes **Crédit**, **Tontine** (cotisations de la période), **Rattrapages** (cotisations de jours passés saisies pendant la période), **Dû caisse**, **Versé**, **Écart** (− manquant, + versé en trop) et **Statut** (*En retard*, *Surplus*, *À jour*, *Inactif*). Un rattrapage n'est jamais compté à la fois dans Tontine et dans Rattrapages. Un clic sur le nom ouvre la fiche.
4. **Caisse** : total encaissé de toutes les caisses, dépenses hors approvisionnement, dépenses avec approvisionnement et **solde de caisse** (même calcul que l'ancienne « Synthèse caisse »).
5. **Origine du dû** : répartition crédit, tontine, rattrapages et solde des nouveaux comptes.
6. **Portefeuille crédit de l'année** (équipe) : portefeuille confié, versé, reste chez les commerciaux, reste chez les clients, dette marchandise. Il ne dépend pas de la période et se charge quand on fait défiler jusqu'à lui.
7. Les boutons **Versements & rapprochement** et **Journal des opérations** ouvrent les deux écrans détaillés.

#### Fiche commercial
Ouverte depuis le tableau, une alerte ou le filtre Commercial. Un commercial connecté arrive directement sur sa propre fiche.
* **Rapprochement de la période** : Crédit + Tontine + Solde Nx + Rattrapages = **Dû à la caisse** ; Dû − **Versé** = **Reste**. Les manquants antérieurs sont rappelés dessous.
* **Activité** en trois blocs : **Crédit** (sortie stock, ventes, recouvrements, commandes, avances, reliquats), **Tontine** (collectes, rattrapages saisis et déjà versés, adhésions, livraisons), **Clients** (nouveaux clients, solde des nouveaux comptes, opérations).
* **7 derniers jours** : pour chaque jour, ce qui était à verser (barre claire) et ce qui a été versé (barre foncée, orange en cas de retard).
* **Bilans de l'année** crédit et tontine, avec **Reste chez les clients · détail**. Si les versements tontine dépassent les collectes, une mention **À vérifier** l'indique : l'écart vient en général de collectes faites chez des membres non enregistrés, que le contrôle carnet permet de retrouver.
* **Nouveau versement** (un seul jour affiché, montant restant dû) et **Équilibrer le surplus** sont disponibles ici. Les flèches **‹ ›** passent au commercial précédent ou suivant ; **Télécharger le PDF** reprend le rapport du commercial.

#### Versements & rapprochement
* Totaux de la période : **Total versé**, **Crédit**, **Tontine** (rattrapages compris), **Solde nouveaux comptes**, **Surplus non catégorisé**.
* Un dépôt par ligne (heure, référence, commercial, reçu par, ventilation, total). Les lignes en surplus sont surlignées et proposent **Équilibrer**. Les rattrapages répartis sur des jours passés sont détaillés sous le dépôt. Le filtre **Avec surplus** ne garde que les dépôts concernés. Le gestionnaire peut **Annuler** un versement dans les 3 jours (l'administrateur sans délai).
* **Remise secrétaire → gérant** ouvre la remise de caisse (ancien onglet « Remise »).

#### Remise au gestionnaire
Le bouton **Remise au gestionnaire**, en haut du cockpit, ouvre l'écran de remise de la nouvelle présentation : mois et dates, six indicateurs (reste à remettre, crédit, tontine, solde des nouveaux comptes, dépenses, montant net), dépenses à déduire, **Soumettre la remise** (secrétaire), **Accuser réception** ou **Initier la réception** (gestionnaire), et historique des remises. Une secrétaire sans indicateurs financiers arrive directement sur cet écran. Détail du cycle : [Finances & Remises](finance.md).

#### Journal des opérations
* Une carte par type d'opération avec son nombre et son montant ; un clic ne garde que ce type, un second clic l'enlève.
* La liste est horodatée et paginée ; **Exporter en PDF** reprend la période, le commercial et le type choisis.

#### Revenir à l'ancienne présentation
Le lien **Ancienne présentation**, en haut du cockpit et de la fiche, ouvre l'écran en onglets décrit ci-dessous, sur la même période et le même commercial. Un bandeau en haut de l'ancienne présentation permet de revenir à la nouvelle. **Recouvrement terrain** ouvre l'écran de recouvrement de la nouvelle présentation (taux du mois, montant recouvré, à remettre par commercial, détail des opérations, choix du chef de recouvrement, export PDF), sur la même période. Un chef de recouvrement sans indicateurs financiers arrive directement sur cet écran. Détail : guide [Chef de recouvrement — application web](../recovery-manager/web.md).

| Ancienne tuile | Où la trouver |
|---|---|
| A Verser (Crédit / Tontine / Solde Nx) | Colonnes Crédit, Tontine et Dû caisse du tableau ; rapprochement de la fiche |
| Versé, Reste | Colonnes Versé et Écart ; rapprochement de la fiche |
| Tontine Rattrapages | Colonne Rattrapages ; bloc Tontine de la fiche |
| Synthèse caisse | Bloc Caisse du cockpit |
| Bilan crédit / tontine | Bas de la fiche commercial ; portefeuille équipe en bas du cockpit |
| Onglets Journal, Versements, Remise | Écrans Journal et Versements |

### Ancienne présentation (onglets)

L'ancienne présentation propose 5 onglets thématiques. Elle reste accessible pendant la transition.

<!-- CAPTURE À INSÉRER : Écran du Rapport Journalier avec sélecteur de période, sélecteur de commercial, bouton Voir marges et onglets de navigation. -->

### A. Barre de filtres globale
Les filtres définis dans la barre supérieure s'appliquent automatiquement à l'ensemble des onglets du rapport :
* **Période** : Boutons rapides **« Aujourd'hui »**, **« Cette semaine »**, **« Ce mois »**, ou **« Personnalisé »** (avec calendrier interactif pour choisir une plage *Du ... Au ...*).
* **Filtre Commercial** :
  * **Pour un commercial** : Votre nom est pré-sélectionné automatiquement. Vous visualisez uniquement vos propres données d'activité (vos ventes, vos recouvrements, vos collectes).
  * **Pour un gestionnaire** : Vous pouvez laisser le champ vide pour obtenir la consolidation globale de toute l'agence, ou sélectionner un commercial dans la liste pour auditer son portefeuille spécifique. La **Synthèse caisse** de la Vue d'ensemble reste celle de toutes les caisses, même lorsqu'un commercial est choisi.
* **Bouton « Voir marges » / « Masquer marges »** : Disponible pour les profils habilités, ce bouton permet d'afficher ou de masquer les indicateurs de marge commerciale brute calculée sur les ventes.
* **Bouton « Réinitialiser »** : Remet les filtres sur la période par défaut.

---

### B. Onglet 1 : Vue d'ensemble
Cet onglet présente la synthèse globale de la performance de l'agence sur la période :

#### 1. Bilans annuels (lorsqu'un commercial est sélectionné)
Dès qu'un commercial est ciblé dans la barre de filtre, deux blocs de bilan annuel apparaissent :
* **Bilan Crédit Annuel** :
  * **Portefeuille confié** : Valorisation totale des articles confiés pour distribution au commercial au cours de l'année (stock d'ouverture au 1er janvier + dotations nettes des mouvements).
  * **Stock d'ouverture** : Valeur du stock détenu par l'agent au premier jour de l'exercice.
  * **Total Ventes** : Montant global des ventes à crédit contractualisées.
  * **Portefeuille cédé / reçu** : Montants issus des passations de dossiers entre commerciaux.
  * **Versements crédit** : Montant cumulé des remboursements déjà encaissés et remis en caisse.
  * **Reste chez le commercial** : Valeur des marchandises actuellement sous la responsabilité physique de l'agent.
  * **Reste chez le client** : Montant total restant dû par les clients du portefeuille. Un clic sur ce montant ouvre la liste nominative des clients débiteurs avec option d'export PDF.
  * **Total carnets** : somme des montants relevés sur les carnets déjà contrôlés. Le sous-texte indique le montant des écarts encore ouverts lorsque le carnet dépasse le système.
* **Bilan Tontine Annuel** :
  * Total des cotisations collectées sur l'année.
  * Montant des versements tontine remis au siège.
  * Reste des cotisations entre les mains du commercial en attente de versement.
  * **Total carnets** : même lecture que sur le bilan crédit, limitée aux lignes de tontine de l’année contrôlées pour ce commercial.

#### 2. Cartes d'indicateurs de la période
* **Ventes crédit** : Montant total vendu, nombre de contrats signés et marge brute (si activée).
* **Recouvrements crédit** : Montant total encaissé et nombre de règlements d'échéances.
* **Tontine** : Montant total des cotisations perçues et nombre de collectes réalisées.
* **Nouveaux comptes** : Montant des dépôts initiaux d'ouverture et nombre de nouveaux clients enrôlés.

#### Synthèse caisse
Sur la Vue d'ensemble, le bloc **Synthèse caisse** reprend l'ensemble des caisses pour la période choisie (**Aujourd'hui**, **Cette semaine**, **Ce mois** ou **Personnalisé**). Le choix d'un commercial ne change pas ces quatre montants.

1. **Dépenses (avec approvisionnement)** : total de toutes les dépenses de la période, approvisionnements compris.
2. **Dépenses (sans approvisionnement)** : total des dépenses de la période, hors approvisionnements.
3. **Total versé (période)** : argent remis en caisse pendant la période, pour l'ensemble des commerciaux. Les rattrapages de jours précédents remis pendant cette période sont inclus. Un rattrapage remis un autre jour n'entre pas dans ce total. Sous le montant, la ligne **Opérations : … · Rattrapages : …** détaille ce qui appartient aux opérations de la période et ce qui a été remis pour des jours précédents. Si des cotisations de la période ont été remises à une autre date, la mention **Versé après la période** indique leur montant. Lorsqu'un commercial est choisi dans le filtre, une ligne **dont COM005 : …** (avec son nom) précise la part de ce commercial dans ce total, avec ses opérations et ses rattrapages.
4. **Solde de caisse** : total versé moins les dépenses sans approvisionnement. C'est l'argent resté en caisse à la fin de la journée, ou de la période sélectionnée.

<!-- CAPTURE À INSÉRER : Bloc Synthèse caisse de la Vue d'ensemble avec les quatre montants. -->

#### 3. Fiche d’un commercial : à verser, versé et reste
Sur la fiche d’un commercial (après sélection dans le filtre) :
* **A Verser (Crédit / Tontine / Solde Nx)** : ce qui doit être remis en caisse pour chaque catégorie, avec le déjà versé et le reste.
* **Versé** : total des versements de la période. S’il reste un surplus non affecté à une catégorie, la mention **dont surplus non catégorisé** s’affiche sous le montant.
* **Reste** : ce qui manque encore en crédit, tontine ou solde. Un montant déjà couvert par un surplus porte la mention **dont couvert par surplus** : il diminue le reste, sans changer le montant versé de ce jour.
* **Dû à la caisse** : l'« A Verser » de la période plus les **rattrapages saisis** pendant la période pour des jours passés. La ligne **Dû de la période : … · Rattrapages saisis : …** détaille les deux parts. Une cotisation de la période saisie plus tard est déjà dans « A Verser » : elle n'est pas comptée deux fois.
* **Total encaissé** : argent réellement remis par le commercial pendant la période. La ligne **Opérations : … · Rattrapages : …** sépare la part des opérations de la période de la part remise pour des jours précédents. Exemple : si le commercial remet 200 000, dont 150 000 pour les opérations d’aujourd’hui et 50 000 pour des journées passées, la carte affiche 200 000 avec **Opérations : 150 000 · Rattrapages : 50 000**. Les cartes **A Verser**, **Versé** et **Reste** restent celles des opérations de la période.

#### Versement du jour

Lorsque la période affichée est un seul jour et qu’il reste un montant à remettre :

1. Cliquez sur **Faire un versement**.
2. Comptez les espèces dans le billetage.
3. Si des cotisations tontine de jours précédents ont été saisies ce jour-là, la fenêtre affiche le KPI **Reste rattrapages** et un champ **Rattrapage**, séparé de la **Tontine du jour**. Le **Reste à verser** ajoute ces rattrapages au crédit, à la tontine et au solde des nouveaux comptes du jour. Chaque date reçoit au plus le montant saisi ce jour pour elle ; un montant plus ancien encore dû sur cette date reste à remettre sur sa propre date.
4. Le champ **Rattrapage** est rempli automatiquement : le billetage sert d'abord le crédit, la tontine du jour et le solde des nouveaux comptes, puis les rattrapages, des dates les plus anciennes aux plus récentes. Vous pouvez le corriger à la main : le rattrapage saisi est alors réservé en premier et le reste du billetage est réparti sur les autres catégories. Une valeur saisie à la main est conservée si le billetage change. Un rattrapage supérieur au **Reste rattrapages** est signalé et refusé.
5. La liste **Rattrapages du jour** montre la part de chaque date.
6. Cliquez sur **Valider le versement**. Ce qui dépasse les montants dus reste un surplus du jour d’encaissement.

<!-- CAPTURE À INSÉRER : Fenêtre Nouveau versement avec le bloc Rattrapages du jour. -->

#### 4. Équilibrer le surplus
Le bouton **Équilibrer le surplus** est proposé lorsqu’un commercial a un **surplus non catégorisé** et un manque en crédit, tontine ou solde. Ce manque peut être sur la période affichée ou sur un jour plus ancien.

1. Cliquez sur **Équilibrer le surplus**.
2. La fenêtre indique le surplus de toute la période affichée, avec le montant de chaque jour.
3. Le tableau liste chaque jour en manque : crédit, tontine, solde, et le montant qui sera affecté. Un jour antérieur à la période porte la mention **Avant la période**.
4. La case **Utiliser le surplus pour les soldes des nouveaux comptes** est décochée. Le surplus sert alors le crédit, puis la tontine. Ce qui reste passe au crédit et à la tontine des jours suivants. Cochez la case pour que le solde d’un jour soit couvert après le crédit et la tontine de ce jour.
5. Cochez **Prioritaire** sur les jours à servir en premier. Ces jours sont traités du plus ancien au plus récent. Le surplus qui reste va ensuite aux autres jours, du plus ancien au plus récent. Sans case prioritaire, les jours les plus anciens sont servis en premier.
6. Le total qui sera affecté, le surplus restant et le reste après se mettent à jour quand vous changez une case.
7. Cliquez sur **Équilibrer**. Le total versé ne change pas.
8. Après validation, le surplus diminue et le reste du jour couvert diminue d’autant. Si l’argent a été encaissé un autre jour, ce jour affiche **dont couvert par surplus** et son montant versé reste celui qui a été encaissé.
9. Une mention reste visible sur la fiche : date, heure, auteur, montants et jours couverts.
10. La même opération apparaît dans le **Journal des opérations** avec le type **Équilibrage surplus** (filtrable).

Un jour déjà transformé en écart de caisse n’est pas repris par cet équilibrage.

<!-- CAPTURE À INSÉRER : Fiche commercial avec « dont surplus non catégorisé », bouton Équilibrer le surplus et mention d’équilibrage. -->

#### 5. Tableau de performance par commercial (vue agence)
Lorsque aucun agent n'est filtré, un tableau comparatif classe les commerciaux de l'agence selon leurs réalisations de la période (ventes, recouvrements, tontine, nouveaux comptes et total produit).

---

### C. Onglet 2 : Journal des opérations
Le **Journal** est le registre chronologique et exhaustif de toutes les transactions financières enregistrées sur la période :
* Chaque ligne précise la date et l'heure exacte, le type d'opération (Vente, Recouvrement, Cotisation tontine, Dépôt compte, **Équilibrage surplus**), le client ou le sujet, le commercial concerné et le montant en Francs CFA.
* **Filtres par nature** : Isolez en un clic les seuls recouvrements, les ventes, les cotisations ou les équilibrages de surplus.
* **Export PDF** : Le bouton de téléchargement génère une version imprimable officielle du journal des opérations, idéale pour les arrêtés comptables de fin de journée.

---

### D. Onglet 3 : Recouvrement terrain
Réservé aux chefs de recouvrement et aux gestionnaires d'agence :
* **Activité terrain** : Contrôles carnet crédit et contrôles carnet tontine faits sur la période, chacun rapporté au total des dossiers encore en cours. Le détail indique les contrôles conformes et les écarts. Les clôtures crédit (totales et partielles) et les carnets vérifiés sur la période sont affichés à côté. Le filtre Commercial réduit ces totaux au portefeuille de l’agent choisi.
* **Taux du mois** : Pourcentage d'efficacité de recouvrement sur le mois courant (montant encaissé sur le terrain rapporté au montant total exigible de tous les retards de délai de l'agence).
* **Indicateurs clés** : Total collecté, nombre d'interventions terrain et nombre de commerciaux audités.
* **Tableau « À remettre par commercial »** : Décompte précis des sommes perçues sur le terrain par dossier commercial.
* **Détail des opérations** : Date, référence crédit, nom du client, commercial titulaire, montant et nature du règlement (**Partiel** ou **Total**).
* **Export PDF** : Édition immédiate du bordereau de recouvrement terrain.

---

### E. Onglet 4 : Versements de caisse
Cet onglet audite tous les versements de caisse enregistrés au guichet :
* Décomposition par source financière : Crédit, Tontine, Dépôts initiaux des nouveaux comptes, Surplus éventuels, et Total versé.
* Permet de rapprocher les montants déclarés par les agents avec les liquidités réelles reçues en caisse.
* Un versement qui couvre des rattrapages tontine s’affiche sur le jour d’encaissement avec le total compté et le détail de chaque date. Sur la date de cotisation, la ligne ne reprend que la part tontine de ce jour, avec la mention du jour où l’argent a été reçu.
* Le bouton d’annulation reste disponible pendant 3 jours à compter du jour d’encaissement, tant que le versement n’a pas été inclus dans une remise. Annuler un versement qui couvre des rattrapages retire la part de chaque date en une seule fois.

---

### F. Onglet 5 : Remise au gestionnaire
Cet onglet permet de réaliser le versement des fonds collectés de la période au gestionnaire en déduisant les dépenses justificatives. Pour le détail complet du cycle de remise, consultez le guide [Finances & Remises](finance.md).

---

## 2. Rapports Mensuels consolidés

Pour accéder aux archives mensuelles, ouvrez le menu latéral et cliquez sur **Rapports Mensuels**.

Ce module gère la conservation et le téléchargement des archives comptables officielles d'ELYKIA.

<!-- CAPTURE À INSÉRER : Arborescence des rapports mensuels avec dossiers Années, sous-dossiers Mois et liste des fichiers PDF téléchargeables. -->

### A. Indicateurs d'archivage
* **Années archivées** : Nombre d'exercices annuels couverts dans la base de données.
* **Mois disponibles** : Nombre total de dossiers mensuels d'ores et déjà clôturés et compilés.
* **Fichiers PDF** : Volume total de documents archivés (rapports généraux + rapports individuels par commercial).
* **Dernier rapport** : Indication du mois le plus récent disponible dans les archives.

### B. Arborescence chronologique des archives
L'écran présente une vue hiérarchique dépliable :
1. **Niveau Année** : Cliquez sur le bandeau d'une année pour dévoiler les mois archivés.
2. **Niveau Mois** : Cliquez sur un mois (de Janvier à Décembre) pour accéder aux documents générés.
3. **Fichiers PDF téléchargeables en 1 clic** :
   * **Rapport Général de l'Agence** : Synthèse institutionnelle consolidée des ventes, des recouvrements, de la tontine, des stocks et de la rentabilité.
   * **Rapports Individuels par Commercial** : Un fichier PDF spécifique pour chaque agent retraçant l'intégralité de son activité mensuelle (ventes, encaissements, état de son stock personnel et portefeuille restant).

### C. Génération à la demande
À la fin de chaque mois civil, le système compile automatiquement les documents. Pour anticiper ou régulariser une archive, le bouton **« Générer mois précédent »** permet de déclencher manuellement la création immédiate des fichiers PDF.

---

## 3. Assistant Décisionnel ELYKIA IA

L'application intègre un assistant d'intelligence artificielle conversationnelle permettant d'interroger instantanément l'ensemble des données d'exploitation en langage naturel.

<!-- CAPTURE À INSÉRER : Interface de discussion Elykia IA avec panneau latéral des sessions, suggestions par domaine et réponse enrichie avec tableau de données. -->

### A. Accès et présentation
* **Accès au module** : Menu latéral **Elykia IA** (icône intelligence artificielle). Si vous ne voyez pas ce menu, vous ne disposez pas des habilitations requises pour votre profil.
* **Bandeau de statut** : Affiche en bas de page l'état de fonctionnement du moteur IA.

### B. Organisation des discussions
* **Volet latéral des sessions** : Retrouvez l'historique complet de vos conversations antérieures, automatiquement renommées en fonction du sujet abordé.
* **Bouton « Nouvelle discussion »** : Ouvre un fil de dialogue vierge.
* **Suppression de session** : Permet de purger les discussions devenues obsolètes via l'icône corbeille.

### C. Interroger l'IA en langage naturel
Vous pouvez poser vos questions courantes en français tel que vous le feriez avec un analyste d'exploitation :
* *« Quel est le montant total des impayés de plus de 15 jours sur l'agence ? »*
* *« Donne-moi le top 5 des articles les plus vendus le mois dernier. »*
* *« Quel commercial a réalisé le plus fort taux de recouvrement cette semaine ? »*
* *« Combien de membres sont inscrits à la session de tontine active ? »*
* *« Quels sont les articles dont le stock en magasin est sous le seuil d'alerte ? »*

### D. Réponses structurées et transparence
* **Tableaux de données clairs** : Les résultats chiffrés sont restitués sous forme de tableaux lisibles et directement exploitables.
* **Transparence pour audit** : Pour les utilisateurs habilités, un bouton permet d'afficher la formule de calcul ou la requête d'interrogation générée en arrière-plan, garantissant l'exactitude des chiffres avancés.
* **Onglet Statistiques** : Permet de consulter les métriques d'utilisation de l'assistant (nombre de questions posées, temps de réponse, thématiques les plus sollicitées).

### E. Assistant momentanément indisponible
Si l'assistant répond qu'un **problème de facturation** l'empêche de répondre :
1. Votre question reste affichée et enregistrée dans la discussion.
2. Copiez-la depuis la discussion.
3. Lorsque le service est rétabli, collez-la de nouveau dans la zone de saisie et envoyez-la.

---

## 4. Référentiels et Configuration de l'agence

Pour les profils administrateurs ou gestionnaires autorisés, le menu latéral **Configuration** regroupe les paramètres fondamentaux qui régissent les calculs et les nomenclatures de l'application :

| Rubrique du menu | Rôle fonctionnel |
|---|---|
| **Localités** | Gestion du répertoire des zones, communes et quartiers. Permet d'harmoniser les adresses des clients et d'organiser les tournées de recouvrement. |
| **Types d'Articles** | Définition des catégories du catalogue de marchandises (Électroménager, Multimédia, Mobilier, etc.). Chaque type peut avoir une photo : **Choisir une photo** (5 Mo maximum), aperçu, puis enregistrement. La photo est réduite automatiquement. |
| **Types de Dépense** | Référentiel des motifs de décaissement d'exploitation (Carburant, Loyer, Maintenance, etc.). |
| **Mobile Money** | Configuration des numéros de transfert d'argent (Mixx by YAS et Moov Money) attribués à chaque commercial pour les règlements clients à distance. |
| **Frais de retrait** | Grilles de frais de retrait Mixx by Yas et Flooz, utilisées lorsque le client paie depuis l’Espace Client. |
| **Paramètres généraux** | Réglage des clés système fondamentales, notamment le mode de calcul de la part société de la tontine et la valorisation du stock magasin. |

### Activer la valorisation du stock magasin par lots

1. Ouvrez **Configuration** → **Paramètres généraux**.
2. Repérez le paramètre de valorisation du stock magasin (`ENABLED_FIFO_STOCK_VALUATION`).
3. Passez sa valeur à **true**, puis enregistrez.

À l'enregistrement, le stock déjà en magasin est repris sur un premier lot pour chaque article concerné. Si des lots existent déjà et couvrent moins que la quantité en magasin, la différence est ajoutée au prix d'achat. Si les lots couvrent plus que la quantité en magasin, l'excédent est soldé pour que les deux quantités coïncident, y compris lorsqu'un article est à zéro. Les quantités affichées ne changent pas. Les prochaines entrées de stock s'ajoutent ensuite derrière ces lots.

La livraison d'une demande de sortie suit la quantité en magasin. Si cette quantité est plus élevée que ce qui a été repris à l'activation, la différence est valorisée au prix d'achat de l'article et sert après le stock déjà repris. La livraison aboutit dès que le magasin couvre la demande.

Si un article en stock n'a pas de prix d'achat renseigné, l'activation est refusée et le paramètre reste désactivé. Complétez le prix d'achat de l'article (ou validez une réception avec prix), puis réessayez.

### Mode de paiement de l’Espace Client

1. Ouvrez **Configuration** → **Paramètres généraux**.
2. Repérez **CUSTOMER_PAYMENT_COLLECTION_MODE**.
3. Cliquez sur **Modifier**.
4. Choisissez **Déclaration manuelle**, **Paiement depuis l’application** ou **Les deux**, puis enregistrez.

### Vérification automatique après un contrôle de carnet tontine

1. Ouvrez **Configuration** → **Paramètres généraux**.
2. Repérez **TONTINE_AUTO_VERIFY_ON_FIELD_CONTROL**.
3. Cliquez sur **Modifier**.
4. Choisissez **OUI** pour que chaque contrôle de carnet terrain marque le membre tontine comme vérifié, y compris hors connexion après actualisation du pack terrain.
5. Laissez **NON** pour n’enregistrer que le contrôle. Le badge **Déjà contrôlé** s’affiche quand même, et le carnet reste à vérifier jusqu’à une action **Vérifier**.

### Validation automatique des commandes tontine

Le paramètre **TONTINE_ORDER_AUTO_VALIDATION** règle le statut d'une commande tontine au moment où elle est enregistrée, depuis le web ou depuis l'application mobile.

1. Ouvrez **Configuration** → **Paramètres généraux**.
2. Repérez **TONTINE_ORDER_AUTO_VALIDATION**.
3. Cliquez sur **Modifier**.
4. Passez la valeur à **true**, puis enregistrez : chaque commande créée passe directement au statut **Validée**. Il n'y a plus d'étape **Valider la Livraison**, ni de **Tout valider** sur la page des livraisons pour ces commandes. Une commande complétée depuis un autre téléphone reste aussi **Validée**.
5. Laissez **false** (valeur de départ) pour garder la validation par le gestionnaire : une commande saisie par un commercial reste **En attente**. Une commande que vous saisissez vous-même est toujours validée directement.

Une commande enregistrée hors ligne prend son statut au moment de la synchronisation du téléphone.

### Prix unitaires sur les documents

Trois paramètres règlent l’affichage du prix unitaire et du montant de chaque ligne. Le montant total du document reste toujours affiché, y compris sur les PDF.

| Paramètre | Ce qu’il couvre |
|-----------|-----------------|
| **RESTRICT_CASH_SALE_UNIT_PRICE_VISIBILITY** | Les ventes comptant (saisie, reçu, fiche de la vente, achats d’un client, PDF d’annulation) ainsi que les commandes et livraisons tontine (choix des articles, fiche du membre, reçu de commande) et les PDF du stock tontine (fiches de demandes de sortie, fiches de retours, rapport des sorties). |
| **RESTRICT_CUSTOMER_SPACE_UNIT_PRICE_VISIBILITY** | L’Espace Client : catalogue, panier, détail d’un achat. |
| **RESTRICT_UNIT_PRICE_VISIBILITY** | Tout le reste : ventes à crédit, commandes clients, sorties et retours du stock commercial, dettes, rapports et autres PDF. |

1. Ouvrez **Configuration** → **Paramètres généraux**.
2. Repérez le paramètre voulu.
3. Cliquez sur **Modifier**.
4. Laissez **true** pour masquer le prix unitaire et le montant de ligne. Sur les écrans de gestion, le gestionnaire et les administrateurs les voient toujours. Dans l’Espace Client, aucun client ne les voit.
5. Passez la valeur à **false**, puis enregistrez, pour que tout le monde les voie dans le périmètre de ce paramètre.

Les écrans relisent ces réglages à l’accueil, dans **Paramètres**, et au plus toutes les 6 heures.

### Grilles de frais de retrait

1. Ouvrez **Configuration** → **Frais de retrait**.
2. Choisissez **Mixx by Yas** ou **Flooz**.
3. Saisissez **De**, **À** et **Frais**, puis appuyez sur **Ajouter**.
4. Les tranches d’un même réseau ne doivent pas se chevaucher.
5. **Modifier** recharge la tranche dans le formulaire. Ajustez les montants, puis appuyez sur **Enregistrer**.
6. **Retirer** enlève une tranche.

Pour une mise comprise dans une tranche, ces frais sont ajoutés avant les frais du paiement en ligne.

> **Prudence d'administration.** La modification d'un paramètre général est une opération sensible qui engage la cohérence des écritures passées et futures. Une fois la valorisation par lots activée, ne la désactivez pas. Toute modification doit respecter les consignes strictes de la direction. Si vous n'avez pas accès à ces écrans, vous ne disposez pas des habilitations nécessaires.

---

## 5. Profil utilisateur & Sécurité de session

Dans le coin supérieur droit de l'écran, le menu utilisateur assure la sécurisation de votre poste de travail :
* **Informations de profil** : Affiche votre nom, prénom, profil opérationnel et l'agence à laquelle vous êtes rattaché.
* **Changer de mot de passe** : Permet de renouveler régulièrement votre code d'accès confidentiel.
* **Déconnexion** : En fin de poste ou avant de quitter votre bureau, cliquez impérativement sur **« Déconnexion »** pour fermer votre session et empêcher tout accès non autorisé à vos données.
* **Session expirée** : Si la session n'est plus reconnue pendant le travail, l'application revient d'elle-même à l'écran de connexion et affiche **Session expirée**. Saisissez à nouveau votre identifiant et votre mot de passe.
* **Ruban d’environnement** : sur un environnement de test, un ruban rouge oblique en haut à gauche affiche **TEST** (ou le nom de l’environnement). Vérifiez toujours ce ruban avant de saisir ou de valider une opération.

---

## 6. Archives des collectes tontine

Ces archives servent à rapprocher une annulation de collectes avec l'argent déjà remis.

1. Dans le menu latéral, cliquez sur **Tontines**, puis sur **Archives collectes**.
2. Ouvrez l'année, puis l'opération marquée **Annulation** suivie du nom du commercial.
3. Trois volets sont disponibles :
   - **Lignes** : chaque collecte retirée, avec le client, la date, la référence et le montant. **Exporter CSV** reprend la même liste.
   - **Membres** : pour chaque client concerné, le montant **Retiré**, le montant **Conservé** (collectes des autres commerciaux) et les totaux avant et après.
   - **Jours à rapprocher** : pour chaque jour, la tontine et le montant **À verser** avant et après, plus le montant **Déjà versé**.
4. **Télécharger** ouvre le PDF du quartier correspondant.

Pour le rapprochement, comparez **Déjà versé** et **À verser après** sur le jour concerné. Le montant déjà remis en caisse ne change pas. L'écart entre les deux est le montant à expliquer avec la caisse. Le rapport journalier du commercial, sur la même date, affiche les montants après annulation.

<!-- CAPTURE À INSÉRER : détail d'une annulation avec les volets Lignes, Membres et Jours à rapprocher -->
