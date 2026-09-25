# Opérations quotidiennes (Journée comptable, Caisse, Billetage & Clients)

Ce guide décrit l'ensemble des procédures opérationnelles et des gestes de contrôle quotidiens : ouverture et fermeture de la journée comptable, gestion des caisses agents, décompte physique par billetage, suivi de l'opération journalière et réaffectation stratégique des portefeuilles clients.

---

## 1. Gestion de la journée comptable (Menu Opérations > Journée comptable)

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

## 2. Gestion de la caisse agent (Menu Caisse > Ouverture / Fermeture)

Chaque commercial ou caissier au siège doit disposer d'une caisse ouverte pour enregistrer ses opérations de vente et d'encaissement.

* **Accès au module** : Menu latéral **Caisse > Ouverture / Fermeture** (selon vos habilitations de caisse).
* **Fonctionnement unitaire** :
  * L'écran affiche automatiquement l'identifiant de l'agent connecté : `Ouvrir la caisse de l'utilisateur : [username]`.
  * Un clic sur **« Ouvrir Caisse »** attribue un numéro de caisse actif pour la journée en cours.
  * En fin de tournée ou de journée guichet, l'utilisateur revient sur cet écran pour cliquer sur **« Fermer Caisse »**.

---

## 3. Billetage physique des espèces (Menu Caisse > Billetage)

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

## 4. Opération journalière et feuille de route (Menu Caisse > Opération Journalière)

Accessible via le menu **Caisse > Opération Journalière**, cette interface permet de superviser l'ensemble des crédits actifs dont les mises sont attendues sur la journée.

* **Indicateurs par ligne** :
  * Nom et prénom du client.
  * Localité / Quartier.
  * **Mise journalière** contractuelle en FCFA.
  * **Reste à payer** global sur le crédit.
* **Actions et documents** :
  * **Détails** : Ouverture de la fiche complète du crédit ciblé.
  * **Bouton TFJ** : Accès direct à la Table Financière Journalière.
  * **Télécharger PDF** : Génération immédiate de la fiche de tournée et de contrôle journalier pour les agents de recouvrement.

---

## 5. Portefeuille Clients & Réaffectation de masse (Menu Clients > Liste)

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
   * **Effet opérationnel** : Si cette case est cochée, l'ensemble des crédits actifs des clients sélectionnés sont automatiquement transférés au nouveau commercial, garantissant la continuité des tournées et la justesse des bilans de passation.
4. **Validation** : Cliquez sur **« Valider »** pour appliquer les réaffectations. L'historique des changements de commercial est intégralement archivé pour audit.

---

### D. Autorisation de Crédit Business (Gestion du double crédit)
Sur chaque ligne client, le gestionnaire habilité dispose d'un bouton d'approbation dédié :
* **Badge vert « B »** : Indique que le client est habilité à contracter un **crédit business/professionnel** en plus de son crédit personnel usuel.
* **Action « Autoriser / Retirer crédit business »** : Permet au gestionnaire d'octroyer ou de révoquer ce privilège après examen de la solvabilité du client.

---

## 6. Traitement des déclarations de paiements clients Mobile Money (Menu Paiements clients)

Le module **Paiements clients** permet d'arbitrer les déclarations d'encaissement effectuées par les clients depuis l'Espace Client ELYKIA via **Mobile Money** (Mixx by YAS ou Moov Money).

<!-- CAPTURE À INSÉRER : Écran de gestion des déclarations de paiement Mobile Money avec onglets Recouvrement crédit et Cotisations tontine, et boutons Valider/Rejeter. -->

### A. Présentation générale et indicateurs
* **Accès au module** : Menu latéral **Paiements clients** (icône carte bancaire). Si vous ne voyez pas ce menu, vous ne disposez pas des habilitations requises.
* **Barre d'état** : Heure d'actualisation en direct et bouton **« Actualiser »** pour vérifier l'arrivée de nouveaux versements.
* **Compteur dynamique** : Affiche le nombre de déclarations actuellement en attente d'instruction.
* **Visibilité des données** :
  * **Pour un gestionnaire** : Visualisation globale de toutes les déclarations de l'agence, avec affichage du commercial affecté.
  * **Pour un commercial** : Consultation restreinte aux seules déclarations de paiement de son portefeuille clients.

---

### B. Traitement des remboursements de crédit (Onglet Recouvrement crédit)
Cet onglet centralise les règlements d'échéances de vente à crédit :

| Information affichée | Description fonctionnelle |
|---|---|
| **Client** | Nom et prénom du client ou son numéro d'identifiant. |
| **Commercial** | Commercial gestionnaire du dossier de crédit. |
| **Crédit** | Numéro du crédit. Cliquer sur le lien bleu `#ID` ouvre directement la fiche 360° du crédit. |
| **Échéance** | Numéro de l'échéance réglée par le client. |
| **Montant** | Somme versée en Francs CFA (affichée en gras). |
| **Téléphone** | Numéro de téléphone Mobile Money utilisé pour le transfert. |
| **Référence** | Numéro de transaction officiel fourni par l'opérateur (Mixx ou Moov). |
| **Date** | Date et heure de déclaration du paiement par le client. |

#### Actions de validation ou de rejet :
1. **Valider** :
   * Après vérification de la réception effective des fonds sur le compte récepteur de l'agence, cliquez sur le bouton vert **« Valider »**.
   * **Conséquences automatiques** : Le paiement est instantanément imputé sur le crédit du client, son solde restant dû diminue, le versement est enregistré dans le journal des recouvrements du commercial et comptabilisé dans les encaissements du jour.
2. **Rejeter** :
   * Si la transaction est introuvable, incorrecte ou frauduleuse, cliquez sur le bouton rouge **« Rejeter »**.
   * Une boîte de dialogue vous demande confirmation avant d'annuler définitivement la déclaration.

---

### C. Traitement des cotisations tontine (Onglet Cotisations tontine)
Cet onglet regroupe les cotisations d'épargne rotative versées en ligne par les adhérents de la tontine :

| Information affichée | Description fonctionnelle |
|---|---|
| **Client** | Nom et identifiant du membre souscripteur. |
| **Commercial tontine** | Commercial responsable du suivi de la tontine pour ce secteur. |
| **Membre** | Numéro d'adhésion officiel tontine (`#ID`). |
| **Montant** | Montant cotisé en Francs CFA. |
| **Téléphone & Référence** | Coordonnées de l'émetteur et identifiant de transaction opérateur. |
| **Date** | Date et heure de l'opération. |

#### Décision gestionnaire :
* **Valider** : Valide l'encaissement, crédite la cagnotte du membre dans la session active, applique la règle de déduction de la part société selon le barème paramétré et met à jour l'état d'avancement de son carnet d'épargne.
* **Rejeter** : Rejette la déclaration après confirmation et alerte le client.

---

## 7. Centre de notifications et suivi des alertes

ELYKIA intègre un système d'alerte multicanal pour avertir immédiatement les équipes des événements requérant une attention rapide.

<!-- CAPTURE À INSÉRER : Centre de notifications avec cloche dans la barre supérieure, badge de notifications non lues et liste chronologique des événements. -->

### A. Cloche de notification (Barre de navigation supérieure)
* **Pastille numérique rouge** : Indique en temps réel le nombre exact de notifications en attente de traitement.
* **Menu déroulant instantané** : Un clic sur la cloche ouvre une fenêtre contextuelle présentant les dernières alertes groupées par date.
* **Raccourci direct** : Cliquer sur une notification la marque automatiquement comme lue et vous redirige directement sur l'écran opérationnel concerné (ex: détail d'une commande client, déclaration de paiement correspondante avec mise en surbrillance de la ligne).
* **Lien complet** : Le lien en bas de volet **« Voir toutes les notifications »** ouvre la page dédiée.

### B. Page dédiée du centre de notifications

1. Ouvrez la page via **« Voir toutes les notifications »** (cloche) ou le menu correspondant.
2. En haut de page, les indicateurs **Total** et **Non lues** résument le volume d’alertes.
3. Cliquez sur **« Tout lire »** pour marquer toutes les alertes affichées comme lues.
4. Cliquez sur **« Actualiser »** pour recharger la liste sans quitter la page.
5. Les alertes sont regroupées par date. Cliquez sur une ligne pour l’ouvrir (elle est marquée lue) et accéder à l’écran concerné.

**Types d’alertes :**
* **Paiement** : déclaration de remboursement de crédit initiée en ligne par un client.
* **Cotisation tontine** : déclaration de cotisation d’épargne par un membre.
* **Commande** : nouvelle réservation ou précommande d’article soumise par un client.
* **Rattrapage** : régularisation de versement de rattrapage sur un mois antérieur.


