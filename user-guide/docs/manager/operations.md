# Opérations quotidiennes (Journée comptable, Caisse, Billetage & Clients)

Ce guide décrit l'ensemble des procédures opérationnelles et des gestes de contrôle quotidiens : ouverture et fermeture de la journée comptable, gestion des caisses agents, décompte physique par billetage, suivi de l'opération journalière et réaffectation stratégique des portefeuilles clients.

---

## 1. Gestion de la journée comptable (`/accounting-day`)

La **Journée comptable** est le verrou d'intégrité central d'ELYKIA. Aucune opération financière (décaissement, encaissement, vente, collecte) ne peut être initiée sans qu'une journée comptable ne soit préalablement ouverte.

<!-- CAPTURE À INSÉRER : Écran de gestion de la journée comptable avec date comptable, bouton Ouvrir/Fermer et liste des caisses ouvertes. -->

### A. Cycle d'ouverture et de fermeture
* **Date comptable proposée** : La date affichée correspond à la date du jour système. Elle est verrouillée en lecture seule pour interdire toute antidatation artificielle.
* **Ouverture de la journée** :
  * Si la journée est fermée, le gestionnaire clique sur le bouton bleu **« Ouvrir »**.
  * Le système enregistre l'ouverture et autorise l'initialisation des caisses individuelles.
* **Fermeture de la journée** :
  * En fin de journée d'exploitation, le bouton rouge **« Fermer »** permet de clôturer la journée comptable.
  * **Contrôle préventif bloquant** : L'écran affiche en temps réel la liste des **Caisses Ouvertes** (nom du commercial et heure d'ouverture). Toutes les caisses des agents doivent impérativement être fermées avant de pouvoir clore la journée générale.

| Statut Journée | Bouton Disponible | Condition d'Exécution | Conséquence Système |
|---|---|---|---|
| **Fermée** | **Ouvrir** | Date comptable du jour valide. | Active la possibilité d'ouvrir les caisses individuelles. |
| **Ouverte** | **Fermer** | Aucune caisse agent ne doit rester ouverte dans la table de monitoring. | Fige les écritures comptables du jour. |

---

## 2. Gestion de la caisse agent (`/open-cashDesk`)

Chaque commercial ou caissier au siège doit disposer d'une caisse ouverte pour enregistrer ses opérations de vente et d'encaissement.

* **Accès au module** : Menu latéral **Caisse > Ouverture / Fermeture** (selon vos habilitations de caisse).
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

### C. Réaffectation en masse de portefeuille

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

