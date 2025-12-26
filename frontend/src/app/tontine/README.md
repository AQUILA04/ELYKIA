# Module Tontine - Documentation

## Vue d'ensemble

Ce module implémente la fonctionnalité complète de gestion des tontines selon les spécifications définies dans `tontine_ux_spec.md` et `tontine_implementation.md`.

## Architecture

Le module suit l'architecture établie par le module `orders` avec une structure claire et modulaire :

```
tontine/
├── components/              # Composants réutilisables
│   ├── filter-bar/         # Barre de filtres
│   ├── kpi-card/           # Cartes KPI
│   ├── member-table/       # Tableau des membres
│   └── modals/             # Modales
│       ├── add-member-modal/
│       ├── record-collection-modal/
│       └── session-settings-modal/
├── pages/                  # Pages principales
│   ├── tontine-dashboard/  # Tableau de bord
│   └── member-details/     # Détails d'un membre
├── services/               # Services
│   └── tontine.service.ts  # Service principal
├── types/                  # Types TypeScript
│   └── tontine.types.ts    # Définitions de types
├── tontine-routing.module.ts
└── tontine.module.ts
```

## Fonctionnalités implémentées

### 1. Tableau de bord (Dashboard)
- **Route**: `/tontine`
- **Composant**: `TontineDashboardComponent`
- **Fonctionnalités**:
  - Affichage des KPIs (membres actifs, montant total collecté, livraisons en attente, contribution moyenne)
  - Liste paginée et triable des membres
  - Filtres par statut de livraison et recherche
  - Actions: Ajouter un membre, Paramètres de session

### 2. Détails d'un membre
- **Route**: `/tontine/member/:id`
- **Composant**: `MemberDetailsComponent`
- **Fonctionnalités**:
  - Affichage des informations du membre
  - Historique complet des collectes
  - Enregistrement de nouvelles collectes
  - Marquage comme livré

### 3. Gestion des membres
- **Ajout de membre**: Modal pour inscrire un client à la session en cours
- **Recherche de clients**: Intégration avec l'API Elasticsearch
- **Validation**: Empêche les inscriptions en double

### 4. Gestion des collectes
- **Enregistrement**: Modal pour enregistrer une nouvelle collecte
- **Validation**: Montants min/max configurables
- **Historique**: Liste complète des collectes par membre

### 5. Gestion des sessions
- **Session automatique**: La session de l'année en cours est créée automatiquement
- **Paramètres**: Modal pour modifier les dates de début et fin
- **Statut**: Suivi du statut de la session (ACTIVE/CLOSED)

## API Backend

Le module consomme les endpoints suivants (voir `tontine_implementation.md`) :

### Membres
- `POST /api/v1/tontines/members` - Inscrire un membre
- `GET /api/v1/tontines/members` - Liste des membres (paginée)
- `GET /api/v1/tontines/members/{id}` - Détails d'un membre
- `PATCH /api/v1/tontines/members/{id}/deliver` - Marquer comme livré

### Collectes
- `POST /api/v1/tontines/collections` - Enregistrer une collecte
- `GET /api/v1/tontines/members/{id}/collections` - Historique des collectes

### Sessions
- `GET /api/v1/tontines/sessions/current` - Session en cours
- `PUT /api/v1/tontines/sessions/current` - Modifier la session

### Clients
- `GET /api/v1/clients` - Liste des clients
- `POST /api/v1/clients/elasticsearch` - Recherche de clients

## État de l'application

Le service `TontineService` gère un état réactif avec RxJS :

```typescript
interface TontineState {
  members: readonly TontineMember[];
  filteredMembers: readonly TontineMember[];
  filters: TontineFilters;
  pagination: TontinePaginationConfig;
  loading: boolean;
  error: string | null;
  kpis: TontineKPI | null;
  currentSession: TontineSession | null;
}
```

## Types principaux

### TontineMember
```typescript
interface TontineMember {
  id: number;
  tontineSession: TontineSession;
  client: TontineClient;
  totalContribution: number;
  deliveryStatus: DeliveryStatus;
  registrationDate: string;
}
```

### TontineCollection
```typescript
interface TontineCollection {
  id: number;
  tontineMember: TontineMember;
  amount: number;
  collectionDate: string;
  commercialUsername: string;
}
```

### TontineSession
```typescript
interface TontineSession {
  id: number;
  year: number;
  startDate: string;
  endDate: string;
  status: SessionStatus;
}
```

## Permissions

Le module utilise les permissions suivantes :
- `ROLE_TONTINE` - Consultation
- `ROLE_EDIT_TONTINE` - Modification

## Intégration

### Routing
Le module est lazy-loaded dans `app-routing.module.ts` :
```typescript
{
  path: 'tontine',
  loadChildren: () => import('./tontine/tontine.module').then(m => m.TontineModule),
  canActivate: [NgxPermissionsGuard],
  data: {
    permissions: {
      only: ['ROLE_TONTINE', 'ROLE_EDIT_TONTINE'],
      redirectTo: '/home'
    }
  }
}
```

### Navigation
Le lien est ajouté dans le sidebar (`sidebar.component.html`) :
```html
<li class="sidebar-item" *ngxPermissionsOnly="['ROLE_TONTINE','ROLE_EDIT_TONTINE']">
  <a class="sidebar-link" routerLink="/tontine">
    <mat-icon>savings</mat-icon>
    <span class="hide-menu">Tontines</span>
  </a>
</li>
```

## Constantes

```typescript
const TONTINE_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_COLLECTION_AMOUNT: 100,
  MAX_COLLECTION_AMOUNT: 1000000,
  CURRENCY_CODE: 'XOF',
  DATE_FORMAT: 'dd/MM/yyyy',
  DATETIME_FORMAT: 'dd/MM/yyyy HH:mm'
};
```

## Gestion des erreurs

Le service implémente une gestion centralisée des erreurs avec des messages utilisateur appropriés pour chaque code HTTP :
- 400: Données invalides
- 401: Session expirée
- 403: Permissions insuffisantes
- 404: Ressource non trouvée
- 409: Conflit (ex: membre déjà inscrit)
- 500: Erreur serveur

## Styles

Le module utilise Angular Material et suit les conventions de style du projet :
- Couleurs cohérentes avec le design system
- Responsive design (mobile-first)
- Animations et transitions fluides
- États de chargement et messages d'erreur

## Tests

Pour tester le module :

1. **Accès**: Naviguer vers `/tontine`
2. **Ajouter un membre**: Cliquer sur "Ajouter un Membre"
3. **Enregistrer une collecte**: Cliquer sur un membre puis "Enregistrer une Collecte"
4. **Marquer comme livré**: Dans les détails d'un membre, cliquer sur "Marquer comme Livré"
5. **Paramètres**: Cliquer sur "Paramètres de Session" pour modifier les dates

## Notes importantes

- La session de l'année en cours est créée automatiquement lors de la première opération
- Un client ne peut être inscrit qu'une seule fois par session
- Les collectes mettent à jour automatiquement le total du membre
- Le statut de livraison ne peut être changé que de PENDING à DELIVERED
- Tous les montants sont en XOF (Franc CFA)

## Améliorations futures possibles

1. Impression de reçus pour les collectes
2. Export des données en Excel/PDF
3. Statistiques avancées et graphiques
4. Notifications pour les collectes en retard
5. Gestion des articles de livraison de fin d'année
6. Historique des modifications
7. Commentaires sur les membres
8. Gestion multi-sessions (années précédentes)
