# Rapports d'activité, Assistant ELYKIA IA & Paramètres (Guide Gestionnaire & Analyste)

Ce guide détaille l'ensemble des modules d'analyse, d'archivage mensuel, d'interrogation par intelligence artificielle et de paramétrage des référentiels d'agence.

---

## 1. Rapport Journalier d'activité (`/report/daily`)

Le **Rapport Journalier** est l'outil central de pilotage opérationnel d'ELYKIA. Il synthétise l'ensemble des flux d'exploitation sur la période sélectionnée et propose 5 onglets thématiques spécialisés.

<!-- CAPTURE À INSÉRER : Écran du Rapport Journalier avec sélecteur de période, sélecteur de commercial, bouton Voir marges et onglets de navigation. -->

### A. Barre de filtres globale
Les filtres définis dans la barre supérieure s'appliquent automatiquement à l'ensemble des onglets du rapport :
* **Période** : Boutons rapides **« Aujourd'hui »**, **« Cette semaine »**, **« Ce mois »**, ou **« Personnalisé »** (avec calendrier interactif pour choisir une plage *Du ... Au ...*).
* **Filtre Commercial** :
  * **Pour un commercial** : Votre compte est pré-sélectionné automatiquement. Vous visualisez uniquement vos propres données d'activité (vos ventes, vos recouvrements, vos collectes).
  * **Pour un gestionnaire** : Vous pouvez laisser le champ vide pour obtenir la consolidation globale de toute l'agence, ou sélectionner un commercial dans la liste pour auditer son portefeuille spécifique.
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
* **Bilan Tontine Annuel** :
  * Total des cotisations collectées sur l'année.
  * Montant des versements tontine remis au siège.
  * Reste des cotisations entre les mains du commercial en attente de versement.

#### 2. Cartes d'indicateurs de la période
* **Ventes crédit** : Montant total vendu, nombre de contrats signés et marge brute (si activée).
* **Recouvrements crédit** : Montant total encaissé et nombre de règlements d'échéances.
* **Tontine** : Montant total des cotisations perçues et nombre de collectes réalisées.
* **Nouveaux comptes** : Montant des dépôts initiaux d'ouverture et nombre de nouveaux clients enrôlés.
* **Dépenses** : Cumul des charges décaissées sur la période.
* **Solde net** : Solde théorique d'encaissement net de caisse.

#### 3. Tableau de performance par commercial (vue agence)
Lorsque aucun agent n'est filtré, un tableau comparatif classe les commerciaux de l'agence selon leurs réalisations de la période (ventes, recouvrements, tontine, nouveaux comptes et total produit).

---

### C. Onglet 2 : Journal des opérations
Le **Journal** est le registre chronologique et exhaustif de toutes les transactions financières enregistrées sur la période :
* Chaque ligne précise la date et l'heure exacte, le type d'opération (Vente, Recouvrement, Cotisation tontine, Dépôt compte), le client, le commercial concerné et le montant en Francs CFA.
* **Filtres par nature** : Isolez en un clic les seuls recouvrements, les ventes ou les cotisations.
* **Export PDF** : Le bouton de téléchargement génère une version imprimable officielle du journal des opérations, idéale pour les arrêtés comptables de fin de journée.

---

### D. Onglet 3 : Recouvrement terrain
Réservé aux chefs de recouvrement et aux gestionnaires d'agence :
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

---

### F. Onglet 5 : Remise au gestionnaire
Cet onglet permet de réaliser le versement des fonds collectés de la période au gestionnaire en déduisant les dépenses justificatives. Pour le détail complet du cycle de remise, consultez le guide [Finances & Remises](finance.md).

---

## 2. Rapports Mensuels consolidés (`/report/monthly-reports`)

Le module **Rapports mensuels** gère la conservation et le téléchargement des archives comptables officielles d'ELYKIA.

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

## 3. Assistant Décisionnel ELYKIA IA (`/ai-chat`)

L'application intègre un assistant d'intelligence artificielle conversationnelle permettant d'interroger instantanément l'ensemble des données d'exploitation en langage naturel.

<!-- CAPTURE À INSÉRER : Interface de discussion Elykia IA avec panneau latéral des sessions, suggestions par domaine et réponse enrichie avec tableau de données. -->

### A. Accès et présentation
* **Accès au module** : Menu latéral **Elykia IA** (icône intelligence artificielle). Si vous ne voyez pas ce menu, vous ne disposez pas des habilitations requises pour votre profil.
* **Bandeau de statut** : Affiche en bas de page l'état de santé du moteur IA et le modèle actif.

### B. Organisation des discussions
* **Volet latéral des sessions** : Retrouvez l'historique complet de vos conversations antérieures, automatiquement renommées en fonction du sujet abordé.
* **Bouton « Nouvelle discussion »** : Ouvre un fil de dialogue vierge.
* **Suppression de session** : Permet de purger les discussions devenues obsolètes.

### C. Interroger l'IA en langage naturel
Vous pouvez poser vos questions courantes en français tel que vous le feriez avec un analyste d'exploitation :
* *« Quel est le montant total des impayés de plus de 15 jours sur l'agence ? »*
* *« Donne-moi le top 5 des articles les plus vendus le mois dernier. »*
* *« Quel commercial a réalisé le plus fort taux de recouvrement cette semaine ? »*
* *« Combien de membres sont inscrits à la session de tontine active ? »*
* *« Quels sont les articles dont le stock en magasin est sous le seuil d'alerte ? »*

### D. Réponses structurées et transparence
* **Tableaux de données clairs** : Les résultats chiffrés sont restitués sous forme de tableaux lisibles et directement exploitables.
* **Transparence pour audit** : Pour les utilisateurs habilités, un bouton permet d'afficher la formule de calcul ou la requête d'interrogation générée en arrière-plan, ainsi que le temps de traitement en millisecondes, garantissant l'exactitude des chiffres avancés.
* **Onglet Statistiques** : Permet de consulter les métriques d'utilisation de l'assistant (nombre de requêtes, temps moyen de réponse, domaines métier les plus sollicités).

---

## 4. Référentiels et Configuration de l'agence (`/configuration`)

Le menu **Configuration** regroupe les paramètres fondamentaux qui régissent les calculs et les nomenclatures de l'application :

| Sous-menu | Rôle fonctionnel |
|---|---|
| **Localités (`/locality`)** | Gestion du répertoire des zones, communes et quartiers. Permet d'harmoniser les adresses des clients et d'organiser les tournées de recouvrement. |
| **Types d'Articles (`/article-type`)** | Définition des catégories du catalogue de marchandises (Électroménager, Multimédia, Mobilier, etc.). |
| **Types de Dépense (`/expense/types`)** | Référentiel des motifs de décaissement d'exploitation (Carburant, Loyer, Maintenance, etc.). |
| **Mobile Money (`/configuration/mobile-money`)** | Configuration des numéros de transfert d'argent (Mixx by YAS et Moov Money) attribués à chaque commercial pour les règlements clients à distance. |
| **Paramètres généraux (`/parameters`)** | Réglage des clés système fondamentales, notamment la version du calcul de la part société tontine (`TONTINE_SOCIETY_SHARE_VERSION` V1 ou V2). |

> **Prudence d'administration.** La modification d'un paramètre général est une opération sensible qui engage la cohérence des écritures passées et futures. Toute modification doit respecter les consignes strictes de la direction. Si vous n'avez pas accès à ces écrans, vous ne disposez pas des habilitations nécessaires.

---

## 5. Profil utilisateur & Sécurité de session

Dans le coin supérieur droit de l'écran, le menu utilisateur assure la sécurisation de votre poste de travail :
* **Informations de profil** : Affiche votre nom, prénom, profil opérationnel et l'agence à laquelle vous êtes rattaché.
* **Changer de mot de passe** : Permet de renouveler régulièrement votre code d'accès confidentiel.
* **Déconnexion** : En fin de poste ou avant de quitter votre bureau, cliquez impérativement sur **« Déconnexion »** pour fermer votre session et empêcher tout accès non autorisé à vos données.
