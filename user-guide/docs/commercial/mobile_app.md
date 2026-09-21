# Application mobile de terrain

L’application mobile propose un parcours commercial et un parcours dédié au chef de recouvrement. Elle privilégie l’écriture en ligne lorsque le serveur est joignable, avec possibilité d’enregistrer hors ligne lorsque l’interface le propose. La synchronisation reste indispensable pour remonter les opérations locales.

## Parcours commercial

Après connexion, le chargement initial prépare les données nécessaires aux onglets de travail. Les parcours disponibles incluent les clients, distributions, recouvrements, stock, commandes, tontine, rapport et synchronisation, selon le compte connecté.

| Action | Comportement à retenir |
|---|---|
| Créer ou modifier un client | Tentative en ligne en priorité ; l’application peut proposer un enregistrement hors ligne en cas d’indisponibilité. |
| Distribution et encaissement | Tentative en ligne puis repli local proposé selon l’erreur rencontrée. |
| Tontine | Inscription, collecte et livraison suivent la même logique hybride ; les collectes locales sont synchronisées ultérieurement. |
| Synchroniser | Les pages de synchronisation manuelle, automatique et d’erreurs permettent de contrôler les opérations en attente. |

<!-- CAPTURE À INSÉRER : Onglet Plus de l’application mobile commerciale avec l’état de synchronisation et les actions disponibles. -->

## Distribution de ventes à crédit

La distribution représente l’acte de vente à crédit direct sur le terrain : le commercial remet immédiatement la marchandise au client depuis sa dotation de stock mobile, établit le contrat avec sa mise journalière et encaisse l’éventuelle avance initiale.

### 1. L’onglet Distributions : suivi et historique

Accessible depuis la barre d’onglets principale (**Distributions**) :

* **Bandeau de KPIs** :
  * **Total** : Nombre global de distributions enregistrées.
  * **En cours** : Nombre de crédits actuellement actifs en cours de remboursement (`INPROGRESS`).
  * **FCFA** : Montant total cumulé des ventes distribuées.
* **Actions rapides d’en-tête** :
  * Carte **Nouvelle Distribution** : pour démarrer immédiatement une vente crédit.
  * Carte **Nouvelle Commande** : visible lorsque la gestion des commandes est activée sur le compte.
* **Recherche et navigation** :
  * Barre de recherche par nom de client ou par référence de contrat (`DIST-...`).
  * Geste « Tirer pour rafraîchir » (*Pull to refresh*) pour synchroniser l’affichage avec la base locale.
* **Lecture des cartes de distribution** :
  * Date de début de contrat affichée en grand (jour et mois).
  * Référence du dossier (`DIST-...`) et nom complet du client.
  * Nombre d’articles livrés et montant de la mise quotidienne (ex. *2 articles · 1 200 FCFA/jour*).
  * Montant total de la vente en FCFA.
  * Badge de statut : **En cours** (vert), **Terminé** (gris/soldé), **En retard** (rouge/impayé).
  * Badge de synchronisation : `Local` (enregistré sur le téléphone, en attente de transmission) ou `Sync` (confirmé sur le serveur).

<!-- CAPTURE À INSÉRER : Liste de l’onglet Distributions avec les KPIs, la recherche et les badges Local / Sync. -->

### 2. Consulter la fiche détaillée d’une distribution

Un appui sur n’importe quelle carte de la liste ouvre la fiche détaillée de la vente :

* **Synthèse client & contrat** : Référence, date d’octroi, nom du client et montant du reliquat (avoir) disponible sur son compte.
* **Jauge de progression** : Pourcentage remboursé affiché avec une barre de progression visuelle en temps réel.
* **Ventilation financière complète** :
  * **Mise journalière** : montant exigible chaque jour.
  * **Avance** : acompte versé à la livraison.
  * **Montant total payé** : somme totale déjà recouvrée à ce jour.
  * **Montant restant** : solde restant dû par le client.
  * **Montant total** : valeur globale du contrat de vente.
* **Articles distribués** : liste exhaustive des produits remis au client avec leur désignation, la quantité exacte livrée et le montant total par ligne.
* **Historique des recouvrements rattachés** : journal chronologique de tous les encaissements déjà perçus sur ce crédit spécifique (dates, montants et références des reçus).

### 3. Droit à l’erreur : Modification ou Annulation sur le terrain

Tant qu’une distribution porte le badge **Local** (non encore synchronisée avec le serveur), le commercial dispose de deux boutons d’action en bas de la fiche détaillée :

* **Modifier** : ouvre le formulaire d’édition pour réajuster la liste des articles, les quantités livrées ou l’avance perçue avant la fin de tournée.
* **Supprimer définitivement** : en cas d’erreur de saisie ou d’annulation immédiate de la vente :
  * Une boîte d’alerte rouge demande confirmation.
  * La suppression entraîne **la réintégration automatique et immédiate des articles dans le stock commercial du vendeur** et l’annulation de la dette du client.
* **Protection stricte** : dès lors qu’une distribution a été synchronisée avec le serveur (badge **Sync**), les boutons *Modifier* et *Supprimer* sont définitivement désactivés sur le mobile afin de garantir l’intégrité comptable et logistique.

### 4. Enregistrer une nouvelle distribution

Pour créer une nouvelle vente à crédit, touchez **Nouvelle Distribution** (depuis le Tableau de bord, l’onglet Distributions ou le bouton **+**) :

#### A. Sélection et vérification du client
* Touchez **Sélectionner un Client** pour rechercher le bénéficiaire.
* **Règle anti-surendettement** : un client standard ne peut pas cumuler plusieurs crédits actifs en même temps. Si un crédit est déjà en cours (`INPROGRESS`), l’application bloque la saisie : *« Ce client a déjà un crédit en cours. Veuillez le solder avant d’en créer un nouveau »*.
* **Option Crédit Professionnel (Dual Credit)** : pour les clients bénéficiant d’une habilitation professionnelle, un sélecteur permet de choisir la finalité du contrat (**Personnel** ou **Professionnel**). Un client ne peut avoir qu’un seul crédit actif par finalité.

#### B. Choix des articles et contrôle du stock
* L’écran affiche uniquement les articles présents dans la **dotation physique du commercial** (stock disponible > 0).
* Utilisez la barre de recherche pour filtrer par nom, marque ou catégorie.
* Ajustez les quantités souhaitées à l’aide des boutons **+** et **-** :
  * Le système empêche strictement de saisir une quantité supérieure au stock disponible sur le terminal.
  * Le total partiel de chaque article s’affiche en temps réel.

#### C. Calcul financier automatique de la mise (Règles AMENOUVEVE-YAVEH)
Le système détermine automatiquement les paramètres du crédit selon les règles établies :
1. **Mise de base** : calculée sur une durée de référence de 30 jours (`Total / 30`).
2. **Arrondi supérieur** : la mise est automatiquement arrondie au **multiple de 50 FCFA supérieur** (ex. 833 FCFA devient 850 FCFA).
3. **Plancher minimum strict** : la mise journalière ne peut **jamais être inférieure à 200 FCFA/jour** (même pour les petits achats). Si le calcul donne moins, elle est fixée d’office à 200 FCFA.
4. **Période de paiement** : calculée selon le nombre de jours nécessaires pour amortir la somme avec cette mise arrondie.
5. **Avance résiduelle automatique** : le solde non couvert par les mises entières est automatiquement calculé comme avance initiale requise.

#### D. Personnalisation de l’avance
* Le commercial peut modifier le champ **Avance (FCFA)** pour saisir un acompte en espèces supérieur versé par le client.
* Le système recalcule instantanément le solde restant dû et adapte la durée de remboursement.

#### E. Contrôle de sécurité Stock Snapshot
Avant validation, l’application vérifie que le total cumulé des ventes locales de la journée ne dépasse pas le lot de stock initialement accordé le matin par le bureau. En cas de dépassement, une alerte exige d’effectuer une synchronisation avant de poursuivre.

#### F. Confirmation et émission du contrat de vente
1. **Modale de récapitulatif** : contrôlez le client, le nombre d’articles, le montant total, l’avance et la mise quotidienne avant d’approuver.
2. **Écriture locale** : l’opération génère une référence unique `DIST-...`, décrémente instantanément le stock commercial local et enregistre la transaction en base SQLite.
3. **Ticket d’achat à crédit & QR Code** : la fenêtre d’aperçu du reçu présente le contrat complet avec les coordonnées, le détail des articles, l’avance, le solde dû et un **QR Code d’authentification**.
4. **Impression Bluetooth** : touchez **Imprimer** pour sortir immédiatement le reçu papier sur votre imprimante thermique mobile de ceinture (ESC/POS) et le remettre au client.

<!-- CAPTURE À INSÉRER : Écran de confirmation de distribution et reçu thermique d’achat à crédit avec QR code. -->

## Recouvrement des ventes à crédit (Mises journalières)

Le recouvrement mobile permet au commercial de collecter les mises quotidiennes sur le terrain, en mode connecté comme en mode hors ligne.

### 1. Préparer la tournée : « Clients à recouvrer »

Pour organiser efficacement les visites, accédez à la liste dédiée :
* Depuis **Clients → bouton Options (icône trois points) → Clients à Recouvrer**, ou depuis le raccourci **Recouvrement** du tableau de bord.
* **Filtrage automatique** : seuls les clients disposant d’un crédit en cours (`INPROGRESS`) sont affichés.
* **Exclusion des clients déjà vus** : les clients ayant déjà reçu un recouvrement le jour même sont automatiquement masqués afin d'éviter les passages redondants.
* **Organisation par quartier** : les clients sont regroupés par quartier avec affichage immédiat de leur solde restant dû en rouge.
* Touchez une carte client pour ouvrir directement son formulaire de recouvrement.

<!-- CAPTURE À INSÉRER : Écran Clients à recouvrer avec regroupement par quartier et badges de montants dus. -->

### 2. Saisie de l'encaissement et sélection du crédit

Depuis **Tableau de bord → Recouvrement** (ou le bouton flottant **+** de la liste des recouvrements) :
1. **Client** : sélectionnez un client via la recherche ou confirmez le client sélectionné depuis la tournée.
2. **Crédits actifs** : la liste présente les crédits en cours du client (référence, montant total, montant déjà payé, solde restant, mise journalière et barre de progression). Touchez le crédit sur lequel imputer le versement.

### 3. Sélection des mises par pastilles

La saisie ne nécessite pas de taper un montant au clavier :
* L'en-tête indique le nombre de mises déjà payées (**Payé**) et le nombre de mises en retard (**Retard**).
* **Grille de pastilles** : touchez le numéro de la mise souhaitée (ex. pastille 5). L'application sélectionne automatiquement toutes les mises jusqu'à celle-ci.
* Le montant total à collecter est calculé instantanément (`Nombre de mises × Mise unitaire`). Si le solde restant dû est inférieur à une mise complète, l'application ajuste automatiquement le solde partiel.

<!-- CAPTURE À INSÉRER : Grille de pastilles de mise avec indicateurs de retard et calcul du montant. -->

### 4. Gestion financière du Reliquat (Avoirs)

Le système gère automatiquement la monnaie et les avoirs du client :
* **Reliquat existant disponible** : si le client dispose d'un avoir antérieur, activez l'interrupteur **Utiliser ce reliquat pour payer** pour le déduire immédiatement de la mise due.
* **Montant remis en espèces** : renseignez la somme physique reçue. Si le reliquat couvre l'intégralité de la mise, vous pouvez saisir `0 FCFA` en espèces ; le bouton de validation devient alors **CLÔTURER AVEC LE RELIQUAT**.
* **Nouveau reliquat généré** : si le client donne un billet supérieur au montant dû (ex. billet de 2 000 FCFA pour une mise de 1 500 FCFA), l'application calcule l'excédent (+ 500 FCFA). L'interrupteur **Conserver ce reliquat pour le client** permet de créditer automatiquement son solde de reliquat pour de futurs paiements.

### 5. Sécurités et confirmation

* **Alerte anti-doublon** : si un recouvrement a déjà été enregistré pour ce client à la date du jour, une boîte de dialogue demande confirmation explicite avant d'ajouter un second encaissement.
* **Anti double-clic** : le bouton se verrouille avec la mention *« ENREGISTREMENT EN COURS... »* pendant l'écriture locale synchrone en base SQLite.
* Chaque encaissement génère une référence unique (format `REC-YYYY...`) et met à jour instantanément les soldes et reliquats locaux sans attendre le réseau.

### 6. Reçu de paiement, QR Code et impression Bluetooth

Dès la confirmation, l'aperçu du ticket de caisse s'affiche :
* **Mentions officielles** : en-tête AMENOUVEVE-YAVEH, date/heure, commercial, référence du crédit.
* **Détail financier** : montant facturé, reliquat utilisé, espèces remises, reliquat conservé, Ancien Solde et Nouveau Solde restant.
* **QR Code d'authentification** : un QR code sécurisé contenant les détails de la transaction est imprimé sur le ticket pour contrôle sur le terrain.
* **Archivage PDF** : un duplicata PDF est généré et sauvegardé automatiquement dans la mémoire du téléphone.
* **Impression thermique Bluetooth** : touchez **Imprimer** pour transmettre directement l'ordre à votre imprimante portable de ceinture connectée (ESC/POS).

<!-- CAPTURE À INSÉRER : Aperçu du reçu de recouvrement avec QR code et bouton Imprimer. -->

### 7. Historique et Droit à l'erreur (Suppression locale)

Depuis l'icône liste en haut de la page de recouvrement ou via le Tableau de bord :
* **Bandeau KPI** : suivi du nombre total de recouvrements, des encaissements du jour et du montant total en FCFA.
* **Filtres** : filtrage par période (*Aujourd'hui, Cette semaine, Ce mois, Toutes*) et par moyen de paiement (*Espèces, Mobile Money*).
* **Statut de synchronisation** : badge `Local` (non synchronisé) ou `Sync` (validé sur le serveur).
* **Correction d'une saisie erronée** : sur un encaissement portant le badge `Local`, touchez le bouton corbeille rouge pour supprimer l'opération. L'application annule le paiement, réincrémente le restant dû du crédit et rétablit les reliquats utilisés. Dès lors qu'un recouvrement porte le badge `Sync`, il ne peut plus être supprimé depuis le terminal mobile.

### Articles (Plus → Articles)

Depuis **Plus → Articles**, consultez deux onglets :

| Onglet | Contenu |
|---|---|
| **Mon Stock** | Articles de votre stock commercial avec quantité disponible et prix de vente à crédit. |
| **Catalogue** | Articles actifs du catalogue (prix de vente à crédit uniquement, sans quantité). |

La barre de recherche filtre l’onglet actif. Hors ligne, chaque onglet s’appuie sur le cache local ; en ligne, la liste se rafraîchit en arrière-plan sans bloquer l’affichage.

<!-- CAPTURE À INSÉRER : Écran Articles avec le segment Mon Stock | Catalogue. -->

Une collecte tontine hors ligne peut afficher une estimation. Après reconnexion, lancez la synchronisation et vérifiez que l’opération a bien quitté la file d’attente avant de la considérer comme définitive.

## Parcours chef de recouvrement

Le profil Chef de recouvrement dispose d’un espace terrain distinct, accessible après le plan du jour, avec les onglets **Retards**, **Terrain**, **Clients** et **Plus**. Son parcours complet — contrôles de carnet, clôtures, réaffectations, pack hors ligne et synchronisation — est documenté dans le [Guide Chef de recouvrement](../recovery-manager/mobile.md).

## Sécurité et mise à jour

Après une réinitialisation de mot de passe, le changement est obligatoire avant de poursuivre. Si la gestion d’appareils mobiles est activée par l’organisation, seuls les appareils autorisés peuvent se connecter. La page **Plus** peut afficher la version installée et le bouton **Mettre à jour l’application** ; installez uniquement les mises à jour proposées par l’application ou par la procédure officielle de l’organisation.
