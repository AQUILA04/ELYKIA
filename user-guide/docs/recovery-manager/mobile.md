# Chef de recouvrement — application mobile

L’application mobile fournit un espace terrain dédié au Chef de recouvrement. Après la connexion, le profil accède au **Plan du jour**, puis au shell composé de quatre onglets : **Retards**, **Terrain**, **Clients** et **Plus**. L’identité de l’utilisateur et l’état **En ligne / Hors ligne** sont affichés dans le parcours afin d’indiquer si les opérations seront envoyées immédiatement ou placées en attente de synchronisation.

## Préparer le plan du jour

Le plan du jour détermine le périmètre du pack hors ligne. Il se déroule en trois étapes.

<!-- CAPTURE À INSÉRER : Mobile Chef de recouvrement — les trois étapes du Plan du jour et le bouton Télécharger le pack. -->

| Étape | Action | Résultat |
|---|---|---|
| 1. Commerciaux | Sélectionner de **1 à 3 commerciaux**. La liste indique les retards et le montant restant. | Le portefeuille à traiter est borné. |
| 2. Localités | Conserver toutes les localités ou effectuer une sélection multiple avec recherche. | Le pack peut être limité aux zones de tournée. |
| 3. Téléchargement | Vérifier l’estimation : commerciaux, retards, montant dû et localités, puis choisir **Télécharger le pack**. | Le téléphone reçoit les données utiles au travail terrain. |

Le pack est nécessaire pour travailler hors ligne. Si l’onglet **Retards** indique qu’aucun pack n’est disponible, revenez au plan du jour au lieu de tenter d’effectuer des opérations sans périmètre.

## Onglet Retards : prioriser, contrôler et clôturer

L’onglet **Retards** affiche les KPI **Retards**, **Dû** et **Clôturé**, puis les dossiers regroupés par localité. Des filtres par commercial sélectionné dans le plan permettent de concentrer la tournée.

Chaque carte affiche le client, la référence, le commercial, le téléphone lorsque disponible, le montant restant et les jours de retard. Les boutons **Contrôle** et **Clôturer** ouvrent les formulaires correspondants.

### Contrôle crédit

Le formulaire compare le montant payé dans le système au montant observé sur le carnet. Saisissez le montant réellement lu, ajoutez une note si nécessaire, puis choisissez **Capturer le contrôle**. Le résultat affiche un statut **CONFORME** ou **ECART**.

### Clôture totale ou partielle

Le formulaire de clôture rappelle le client, la référence, le commercial, le restant dû et le reliquat appliqué, le cas échéant. Choisissez **Total** ou **Partiel**, puis saisissez le montant encaissé. Les raccourcis de montant peuvent aider à renseigner la valeur, mais le montant final doit toujours correspondre à l’encaissement réel.

> **Ne doublez pas une clôture hors ligne.** Après confirmation, consultez l’onglet **Plus** pour vérifier si l’opération a été synchronisée ou placée dans la file d’attente.

## Onglet Terrain : carnets crédit et tontine

L’onglet **Terrain** regroupe les portefeuilles par commercial et par localité. Il distingue les retards des membres tontine.

| Zone | Action |
|---|---|
| Retards | Consulter les clients et utiliser **Naviguer** lorsqu’une position est disponible. |
| Tontine | Vérifier ou annuler la vérification d’un carnet, lancer un contrôle, ou passer en mode sélection pour une vérification en masse. |

Le contrôle tontine permet de sélectionner les mois à contrôler et de saisir le montant écrit dans le carnet pour chaque mois. L’application calcule la comparaison **Système / Carnet / Écart** et accepte une note. Le badge **Vérifié** indique la vérification de carnet, tandis que le badge **CONFORME** ou **ECART** correspond au résultat d’un contrôle : ces deux informations sont complémentaires et ne doivent pas être confondues.

<!-- CAPTURE À INSÉRER : Mobile Chef de recouvrement — onglet Terrain avec membres tontine, badge Vérifié et contrôle par mois. -->

## Onglet Clients : contact, GPS et changement de commercial

L’onglet **Clients** recherche les clients contenus dans le pack par nom, téléphone ou localité. Chaque carte montre le téléphone, le quartier, les commerciaux crédit et tontine, ainsi que l’état GPS.

Touchez une carte pour modifier uniquement les données autorisées : le **téléphone** et la **géolocalisation**. Le quartier est visible comme information de périmètre et reste en lecture seule. Utilisez **Mettre à jour ma position** lorsque vous êtes sur le lieu du client ; utilisez **Ouvrir Maps** pour consulter une position déjà enregistrée.

La sélection multiple donne accès à **Changer de commercial**. La feuille permet de choisir séparément le commercial crédit et le commercial tontine. La case de transfert automatique des ventes en cours n’est activable qu’après sélection d’un commercial crédit.

## Onglet Plus : synchroniser et maintenir le pack

L’onglet **Plus** est le point de contrôle de la journée. Il présente le plan actif, les informations du pack et la file d’attente classée par type d’opération : transferts de commercial, modifications de contact, contrôles crédit, contrôles tontine, vérifications de carnet et clôtures.

| Action | Quand l’utiliser |
|---|---|
| **Synchroniser** | Après une période hors ligne ou avant la fin de tournée, pour transmettre les opérations en attente. |
| **Actualiser le pack** | Lorsque le périmètre ou les informations téléchargées doivent être renouvelés. |
| **Changer le plan du jour** | Lorsque les commerciaux ou localités à traiter changent. |
| **Mettre à jour l’application** | Lorsqu’une version officielle est proposée par l’application. |

Traitez les erreurs affichées avant de recommencer une opération. Une opération placée dans la file est déjà enregistrée localement ; la ressaisie créerait un risque de doublon. La synchronisation priorise les données de contact et les contrôles avant les clôtures, afin de conserver la cohérence du compte rendu terrain.
