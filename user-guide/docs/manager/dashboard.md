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

### B. La grille supérieure regroupe 5 indicateurs clés synthétiques. Ces indicateurs financiers s'affichent si vous disposez des habilitations de consultation financière.

| Carte KPI | Visuel & Teinte | Métrique principale affichée | Sous-indicateurs & Détails | Particularités métier |
|---|---|---|---|---|

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

### E. Section Alertes Stock Magasin
Cette section s'affiche au bas du tableau de bord pour les profils en charge du stock (si vous ne voyez pas cette section, vous ne disposez pas des habilitations requises) afin de prévenir tout arrêt de distribution :
* **Tableau Rupture de Stock (Rouge)** : Liste paginée des articles dont le stock physique est tombé à zéro (numéro d'ordre, nom de l'article, catégorie/type).
* **Tableau Rupture Imminente (Orange)** : Liste paginée des articles dont le niveau de stock est critique, avec affichage d'une pastille numérique d'alerte.
* **Lien direct** : Le bouton **« Voir le catalogue »** permet de basculer immédiatement sur la gestion des articles (`/article/list`).

---

## 2. Tableau de bord décisionnel BI (`/bi`)

Accessible via le menu **Dashboard BI** pour les profils d'analyse, directeurs et gestionnaires, ce module est conçu pour l'analyse stratégique approfondie et le pilotage de la performance.

<!-- CAPTURE À INSÉRER : Page Dashboard BI avec filtres Aujourd'hui/Semaine/Mois/Année/Personnalisé, cartes de rentabilité et centre d'alertes. -->

### A. Filtres de période multi-dimensionnels
Le Dashboard BI propose une barre de sélection temporelle rapide à 5 options :
1. **Aujourd'hui** : Analyse de la journée en cours.
2. **Cette semaine** : Synthèse hebdomadaire glissante.
3. **Ce mois** : Vue consolidée du mois civil.
4. **Cette année** : Bilan annuel cumulé.
5. **Personnalisé** : Déploiement de deux sélecteurs de calendrier permettant de définir une plage de dates libre (`Date début` et `Date fin`).

### B. Indicateurs stratégiques de rentabilité
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

