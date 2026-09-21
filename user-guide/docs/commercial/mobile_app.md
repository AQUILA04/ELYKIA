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
