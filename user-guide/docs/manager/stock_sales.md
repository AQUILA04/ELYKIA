# Gestion des stocks, réceptions et inventaires (Vision Gestionnaire)

Dans l'application ELYKIA, la marchandise suit un circuit d'approvisionnement et de distribution hautement sécurisé. Chaque mouvement physique est tracé par une étape de validation stricte, interdisant toute entrée ou sortie non autorisée.

L'organisation repose sur **trois niveaux étanches de stock** :
1. **Stock Central Magasin** : Stock physique détenu au dépôt principal, administré par le magasinier et audité par les inventaires.
2. **Stock Commercial** (accessible via le menu latéral **Stock Commercial**) : Stock opérationnel attribué aux commerciaux pour les ventes directes au comptant et à crédit.
3. **Stock Tontine** (accessible via le menu latéral **Stock Tontine**) : Stock tampon strictement réservé aux livraisons de fin d'exercice des membres épargnants de la tontine, interdisant tout mélange avec le flux commercial standard.

---

## 1. Référentiel Articles et Valorisation du Stock

Pour consulter l'ensemble des articles, rendez-vous dans le menu latéral puis cliquez sur **Articles**.

Le catalogue centralise les articles commercialisables, leurs grilles tarifaires et leurs seuils d'alerte logistique.

<!-- CAPTURE À INSÉRER : Liste du catalogue d'articles avec filtres de type, prix d'achat/vente et seuils de réapprovisionnement. -->

### A. Données obligatoires de la fiche article (Bouton « Nouvel Article »)
* **Identification produit** : Nom de l'article, Marque, Modèle et Catégorie / Famille de produits.
* **Grille tarifaire à 3 niveaux** :
  * **Prix d'achat fournisseur** : Coût d'acquisition servant de base au calcul de valorisation du stock et aux marges brutes.
  * **Prix de vente comptant** : Montant appliqué lors des règlements immédiats en espèces.
  * **Prix de vente à crédit** : Montant contractuel pour les paiements échelonnés sur 30 jours (incluant la marge financière).
* **Paramètres de réapprovisionnement** :
  * **Point de commande (Seuil d'alerte)** : Quantité minimale en deçà de laquelle l'article bascule en alerte orange *Rupture imminente*.
  * **Niveau de stock optimal** : Quantité cible recommandée en magasin.

---

## 2. Entrées Fournisseurs & Historique des Réceptions

Toute livraison de marchandise par un fournisseur doit faire l'objet d'une saisie d'entrée, soumise à une **validation préalable obligatoire** du gestionnaire avant d'impacter le stock disponible.

Pour accéder à la liste des réceptions, ouvrez le menu latéral **Stock Commercial**, puis cliquez sur **Historique Entrée**.

<!-- CAPTURE À INSÉRER : Page Historique des réceptions avec les filtres de recherche, les statuts et les boutons Valider / Refuser / Abandonner. -->

### A. Circuit d'approbation d'une réception
1. **Saisie de l'entrée** : Le magasinier saisit les articles et quantités reçus via le bouton **« Entrées stock »** de la page **Inventaires**.
2. **Étape « En attente »** : Une référence de réception unique est générée. Les articles ne sont **pas encore intégrés** au stock vendable.
3. **Contrôle et Validation par le gestionnaire** :
   * Rendez-vous dans **Stock Commercial > Historique Entrée**.
   * Cliquez sur **« Voir »** pour contrôler la concordance entre le bon de livraison fournisseur physique et les quantités saisies à l'écran.
   * **Valider** : Confirme la conformité de la réception. Le stock magasin est **instantanément augmenté**.
   * **Refuser** : Rejette la réception en cas de non-conformité majeure (marchandise abîmée, erreur de produit). Le statut passe à **Refusé**.
   * **Abandonner** : Permet au créateur de la réception en attente de supprimer sa saisie avant validation si une erreur a été commise.
   * **Annuler** : Réservé aux gestionnaires habilités pour annuler une réception déjà validée suite à une régularisation comptable, décrémentant le stock du magasin.

| Statut Réception | Badge Couleur | Impact sur le Stock Magasin | Actions Disponibles |
|---|---|---|---|
| **En attente** | Jaune | **Aucun impact** (en cours de contrôle) | Valider, Refuser, Abandonner |
| **Validée** | Vert | **Stock magasin augmenté** | Voir, Annuler (selon vos droits) |
| **Refusée** | Rouge | Aucun impact (réception rejetée) | Voir |
| **Annulée** | Gris | Le stock préalablement ajouté est **retiré** | Voir |

### B. Consulter le détail et télécharger les documents
1. **Ouvrir le détail** : cliquez sur **« Voir »**. Vous retrouvez la référence, la date, le reçu par, le montant total, puis la liste des articles avec quantité, prix unitaire d'achat et prix total de chaque ligne.
2. **Télécharger la fiche d'une entrée** : depuis le détail, cliquez sur **« Télécharger PDF »**. Le document reprend les articles, les quantités et le montant total de l'entrée.
3. **Télécharger le récapitulatif d'une journée** :
   * Sur **Historique Entrée**, choisissez une **date** dans le filtre.
   * Cliquez sur **« PDF du jour »**.
   * Le fichier regroupe toutes les entrées de ce jour, avec les quantités cumulées par article et le montant total de la journée.

---

## 3. Demandes de Sortie de Stock Commercial

Pour suivre les mouvements de réapprovisionnement des commerciaux, rendez-vous dans le menu latéral **Stock Commercial**, puis cliquez sur **Demandes Sortie**.

Le réapprovisionnement suit un flux rigoureux en 3 étapes : **Création $\rightarrow$ Validation $\rightarrow$ Livraison**.

<!-- CAPTURE À INSÉRER : Liste des demandes de sortie de stock commercial avec statuts Créée, Validée, Livrée et boutons d'action. -->

### A. Les étapes de traitement pas à pas
1. **Étape 1 : Création (Statut « Créée »)** :
   * Le commercial (ou le gestionnaire) soumet une demande via le bouton **« Nouvelle demande »** en sélectionnant le commercial destinataire, les articles et les quantités voulues.
   * La demande est en attente d'approbation hiérarchique. Le créateur ou le gestionnaire peut encore la **Modifier** ou l'**Annuler**.
2. **Étape 2 : Validation gestionnaire (Statut « Validée »)** :
   * Le gestionnaire contrôle la disponibilité physique en magasin et les encours du commercial, puis clique sur le bouton vert **« Valider »**.
   * La demande passe à l'état **Validée**. La marchandise est alors réservée au magasin.
3. **Étape 3 : Livraison magasinier (Statut « Livrée »)** :
   * Le magasinier physique remet les articles au commercial et clique sur le bouton bleu **« Livrer »**.
   * **Conséquence instantanée** : Le stock magasin est débité et le stock personnel du commercial est crédité. La date de livraison est horodatée.

### B. Téléchargements et exports PDF
* **Fiche de sortie unitaire** : Téléchargement du bon de sortie physique signé pour une demande précise.
* **Télécharger sélection (N)** : Cochez plusieurs demandes dans la liste pour générer en un clic un PDF d'approvisionnement consolidé.
* **Fiche sortie PDF globale** : Export synthétique sur la période active (*Aujourd'hui, Cette semaine, Ce mois, Mois précédents*).

---

## 4. Module Stock Tontine

Le **Stock Tontine** dispose de son propre sous-menu indépendant dans la barre latérale (**Stock Tontine > Demandes Sortie**, **Stock** et **Retours**).

* **Étanche et dédié** : Les articles sortis sous ce module ne peuvent en aucun cas être vendus à crédit dans le circuit commercial régulier.
* **Finalité opérationnelle** : Ce stock est constitué en fin d'année pour préparer les paniers de distribution de fin d'exercice des membres de la tontine ayant cotisé régulièrement.
* Le cycle d'approbation (**Créée $\rightarrow$ Validée $\rightarrow$ Livrée**) et de retour est rigoureusement identique à celui du stock commercial.

---

## 5. Inventaires physiques et réconciliation des écarts

Accessible via le menu latéral **Inventaires**, ce module permet de confronter le stock théorique calculé par l'informatique au stock physique réel compté sur les étagères du magasin dépôt.

<!-- CAPTURE À INSÉRER : Panneau d'actions inventaire avec boutons Créer un inventaire, Saisir quantités physiques, Réconcilier les écarts et Clôturer. -->

### A. Indicateurs de valorisation du stock magasin
Pour les gestionnaires, le bandeau supérieur présente 5 métriques financières stratégiques :
1. **Valeur d'achat FIFO / Total achat** : Valeur monétaire du stock au coût d'acquisition fournisseur.
2. **Prix total vente crédit** : Valeur projetée de réalisation du stock si l'ensemble des articles est distribué à crédit.
3. **Marge estimée (crédit)** : Marge brute prévisionnelle dégagée sur le stock (Vente crédit $-$ Coût d'achat).
4. **Prix total vente comptant** : Valeur du stock au prix de vente comptant.
5. **Marge estimée (comptant)** : Marge brute projetée au comptant.

### B. Déroulement méthodique d'une session d'inventaire
Une session d'inventaire se déroule en 4 étapes séquentielles :

```mermaid
graph LR
    A["1. Créer l'inventaire<br/>(En cours)"] --> B["2. Télécharger PDF<br/>& Compter en rayon"]
    B --> C["3. Saisir quantités<br/>physiques constatées"]
    C --> D["4. Réconcilier les écarts<br/>& Clôturer"]
```

1. **Création de session** : Cliquez sur le bouton vert **« Créer un inventaire »**. La session passe à l'état **En cours** et affiche la date, le statut et l'auteur.
2. **Impression de la feuille de comptage** : Cliquez sur **« Télécharger PDF »** pour éditer le document de comptage vierge destiné aux équipes de magasin.
3. **Saisie des quantités réelles** : Cliquez sur **« Saisir quantités physiques »**. Dans la fenêtre qui s'ouvre, saisissez les quantités effectivement dénombrées pour chaque référence d'article.
4. **Réconciliation des écarts** :
   * Cliquez sur **« Réconcilier les écarts »** pour afficher la balance comparative : `Quantité Théorique Système` vs `Quantité Physique Constatée` = `Écart (Surplus ou Manquant)`.
   * Enregistrez les motifs d'écart (casse, avarie, vol, erreur de saisie).
5. **Clôture définitive** : Cliquez sur **« Clôturer l'inventaire »**. Les stocks théoriques sont automatiquement réalignés sur le comptage physique approuvé et la session est archivée dans l'**Historique des inventaires** (accessible via l'onglet ou le bouton Historique).
