# Prochaines Étapes - Module BI Dashboard

## 🚀 Actions Immédiates

### 1. Installation des Dépendances pour les Graphiques

```bash
# Installer Chart.js et ng2-charts
npm install chart.js ng2-charts

# Installer les types TypeScript
npm install --save-dev @types/chart.js
```

### 2. Tester le Module BI

```bash
# Démarrer le serveur de développement
ng serve

# Accéder au dashboard BI
# URL: http://localhost:4200/bi
```

### 3. Vérifier les Endpoints Backend

Assurez-vous que les endpoints suivants sont disponibles :

```bash
# Test avec curl (remplacer YOUR_TOKEN par votre JWT)

# Dashboard Overview
curl -X GET "http://localhost:8080/api/v1/bi/dashboard/overview" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Sales Metrics
curl -X GET "http://localhost:8080/api/v1/bi/dashboard/sales/metrics" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Collection Metrics
curl -X GET "http://localhost:8080/api/v1/bi/dashboard/collections/metrics" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Stock Metrics
curl -X GET "http://localhost:8080/api/v1/bi/dashboard/stock/metrics" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Phase 2 : Implémentation des Graphiques

### Étape 1 : Créer le Service de Graphiques

Créer `src/app/bi/services/chart.service.ts` :

```typescript
import { Injectable } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';

@Injectable({
  providedIn: 'root'
})
export class ChartService {
  
  /**
   * Configuration par défaut pour les graphiques en ligne
   */
  getLineChartConfig(data: ChartData): ChartConfiguration {
    return {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top'
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };
  }

  /**
   * Configuration pour les graphiques en donut
   */
  getDonutChartConfig(data: ChartData): ChartConfiguration {
    return {
      type: 'doughnut',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'right'
          }
        }
      }
    };
  }

  /**
   * Configuration pour les graphiques en barres
   */
  getBarChartConfig(data: ChartData): ChartConfiguration {
    return {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };
  }
}
```

### Étape 2 : Créer le Composant de Graphique en Ligne

Créer `src/app/bi/components/line-chart/line-chart.component.ts` :

```typescript
import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

@Component({
  selector: 'app-line-chart',
  template: `
    <div class="chart-container">
      <canvas baseChart
        [data]="chartData"
        [options]="chartOptions"
        [type]="'line'">
      </canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      height: 300px;
      width: 100%;
    }
  `]
})
export class LineChartComponent implements OnInit {
  @Input() chartData!: ChartData;
  @Input() chartOptions?: ChartConfiguration['options'];
  @ViewChild(BaseChartDirective) chart?: BaseChartDirective;

  ngOnInit(): void {
    if (!this.chartOptions) {
      this.chartOptions = {
        responsive: true,
        maintainAspectRatio: false
      };
    }
  }
}
```

### Étape 3 : Mettre à Jour le Module BI

Ajouter dans `src/app/bi/bi.module.ts` :

```typescript
import { NgChartsModule } from 'ng2-charts';
import { LineChartComponent } from './components/line-chart/line-chart.component';

@NgModule({
  declarations: [
    // ... existing declarations
    LineChartComponent
  ],
  imports: [
    // ... existing imports
    NgChartsModule
  ]
})
export class BiModule { }
```

### Étape 4 : Intégrer dans le Dashboard

Mettre à jour `src/app/bi/pages/bi-dashboard/bi-dashboard.component.ts` :

```typescript
// Ajouter les imports
import { ChartData } from 'chart.js';
import { BiSalesService } from '../../services/bi-sales.service';

// Dans la classe
salesTrendData: ChartData | null = null;

constructor(
  private biService: BiService,
  private biSalesService: BiSalesService
) {}

ngOnInit(): void {
  this.loadDashboard();
  this.loadSalesTrend();
}

loadSalesTrend(): void {
  const filter = this.getPeriodFilter();
  
  this.biSalesService.getSalesTrends(filter).subscribe({
    next: (trends) => {
      this.salesTrendData = {
        labels: trends.map(t => t.date),
        datasets: [
          {
            label: 'Chiffre d\'affaires',
            data: trends.map(t => t.totalAmount),
            borderColor: '#2563EB',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            tension: 0.4
          },
          {
            label: 'Marge',
            data: trends.map(t => t.totalProfit),
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4
          }
        ]
      };
    }
  });
}
```

Mettre à jour le template `bi-dashboard.component.html` :

```html
<!-- Remplacer le placeholder par -->
<div class="bi-dashboard__chart-card">
  <h3 class="bi-dashboard__chart-title">Évolution CA et Marge</h3>
  <app-line-chart 
    *ngIf="salesTrendData" 
    [chartData]="salesTrendData">
  </app-line-chart>
</div>
```

---

## 📄 Phase 3 : Créer les Pages Spécialisées

### Page Analyse des Ventes

```bash
# Générer les composants
ng generate component bi/pages/bi-sales-dashboard
ng generate component bi/components/sales-trend-chart
ng generate component bi/components/commercial-performance-table
```

### Page Analyse des Recouvrements

```bash
# Générer les composants
ng generate component bi/pages/bi-collections-dashboard
ng generate component bi/components/collection-trend-chart
ng generate component bi/components/overdue-analysis-chart
```

### Page Analyse du Stock

```bash
# Générer les composants
ng generate component bi/pages/bi-stock-dashboard
ng generate component bi/components/stock-alerts-table
ng generate component bi/components/stock-rotation-chart
```

---

## 🧪 Tests

### Tests Unitaires

```bash
# Exécuter les tests
ng test

# Avec couverture
ng test --code-coverage
```

### Tests E2E

```bash
# Installer Cypress
npm install --save-dev cypress

# Ouvrir Cypress
npx cypress open
```

---

## 📦 Build et Déploiement

### Build de Production

```bash
# Build optimisé
ng build --configuration production

# Vérifier la taille des bundles
npm run analyze
```

### Vérification Avant Déploiement

```bash
# Linting
ng lint

# Tests
ng test --watch=false

# Build
ng build --configuration production
```

---

## 📚 Documentation à Compléter

### 1. Guide Utilisateur
Créer `docs/BI_USER_GUIDE.md` avec :
- Comment accéder au dashboard
- Comment utiliser les filtres
- Comment interpréter les KPIs
- Comment exporter les données

### 2. Guide Développeur
Créer `docs/BI_DEVELOPER_GUIDE.md` avec :
- Architecture du module
- Comment ajouter un nouveau graphique
- Comment ajouter une nouvelle page
- Conventions de code

### 3. Changelog
Créer `docs/BI_CHANGELOG.md` pour suivre les versions

---

## 🔍 Checklist de Validation

### Avant de Passer à la Phase 2

- [ ] Le dashboard principal s'affiche correctement
- [ ] Les filtres de période fonctionnent
- [ ] Les KPI cards affichent les bonnes données
- [ ] Les alertes s'affichent correctement
- [ ] La navigation fonctionne
- [ ] Le responsive design est correct
- [ ] Aucune erreur dans la console
- [ ] Les endpoints backend répondent correctement

### Avant de Déployer en Production

- [ ] Tous les tests passent
- [ ] La couverture de tests est > 80%
- [ ] Le linting ne remonte aucune erreur
- [ ] Le build de production fonctionne
- [ ] La documentation est à jour
- [ ] Les permissions sont correctement configurées
- [ ] Les performances sont acceptables
- [ ] L'accessibilité est validée

---

## 🆘 Résolution de Problèmes

### Problème : Les données ne s'affichent pas

**Solution :**
1. Vérifier que le backend est démarré
2. Vérifier l'URL de l'API dans `environment.ts`
3. Vérifier le token JWT dans les headers
4. Vérifier les permissions de l'utilisateur
5. Consulter la console du navigateur pour les erreurs

### Problème : Erreur de compilation TypeScript

**Solution :**
1. Vérifier les imports
2. Vérifier que tous les types sont définis
3. Exécuter `npm install` pour installer les dépendances
4. Redémarrer le serveur de développement

### Problème : Les graphiques ne s'affichent pas

**Solution :**
1. Vérifier que Chart.js est installé : `npm list chart.js`
2. Vérifier que ng2-charts est installé : `npm list ng2-charts`
3. Vérifier l'import de `NgChartsModule` dans le module
4. Vérifier que les données sont au bon format

---

## 📞 Support

### Ressources
- Documentation Angular : https://angular.io/docs
- Documentation Chart.js : https://www.chartjs.org/docs/
- Documentation ng2-charts : https://valor-software.com/ng2-charts/

### Contact
Pour toute question :
1. Consulter la documentation dans `src/app/bi/README.md`
2. Consulter les spécifications dans `docs/BI_DASHBOARD_*.md`
3. Créer un ticket dans le système de gestion de projet

---

**Bonne continuation avec le développement du module BI ! 🚀**
