# Requirements Document

## Introduction

Cette fonctionnalité permet aux utilisateurs de fusionner plusieurs crédits d'un même commercial en un seul crédit consolidé. L'interface utilisateur sera intégrée dans le module de gestion des crédits existant, avec un nouveau bouton "Fusion" et un modal dédié pour sélectionner et fusionner les crédits éligibles.

## Requirements

### Requirement 1

**User Story:** En tant qu'utilisateur de l'application de gestion des crédits, je veux pouvoir accéder à une fonctionnalité de fusion depuis la liste des crédits, afin de pouvoir initier le processus de fusion facilement.

#### Acceptance Criteria

1. WHEN l'utilisateur consulte la liste des crédits THEN le système SHALL afficher un bouton "Fusion" à côté du bouton "Ajouter" existant
2. WHEN l'utilisateur clique sur le bouton "Fusion" THEN le système SHALL ouvrir un modal de fusion des crédits
3. IF l'utilisateur a les permissions appropriées THEN le système SHALL permettre l'accès au bouton "Fusion"

### Requirement 2

**User Story:** En tant qu'utilisateur, je veux pouvoir sélectionner un commercial et voir ses crédits fusionnables, afin de choisir lesquels fusionner.

#### Acceptance Criteria

1. WHEN le modal de fusion s'ouvre THEN le système SHALL afficher une liste déroulante des commerciaux disponibles
2. WHEN l'utilisateur sélectionne un commercial THEN le système SHALL automatiquement charger et afficher la liste des crédits fusionnables pour ce commercial via l'API GET /api/v1/credits/mergeable/{commercialUsername}
3. WHEN aucun crédit fusionnable n'existe pour le commercial sélectionné THEN le système SHALL afficher un message informatif "Aucun crédit fusionnable trouvé pour ce commercial"
4. WHEN le chargement des crédits est en cours THEN le système SHALL afficher un indicateur de chargement

### Requirement 3

**User Story:** En tant qu'utilisateur, je veux pouvoir sélectionner plusieurs crédits à fusionner, afin de créer un crédit consolidé.

#### Acceptance Criteria

1. WHEN les crédits fusionnables sont affichés THEN le système SHALL permettre la sélection multiple via des checkboxes
2. WHEN l'utilisateur sélectionne/désélectionne un crédit THEN le système SHALL mettre à jour le compteur de crédits sélectionnés
3. IF moins de 2 crédits sont sélectionnés THEN le système SHALL désactiver le bouton "Fusionner"
4. WHEN au moins 2 crédits sont sélectionnés THEN le système SHALL activer le bouton "Fusionner" avec le nombre de crédits sélectionnés affiché

### Requirement 4

**User Story:** En tant qu'utilisateur, je veux pouvoir exécuter la fusion des crédits sélectionnés, afin d'obtenir un nouveau crédit consolidé.

#### Acceptance Criteria

1. WHEN l'utilisateur clique sur "Fusionner" avec au moins 2 crédits sélectionnés THEN le système SHALL envoyer une requête POST à l'API /api/v1/credits/merge avec les IDs des crédits et le nom d'utilisateur du commercial
2. WHEN la fusion est en cours THEN le système SHALL afficher un indicateur de chargement sur le bouton "Fusionner" et le désactiver
3. WHEN la fusion réussit THEN le système SHALL afficher un message de succès avec la nouvelle référence du crédit fusionné
4. WHEN la fusion réussit THEN le système SHALL fermer le modal et actualiser la liste des crédits
5. WHEN la fusion échoue THEN le système SHALL afficher le message d'erreur retourné par l'API

### Requirement 5

**User Story:** En tant qu'utilisateur, je veux que l'interface de fusion soit cohérente avec le design existant, afin d'avoir une expérience utilisateur fluide.

#### Acceptance Criteria

1. WHEN le bouton "Fusion" est affiché THEN le système SHALL utiliser le même style et la même couleur que le bouton "Ajouter"
2. WHEN le modal de fusion s'affiche THEN le système SHALL respecter les conventions de design du projet (Bootstrap, couleurs, typographie)
3. WHEN les montants sont affichés THEN le système SHALL utiliser le format monétaire XOF avec le pipe currency approprié
4. WHEN les dates sont affichées THEN le système SHALL utiliser le format DD/MM/YYYY

### Requirement 6

**User Story:** En tant qu'utilisateur, je veux que les erreurs soient gérées de manière appropriée, afin de comprendre ce qui se passe en cas de problème.

#### Acceptance Criteria

1. WHEN une erreur de réseau survient THEN le système SHALL afficher un message d'erreur générique approprié
2. WHEN l'API retourne une erreur 400 avec un message spécifique THEN le système SHALL afficher ce message d'erreur à l'utilisateur
3. WHEN le token d'authentification expire THEN le système SHALL gérer l'erreur d'authentification de manière appropriée
4. WHEN une requête prend trop de temps THEN le système SHALL gérer le timeout et informer l'utilisateur

### Requirement 7

**User Story:** En tant qu'utilisateur, je veux que les données soient validées côté frontend, afin d'éviter les erreurs inutiles.

#### Acceptance Criteria

1. WHEN aucun commercial n'est sélectionné THEN le système SHALL empêcher le chargement des crédits
2. WHEN moins de 2 crédits sont sélectionnés THEN le système SHALL empêcher l'exécution de la fusion
3. WHEN le formulaire est invalide THEN le système SHALL afficher des messages de validation appropriés
4. WHEN l'utilisateur tente de fermer le modal pendant une opération THEN le système SHALL demander confirmation si nécessaire