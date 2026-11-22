# Module BI Dashboard - ELYKIA

## 📊 Vue d'ensemble

Le module BI (Business Intelligence) fournit une interface complète d'analyse des performances commerciales et financières du système ELYKIA. Il permet de suivre en temps réel les ventes, les recouvrements, le stock et les performances des commerciaux.

## 🎯 Fonctionnalités

### Dashboard Principal
- **KPI Cards** : Affichage des métriques clés (CA, Marge, Encaissements, Stock)
- **Filtres de période** : Aujourd'hui, Semaine, Mois, Année, Personnalisé
- **Alertes** : Notifications sur les ruptures de stock, retards de paiement, etc.
- **Graphiques** : Visualisation des tendances et distributions

### Modules Spécialisés (À venir)
- **Module Ventes** : Analyse détaillée des ventes par commercial, article, période
- **Module Recouvrement** : Suivi des encaissements, retards, solvabilité
- **Module Stock** : Gestion des alertes, rotation, mouvements

## 📁 Structure du Module

```
src/app/bi/
├── components/              # Composants réutilisables
│   └── bi-kpi-card/        # Carte KPI avec évolution
├── pages/                   # Pages principales
│   └── bi-dashboard/       # Dashboard principal
├── services/                # Services API
│   ├── bi.service.ts       # Service principal
│   ├── bi-sales.service.ts # Service ventes
│   ├── bi-collections.service.ts # Service recouvrements
│   └── bi-stock.service.ts # Service stock
├── types/                   # Types TypeScript
│   └── bi.types.ts         # Interfaces et types
├── bi.module.ts            # Module Angular
├── bi-routing.module.ts    # Configuration des routes
└── README.md               # Documentation
```

## 🔌 API Endpoints

### Dashboard Principal
- `GET /api/v1/bi/dashboard/overview` - Vue d'ensemble complète
- `GET /api/v1/bi/dashboard/sales/metrics` - Métriques de ventes
- `GET /api/v1/bi/dashboard/collections/metrics` - Métriques de recouvrement
- `GET /api/v1/bi/dashboard/stock/metrics` - Métriques de stock
- `GET /api/v1/bi/dashboard/portfolio/metrics` - Métriques du portefeuille

### Ventes
- `GET /api/v1/bi/sales/trends` - Tendances des ventes
- `GET /api/v1/bi/sales/by-commercial` - Performance des commerciaux
- `GET /api/v1/bi/sales/by-article` - Performance des articles

### Recouvrements
- `GET /api/v1/bi/collections/trends` - Tendances des encaissements
- `GET /api/v1/bi/collections/overdue-analysis` - Analyse des retards
- `GET /api/v1/bi/collections/solvency-distribution` - Distribution de solvabilité

### Stock
- `GET /api/v1/bi/stock/alerts` - Toutes les alertes de stock
- `GET /api/v1/bi/stock/out-of-stock` - Articles en rupture
- `GET /api/v1/bi/stock/low-stock` - Articles en stock faible

## 🎨 Design System

### Palette de Couleurs
- **Primaire** : `#2563EB` (Bleu Royal) - Actions principales
- **Succès** : `#10B981` (Émeraude) - Croissance, Stock OK
- **Attention** : `#F59E0B` (Ambre) - Stock faible, Retard léger
- **Danger** : `#EF4444` (Rose Vif) - Rupture, Retard critique
- **Info** : `#6366F1` (Indigo) - Informations

### Composants
- **KPI Card** : Carte avec valeur, évolution, icône et sparkline
- **Alert Card** : Carte d'alerte avec icône, titre, message et action
- **Chart Card** : Carte contenant un graphique

## 🚀 Utilisation

### Accès au Module
Le module BI est accessible via la sidebar pour les utilisateurs ayant les rôles :
- `ROLE_ADMIN`
- `ROLE_MANAGER`

### Navigation
```
/bi                    → Redirection vers /bi/dashboard
/bi/dashboard          → Dashboard principal
/bi/sales              → Module Ventes (à venir)
/bi/collections        → Module Recouvrement (à venir)
/bi/stock              → Module Stock (à venir)
```

### Exemple d'Utilisation du Service

```typescript
import { BiService } from './services/bi.service';

constructor(private biService: BiService) {}

loadDashboard() {
  const filter = {
    startDate: '2025-11-01',
    endDate: '2025-11-18'
  };

  this.biService.getDashboardOverview(filter).subscribe({
    next: (data) => {
      console.log('Dashboard data:', data);
    },
    error: (err) => {
      console.error('Error:', err);
    }
  });
}
```

### Exemple d'Utilisation du Composant KPI Card

```typescript
// Dans le component
kpiData: KpiCardData = {
  title: 'Chiffre d\'affaires',
  value: 12500000,
  evolution: 15.3,
  icon: 'trending_up',
  color: 'primary',
  format: 'currency',
  subtitle: '156 ventes'
};
```

```html
<!-- Dans le template -->
<app-bi-kpi-card [data]="kpiData" [loading]="loading"></app-bi-kpi-card>
```

## 📝 Types Principaux

### DashboardOverview
```typescript
interface DashboardOverview {
  sales: SalesMetrics;
  collections: CollectionMetrics;
  stock: StockMetrics;
  portfolio: PortfolioMetrics;
}
```

### KpiCardData
```typescript
interface KpiCardData {
  title: string;
  value: number | string;
  evolution?: number;
  icon?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  format?: 'currency' | 'number' | 'percentage';
  trend?: number[];
  subtitle?: string;
}
```

## 🔧 Configuration

### Environment
Assurez-vous que l'URL de l'API est correctement configurée dans `environment.ts` :

```typescript
export const environment = {
  apiUrl: 'http://localhost:8080/api/v1'
};
```

### Permissions
Les permissions requises sont définies dans le routing :
- `ROLE_ADMIN` : Accès complet
- `ROLE_MANAGER` : Accès complet

## 📊 Métriques Disponibles

### Ventes
- Chiffre d'affaires total
- Marge brute
- Nombre de ventes
- Panier moyen
- Évolution par rapport à la période précédente

### Recouvrements
- Montant collecté
- Taux de recouvrement
- Paiements à temps / en retard
- Portfolio at Risk (PAR)

### Stock
- Valeur totale du stock
- Nombre d'articles
- Articles en rupture
- Articles en stock faible
- Taux de rotation moyen

### Portefeuille
- Crédits actifs
- Montant en cours
- Montant en retard
- PAR 7/15/30 jours

## 🎯 Prochaines Étapes

### Phase 2 : Modules Spécialisés
- [ ] Page Analyse des Ventes
- [ ] Page Analyse des Recouvrements
- [ ] Page Analyse du Stock

### Phase 3 : Graphiques
- [ ] Intégration de Chart.js ou D3.js
- [ ] Graphiques de tendances
- [ ] Graphiques de distribution
- [ ] Heatmaps

### Phase 4 : Fonctionnalités Avancées
- [ ] Export PDF/Excel
- [ ] Rapports automatiques
- [ ] Alertes personnalisables
- [ ] Tableaux de bord personnalisés

## 📚 Documentation Complète

Pour plus de détails, consultez :
- `docs/BI_DASHBOARD_SPECIFICATION.md` - Spécifications fonctionnelles
- `docs/BI_DASHBOARD_UX_SPEC.md` - Spécifications UX/UI
- `docs/BI_DASHBOARD_API_REFERENCE.md` - Référence API complète

## 🤝 Contribution

Pour ajouter de nouvelles fonctionnalités :
1. Créer un nouveau service dans `services/`
2. Définir les types dans `types/bi.types.ts`
3. Créer les composants dans `components/` ou `pages/`
4. Ajouter les routes dans `bi-routing.module.ts`
5. Mettre à jour la documentation

## 📄 Licence

© 2025 ELYKIA - Tous droits réservés
