# Logistique & Stocks

Ce module s'adresse au **Magasinier**. Il assure la gestion physique des articles, des entrées en stock jusqu'à la remise aux commerciaux.

## 📥 Entrées de Stock (Approvisionnement)

Cette procédure permet d'augmenter votre stock lorsqu'une livraison fournisseur arrive.

### 1. Accéder à l'inventaire
Dans le menu latéral, cliquez sur **Inventaires**.

Le tableau affiche l'état actuel :
*   **Nom**, **Marque**, **Modèle**, **Type** : Identification de l'article.
*   **Quantité en stock** : Le nombre d'unités actuellement disponibles dans le système.

### 2. Enregistrer une réception (Entrée)
1.  Cliquez sur le bouton **+ Entrées** situé au-dessus de la liste.
2.  Sur l'écran **Entrée de stock** :
    *   Cliquez sur le champ **Articles à approvisionner**. Une liste déroulante apparaît.
    *   Cochez les articles que vous avez reçus.
    *   Pour chaque article sélectionné, saisissez la **Quantité** reçue dans la case correspondante.
3.  Cliquez sur le bouton **Valider l'entrée** (Icône bleue avec une coche).

!!! info "Résultat"
    Les quantités sont immédiatement ajoutées au stock. Des cartes en haut de la page principale se mettent à jour avec les nouvelles valorisations (Prix Total Achat / Vente).

---

## 📤 Sorties de Stock (Livraisons)

Une "Sortie" correspond à la remise physique de marchandises à un commercial, suite à une vente validée administrativement.

### 1. Accéder à la liste des sorties
Dans le menu latéral, cliquez sur **Sortie**.

Vous y voyez la liste des ventes en attente de traitement logistique ou terminées.
Les colonnes importantes sont :
*   **Nom du Client** : Le bénéficiaire de la vente.
*   **Status** : L'état du dossier.
*   **Action** : C'est ici que vous intervenez.

### 2. Valider une Sortie (Démarrage)
Cette action est critique : elle déstocke les articles et lance le contrat de crédit.

1.  Repérez une ligne avec le statut **VALIDATED**.
    *   Cela signifie que l'administration a donné son feu vert.
2.  Dans la colonne **Action**, cliquez sur le bouton **Play** (`play_arrow`, triangle dans un cercle bleu).
3.  Le système confirmera le démarrage.
    *   Le statut passe à **INPROGRESS**.
    *   Les articles sont déduits de votre stock.

### 3. Gestion Administrative des Sorties
En haut de la page, plusieurs boutons vous aident à gérer la paperasse :
*   **Générer PDF** : Crée un bordereau de sortie pour faire signer le commercial.
*   **List PDF** : Retrouvez les anciens bordereaux générés.
*   **Historique** : Voir toutes les sorties passées.
