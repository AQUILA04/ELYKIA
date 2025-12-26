# Plan d'Implémentation US008 - Écran de Recouvrement

## Analyse des Exigences

### Fonctionnalités Requises (basées sur l'US008)
1. **Sélection Client** : Afficher les informations du client sélectionné
2. **Liste des Crédits Actifs** : Afficher tous les crédits en cours du client avec :
   - Référence du crédit et date
   - Barre de progression du remboursement
   - Montant total, montant payé, montant restant
   - Mise journalière attendue
   - Bouton de sélection
3. **Saisie du Montant** : Section pour collecter le montant avec validation
4. **Confirmation** : Bouton pour confirmer le recouvrement

### Rendu Visuel Attendu (basé sur les images fournies)
- **Header vert** avec titre "Nouveau Recouvrement" et bouton retour
- **Section Client** avec nom et coordonnées dans un cadre vert
- **Section Crédits Actifs** avec icône et titre
- **Cards de Crédits** avec :
  - Référence et date en en-tête
  - Barre de progression colorée (verte)
  - Trois colonnes : Montant total (bleu), Montant payé (vert), Montant restant (rouge)
  - Zone mise journalière avec fond vert clair
  - Bouton "Sélectionner ce Crédit" vert
- **Section Montant à Collecter** (visible après sélection)
- **Bouton de confirmation** fixe en bas

## Architecture Existante Analysée

### Services Existants
- ✅ `RecoveryService` : Service de base existant
- ✅ `Recovery` model : Interface définie
- ✅ Store NgRx : Actions, reducers, effects, selectors

### Manquant
- ❌ Page/Composant UI pour l'écran de recouvrement
- ❌ Logique de sélection de client et crédits
- ❌ Validation des montants selon les règles métier
- ❌ Interface utilisateur conforme aux maquettes

## Fichiers à Créer/Modifier

### 1. Nouveaux Fichiers à Créer

#### Page Recovery
- `src/app/features/recovery/` (nouveau dossier)
- `src/app/features/recovery/recovery.page.ts`
- `src/app/features/recovery/recovery.page.html`
- `src/app/features/recovery/recovery.page.scss`
- `src/app/features/recovery/recovery.module.ts`
- `src/app/features/recovery/recovery-routing.module.ts`

#### Composants
- `src/app/features/recovery/components/credit-card/credit-card.component.ts`
- `src/app/features/recovery/components/credit-card/credit-card.component.html`
- `src/app/features/recovery/components/credit-card/credit-card.component.scss`
- `src/app/features/recovery/components/amount-input/amount-input.component.ts`
- `src/app/features/recovery/components/amount-input/amount-input.component.html`
- `src/app/features/recovery/components/amount-input/amount-input.component.scss`

### 2. Fichiers Existants à Modifier

#### Services
- `src/app/core/services/recovery.service.ts` : Ajouter méthodes pour créer un recouvrement
- `src/app/core/services/distribution.service.ts` : Ajouter méthodes pour récupérer les crédits d'un client

#### Store NgRx
- `src/app/store/recovery/recovery.actions.ts` : Ajouter actions pour création recouvrement
- `src/app/store/recovery/recovery.effects.ts` : Ajouter effects pour gestion des recouvrements
- `src/app/store/recovery/recovery.reducer.ts` : Ajouter états pour l'UI de recouvrement
- `src/app/store/recovery/recovery.selectors.ts` : Ajouter sélecteurs pour l'UI

#### Routing
- `src/app/app-routing.module.ts` : Ajouter route vers la page recovery

#### Models (si nécessaire)
- `src/app/models/distribution.model.ts` : Vérifier/compléter interface Distribution
- `src/app/models/client.model.ts` : Vérifier interface Client

## Détails des Modifications

### 1. Service Recovery - Nouvelles Méthodes
```typescript
// Méthodes à ajouter dans recovery.service.ts
createRecovery(recovery: Partial<Recovery>): Observable<Recovery>
validateRecoveryAmount(amount: number, distributionId: string): Observable<boolean>
getClientActiveCredits(clientId: string): Observable<Distribution[]>
```

### 2. Store NgRx - Nouvelles Actions
```typescript
// Actions à ajouter
loadClientCredits = createAction('[Recovery] Load Client Credits', props<{clientId: string}>())
selectCredit = createAction('[Recovery] Select Credit', props<{distributionId: string}>())
setRecoveryAmount = createAction('[Recovery] Set Recovery Amount', props<{amount: number}>())
createRecovery = createAction('[Recovery] Create Recovery', props<{recovery: Partial<Recovery>}>())
```

### 3. Interface Utilisateur - Composants Clés

#### Credit Card Component
- Affichage des informations du crédit
- Barre de progression
- Bouton de sélection
- Validation visuelle de l'état

#### Amount Input Component
- Champ de saisie numérique
- Validation en temps réel
- Affichage des erreurs
- Formatage de la devise

### 4. Règles de Validation à Implémenter
- Montant ≤ montant restant dû (RM-RECOUV-003)
- Montant multiple de la mise journalière (RM-RECOUV-004)
- Vérification du solde disponible (RM-RECOUV-004)

### 5. Styles CSS - Conformité aux Maquettes
- Header vert (#4CAF50) avec titre centré
- Cards avec bordures arrondies et ombres
- Couleurs spécifiques : bleu (montant total), vert (payé), rouge (restant)
- Boutons verts avec hover effects
- Responsive design pour mobile

## Ordre d'Implémentation

1. **Créer la structure de base** : Page, module, routing
2. **Implémenter les composants UI** : Credit card, amount input
3. **Étendre les services** : Méthodes pour récupérer et créer les recouvrements
4. **Compléter le store NgRx** : Actions, effects, reducers pour l'UI
5. **Intégrer la logique métier** : Validation, calculs, règles
6. **Styliser selon les maquettes** : CSS conforme aux images fournies
7. **Tester l'intégration** : Vérifier le flux complet

## Points d'Attention

### Préservation de l'Existant
- Ne pas modifier la logique d'initialisation des données existante
- Respecter l'architecture local-first
- Intégrer harmonieusement avec les services existants

### Conformité Visuelle
- Respecter scrupuleusement les couleurs des maquettes
- Implémenter les barres de progression avec les bonnes couleurs
- Assurer la responsivité mobile
- Respecter les espacements et bordures arrondies

### Performance
- Optimiser les requêtes de base de données
- Gérer les états de chargement
- Implémenter la gestion d'erreur appropriée

