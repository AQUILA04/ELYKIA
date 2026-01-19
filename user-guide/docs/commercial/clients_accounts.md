# Gestion Clients & Comptes

Le cœur de votre métier est la gestion de votre portefeuille clients. Ce menu vous permet d'enregistrer de nouveaux prospects et de gérer leurs comptes.

## 1. Gestion des Clients (« Clients »)
L'écran affiche la liste alphabétique de vos clients et prospects.

### a. Liste des Clients
![Liste des clients](../images/commercial_client_list.png)

Chaque ligne présente :
*   **Nom/Prénom** du client.
*   **Téléphone**.
*   **Localité** (Quartier).
*   **Actions** : Modifier ou Voir Détails.

### b. Créer un Nouveau Client
![Formulaire nouveau client](../images/commercial_client_add.png)

Pour inscrire un client, cliquez sur le bouton **+ Nouveau** et remplissez les sections :

1.  **Profil** : Photo (Optionnel), Nom, Prénom.
2.  **Contact** : Adresse physique, Téléphone (8 chiffres).
3.  **Géolocalisation** :
    *   **Auto** : Cliquez sur "Obtenir la position GPS" (recommandé sur mobile).
    *   **Manuel** : Activez l'interrupteur pour saisir Latitude/Longitude si le GPS échoue.
4.  **Identité** : Type de pièce (Carte électeur, Passeport...), Numéro, et **Photo du document** (Obligatoire).
5.  **Détails** : Date de naissance (Min 16 ans), Occupation (Métier), Localité (Liste déroulante).
6.  **Référents** : Personne à contacter (Nom, Adresse, Tel).
7.  **Associations (Commerciaux)** :
    *   Sélectionnez-vous vous-même (ou le commercial responsable) pour les champs *Commercial Crédit*, *Commercial Tontine*, et *Agence*.
8.  **Type** : Choisissez "Client".
9.  **Compte Initial** :
    *   Le système crée automatiquement un compte. Saisissez le **Solde Initial** (Min 500 FCFA).

Cliquez sur **Enregistrer**.

## 2. Gestion des Comptes (« Comptes »)
Cet écran centralise la situation financière de tous vos clients. Il permet de voir qui peut acheter à crédit et qui doit régulariser sa situation.

### a. Liste des Comptes
![Liste des comptes](../images/commercial_account_list.png)
L'écran présente un tableau avec :
*   **Nom du Client** : Le titulaire.
*   **Numéro de Compte** : Identifiant unique.
*   **Solde** : Montant disponible ou dû.
*   **Statut** :
    *   *Créé/Actif* : Le compte est opérationnel.
    *   *Fermé/Bloqué* : Aucune opération possible.

**Fonctionnalités :**
*   **Recherche** : Filtrez par nom ou numéro de compte via la barre en haut.
*   **Créer** : Si un client n'a pas de compte, cliquez sur **Ajouter**.

### b. Créer/Associer un Compte
Si vous devez créer un compte manuellement :
1.  Cliquez sur **Ajouter**.
2.  **Client** : Recherchez le client dans la liste.
3.  **Numéro** : Attribuez un numéro de compte unique.
4.  **Solde Initial** : Définissez le montant de départ (Minimum 500 FCFA, Maximum 100 000 FCFA).
5.  **Enregistrer**.

### c. Actions sur les Comptes
Au bout de chaque ligne, des icônes vous permettent d'agir :
*   **(De)Activer** (Icône Power/Blocage) : Change le statut du compte (Active ou Désactive).
*   **Détails** (Œil) : Affiche la fiche complète.
*   **Modifier** (Crayon) : Permet de corriger le solde ou le numéro.
*   **Supprimer** (Corbeille) : Supprime définitivement le compte (Action irréversible).
