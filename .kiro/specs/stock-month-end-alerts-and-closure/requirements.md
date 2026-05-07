# Document de Requirements — Alertes Fin de Mois et Clôture Automatique du Stock

## Introduction

Cette fonctionnalité ajoute deux capacités au système pour améliorer la gestion des stocks en fin de mois :

1. **Alertes fin de mois** — afficher des messages d'avertissement dans le dashboard stock et la création de demande de sortie stock quand il reste ≤ 5 jours avant la fin du mois, rappelant que tous les articles non vendus doivent être retournés ou distribués avant la fin du mois.

2. **Option "Mois prochain"** — dans la création de demande de sortie stock, si on est dans les 5 derniers jours du mois, proposer une option pour créer la demande pour le mois prochain. Sélectionner cette option clôture automatiquement le stock du mois courant pour le commercial et crée la demande dans le mois suivant.

---

## Glossaire

- **Fin de mois** : le dernier jour du mois calendaire (28, 29, 30 ou 31 selon le mois).
- **Jours restants** : nombre de jours entre aujourd'hui (inclus) et le dernier jour du mois (inclus).
- **Alerte fin de mois** : message d'avertissement affiché quand il reste ≤ 5 jours avant la fin du mois.
- **Option mois prochain** : option proposée à l'utilisateur pour créer une demande de sortie stock pour le mois prochain au lieu du mois courant.
- **Clôture du stock** : marquer le stock du mois courant comme CLOSED, indiquant qu'aucune nouvelle distribution ne peut être faite sur ce stock.
- **Mois prochain** : le mois suivant le mois courant (ex : février si on est en janvier).

---

## Requirements

### Requirement 1 : Calcul des jours restants jusqu'à la fin du mois

**User Story :** En tant que système, je veux calculer le nombre de jours restants jusqu'à la fin du mois, afin de déterminer si une alerte doit être affichée.

#### Acceptance Criteria

1. THE system SHALL calculer le nombre de jours entre aujourd'hui (inclus) et le dernier jour du mois (inclus).
2. THE calculation SHALL prendre en compte les mois de longueurs différentes (28, 29, 30, 31 jours).
3. THE calculation SHALL prendre en compte les années bissextiles pour février.
4. THE calculation SHALL retourner 0 si aujourd'hui est le dernier jour du mois.
5. THE calculation SHALL retourner un nombre négatif si on est après le dernier jour du mois (cas exceptionnel).

---

### Requirement 2 : Affichage de l'alerte fin de mois dans le dashboard stock

**User Story :** En tant que commercial ou gestionnaire, je veux voir une alerte dans le dashboard stock quand il reste ≤ 5 jours avant la fin du mois, afin de me rappeler que tous les articles non vendus doivent être retournés ou distribués.

#### Acceptance Criteria

1. THE MyStockDashboardComponent SHALL calculer le nombre de jours restants jusqu'à la fin du mois au chargement.
2. IF le nombre de jours restants est ≤ 5 et ≥ 0, THEN THE MyStockDashboardComponent SHALL afficher une alerte visuelle en haut du dashboard.
3. THE alerte SHALL afficher un message du type : "⚠️ Il reste X jour(s) avant la fin du mois. Tous les articles non vendus doivent être retournés en stock ou distribués avant la fin du mois."
4. IF le nombre de jours restants est 0 (dernier jour du mois), THEN THE alerte SHALL afficher un message du type : "🔴 C'est le dernier jour du mois. Tous les articles doivent être retournés ou distribués AUJOURD'HUI."
5. THE alerte SHALL utiliser un style visuel distinctif (couleur warning ou danger, icône, etc.) pour attirer l'attention.
6. IF le nombre de jours restants est > 5, THEN THE alerte SHALL ne pas être affichée.

---

### Requirement 3 : Affichage de l'alerte et option mois prochain dans la création de demande de sortie stock

**User Story :** En tant que commercial ou gestionnaire, je veux voir une alerte et une option pour créer une demande pour le mois prochain quand il reste ≤ 5 jours avant la fin du mois, afin de faciliter la gestion des stocks en fin de mois.

#### Acceptance Criteria

1. THE StockRequestCreateComponent SHALL calculer le nombre de jours restants jusqu'à la fin du mois au chargement.
2. IF le nombre de jours restants est ≤ 5 et ≥ 0, THEN THE StockRequestCreateComponent SHALL afficher une alerte identique à celle du dashboard.
3. IF le nombre de jours restants est ≤ 5 et ≥ 0, THEN THE StockRequestCreateComponent SHALL afficher une option "Créer pour le mois prochain ?" avec deux boutons : "Mois courant" et "Mois prochain".
4. WHEN l'utilisateur clique sur "Mois courant", THE StockRequestCreateComponent SHALL créer la demande pour le mois courant (comportement par défaut).
5. WHEN l'utilisateur clique sur "Mois prochain", THE StockRequestCreateComponent SHALL créer la demande pour le mois prochain et clôturer automatiquement le stock du mois courant.
6. IF le nombre de jours restants est > 5, THEN THE alerte et l'option mois prochain SHALL ne pas être affichées.

---

### Requirement 4 : Clôture automatique du stock du mois courant

**User Story :** En tant que système, je veux clôturer automatiquement le stock du mois courant quand l'utilisateur crée une demande pour le mois prochain, afin d'éviter les distributions ultérieures sur un stock fermé.

#### Acceptance Criteria

1. WHEN l'utilisateur crée une demande de sortie stock avec l'option "Mois prochain", THE backend SHALL clôturer le stock du mois courant du commercial.
2. THE clôture SHALL marquer le stock comme CLOSED dans la base de données.
3. THE clôture et la création de la demande SHALL être effectuées dans une transaction atomique : si une étape échoue, aucune modification ne doit être sauvegardée.
4. AFTER la clôture, aucune nouvelle distribution ne doit être possible sur le stock du mois courant (vérification lors de la création de rattrapage ou retour).
5. IF une erreur survient lors de la clôture, THE backend SHALL retourner une erreur HTTP 500 et ne pas créer la demande.

---

### Requirement 5 : Création de la demande pour le mois prochain

**User Story :** En tant que système, je veux créer la demande pour le mois prochain avec les bonnes dates, afin que la demande soit correctement associée au mois suivant.

#### Acceptance Criteria

1. WHEN l'utilisateur crée une demande avec l'option "Mois prochain", THE backend SHALL créer la demande avec `month` et `year` du mois prochain.
2. THE mois prochain SHALL être calculé correctement, y compris le passage d'année (ex : décembre → janvier de l'année suivante).
3. IF le stock du mois prochain n'existe pas encore, THE backend SHALL le créer automatiquement.
4. THE demande créée SHALL être visible dans le système avec les bonnes dates du mois prochain.

---

### Requirement 6 : Composant réutilisable pour l'alerte

**User Story :** En tant que développeur, je veux un composant réutilisable pour afficher l'alerte fin de mois, afin d'éviter la duplication de code entre le dashboard et la création de demande.

#### Acceptance Criteria

1. THE AlerteFinMoisComponent SHALL être un composant Angular réutilisable avec `@Input() daysRemaining` et `@Input() showAlert`.
2. THE AlerteFinMoisComponent SHALL afficher le message approprié selon le nombre de jours restants.
3. THE AlerteFinMoisComponent SHALL être utilisé dans MyStockDashboardComponent et StockRequestCreateComponent.

---

### Requirement 7 : Utilitaire de calcul des jours restants

**User Story :** En tant que développeur, je veux un utilitaire centralisé pour calculer les jours restants jusqu'à la fin du mois, afin d'assurer la cohérence entre le frontend et le backend.

#### Acceptance Criteria

1. THE MonthEndCalculator SHALL fournir une méthode `getDaysUntilMonthEnd()` retournant le nombre de jours restants.
2. THE MonthEndCalculator SHALL fournir une méthode `isInLastFiveDaysOfMonth()` retournant true si `daysUntilMonthEnd <= 5`.
3. THE MonthEndCalculator SHALL fournir une méthode `getNextMonthDate()` retournant le mois et l'année du mois prochain.
4. THE MonthEndCalculator SHALL être utilisé dans les composants frontend et le backend.

---

### Requirement 8 : Validation et intégrité des données

**User Story :** En tant que système, je veux valider que la clôture du stock et la création de la demande sont cohérentes, afin d'éviter les incohérences comptables.

#### Acceptance Criteria

1. THE backend SHALL vérifier que le stock du mois courant existe avant de le clôturer.
2. THE backend SHALL vérifier que le stock du mois courant n'est pas déjà clôturé.
3. THE backend SHALL vérifier que le mois prochain est correctement calculé.
4. IF une validation échoue, THE backend SHALL retourner une erreur HTTP 400 avec un message explicite.
