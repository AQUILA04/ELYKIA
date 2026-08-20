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

## Clôturer un ou plusieurs retards

Utilisez le bouton de clôture de la ligne concernée. Selon l’écran et les droits, la procédure peut regrouper plusieurs crédits sélectionnés. La fenêtre de clôture affiche, pour chaque dossier, le client, le commercial, le restant, le mode partiel éventuel et le montant prévu.

> **Vérification obligatoire.** Comparez le montant encaissé au restant net affiché par le système. Un reliquat peut réduire le cash nécessaire pour solder un crédit ; il ne doit pas être traité comme un encaissement supplémentaire.

Avant de choisir **Confirmer l’opération**, contrôlez le résumé financier. Une clôture totale ou partielle est journalisée et devient disponible dans le rapport de recouvrement. Ne confirmez jamais une clôture à partir d’une promesse de paiement non encaissée.

## Contrôler la tontine depuis le web

La fiche membre tontine donne accès au bouton **Contrôle terrain** pour le Chef de recouvrement. Le contrôle se réalise mois par mois : l’utilisateur sélectionne les mois, saisit les montants indiqués sur le carnet et peut ajouter une note. La fiche conserve ensuite le total système, le total carnet, l’écart, le statut **Conforme** ou **Disparité**, la date et l’auteur.

La vérification administrative du carnet est une action distincte du contrôle terrain. Le badge **Carnet vérifié** peut être appliqué ou retiré seulement par les rôles dotés de la permission de vérification ; il atteste la vérification du carnet sans changer les collectes ni l’état du contrôle terrain.

## Suivre le rapport de recouvrement

Ouvrez **Rapport Journalier**, appliquez la période et, lorsque l’interface le demande, choisissez le commercial. Le segment **Recouvrement** est disponible au Chef de recouvrement ou au gestionnaire. Un gestionnaire peut également filtrer le rapport par identifiant de Chef de recouvrement.

<!-- CAPTURE À INSÉRER : Segment web Recouvrement du Rapport Journalier avec les KPI et le tableau À remettre par commercial. -->

| Partie du rapport | Contenu |
|---|---|
| KPI | Total collecté, nombre d’opérations et nombre de commerciaux concernés. |
| À remettre par commercial | Nombre d’opérations et montant à remettre pour chaque commercial. |
| Détail des opérations | Date, référence crédit, client, commercial, montant et type **Partiel** ou **Total**. |
| Export PDF | Génère le rapport correspondant à la période et aux filtres appliqués. |

Utilisez l’export uniquement après contrôle de la période et des filtres. Un montant de recouvrement terrain n’est pas automatiquement une remise au gestionnaire : la remise suit son propre circuit de trésorerie.
