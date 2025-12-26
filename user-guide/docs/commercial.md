# Gestion Commerciale

Ce module est le cœur du métier. Il permet aux commerciaux de gérer leur portefeuille de clients et de suivre les ventes à crédit.

## 👥 Gestion des Clients

Pour pouvoir vendre à une personne, elle doit d'abord être enregistrée dans la base de données.

### 1. Accéder à la liste des clients
Dans le menu latéral, cliquez sur **Clients**.
L'écran affiche la liste de vos clients avec les colonnes :
*   **#** : Numéro d'ordre.
*   **Nom** et **Prénom** : Identité du client (Cliquable pour voir le détail).
*   **Localité** : Son lieu de résidence.
*   **Numéro de téléphone** : Son contact.
*   **Action** : Boutons de gestion.

### 2. Créer un Client
1.  Cliquez sur le bouton **+ Ajouter** situé en haut à droite.
2.  Remplissez le formulaire **Nouveau Client** :

#### A. Identité & Contact
*   **Nom** et **Prénom** (Requis).
*   **Adresse** et **Numéro de téléphone** (Requis, format 8 chiffres).
*   **Date de naissance** (Le client doit avoir au moins 16 ans).
*   **Occupation** : Son métier.

#### B. Géolocalisation
C'est une étape importante pour pouvoir retrouver le client.
*   **Option 1 (Automatique)** : Si vous êtes chez le client, cliquez sur **Obtenir la position GPS**.
*   **Option 2 (Manuelle)** : Activez "Saisie manuelle" et entrez Latitude/Longitude.
*   **Localité** : Sélectionnez son quartier dans la liste déroulante.

#### C. Rattachement Commercial
Vous devez définir quel commercial s'occupe de ce client pour chaque activité :
*   **Commercial associé pour crédit** : Qui gère ses ventes à crédit ?
*   **Commercial associé pour tontine** : Qui collecte ses épargnes ?
*   **Commercial associé pour agence** : Le superviseur de zone.

3.  Cliquez sur **Enregistrer** pour valider la création.

### 3. Actions Client
Dans la colonne **Action** :
*   **Détails** (Oeil) : Pour voir la fiche complète.
*   **Modifier** (Crayon bleu) : Pour corriger une erreur.
*   **Supprimer** (Corbeille rouge) : Uniquement si autorisé.

---

## 🛍 Gestion des Ventes (Crédit)

Une vente à crédit est un contrat où le client s'engage à payer en 30 jours.

### 1. Accéder aux Ventes
Dans le menu latéral, cliquez sur **Ventes**.

Le tableau de bord permet de suivre l'état de chaque dossier :
*   **Montant** : Valeur totale de la marchandise vendue.
*   **Mise journalière** : Montant que le client doit verser chaque jour.
*   **Nombre de jours restants** : Compte à rebours avant la fin du crédit.
*   **Statut** : État d'avancement (Créé, Validé, En cours...).

### 2. Enregistrer une Vente
1.  Cliquez sur le bouton **+ Ajouter** en haut.
2.  Sur le formulaire :
    *   **Client** : Tapez le nom pour rechercher et sélectionner le client.
    *   **Avance** : Si le client paie une partie tout de suite, indiquez le montant.
    *   **Articles** : Choisissez les produits. Le système affiche le prix unitaire, le stock disponible et calcule le total automatiquement.

3.  Cliquez sur **Valider**.
    *   La vente est créée avec le statut **CREATED**. Elle n'est pas encore active.

### 3. Circuit de Validation (Workflow)
Une vente passe par plusieurs étapes, visibles dans la colonne **Action** :

*   **Étape 1 : Validation (Responsable)**
    Un bouton vert **Coche** (`check`) apparaît pour les responsables.
    En cliquant dessus, la vente passe au statut **VALIDATED**. C'est l'accord administratif.

*   **Étape 2 : Livraison / Démarrage (Magasinier)**
    Une fois validée, un bouton bleu **Play** (`play_arrow`) apparaît pour le magasinier.
    En cliquant dessus, il confirme avoir remis la marchandise. La vente passe au statut **INPROGRESS**.
    *   C'est à ce moment que le compte à rebours des 30 jours commence.

### 4. Autres Actions
*   **Changer la mise** (Icône pièce `monetization_on`) : Permet d'ajuster le montant que le client paie par jour.
*   **Détails** (Oeil) : Voir le contenu de la vente et l'historique des paiements.
