# Mise à jour de la Logique de Part Société (Tontine) - Historisation des Montants

## Contexte
Le document précédent (`TONTINE_SOCIETY_SHARE_LOGIC_UPDATE.md`) décrivait le fonctionnement de la part société sur la collecte. Cependant, une nouvelle exigence a émergé concernant la modification du montant journalier (cotisation) d'un membre en cours de session. Cette modification a un impact direct sur le calcul de la part société, qui est basée sur ce montant journalier.

Actuellement, le système calcule la part société cible (`TargetSocietyShare`) comme :
`MoisEntamés * MontantJournalier`

Si le `MontantJournalier` change, ce calcul rétroactif peut fausser les données historiques ou créer des dettes/crédits injustifiés si on applique le nouveau montant aux mois passés.

## Problématique
Lorsqu'un utilisateur modifie le montant de la cotisation journalière d'un membre, il doit pouvoir spécifier la portée de ce changement. Le système doit gérer l'historique des montants pour calculer correctement la part société due pour chaque période.

## Analyse des Cas d'Utilisation (Modification du Montant)

L'utilisateur doit choisir parmi 4 options lors de la modification du montant :

1.  **Changement Général (Rétroactif)** : Affecte tous les mois (passés, présent, futurs).
2.  **Mois Précédents Inclus** : Affecte les mois précédents (s'il y en a) + présent + futurs. (Similaire au cas 1, à clarifier si nuance). *Note : La demande mentionne "si le changement affecte les collecte du ou des mois précédents". Cela semble revenir à un recalcul complet.*
3.  **Mois En Cours et Futurs** : Affecte le mois courant et les suivants.
4.  **Futurs Mois Seulement** : Affecte uniquement les mois à venir (à partir du mois prochain).

*Règle de gestion : S'il y a plusieurs changements dans un mois concernant le mois présent et futur, on ne prendra que la dernière valeur pour le calcul de la part société pour le mois.*

## Proposition de Solution Technique

Pour supporter ces cas, nous ne pouvons plus nous baser sur un seul champ `amount` dans `TontineMember` pour tout le calcul. Nous devons historiser les changements de montant ou stocker la part société due calculée mois par mois.

### Option Retenue : Historisation des Montants (TontineMemberAmountHistory)

Nous allons introduire une nouvelle entité `TontineMemberAmountHistory` pour suivre l'évolution du montant journalier.

#### Modèle de Données

**Nouvelle Entité : `TontineMemberAmountHistory`**
*   `id`
*   `tontineMember` (ManyToOne)
*   `amount` (Double) : Le montant de la cotisation.
*   `startDate` (LocalDate) : Date de début d'application de ce montant.
*   `endDate` (LocalDate) : Date de fin d'application (null si actif).
*   `creationDate` (LocalDateTime)

#### Algorithme de Calcul de la Part Société Cible (`TargetSocietyShare`)

Au lieu de `MoisEntamés * MontantActuel`, le calcul devient une somme des parts dues pour chaque mois écoulé, en fonction du montant actif à ce moment-là.

**Algorithme :**
1.  Déterminer la liste des mois entamés depuis le début de la session (ou inscription).
2.  Pour chaque mois `M` :
    *   Trouver le montant `A` applicable pour ce mois `M`.
    *   *Règle de priorité* : Si plusieurs montants ont été actifs durant ce mois (ou modifiés pour ce mois), prendre la "dernière valeur" décidée par l'utilisateur pour ce mois.
    *   Part Société du mois `M` = `A`.
3.  `TargetSocietyShare` = Somme(Part Société de chaque mois `M`).
4.  Plafonner à 10 mois (si la règle des 10 mois s'applique toujours sur le total ou mois par mois ? *Supposition : 10 mois de cotisation = 10 parts société. Donc on s'arrête au 10ème mois payé ou dû.*)

### Gestion des Options de Modification

Lors de la modification du montant (ex: passage de 500 à 1000), l'utilisateur choisit l'option.

**Cas 1 : Changement Général (Tous les mois)**
*   Mise à jour de l'historique : On écrase l'historique ou on crée une entrée qui couvre toute la période depuis le début.
*   Recalcul immédiat de la `TargetSocietyShare` avec le nouveau montant * nombre de mois entamés.
*   Conséquence : Le membre peut se retrouver soudainement avec une grosse dette de part société (si augmentation) ou un surplus (si diminution).

**Cas 2 : Mois En Cours et Futurs**
*   Date d'effet = 1er du mois en cours.
*   On clôture l'ancien montant à la fin du mois précédent.
*   On crée une nouvelle entrée d'historique commençant le 1er du mois en cours.
*   Calcul :
    *   Mois passés : utilisent l'ancien montant.
    *   Mois courant + futurs : utilisent le nouveau montant.

**Cas 3 : Futurs Mois Seulement**
*   Date d'effet = 1er du mois suivant.
*   On clôture l'ancien montant à la fin du mois en cours.
*   On crée une nouvelle entrée commençant le 1er du mois suivant.
*   Calcul :
    *   Mois passés + courant : utilisent l'ancien montant.
    *   Mois futurs : utilisent le nouveau montant.

### Impact sur le Code Backend

1.  **Backend (`TontineMember`)** :
    *   Ajouter la relation `OneToMany` vers `TontineMemberAmountHistory`.
    *   Le champ `amount` actuel reste utile comme "montant actuel" pour l'affichage rapide, mais le calcul financier doit utiliser l'historique.

2.  **Backend (`TontineService`)** :
    *   Modifier `updateMember` pour accepter le type de changement (enum : `GLOBAL`, `CURRENT_AND_FUTURE`, `FUTURE_ONLY`).
    *   Implémenter la logique de découpage de l'historique selon l'option choisie.
    *   Mettre à jour `processCollectionAllocation` pour itérer sur les mois et chercher le montant applicable dans l'historique.

3.  **API** :
    *   Mettre à jour le DTO de mise à jour membre pour inclure `updateScope` (l'option choisie).

### Impact sur le Frontend (Web)

1.  **Interface de Modification (`member-details` ou modal d'édition)** :
    *   Ajouter un sélecteur (Radio Button ou Dropdown) pour choisir la portée du changement (`updateScope`) lorsque le montant est modifié.
    *   Ce sélecteur ne doit apparaître que si le montant est modifié.

### Impact sur le Mobile (Offline-First)

Le mobile doit pouvoir fonctionner en mode déconnecté. Cependant, la logique complexe de recalcul historique est lourde à répliquer parfaitement en SQL local (SQLite) sans risque de divergence avec le backend.

**Stratégie Mobile :**

1.  **Modification du Montant (Offline)** :
    *   L'application mobile permettra de modifier le montant, mais **limitera peut-être les options complexes en offline** ou stockera l'intention de modification.
    *   *Approche simplifiée* : En offline, on ne permet que la modification "Futurs Mois" ou "Mois Courant + Futurs" par défaut, ou on demande à l'utilisateur mais le calcul réel de la dette `TargetSocietyShare` ne sera mis à jour avec précision qu'après synchronisation.
    *   *Approche robuste* : On stocke la demande de modification (nouveau montant + scope) dans une table de synchro. Le mobile met à jour le champ `amount` localement pour les affichages futurs immédiats.

2.  **Calcul Local (`TontineCalculationService`)** :
    *   Le service de calcul local devra être conscient qu'il existe un historique, mais il est probable que l'historique complet ne soit pas synchronisé sur le mobile pour économiser la bande passante, sauf si nécessaire.
    *   *Compromis* : Le mobile continuera d'utiliser le `amount` actuel pour ses estimations offline. Lors de la synchronisation, le backend fera le calcul précis (avec l'historique) et renverra les valeurs corrigées (`societyShare`, `totalContribution`, etc.) au mobile.
    *   Cela signifie qu'en offline, après une modification de montant, l'affichage de la "Dette Part Société" pourrait être approximatif jusqu'à la prochaine synchro. C'est acceptable si l'utilisateur est prévenu.

3.  **Base de Données Mobile (`SQLite`)** :
    *   Ajout d'une table `tontine_member_amount_history` (optionnel, si on veut répliquer la logique exacte).
    *   *Recommandation* : Pour l'instant, ne pas complexifier le modèle mobile. Envoyer la modification au backend qui gère l'historique. Le mobile reçoit juste le nouvel état calculé.

4.  **Synchronisation** :
    *   Le DTO de synchro montant (Mobile -> Backend) doit inclure le `updateScope`.
