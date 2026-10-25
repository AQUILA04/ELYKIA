# Chef de recouvrement — application mobile

L’application mobile fournit un espace terrain dédié au Chef de recouvrement. Après la connexion, le profil accède au **Plan du jour**, puis au shell composé de quatre onglets : **Retards**, **Terrain**, **Clients** et **Plus**. L’identité de l’utilisateur et l’état **En ligne / Hors ligne** sont affichés dans le parcours afin d’indiquer si les opérations seront envoyées immédiatement ou placées en attente de synchronisation.

Si la session n’est plus reconnue pendant le travail en ligne, l’application revient d’elle-même à l’écran de connexion et affiche **Session expirée**. Saisissez à nouveau l’identifiant et le mot de passe pour reprendre le plan du jour.

## Préparer le plan du jour

Le plan du jour détermine le périmètre du pack hors ligne. Il se déroule en trois étapes.

<!-- CAPTURE À INSÉRER : Mobile Chef de recouvrement — les trois étapes du Plan du jour et le bouton Télécharger le pack. -->

| Étape | Action | Résultat |
|---|---|---|
| 1. Commerciaux | Sélectionner de **1 à 5 commerciaux**. La liste indique les retards, le montant restant et les commerciaux qui suivent une tontine, même s'ils n'ont pas de retard. Une recherche permet de retrouver un nom. | Le portefeuille à traiter est borné. |
| 2. Localités | Conserver toutes les localités ou effectuer une sélection multiple avec recherche. | Le pack peut être limité aux zones de tournée. |
| 3. Téléchargement | Vérifier l’estimation : commerciaux, retards, montant dû et localités, puis choisir **Télécharger le pack**. | Le téléphone reçoit les données utiles au travail terrain. |

Le pack est nécessaire pour travailler hors ligne. Si l’onglet **Retards** indique qu’aucun pack n’est disponible, revenez au plan du jour au lieu de tenter d’effectuer des opérations sans périmètre.

## Onglet Retards : prioriser, contrôler et clôturer

L’onglet **Retards** affiche les KPI **Retards**, **Dû** et **Clôturé** (périmètre du **plan du jour**), puis un bandeau distinct **Taux du mois** : le taux de recouvrement du chef sur **tous les retards délai** de l’application (pas seulement le pack). Ce bandeau nécessite le réseau ; hors ligne, la dernière valeur mise en cache peut s’afficher, sinon un message indique que le taux est disponible en ligne uniquement. Un sélecteur de mois simple permet de consulter le mois courant ou un mois passé.

En haut à droite, l’icône carte ouvre à nouveau l’écran du plan du jour pour changer les commerciaux ou les localités.

Les dossiers sont regroupés par localité. Des filtres par commercial sélectionné dans le plan permettent de concentrer la tournée.

Chaque carte affiche le client, la référence, le commercial, le téléphone lorsque disponible, le montant restant et les jours de retard. Le badge **Vérifié** indique qu’un carnet a déjà été certifié. Les boutons **Vérifier**, **Contrôle** et **Clôturer** ouvrent les actions correspondantes. **Vérifier** certifie le carnet physique ; **Contrôle** compare les montants système et carnet.

### Contrôle crédit

Le formulaire rappelle la **mise journalière**, le **montant total** du crédit et le montant déjà payé.

1. Saisissez l’**avance lue sur le carnet**. L’avance déjà enregistrée s’affiche à côté, avec la mention **Identique** ou **Différente**.
2. Les pastilles vont de **1** à **31**. Touchez le dernier jour coché sur le carnet : les jours du 1 jusqu’à ce numéro passent au vert. La **somme des mises** se calcule en même temps.
3. Le **total carnet** additionne cette somme et l’avance saisie.
4. Si le carnet compte plus de 31 jours, choisissez **Étendre le mois**. Chaque appui ajoute 31 numéros : 62, puis 93, et ainsi de suite.
5. Ajoutez une note si besoin, puis **Capturer le contrôle**. Le résultat affiche **CONFORME** lorsque le total carnet correspond au montant payé, sinon **ECART**.

Lorsque la mise journalière n’est pas affichée, saisissez directement le montant lu sur le carnet.

Si ce crédit a déjà un écart qui n’a pas encore été accepté, la carte indique **Déjà contrôlé** et le montant de l’écart. Le formulaire reprend le montant saisi et le bouton devient **Modifier le contrôle**. Lorsque l’écart a été accepté ou refusé, ou si le dernier contrôle est **CONFORME**, un nouveau contrôle peut être saisi.

### Clôture totale ou partielle

Le formulaire de clôture rappelle le client, la référence, le commercial, le restant dû brut et le reliquat appliqué, le cas échéant. Choisissez **Total** ou **Partiel**, puis saisissez le montant encaissé. En mode partiel, des raccourcis facilitent la saisie rapide :
* **10 000** : applique directement un palier rond de 10 000 FCFA (si le restant dû le permet).
* **½** : pré-remplit la moitié exacte du montant net dû.
* **Net** : bascule immédiatement sur le solde net restant après déduction du reliquat client.

Le montant final saisi doit toujours correspondre à l’encaissement physique réel.

> **Ne doublez pas une clôture hors ligne.** Après confirmation, consultez l’onglet **Plus** pour vérifier si l’opération a été synchronisée ou placée dans la file d’attente.

## Onglet Terrain : carnets crédit et tontine

L’onglet **Terrain** regroupe les portefeuilles par commercial et par localité. Il distingue les crédits en cours des membres tontine.

En ligne, l’onglet affiche tous les membres tontine et tous les crédits en cours, y compris ceux qui ne sont pas en retard, sans se limiter au plan du jour. La liste se complète au fil du défilement. Deux boutons, **Tontine** et **Crédits**, permettent de passer d’une liste à l’autre. Hors ligne, les crédits en cours sont ceux des commerciaux et des localités du plan du jour.

La recherche en haut de la liste filtre par nom, téléphone, localité ou commercial. En ligne, elle interroge l’ensemble des données. Hors ligne, elle filtre le pack.

Sous la recherche, deux totaux indiquent le nombre de clients tontine et le nombre de clients dont un crédit est en cours. Ce sont les totaux complets, pas seulement les lignes déjà affichées. Pendant une recherche, le premier nombre correspond aux résultats et le second au total général.

Sous ces totaux, trois pastilles filtrent la liste en un geste : **Tous**, **À faire** et **Déjà fait**. Le même filtre s’applique aux crédits et aux membres tontine, en ligne comme hors ligne.

| Pastille | Ce qu’elle affiche |
|---|---|
| **Tous** | L’ensemble des dossiers. Un dossier déjà contrôlé il y a plus de 30 jours se trouve ici : vous pouvez y lancer un nouveau contrôle. |
| **À faire** | Seulement les dossiers qui n’ont encore jamais eu de contrôle terrain. |
| **Déjà fait** | Les contrôles dont l’écart n’est pas encore accepté ou refusé, ainsi que les contrôles déjà terminés depuis moins de 30 jours. |

Un contrôle terminé depuis plus de 30 jours (conforme, ou écart déjà accepté ou refusé) reste dans **Tous**, où un nouveau contrôle peut être lancé.

| Zone | Action |
|---|---|
| Crédits | Vérifier ou annuler la vérification d’un carnet, lancer un **Contrôle**, puis utiliser **Naviguer** lorsqu’une position est disponible. Le badge **Retard** signale un crédit en retard. |
| Tontine | Vérifier ou annuler la vérification d’un carnet, lancer un contrôle, ou passer en mode sélection pour une vérification en masse. |

La clôture d’un crédit en retard se fait sur l’onglet **Retards**.

Le contrôle d’un crédit affiche la mise journalière et le montant total, puis l’avance lue sur le carnet à côté de l’avance déjà enregistrée. Touchez le dernier jour coché : les pastilles du 1 jusqu’à ce jour passent au vert, la somme des mises s’affiche, et le total carnet ajoute l’avance. **Étendre le mois** ajoute 31 jours lorsque le carnet dépasse 31.

Le contrôle tontine ouvre un formulaire par commercial lorsque plusieurs agents ont collecté pour le membre. Dans chaque bloc (le commercial actuel est signalé), cochez les mois à contrôler. Pour chaque mois coché, la mise du mois est affichée avec des pastilles de 1 à 31. Touchez le dernier jour coché : le montant du mois se calcule automatiquement. **Étendre le mois** ajoute 31 pastilles pour ce mois-là. La comparaison **Système / Carnet / Écart** s’affiche pour le commercial et pour l’ensemble de la sélection. Une note peut être ajoutée. Vous pouvez contrôler un seul commercial lors d’une visite : les autres restent non contrôlés. Le badge **Vérifié** indique la vérification de carnet. Le badge **CONFORME** ou **ECART** correspond au dernier contrôle, même s’il date d’un autre jour. Ces deux informations sont complémentaires et ne doivent pas être confondues.

Lorsqu’un écart est affiché, son montant apparaît à côté du badge, avec la mention **Déjà contrôlé**. Si cet écart n’a pas encore été accepté, le formulaire reprend les montants déjà saisis et le bouton **Modifier le contrôle** met à jour ce contrôle. Si le dernier contrôle est **CONFORME**, ou si l’écart a été accepté ou refusé, un nouveau contrôle peut être enregistré avec **Capturer le contrôle**. Ce choix entre modification et nouveau contrôle est le même pour un crédit et pour un membre tontine.

<!-- CAPTURE À INSÉRER : Mobile Chef de recouvrement — onglet Terrain, liste Crédits avec badge Retard et bouton Contrôle. -->

## Onglet Clients : contact, GPS et changement de commercial

L’onglet **Clients** recherche les clients contenus dans le pack par nom, téléphone ou localité. Chaque carte montre le téléphone, le quartier, les commerciaux crédit et tontine, ainsi que l’état GPS.

Touchez une carte pour modifier uniquement les données autorisées : le **téléphone** et la **géolocalisation**. Le quartier est visible comme information de périmètre et reste en lecture seule. Utilisez **Mettre à jour ma position** lorsque vous êtes sur le lieu du client ; utilisez **Ouvrir Maps** pour consulter une position déjà enregistrée.

La sélection multiple donne accès à **Changer de commercial**. La feuille permet de choisir séparément le commercial crédit et le commercial tontine. La case de transfert automatique des ventes en cours n’est activable qu’après sélection d’un commercial crédit.

## Onglet Plus : synchroniser et maintenir le pack

L’onglet **Plus** est le point de contrôle de la journée. Il présente le plan actif, les informations du pack et la file d’attente classée par type d’opération : transferts de commercial, modifications de contact, contrôles crédit, contrôles tontine, vérifications de carnet crédit et tontine, et clôtures.

| Action | Quand l’utiliser |
|---|---|
| **Synchroniser** | Après une période hors ligne ou avant la fin de tournée, pour transmettre les opérations en attente. |
| **Actualiser le pack** | Lorsque le périmètre ou les informations téléchargées doivent être renouvelés. |
| **Changer le plan du jour** | Lorsque les commerciaux ou les localités à traiter changent. L'écran du plan s'ouvre à nouveau pour préparer un nouveau pack. |
| **Mettre à jour l’application** | Lorsqu’une version officielle est proposée par l’application. |

Traitez les erreurs affichées avant de recommencer une opération. Une opération placée dans la file est déjà enregistrée localement ; la ressaisie créerait un risque de doublon. La synchronisation priorise les données de contact et les contrôles avant les clôtures, afin de conserver la cohérence du compte rendu terrain.
