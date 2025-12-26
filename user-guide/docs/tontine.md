# Gestion de la Tontine

La tontine est une épargne programmée (Février à Novembre) permettant aux clients de commander des articles livrés en fin d'année.

## 👥 Gestion des Membres

L'écran principal de la Tontine permet de voir qui participe à la session en cours.

### 1. Accéder au Dashboard
Dans le menu latéral, cliquez sur **Tontines**.

Vous y trouverez :
*   En haut : Des cartes (KPI) résumant le Total Collecté et le Nombre de Membres.
*   Au centre : La liste des membres avec le **Client**, le **Commercial**, le **Montant Total** déjà versé et le **Reste à payer**.

### 2. Inscrire un Membre
1.  Cliquez sur le bouton **Ajouter un Membre** (Icône `person_add`).
2.  Un formulaire s'ouvre. Sélectionnez le client.
3.  Définissez le **Montant de la mise** (Combien il verse par période).
4.  Cliquez sur **Valider**.

## 💶 Enregistrement des Cotisations (Mises)

C'est l'action la plus courante : enregistrer l'argent qu'un client vient de verser.

1.  Dans la liste des membres, cliquez sur la ligne du client concerné.
2.  Vous arrivez sur la fiche **Détail Membre**.
3.  En haut à droite, cliquez sur le bouton bleu **Enregistrer une Collecte** (Icône `add`).
4.  Une fenêtre s'ouvre :
    *   Saisissez le **Montant** reçu.
    *   Validez.
5.  Le **Total Contribué** se met à jour instantanément.
    *   Vous pouvez voir le détail de ce versement dans le tableau **Historique des Collectes** en bas de page.

---

## 🎁 Flux de Livraison (Fin d'Année)

En fin d'année, une fois les cotisations terminées, la phase de livraison commence. Cela se passe aussi depuis la fiche **Détail Membre**.

### Étape 1 : Préparation (Commercial)
Le commercial décide avec le client quels articles il prend avec son épargne.

1.  Sur la fiche membre, si la session est clôturée, un bouton **Préparer la Livraison** (Icône `local_shipping`) apparaît. Cliquez dessus.
2.  Sélectionnez les articles dans la liste.
3.  Vérifiez que le total des articles ne dépasse pas le solde épargné.
4.  Validez.
    *   Le statut de livraison devient **PENDING** (En attente).

### Étape 2 : Validation (Superviseur)
Un responsable contrôle la commande préparée.

1.  Sur la même fiche, il verra un bouton orange **Valider la Livraison** (Icône `check_circle`).
2.  En cliquant dessus, la commande est confirmée.
    *   Le statut passe à **VALIDATED**.

### Étape 3 : Livraison Physique (Magasinier)
Au moment où le client récupère ses marchandises :

1.  Le magasinier accède à la fiche membre.
2.  Il clique sur le bouton **Marquer comme Livré** (Icône `done_all`).
    *   Le statut passe à **DELIVERED**.
    *   Le dossier est clos.
