# Chef de recouvrement — application web

L’application web permet au Chef de recouvrement de préparer et contrôler les dossiers avant, pendant ou après une tournée. Les actions particulières de ce profil apparaissent principalement dans **Ventes > Retards**, la fiche crédit, la fiche membre tontine et le segment **Recouvrement** du Rapport Journalier.

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

Le commercial traite ensuite la disparité dans **Écarts de carnet**. S’il accepte un carnet supérieur au système, la mise manquante et le manquant de caisse sont créés. S’il rejette le constat, un motif est enregistré et aucun mouvement n’est passé. Lorsque le système dépasse le carnet, la suite est une contestation : le commercial rejette le constat, sans annulation de mise.

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

La fiche membre tontine donne accès au bouton **Contrôle terrain** pour le Chef de recouvrement. Lorsque plusieurs commerciaux ont collecté pour le même membre, le formulaire présente **un bloc par commercial**. Dans chaque bloc, sélectionnez les mois concernés et saisissez le montant marqué dans le carnet de ce commercial. L’écart s’affiche pour chaque commercial, puis au total. Un commercial laissé sans mois sélectionné reste **non contrôlé** pour cette visite. La fiche conserve ensuite le total système, le total carnet, l’écart, le statut **Conforme** ou **Disparité**, le détail par commercial, la date et l’auteur. Le commercial concerné retrouve ses mois en disparité dans **Écarts de carnet** pour les accepter ou les rejeter.

La vérification administrative du carnet est une action distincte du contrôle terrain. Le badge **Carnet vérifié** peut être appliqué ou retiré seulement si vous disposez des habilitations nécessaires ; il atteste la vérification physique du carnet sans modifier les montants des collectes ni l’état du contrôle terrain.

## Suivre le rapport de recouvrement

Ouvrez **Rapport Journalier**, appliquez la période et, lorsque l’interface le demande, choisissez le commercial. Le segment **Recouvrement** est disponible au Chef de recouvrement ou au gestionnaire. Un gestionnaire peut également filtrer le rapport par identifiant de Chef de recouvrement.

<!-- CAPTURE À INSÉRER : Segment web Recouvrement du Rapport Journalier avec les KPI et le tableau À remettre par commercial. -->

| Partie du rapport | Contenu |
|---|---|
| Taux du mois | Pourcentage de recouvrement du chef sur le mois de fin de période : encaissé terrain / dû live de **tous les retards délai** de l’application. |
| KPI | Total collecté, nombre d’opérations et nombre de commerciaux concernés. |
| À remettre par commercial | Nombre d’opérations et montant à remettre pour chaque commercial. |
| Détail des opérations | Date, référence crédit, client, commercial, montant et type **Partiel** ou **Total**. |
| Export PDF | Génère le rapport correspondant à la période et aux filtres appliqués. |

Utilisez l’export uniquement après contrôle de la période et des filtres. Un montant de recouvrement terrain n’est pas automatiquement une remise au gestionnaire : la remise suit son propre circuit de trésorerie.
