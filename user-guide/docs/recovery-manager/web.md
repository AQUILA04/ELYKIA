# Chef de recouvrement — application web

L’application web permet au Chef de recouvrement de préparer et contrôler les dossiers avant, pendant ou après une tournée. Les actions particulières de ce profil apparaissent principalement dans **Ventes > Retards**, la fiche crédit, la fiche membre tontine et l’écran **Recouvrement terrain** du Rapport Journalier.

## Traiter les crédits en retard

Ouvrez **Ventes > Retards**. La liste peut être filtrée par commercial, période, localité et type de retard. Chaque ligne présente une référence, le client, son téléphone, sa localité, le commercial concerné, le montant restant, la date prévue et la gravité du retard.

<!-- CAPTURE À INSÉRER : Liste web des crédits en retard avec badges Délai / Échéance, action Terrain et bouton de clôture. -->

| Élément affiché | Utilisation opérationnelle |
|---|---|
| Gravité et jours de retard | Aider à prioriser les visites, sans modifier le montant dû. |
| Type de retard | Distinguer un **délai dépassé** d’une **échéance**. |
| Client et localité | Préparer la visite, puis ouvrir la fiche client si nécessaire. |
| Montant restant et payé | Vérifier la situation système avant d’encaisser ou de clôturer. |
| Bouton **Voir** | Ouvrir le détail du crédit et son historique. |

Le profil Chef de recouvrement voit des cases de sélection sur les listes adaptées. Sur écran mobile web, les mêmes dossiers sont présentés sous forme de cartes avec les actions **Voir**, **Terrain** et **Clôturer**.

## Enregistrer un contrôle terrain crédit

Sur une ligne de retard, choisissez **Terrain**. Le formulaire rappelle la référence, le client, le montant payé dans le système et le restant dû. Saisissez le **total noté dans le carnet client**, puis ajoutez une note si l’observation doit être expliquée.

| Situation observée | Traitement attendu |
|---|---|
| Montant carnet identique au système | Enregistrer le contrôle ; le statut sera conforme. |
| Montant carnet différent | Saisir le montant réellement constaté et décrire l’écart dans la note. |
| Carnet indisponible ou illisible | Ne pas inventer de montant ; suivre la procédure interne et documenter la situation si un contrôle est requis. |

Après enregistrement, la fiche crédit peut afficher la section **Contrôle terrain** avec les montants système et carnet, l’écart, le statut et l’auteur du contrôle.

Le commercial traite ensuite la disparité dans **Écarts de carnet**. S’il accepte une tontine, le dossier est recalé sur le carnet : les mois manquants sont enregistrés avec leur manquant de caisse, et les mois en trop sont annulés. S’il rejette le constat, un motif est enregistré et aucun mouvement n’est passé. Pour une vente, lorsque le système dépasse le carnet, l’acceptation ne modifie pas la mise : le commercial rejette le constat.

## Vérifier un carnet de vente à crédit

La vérification du carnet est une action distincte du contrôle terrain. Elle atteste que le carnet physique a été inspecté, sans modifier les montants ni le résultat du contrôle.

1. Ouvrez **Ventes > Liste** ou la fiche d’une vente à crédit en cours.
2. Le badge **Carnet vérifié** ou **Carnet non vérifié** indique l’état actuel.
3. Choisissez **Vérifier** pour certifier le carnet, ou **Annuler la vérification** pour retirer la certification.
4. Sur la liste, sélectionnez plusieurs ventes puis **Vérifier la sélection** pour traiter plusieurs carnets d’un coup.
5. Utilisez le filtre **Carnet** de la recherche avancée pour n’afficher que les carnets déjà vérifiés ou ceux encore à traiter.

## Clôturer un ou plusieurs retards

Utilisez le bouton de clôture de la ligne concernée. Selon l’écran et les droits, la procédure peut regrouper plusieurs crédits sélectionnés. La fenêtre de clôture affiche, pour chaque dossier, le client, le commercial, le restant, le mode partiel éventuel et le montant prévu.

> **Vérification obligatoire.** Comparez le montant encaissé au restant net affiché par le système. Un reliquat peut réduire le cash nécessaire pour solder un crédit ; il ne doit pas être traité comme un encaissement supplémentaire.

Avant de choisir **Confirmer l’opération**, contrôlez le résumé financier. Une clôture totale ou partielle est journalisée et devient disponible dans le rapport de recouvrement. Ne confirmez jamais une clôture à partir d’une promesse de paiement non encaissée.

## Contrôler la tontine depuis le web

La fiche membre tontine donne accès au bouton **Contrôle terrain** pour le Chef de recouvrement, y compris après la clôture de la session. Lorsque plusieurs commerciaux ont collecté pour le même membre, le formulaire présente **un bloc par commercial**. Dans chaque bloc, sélectionnez les mois concernés et saisissez le montant marqué dans le carnet de ce commercial. L’écart s’affiche pour chaque commercial, puis au total. Un commercial laissé sans mois sélectionné reste **non contrôlé** pour cette visite.

Pour un mois encore à zéro dans le système, choisissez **Collecté par** parmi tous les commerciaux, puis indiquez la **Mise du mois** lue sur le carnet. Si cette mise est la même que celle déjà en vigueur, rien de plus n’est enregistré. Si elle diffère, elle sera retenue pour ce mois au moment de l’acceptation. Un mois qui a déjà des cotisations reste rattaché au commercial qui les a encaissées. Un même mois vide ne peut être attribué qu’à un seul commercial.

La fiche conserve ensuite le total système, le total carnet, l’écart, le statut **Conforme** ou **Disparité**, le détail par commercial, la date et l’auteur. Le commercial choisi retrouve ses mois en disparité dans **Écarts de carnet** pour les accepter ou les rejeter. Le bouton **Vérifier** reste disponible après la clôture de la session.

La liste des membres et la fiche affichent le badge **Déjà contrôlé** lorsqu’un contrôle de carnet terrain a déjà été enregistré.

La vérification administrative du carnet est une action distincte du contrôle terrain. Le badge **Carnet vérifié** peut être appliqué ou retiré seulement si vous disposez des habilitations nécessaires ; il atteste la vérification physique du carnet sans modifier les montants des collectes ni l’état du contrôle terrain. Si l’agence a activé la vérification automatique, l’enregistrement du contrôle marque aussi le carnet comme vérifié. Si ce réglage est désactivé, seul le contrôle est enregistré.

## Piloter le recouvrement terrain

Ouvrez **Rapport Journalier** : un Chef de recouvrement arrive directement sur l’écran **Recouvrement terrain** (adresse `/report/daily/recovery`) ; un gestionnaire y accède par le bouton **Recouvrement terrain** du cockpit, sur la même période. L’écran est réservé au Chef de recouvrement et au gestionnaire.

* **Période** : **Aujourd’hui**, **Semaine**, **Mois**, ou **Dates** puis **Appliquer**. **Commercial** : vide pour toute l’équipe, ou un commercial. Les filtres restent dans l’adresse de la page.
* Le Chef de recouvrement ne voit que ses propres chiffres. Le gestionnaire arrive sur **Tous les chefs** et peut choisir un **Chef de recouvrement** dans la liste (voir plus bas).
* À la première ouverture, une **visite guidée** présente l’écran ; le bouton **Visite guidée** la relance.
* **Ancienne présentation** ouvre l’onglet **Recouvrement** de la présentation en onglets, sur la même période.

<!-- CAPTURE À INSÉRER : Recouvrement terrain — points d'attention, bande des cinq chiffres, tendance et retards prioritaires. -->

### Les points d’attention

En haut de l’écran, chaque point d’attention est un bouton. Les plus urgents (en orange) passent avant les autres (en ocre).

| Point d’attention | Ce qu’il signale | Que faire |
|---|---|---|
| **Écarts de carnet en attente** | Vos contrôles en écart que le commercial n’a pas encore acceptés ou rejetés, avec le montant et les commerciaux concernés. | Relancer le commercial. Le gestionnaire ouvre **Écarts de carnet** d’un clic. |
| **Gros retards jamais contrôlés** | Parmi les retards prioritaires, ceux dont le carnet n’a jamais été contrôlé. | Les mettre dans la prochaine tournée. Le clic descend au tableau des retards. |
| **Sans contrôle depuis plus de 30 jours** | Retards prioritaires dont le dernier contrôle est ancien. | Refaire un contrôle terrain. |
| **Taux du mois sous le repère** | Le taux du mois est sous l’objectif ramené aux jours déjà écoulés du mois. | Concentrer les visites sur les plus gros dus. |
| **Couverture des carnets sous le repère** | La part des dossiers en cours contrôlés ce mois est sous l’objectif ramené aux jours écoulés. | Augmenter les contrôles de carnet. |

Le repère suit le mois : avec un objectif de 30 % au 15 d’un mois de 30 jours, le repère est de 15 %. Sans objectif réglé, ces deux alertes n’apparaissent pas.

### Les cinq chiffres

| Chiffre | Lecture |
|---|---|
| **Taux du mois** | Montant recouvré dans le mois de fin de période, rapporté au dû de **tous les retards délai** de l’application (net du reliquat client). Le trait sur la barre marque l’objectif du mois ; la ligne **Objectif** donne aussi le repère à ce jour. |
| **Recouvré · période** | Montant recouvré et nombre d’opérations sur la période choisie. |
| **Mois vs mois précédent** | Recouvré du 1er au jour affiché, comparé aux mêmes jours du mois précédent. Le taux du mois précédent n’est pas affiché : le dû des retards change chaque jour. |
| **À remettre** | Argent recouvré pour le compte des commerciaux, avec le nombre de commerciaux concernés. |
| **Retards délai** | Nombre de crédits dont la date de fin est dépassée et montant encore dû. |

### Tendance et retards prioritaires

* **Recouvré par jour · 30 derniers jours** : une barre par jour jusqu’à la fin de la période. Survolez une barre, ou placez-y le focus au clavier, pour lire le montant et le nombre d’opérations. Un trait vertical marque le début du mois.
* **Retards prioritaires** : les 10 plus gros montants dus en retard de délai (à montant égal, le plus ancien retard d’abord), avec le quartier, le commercial, le nombre de jours de retard et le **Dernier contrôle** (date, **Conforme** ou **Écart**, ou **Jamais**). **Voir** ouvre le crédit. Ce portefeuille est commun à tous les chefs ; le filtre **Commercial** le réduit.

### Le détail de vos chiffres

| Partie du rapport | Contenu |
|---|---|
| Couverture des carnets du mois | Dossiers crédit et membres tontine en cours contrôlés depuis le 1er du mois, avec le trait de l’objectif, puis la part d’ensemble. |
| Activité terrain | Contrôles carnet crédit et tontine faits sur la période, chacun rapporté au total encore en cours, avec les conformes et les écarts. Clôtures crédit (totales et partielles) et carnets vérifiés sur la période. |
| À remettre par commercial | Une carte par commercial : montant à remettre et nombre d’opérations. Si votre compte a accès au rapport financier, la carte ouvre la fiche du commercial. |
| Détail des opérations | Date, référence crédit, client, commercial (et chef de recouvrement pour le gestionnaire), montant et type **Partiel** ou **Total**. Boutons **Précédent** / **Suivant** au-delà de 20 opérations. |
| Exporter en PDF | Génère le rapport correspondant à la période et aux filtres appliqués. |

### Vue du gestionnaire : tous les chefs

Sans chef choisi, la liste **Chef de recouvrement** affiche **Tous les chefs**. Les points d’attention et les chiffres portent alors sur toute l’équipe, et le tableau **Chefs de recouvrement côte à côte** donne une ligne par chef :

| Colonne | Lecture |
|---|---|
| **Recouvré**, **Opérations** | Sur la période choisie. |
| **Taux du mois**, **vs mois préc.** | Taux du mois du chef et évolution du recouvré par rapport aux mêmes jours du mois précédent. Un taux sous le repère du jour s’affiche en orange. |
| **Couverture crédit**, **Couverture tontine** | Dossiers en cours contrôlés par le chef depuis le 1er du mois. |
| **Écarts**, **Carnets vérifiés** | Contrôles en écart et vérifications de carnet du chef sur la période. |
| **Tournée du jour** | **Ouverte** ou **Clôturée** avec les quartiers prévus, **En préparation**, ou **Aucune**. |

La ligne **Équipe** totalise les chefs ; sa couverture compte une seule fois un dossier contrôlé par deux chefs. Un point d’attention signale aussi un chef **sans opération depuis 5 jours** ou plus. Le nom d’un chef ouvre sa vue ; choisissez **Tous les chefs** dans la liste pour revenir. L’activité terrain, le détail des opérations et l’export PDF ne s’affichent que pour un chef choisi.

Utilisez l’export uniquement après contrôle de la période et des filtres. Un montant de recouvrement terrain n’est pas automatiquement une remise au gestionnaire : la remise suit son propre circuit de trésorerie.
