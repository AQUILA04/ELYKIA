# Clients et comptes

Le module **Clients** centralise les données nécessaires aux ventes et à la tontine. Recherchez toujours un dossier existant avant de créer un client afin d’éviter les doublons.

## Rechercher et consulter

La liste affiche des KPI de portefeuille, une recherche par nom, prénom, téléphone ou localité, un filtre commercial et une pagination. Cliquez sur le nom ou sur **Voir** pour ouvrir la fiche. La fiche peut montrer les badges de crédit actif, membre tontine ou commande en cours, les informations de contact, une photo et les historiques disponibles.

<!-- CAPTURE À INSÉRER : Liste des clients avec la recherche, le filtre Commercial, les KPI et le bouton Ajouter. -->

Si un commercial est sélectionné, le bouton **Fiche Client PDF** permet l’export du portefeuille correspondant. L’export ne remplace pas la vérification de la période ou du commercial choisi.

## Créer ou modifier un client

Cliquez sur **Ajouter** puis remplissez les sections du formulaire. Les champs obligatoires affichent un astérisque.

| Section | Informations principales |
|---|---|
| Identité | Nom, prénom, adresse, téléphone à huit chiffres et photo de profil facultative. |
| Pièce d’identité | Type de pièce, numéro et document facultatif au format autorisé. |
| Informations personnelles | Date de naissance, occupation et localité recherchable. |
| Contact | Personne à contacter, si nécessaire. |
| Géolocalisation | Position GPS obtenue depuis l’appareil ou latitude/longitude saisies manuellement. |
| Commerciaux associés | Commercial crédit, commercial tontine et commercial agence. |
| Type et compte | Type client ou commercial ; solde initial lorsque la section compte est affichée. |

Validez avec **Enregistrer**. En modification, les champs liés aux commerciaux peuvent être restreints : seul un compte autorisé à l’affectation peut changer les responsables crédit ou tontine.

## Réaffecter plusieurs clients

Les comptes ayant la permission d’affectation voient des cases à cocher et le bouton **Changer de commercial**. Sélectionnez les clients, puis choisissez le commercial crédit, le commercial tontine ou les deux. L’option **Transférer automatiquement les ventes du commercial** devient disponible après sélection d’un commercial crédit ; elle transfère les ventes crédit `INPROGRESS` du portefeuille vers le nouveau commercial.

> Vérifiez la sélection avant validation. L’historique conserve la traçabilité des changements de commercial.

## Comptes

Le menu **Comptes**, lorsqu’il est visible, est distinct de la fiche client. Utilisez-le pour consulter les comptes et leurs soldes avec les droits prévus. Ne créez pas un nouveau client uniquement pour corriger une information de compte : revenez à la fiche client ou suivez la procédure de gestion de compte de votre organisation.
