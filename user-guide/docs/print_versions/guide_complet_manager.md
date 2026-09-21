# Guide Utilisateur - Profil Manager

_Ce document est une compilation de la documentation pour impression._

\newpage

# Guide Gestionnaire

Ce guide accompagne les gestionnaires, secrétaires et administrateurs dans les tâches de pilotage. Les responsabilités exactes restent déterminées par les permissions attribuées au compte : la présence d’un menu ou d’un bouton confirme qu’il est autorisé pour votre session.

<!-- CAPTURE À INSÉRER : Accueil web d’un gestionnaire avec le menu développé et les indicateurs du tableau de bord. -->

## Votre espace de pilotage

Le menu peut notamment donner accès au **Dashboard**, aux **Clients**, aux **Articles**, aux modules **Stock Commercial** et **Stock Tontine**, aux **Ventes**, aux **Tontines**, aux **Dépenses**, à la **Configuration**, au **Rapport Journalier**, aux **Inventaires**, aux **Utilisateurs** et à la **Sécurité**. Certains éléments, comme les rapports mensuels, le recrutement ou ELYKIA IA, ne s’affichent que si la permission et le paramétrage nécessaires sont actifs.

| Priorité | Où intervenir | Finalité |
|---|---|---|
| Démarrer et contrôler l’activité | Caisse, Clients, Ventes | Sécuriser les opérations du jour et les portefeuilles. |
| Garantir la disponibilité des articles | Articles, Inventaires, Stock Commercial | Suivre les réceptions, sorties, retours et écarts. |
| Contrôler l’argent et la performance | Rapport Journalier, Dépenses | Lire les indicateurs, les versements et les remises. |
| Gouverner l’application | Configuration, Utilisateurs, Sécurité | Maintenir les référentiels, paramètres et habilitations. |

## Règles de travail

La gestion d’une opération doit toujours suivre son statut. Une demande de sortie créée n’est pas encore livrable ; une réception de stock en attente n’a pas encore augmenté le stock ; une vente validée n’est pas encore démarrée. Les boutons disponibles sur une ligne correspondent à l’étape atteinte et à vos droits.

Consultez les pages suivantes selon la tâche à accomplir :

- [Tableaux de bord](dashboard.md) pour lire les KPI sans confondre les périodes.
- [Opérations quotidiennes](operations.md) pour les caisses, clients, comptes et versements.
- [Stocks, ventes et commandes](stock_sales.md) pour les flux de marchandises et de crédits.
- [Finances et tontines](finance.md) pour les dépenses, remises et contrôles tontine.
- [Rapports et configuration](reporting_config.md) pour l’analyse et les référentiels.


\newpage



---

# Tableaux de bord et Pilotage (Dashboard V2 & BI)

Le module **Tableaux de bord** constitue le centre de contrôle opérationnel et stratégique d'ELYKIA. Il offre aux gestionnaires, secrétaires, chefs d'agence et magasiniers une visibilité immédiate et en temps réel sur la santé financière, le recouvrement des créances, la mobilisation de l'épargne tontine, l'activité commerciale et la gestion des stocks.

L'application web propose deux niveaux de pilotage complémentaires :
1. **Le Tableau de bord opérationnel V2 (`/home`)** : Suivi au mois le mois des flux d'exploitation, des crédits en cours, des cotisations tontine, des alertes de rupture et des transactions récentes.
2. **Le Dashboard décisionnel BI (`/bi`)** : Plateforme de Business Intelligence offrant une analyse multi-périodique des tendances de vente, de la rentabilité commerciale, de la solvabilité du portefeuille et de la rotation des stocks.

---

## 1. Tableau de bord opérationnel V2 (`/home`)

Accessible dès la connexion via l'icône d'accueil de la barre latérale, le **Dashboard V2** consolide l'ensemble des données d'exploitation en temps réel.

<!-- CAPTURE À INSÉRER : Vue d'ensemble du Dashboard V2 montrant le sélecteur de mois, la grille des 5 KPIs, les graphiques d'évolution et les alertes stock. -->

### A. Bandeau de contrôle temporel et actualisation
En tête de page, la barre de navigation et le bandeau de pilotage affichent :
* **Horloge temps réel** : Affichage permanent de la date et de l'heure à la seconde près (`dd/MM/yyyy - HH:mm:ss`).
* **Horodatage de synchronisation** : Indication de la dernière actualisation des données (`Actualisation : HH:mm:ss`).
* **Sélecteur de mois civil** : Un contrôle interactif muni d'un calendrier annuel (`startView="year"`) permettant de sélectionner n'importe quel mois de l'exercice en cours ou passé. Dès la sélection, l'ensemble des indicateurs, graphiques et listes se recalculent instantanément sur le mois cible.
* **Bouton « Actualiser »** : Permet de recharger immédiatement l'ensemble des métriques sans recharger la page entière du navigateur.

---

### B. Les 5 Cartes KPIs Financières et Opérationnelles
La grille supérieure regroupe 5 indicateurs clés synthétiques. Ces indicateurs financiers sont soumis à l'habilitation `ROLE_KPI_FINANCIER_DASHBOARD`.

| Indicateur | Visuel / Couleur | Métrique Principale | Sous-titre & Détails | Particularité selon Profil |
|---|---|---|---|---|
| **Crédits en cours** | Icône `credit_card`<br>Bleu Marine (`#003366`) | **Montant total en cours** (FCFA)<br>Total des crédits au statut `INPROGRESS`. | Nombre de crédits actifs et **marge bénéficiaire brute** calculée. | La marge bénéficiaire est **automatiquement masquée** si l'utilisateur connecté est un commercial / promoteur. |
| **Recouvrement encours** | Icône `payments`<br>Cyan (`#0095c8`) | **Montant recouvré** (FCFA)<br>Cumul des encaissements enregistrés sur les crédits actifs. | **Reste à recouvrer** (FCFA)<br>Différence nette restant due par les clients. | Permet d'évaluer le taux d'avancement des remboursements du mois. |
| **Tontine** | Icône `savings`<br>Vert Émeraude (`#00a86b`) | **Total cotisé** (FCFA)<br>Montant brut des collectes tontine du mois civil. | Nombre total de **mises** enregistrées et **Part Société** calculée. | La Part Société affichée s'adapte à la version d'algorithme active (V1 ou V2). |
| **Clients** | Icône `groups`<br>Orange (`#f39c12`) | **Total clients inscrits**<br>Effectif global du fichier clients. | Nombre de clients **actifs** et nombre de clients **avec crédit en cours**. | Met en lumière le taux d'engagement du portefeuille clients. |
| **Stock** | Icône `inventory_2`<br>Violet (`#8e44ad`) | **Valorisation du stock** (FCFA)<br>Valeur totale valorisée au prix de vente crédit. | Nombre d'articles / lignes en stock et statut de disponibilité. | **Mode Magasin** (gestionnaire/magasinier : vision centrale) vs **Mode Commercial** (promoteur : vision de son stock personnel embarqué). |

---

### C. Graphiques dynamiques d'analyse d'activité

Sous les cartes KPIs, deux graphiques interactifs permettent de suivre le rythme opérationnel :

#### 1. Évolution des Ventes et Recouvrements
* **Courbes comparatives** : Affiche sur le même axe la courbe des **Ventes à crédit** (bleu marine) et la courbe des **Recouvrements / Encaissements** (bleu cyan).
* **Bascule de granularité** : Trois boutons en haut à droite du graphique permettent de changer immédiatement l'échelle temporelle d'analyse :
  * **Mois** : Découpage journalier précis sur les jours du mois sélectionné.
  * **Trimestre** : Agrégation trimestrielle (T1, T2, T3, T4) de l'exercice.
  * **Année** : Cumul annuel global.
* **Formatage intelligent** : Les montants sur l'axe vertical sont automatiquement abrégés pour une clarté optimale (ex : `500 k`, `1,2 M`).

#### 2. Statut & Disponibilité du Stock (Graphique Donut)
* Diagramme circulaire ventilé en 3 segments de couleurs normées :
  * **En stock (Vert)** : Articles disposant d'une quantité suffisante pour honorer les demandes.
  * **Stock faible (Orange)** : Articles ayant atteint ou franchi le seuil d'alerte de réapprovisionnement.
  * **Rupture de stock (Rouge)** : Articles indisponibles (quantité égale à 0).
* Au centre du diagramme, le **pourcentage de disponibilité globale** du magasin est indiqué en grand.

---

### D. Panneaux de traçabilité des transactions récentes

Deux panneaux situés sous les graphiques permettent un audit visuel direct des flux :

#### 1. Dernières Ventes (`app-recent-sales-panel`)
* Liste les 5 dernières ventes à crédit conclues dans l'application.
* Présente pour chaque ligne :
  * L'avatar et le nom complet du client avec sa référence de dossier (`#REF`).
  * Le montant total de la vente en FCFA.
  * Le badge de statut coloré : `CREATED` (Gris - en attente de validation), `VALIDATED` (Bleu - validée par la gestion), `INPROGRESS` (Vert - marchandise livrée, crédit en cours de remboursement) ou `SETTLED` (Pourpre - crédit intégralement soldé).
  * La date de démarrage de la vente.
* Un lien direct **« Voir tout »** redirige vers la liste complète des ventes (`/credit/list`).

#### 2. Activité Récente (`app-recent-activity-panel`)
* Fil chronologique des 5 dernières opérations administratives et financières (ouvertures/fermetures de caisse, versements bancaires, modifications de portefeuille).
* Affiche un message explicatif, une icône thématique et le temps écoulé en langage naturel (`il y a 10 min`, `il y a 2 h`).
* Un lien direct **« Voir tout l'historique »** redirige vers le [Rapport Journalier](reporting_config.md) (`/report/daily`).

---

### E. Section Alertes Stock Magasin (`ROLE_STOREKEEPER`)
Réservée aux magasiniers et aux gestionnaires de stock, cette section s'affiche au bas du tableau de bord pour prévenir tout arrêt de distribution :
* **Tableau Rupture de Stock (Rouge)** : Liste paginée des articles dont le stock physique est tombé à zéro (numéro d'ordre, nom de l'article, catégorie/type).
* **Tableau Rupture Imminente (Orange)** : Liste paginée des articles dont le niveau de stock est critique, avec affichage d'une pastille numérique d'alerte.
* **Lien direct** : Le bouton **« Voir le catalogue »** permet de basculer immédiatement sur la gestion des articles (`/article/list`).

---

## 2. Tableau de bord décisionnel BI (`/bi`)

Accessible via le menu **Dashboard BI** pour les profils analystes, directeurs et gestionnaires (`ROLE_REPORT`), ce module est conçu pour l'analyse stratégique approfondie et le pilotage de la performance.

<!-- CAPTURE À INSÉRER : Page Dashboard BI avec filtres Aujourd'hui/Semaine/Mois/Année/Personnalisé, cartes de rentabilité et centre d'alertes. -->

### A. Filtres de période multi-dimensionnels
Le Dashboard BI propose une barre de sélection temporelle rapide à 5 options :
1. **Aujourd'hui** : Analyse de la journée en cours.
2. **Cette semaine** : Synthèse hebdomadaire glissante.
3. **Ce mois** : Vue consolidée du mois civil.
4. **Cette année** : Bilan annuel cumulé.
5. **Personnalisé** : Déploiement de deux sélecteurs de calendrier permettant de définir une plage de dates libre (`Date début` et `Date fin`).

### B. Indicateurs stratégiques de rentabilité (`ROLE_KPI_FINANCIER_BI_DASHBOARD`)
Le bandeau BI présente 4 cartes de performance avancée :
* **Chiffre d'Affaires Ventes** : Volume total des ventes conclues sur la période et taux de variation par rapport à la période précédente.
* **Marge Brute Dégagée** : Marge commerciale nette réalisée en FCFA et pourcentage de marge sur coût d'achat.
* **Encaissements & Recouvrement** : Cumul des liquidités réellement collectées et taux de recouvrement effectif par rapport au prévisionnel.
* **Valeur Globale du Stock** : Montant immobilisé en magasin et taux de rotation des marchandises.

### C. Liens rapides d'analyse spécialisée
Trois raccourcis permettent de plonger dans les sous-modules de Business Intelligence :
* **Analyse des Ventes (`/bi/sales`)** : Analyse détaillée du chiffre d'affaires ventilé par commercial, par article et par catégorie.
* **Analyse des Recouvrements (`/bi/collections`)** : Analyse fine des créances en souffrance, pyramide des retards de paiement et distribution de solvabilité des clients.
* **Analyse du Stock (`/bi/stock`)** : Matrice de rotation des stocks, détection des articles dormants et suivi des alertes d'approvisionnement.

### D. Centre d'Alertes et Notifications BI
Le module BI analyse automatiquement les risques opérationnels et génère des cartes d'avertissement en temps réel :
* **Alerte Ruptures** : Notification rouge dès qu'un article passe en rupture avec lien vers le détail.
* **Alerte Stock Faible** : Notification jaune listant les articles sous le seuil critique.
* **Alerte Créances en Souffrance** : Avertissement rouge indiquant le montant cumulé des échéances impayées (`totalOverdue`) nécessitant une relance du chef de recouvrement.
* **Indicateur d'Efficacité de Recouvrement** : Pastille de notation automatique (Excellente, Bonne, Vigilance) selon le ratio montant collecté / montant attendu.

---

## 3. Bonnes pratiques de lecture et réflexes de gestion

1. **Toujours vérifier la période active** : Avant d'analyser un montant ou de tirer une conclusion sur le chiffre d'affaires, vérifiez systématiquement le mois sélectionné dans le sélecteur temporel.
2. **Différencier stock magasin et stock commercial** : Ne confondez pas la valorisation globale du stock magasin (articles physiques en réserve) avec le stock commercial attribué aux équipes terrain.
3. **Contrôler les créances avant d'octroyer de nouvelles ventes** : Utilisez le ratio *Recouvrement encours / Crédits en cours* pour apprécier la liquidité globale avant d'approuver de nouveaux dossiers de vente à crédit.
4. **Bouton d'actualisation** : Après la clôture d'une caisse, la réception d'un arrivage ou la validation d'une série de ventes, cliquez sur **« Actualiser »** pour rafraîchir instantanément les agrégats financiers.



\newpage



---

# Opérations quotidiennes (Journée comptable, Caisse, Billetage & Clients)

Ce guide décrit l'ensemble des procédures opérationnelles et des gestes de contrôle quotidiens : ouverture et fermeture de la journée comptable, gestion des caisses agents, décompte physique par billetage, suivi de l'opération journalière et réaffectation stratégique des portefeuilles clients.

---

## 1. Gestion de la journée comptable (`/accounting-day`)

La **Journée comptable** est le verrou d'intégrité central d'ELYKIA. Aucune opération financière (décaissement, encaissement, vente, collecte) ne peut être initiée sans qu'une journée comptable ne soit préalablement ouverte.

<!-- CAPTURE À INSÉRER : Écran de gestion de la journée comptable avec date comptable, bouton Ouvrir/Fermer et liste des caisses ouvertes. -->

### A. Cycle d'ouverture et de fermeture (`ROLE_OPEN_ACCOUNTING_DAY`)
* **Date comptable proposée** : La date affichée correspond à la date du jour système. Elle est verrouillée en lecture seule pour interdire toute antidatation artificielle.
* **Ouverture de la journée** :
  * Si la journée est fermée, le gestionnaire clique sur le bouton bleu **« Ouvrir »**.
  * Le système enregistre l'ouverture et autorise l'initialisation des caisses individuelles.
* **Fermeture de la journée** :
  * En fin de journée d'exploitation, le bouton rouge **« Fermer »** permet de clôturer la journée comptable.
  * **Contrôle préventif bloquant** : L'écran affiche en temps réel la liste des **Caisses Ouvertes** (nom du collecteur et heure d'ouverture). Toutes les caisses des agents doivent impérativement être fermées avant de pouvoir clore la journée générale.

| Statut Journée | Bouton Disponible | Condition d'Exécution | Conséquence Système |
|---|---|---|---|
| **Fermée** | **Ouvrir** | Date comptable du jour valide. | Active la possibilité d'ouvrir les caisses individuelles. |
| **Ouverte** | **Fermer** | Aucune caisse agent ne doit rester ouverte dans la table de monitoring. | Fige les écritures comptables du jour. |

---

## 2. Gestion de la caisse agent (`/open-cashDesk`)

Chaque collecteur, commercial ou caissier au siège doit disposer d'une caisse ouverte pour enregistrer ses opérations de vente et d'encaissement.

* **Accès au module** : Menu latéral **Caisse > Ouverture / Fermeture** (`ROLE_OPEN_CASH_DESK`, `ROLE_CLOSE_CASH_DESK`).
* **Fonctionnement unitaire** :
  * L'écran affiche automatiquement l'identifiant de l'agent connecté : `Ouvrir la caisse de l'utilisateur : [username]`.
  * Un clic sur **« Ouvrir Caisse »** attribue un numéro de caisse actif pour la journée en cours.
  * En fin de tournée ou de journée guichet, l'utilisateur revient sur cet écran pour cliquer sur **« Fermer Caisse »**.

---

## 3. Billetage physique des espèces (`/billetage`)

Le **Billetage** permet de réaliser le comptage contradictoire et rigoureux des espèces physiques (billets et pièces de monnaie en Francs CFA) avant tout versement ou clôture.

<!-- CAPTURE À INSÉRER : Grille de billetage avec visuels des coupures de billets et pièces, sous-totaux par ligne et total global. -->

### A. Grille de décomposition des coupures
L'interface présente deux colonnes distinctes avec les reproductions visuelles officielles des billets et pièces de la zone UMOA / BCEAO :

1. **Colonne Billets (Badge B)** :
   * `10 000 FCFA`
   * `5 000 FCFA`
   * `2 000 FCFA`
   * `1 000 FCFA`
   * `500 FCFA`
2. **Colonne Pièces (Badge P)** :
   * `500 FCFA`
   * `250 FCFA`
   * `200 FCFA`
   * `100 FCFA`
   * `50 FCFA`
   * `25 FCFA`
   * `20 FCFA`
   * `10 FCFA`
   * `5 FCFA`

### B. Saisie et calcul instantané
* L'utilisateur saisit uniquement le **nombre d'unités physiques** constatées dans le champ `qté`.
* **Sous-total par ligne** : Dès la frappe, la ligne affiche le montant monétaire calculé (ex : 15 billets de 10 000 FCFA = `150 000 F`).
* **Total Billetage en pied de page** : Un encadré met en évidence la somme totale en FCFA en temps réel.
* Cliquez sur **« Suivant »** pour valider et transmettre le bordereau de billetage aux états financiers.

> **Règle d'or.** Le billetage doit refléter exactement les espèces contenues dans la sacoche ou le tiroir-caisse. Il ne doit jamais être ajusté arbitrairement pour compenser un écart avec les montants du système.

---

## 4. Opération journalière et feuille de route (`/daily-operation`)

Accessible via **Caisse > Opération Journalière**, cette interface permet de superviser l'ensemble des crédits actifs dont les mises sont attendues sur la journée.

* **Indicateurs par ligne** :
  * Nom et prénom du client.
  * Localité / Quartier.
  * **Mise journalière** contractuelle en FCFA.
  * **Reste à payer** global sur le crédit.
* **Actions et documents** :
  * **Détails (`visibility`)** : Ouverture de la fiche complète du crédit ciblé.
  * **Bouton TFJ (`payment`)** : Accès direct à la Table Financière Journalière.
  * **Télécharger PDF (`picture_as_pdf`)** : Génération immédiate de la fiche de tournée et de contrôle journalier pour les agents de recouvrement.

---

## 5. Portefeuille Clients & Réaffectation de masse (`/client/list`)

Le module **Clients** regroupe l'annuaire centralisé des clients et prospects, enrichi de contrôles de gestion de portefeuille.

### A. Bandeau KPI du portefeuille
En haut de page, 4 cartes synthétiques donnent une photographie immédiate du portefeuille :
* **Clients enregistrés** : Nombre total de clients actifs enregistrés dans la base (hors fiches supprimées).
* **Crédit en cours** : Nombre de clients détenant actuellement au moins une vente à crédit non soldée.
* **Membres tontine** : Nombre de clients inscrits à au moins un cycle de tontine.
* **Sans crédit ni tontine** : Clients inactifs ou prospects n'ayant aucun engagement financier en cours.

### B. Outils de recherche et filtres
* **Recherche universelle** : Recherche en texte libre par nom, prénom, numéro de téléphone (8 chiffres) ou quartier/localité.
* **Filtre Commercial** : Permet d'isoler en un clic le portefeuille attribué à un commercial spécifique.
* **Export Fiche Client PDF** : Dès qu'un commercial est sélectionné, un bouton de téléchargement permet d'éditer la liste complète de ses clients au format PDF.

---

### C. Réaffectation en masse de portefeuille (`ROLE_ASSIGN_CLIENT_COLLECTOR`)

Lorsqu'un commercial quitte l'entreprise, change de zone ou qu'un rééquilibrage de tournée est nécessaire, les gestionnaires autorisés peuvent réaffecter plusieurs clients en un seul geste :

<!-- CAPTURE À INSÉRER : Fenêtre modale Changer de commercial avec sélection commercial crédit, commercial tontine et case de transfert des ventes. -->

1. **Sélection des clients** :
   * Cochez les cases individuelles devant les noms des clients souhaités, ou utilisez la case d'en-tête pour sélectionner l'ensemble des lignes de la page.
   * Le bouton d'action contextuelle **« Changer de commercial (N) »** apparaît automatiquement.
2. **Configuration dans la fenêtre modale** :
   * **Commercial crédit** : Choisissez le nouveau commercial responsable du suivi des crédits.
   * **Commercial tontine** : Choisissez le nouveau commercial chargé des collectes de tontine (peut être identique ou différent du commercial crédit).
3. **Option stratégique : Transfert automatique des ventes** :
   * La case à cocher **« Transférer automatiquement les ventes du commercial vers le nouveau commercial »** s'active dès qu'un commercial crédit est sélectionné.
   * **Effet opérationnel** : Si cette case est cochée, l'ensemble des crédits actifs (`INPROGRESS`) des clients sélectionnés sont automatiquement transférés au nouveau commercial, garantissant la continuité des tournées et la justesse des bilans de passation.
4. **Validation** : Cliquez sur **« Valider »** pour appliquer les réaffectations. L'historique des changements de commercial est intégralement archivé pour audit.

---

### D. Autorisation de Crédit Business (Gestion du double crédit)
Sur chaque ligne client, le gestionnaire habilité dispose d'un bouton d'approbation dédié :
* **Badge vert « B »** : Indique que le client est habilité à contracter un **crédit business/professionnel** en plus de son crédit personnel usuel.
* **Action « Autoriser / Retirer crédit business »** : Permet au gestionnaire d'octroyer ou de révoquer ce privilège après examen de la solvabilité du client.



\newpage



---

# Stocks, ventes et commandes

Les marchandises suivent un circuit tracé : référentiel article, entrée de stock, demande de sortie, validation, livraison, retour éventuel, puis vente ou livraison tontine. Chaque étape comporte un statut ; ne passez pas directement à l’étape suivante.

## Catalogue et inventaire

Le menu **Articles** donne accès au catalogue. La fiche article regroupe les informations commerciales et l’historique de ses mouvements. Utilisez l’inventaire pour consulter les quantités, créer un inventaire physique, saisir les quantités constatées, réconcilier les écarts puis clôturer l’opération lorsque les contrôles sont terminés.

<!-- CAPTURE À INSÉRER : Page Inventaires — panneau Actions inventaire avec Créer, Saisir quantités physiques, Réconcilier et Clôturer. -->

## Entrées de stock : validation obligatoire

Depuis **Inventaires > Entrées stock**, sélectionnez les articles et les quantités reçues, puis validez l’entrée. L’application crée une réception en attente ; elle ne doit pas être présentée comme du stock immédiatement disponible.

Le menu **Historique Entrée** permet de rechercher une réception par référence, date ou statut. Le gestionnaire habilité y trouve les actions **Valider** et **Refuser** ; le créateur ou le gestionnaire peut, selon le statut, **Abandonner** une réception en attente, et l’annulation d’une réception validée est réservée aux droits appropriés.

| Statut de réception | Sens opérationnel |
|---|---|
| En attente | Saisie créée, à contrôler avant impact sur le stock. |
| Validée | Réception acceptée ; son impact est pris en compte. |
| Refusée ou abandonnée | Réception non retenue, sans disponibilité à utiliser. |
| Annulée | Réception validée annulée selon les droits et contrôles disponibles. |

## Stock commercial et ventes

Une demande de sortie suit le circuit **Créée → Validée → Livrée**. Depuis **Stock Commercial > Demandes Sortie**, les commerciaux ou gestionnaires habilités créent une demande en sélectionnant le commercial et les articles. Le gestionnaire valide une demande créée ; le magasinier livre une demande validée. Les listes proposent les filtres de période et commercial ainsi que des exports PDF par période, demande ou sélection.

Après livraison, la vente apparaît dans **Ventes > Liste**. Pour une vente à crédit, le responsable valide l’enregistrement puis le magasinier démarre la vente validée. Seules les ventes `INPROGRESS` sont candidates à l’encaissement régulier. Consultez [le parcours commercial](../commercial/sales_orders.md) pour le détail du crédit, des retards et des recouvrements.

## Stock tontine et commandes

Le stock tontine suit le même principe de demande, validation, livraison et retour, mais il est affecté aux livraisons de fin d’année. Ne confondez pas une demande de stock tontine avec la préparation de livraison sur la fiche du membre : la première alimente le stock concerné, la seconde choisit les articles destinés au membre.

Le menu **Commandes** est disponible selon les rôles. Utilisez les statuts et les détails de la commande pour traiter le dossier dans l’ordre prévu par l’interface ; n’enregistrez pas de vente ou de livraison avant que le statut n’y autorise l’action.


\newpage



---

# Finances et tontines

Ce guide couvre les dépenses, les versements et le contrôle de la tontine depuis le point de vue de gestion. Les montants présentés par l’application restent soumis aux permissions KPI financières de la page.

## Dépenses

Le menu **Dépenses** permet de créer, filtrer et consulter les dépenses par mois et type. Une dépense comporte un type, un montant, une date, une référence éventuelle et une description. Lorsqu’elle est indiquée comme **Comptabilisée**, les actions de modification et de suppression sont bloquées : elle est liée à une remise déjà reçue.

<!-- CAPTURE À INSÉRER : Liste des dépenses avec filtres Mois et Type, et badge Comptabilisée sur une ligne verrouillée. -->

## Remise au gestionnaire

La **Remise** est accessible depuis le Rapport Journalier aux profils autorisés. Elle travaille à l’intérieur d’un mois et peut être limitée par une plage **Du / Au**. Cette plage permet de remettre uniquement les versements non encore remis dans l’intervalle choisi.

| Étape | Secrétaire | Gestionnaire |
|---|---|---|
| Préparer | Choisit le mois et, si nécessaire, la plage de dates. Sélectionne les dépenses à déduire. | Peut initier une réception directe lorsque l’action est disponible. |
| Soumettre | Soumet la remise lorsque le montant net est valide. | Consulte la remise en attente. |
| Contrôler | Consulte l’historique. | Peut retirer des dépenses tant que la remise est en attente, puis **Accuser réception**. |
| Archiver | Consulte les lignes de versements incluses. | Après réception, dépenses et montant net sont figés. |

Le bandeau KPI distingue le total à remettre, crédit, tontine, solde des nouveaux comptes, dépenses et **montant net**. Les dépenses de type **Approvisionnement** ne sont pas proposées à la déduction. Si les dépenses dépassent le montant versé, l’action est bloquée jusqu’à correction.

## Pilotage tontine

Le Rapport Journalier affiche, pour le commercial sélectionné et si les KPI sont autorisés, un bilan annuel tontine : collectes enregistrées, versements tontine remis et reste chez le commercial. La fiche d’un membre complète ce contrôle avec la répartition des collectes par commercial, la synthèse mensuelle et les contrôles terrain.

La vérification de carnet est une action dédiée : elle ne modifie pas les montants. Elle ajoute ou retire le badge **Carnet vérifié** et conserve la date ainsi que l’auteur de la vérification. L’export PDF des membres ou d’un membre ne s’affiche qu’aux comptes autorisés.


\newpage



---

# Rapports et configuration

Le **Rapport Journalier** et le menu **Configuration** sont les deux points de contrôle les plus utiles pour un gestionnaire. Le premier explique ce qui s’est passé ; le second maîtrise les référentiels et règles appliqués aux futurs dossiers.

## Rapport Journalier

Ouvrez **Rapport Journalier**. La barre de filtres commune propose **Aujourd’hui**, **Cette semaine**, **Ce mois** ou **Personnalisé**, avec une plage de dates. Les comptes non commerciaux peuvent sélectionner un commercial. Ces filtres s’appliquent à tous les segments.

<!-- CAPTURE À INSÉRER : Rapport Journalier — barre de période, sélection de commercial et segments. -->

| Segment | Usage | Accès courant |
|---|---|---|
| Vue d’ensemble | Totaux de période, bilans annuels crédit et tontine, indicateurs globaux et par commercial. | Permission KPI financier du rapport. |
| Journal | Liste paginée des opérations, filtre par type et export PDF. | Permission KPI financier du rapport. |
| Recouvrement | Contrôle opérationnel du recouvrement terrain. | Chef de recouvrement ou gestionnaire. |
| Versements | Historique ventilé par crédit, tontine, solde de nouveaux comptes, surplus et total. | Permission KPI financier du rapport. |
| Remise | Préparation, réception et historique des remises de période. | Gestionnaire ou secrétaire avec les permissions requises. |

Le bilan annuel crédit s’affiche après sélection d’un commercial. Il distingue stock d’ouverture, ventes, créances reçues ou cédées, portefeuille confié, versements crédit, reste chez le commercial et reste chez le client. Le KPI **Reste chez le client** ouvre le détail des crédits encore dus et permet un export PDF. Ne confondez pas le portefeuille confié avec le solde live des clients.

## Référentiels et paramètres

| Sous-menu Configuration | Usage |
|---|---|
| Localités | Gérer les zones et quartiers proposés dans la fiche client. |
| Type d’Article | Gérer les catégories utilisées pour classer et rechercher les articles. |
| Types de Dépense | Définir les catégories proposées à la saisie des dépenses. |
| Paramètres | Gérer les clés fonctionnelles autorisées, leurs valeurs et descriptions. |
| Mobile Money | Définir les numéros Mixx by YAS et Moov Money par commercial. |

Les listes de localités et de types d’article proposent recherche, pagination, ajout, modification et suppression selon les permissions. Le type de dépense est un référentiel plus simple, centré sur son nom ; créez-le avant la première dépense de cette catégorie.

Les paramètres sont sensibles. Modifiez une valeur uniquement après validation de la procédure interne. En particulier, `TONTINE_SOCIETY_SHARE_VERSION` est proposé sous la forme d’un choix contrôlé **V1** ou **V2** ; le passage de version peut déclencher un recalcul des parts société et bloquer temporairement les écritures tontine pendant le traitement.

Dans **Mobile Money**, les numéros saisis par commercial prévalent sur les numéros globaux affichés en haut de page. Laissez un champ vide pour conserver le repli sur la configuration globale ; vérifiez la colonne **Effectif** avant d’enregistrer.


\newpage



---

