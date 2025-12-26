# 🚀 Quick Start - Module BI Dashboard

## ⚡ Démarrage Rapide (5 minutes)

### 1. Vérifier l'Installation ✅

Le module BI a été installé avec succès. Vérifiez que tous les fichiers sont présents :

```bash
# Vérifier la structure
ls src/app/bi/

# Devrait afficher :
# bi.module.ts
# bi-routing.module.ts
# README.md
# components/
# pages/
# services/
# types/
```

### 2. Démarrer l'Application 🚀

```bash
# Démarrer le serveur de développement
ng serve

# Ou avec un port spécifique
ng serve --port 4200
```

### 3. Accéder au Dashboard 📊

1. **Ouvrir le navigateur :**
   ```
   http://localhost:4200
   ```

2. **Se connecter avec un compte ayant les permissions :**
   - ROLE_ADMIN ou ROLE_MANAGER

3. **Cliquer sur "Dashboard BI" dans la sidebar**
   - Icône : analytics (📊)
   - Ou accéder directement : `http://localhost:4200/bi`

---

## 🎯 Ce que Vous Devriez Voir

### Dashboard Principal

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard BI                                                │
│  Vue d'ensemble des performances commerciales et financières │
├─────────────────────────────────────────────────────────────┤
│  [Aujourd'hui] [Cette semaine] [Ce mois] [Cette année]      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│  │ CA           │ │ Marge Brute  │ │ Encaissements│        │
│  │ 12,500,000 F │ │ 3,750,000 F  │ │ 8,200,000 F  │        │
│  │ ↑ +15.3%     │ │ ↑ +2.1%      │ │ ↓ -3.2%      │        │
│  └──────────────┘ └──────────────┘ └──────────────┘        │
│                                                              │
│  ┌──────────────┐                                           │
│  │ Stock Total  │                                           │
│  │ 15,000,000 F │                                           │
│  │ 245 articles │                                           │
│  └──────────────┘                                           │
├─────────────────────────────────────────────────────────────┤
│  Alertes et Notifications                                   │
│  ⚠️ 5 articles en rupture de stock                          │
│  ⚠️ 12 crédits en retard > 15 jours                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Configuration Backend

### Endpoints Requis

Le module BI nécessite que ces endpoints soient disponibles :

```
✅ GET /api/v1/bi/dashboard/overview
✅ GET /api/v1/bi/dashboard/sales/metrics
✅ GET /api/v1/bi/dashboard/collections/metrics
✅ GET /api/v1/bi/dashboard/stock/metrics
✅ GET /api/v1/bi/dashboard/portfolio/metrics
```

### Tester les Endpoints

```bash
# Remplacer YOUR_TOKEN par votre JWT
curl -X GET "http://localhost:8080/api/v1/bi/dashboard/overview" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse attendue :**
```json
{
  "status": "OK",
  "statusCode": 200,
  "message": "default.message.success",
  "service": "OPTIMIZE-SERVICE",
  "data": {
    "sales": { ... },
    "collections": { ... },
    "stock": { ... },
    "portfolio": { ... }
  }
}
```

---

## 🎨 Personnalisation Rapide

### Changer les Couleurs

Modifier `src/app/bi/components/bi-kpi-card/bi-kpi-card.component.scss` :

```scss
// Couleurs des cartes KPI
&--primary { border-left-color: #2563EB; }  // Bleu
&--success { border-left-color: #10B981; }  // Vert
&--warning { border-left-color: #F59E0B; }  // Orange
&--danger  { border-left-color: #EF4444; }  // Rouge
&--info    { border-left-color: #6366F1; }  // Indigo
```

### Ajouter une Nouvelle Carte KPI

Dans `bi-dashboard.component.ts` :

```typescript
newKpi: KpiCardData = {
  title: 'Mon KPI',
  value: 12345,
  evolution: 10.5,
  icon: 'trending_up',
  color: 'primary',
  format: 'number',
  subtitle: 'Description'
};
```

Dans `bi-dashboard.component.html` :

```html
<app-bi-kpi-card [data]="newKpi" [loading]="loading"></app-bi-kpi-card>
```

---

## 📊 Prochaine Étape : Ajouter des Graphiques

### Installation (2 minutes)

```bash
npm install chart.js ng2-charts
```

### Créer un Graphique Simple (5 minutes)

1. **Importer dans le module :**

```typescript
// src/app/bi/bi.module.ts
import { NgChartsModule } from 'ng2-charts';

@NgModule({
  imports: [
    // ... autres imports
    NgChartsModule
  ]
})
```

2. **Ajouter les données dans le composant :**

```typescript
// src/app/bi/pages/bi-dashboard/bi-dashboard.component.ts
import { ChartData } from 'chart.js';

chartData: ChartData = {
  labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai'],
  datasets: [{
    label: 'Ventes',
    data: [12, 19, 3, 5, 2],
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.1)'
  }]
};
```

3. **Afficher dans le template :**

```html
<!-- src/app/bi/pages/bi-dashboard/bi-dashboard.component.html -->
<canvas baseChart
  [data]="chartData"
  [type]="'line'">
</canvas>
```

**Guide complet :** `docs/BI_NEXT_STEPS.md`

---

## 🐛 Résolution de Problèmes

### Problème : "Cannot find module '@angular/material'"

**Solution :**
```bash
npm install @angular/material @angular/cdk
```

### Problème : "404 Not Found" sur les endpoints API

**Solution :**
1. Vérifier que le backend est démarré
2. Vérifier l'URL dans `src/environments/environment.ts`
3. Vérifier que les endpoints sont implémentés

### Problème : "Access Denied" ou "403 Forbidden"

**Solution :**
1. Vérifier que l'utilisateur a le rôle ROLE_ADMIN ou ROLE_MANAGER
2. Vérifier le token JWT dans les headers
3. Vérifier les permissions côté backend

### Problème : Les données ne s'affichent pas

**Solution :**
1. Ouvrir la console du navigateur (F12)
2. Vérifier les erreurs dans l'onglet Console
3. Vérifier les requêtes dans l'onglet Network
4. Vérifier que les données sont au bon format

---

## 📚 Documentation Complète

### Pour Commencer
- **Ce fichier** : Guide de démarrage rapide
- `src/app/bi/README.md` : Documentation du module
- `BI_MODULE_IMPLEMENTATION_COMPLETE.md` : Vue d'ensemble complète

### Pour Développer
- `docs/BI_IMPLEMENTATION_PLAN.md` : Plan complet (8 phases)
- `docs/BI_NEXT_STEPS.md` : Prochaines étapes détaillées
- `docs/BI_DASHBOARD_API_REFERENCE.md` : Référence API

### Pour Comprendre
- `docs/BI_DASHBOARD_SPECIFICATION.md` : Spécifications fonctionnelles
- `docs/BI_DASHBOARD_UX_SPEC.md` : Spécifications UX/UI
- `BI_FILES_CREATED.md` : Liste de tous les fichiers

---

## ✅ Checklist de Démarrage

### Avant de Commencer
- [ ] Node.js et npm installés
- [ ] Angular CLI installé (`npm install -g @angular/cli`)
- [ ] Projet cloné et dépendances installées (`npm install`)
- [ ] Backend démarré et accessible

### Premier Lancement
- [ ] `ng serve` exécuté sans erreur
- [ ] Application accessible sur http://localhost:4200
- [ ] Connexion réussie avec un compte admin/manager
- [ ] Entrée "Dashboard BI" visible dans la sidebar

### Vérification du Dashboard
- [ ] Dashboard BI accessible
- [ ] 4 cartes KPI affichées
- [ ] Filtres de période fonctionnels
- [ ] Alertes affichées
- [ ] Aucune erreur dans la console

### Prêt pour la Phase 2
- [ ] Tous les tests ci-dessus passent
- [ ] Backend répond correctement
- [ ] Prêt à installer Chart.js
- [ ] Prêt à créer les graphiques

---

## 🎯 Objectifs des Prochaines Sessions

### Session 1 : Graphiques (2-3 heures)
- [ ] Installer Chart.js
- [ ] Créer les composants de graphiques
- [ ] Intégrer dans le dashboard
- [ ] Tester les graphiques

### Session 2 : Page Ventes (3-4 heures)
- [ ] Créer la page analyse des ventes
- [ ] Implémenter les graphiques de ventes
- [ ] Créer les tableaux de performance
- [ ] Ajouter les filtres avancés

### Session 3 : Page Recouvrements (3-4 heures)
- [ ] Créer la page analyse des recouvrements
- [ ] Implémenter les graphiques de recouvrement
- [ ] Créer l'analyse des retards
- [ ] Ajouter les prévisions

---

## 💡 Conseils

### Performance
- Utiliser le lazy loading (déjà configuré ✅)
- Implémenter le caching pour les données fréquentes
- Optimiser les requêtes API avec des filtres

### Développement
- Suivre les normes du module Orders
- Utiliser les types TypeScript définis
- Commenter le code complexe
- Tester régulièrement

### Débogage
- Utiliser la console du navigateur (F12)
- Utiliser les DevTools Angular
- Vérifier les requêtes réseau
- Consulter les logs du backend

---

## 🚀 Commandes Utiles

```bash
# Démarrer le serveur
ng serve

# Build de production
ng build --configuration production

# Lancer les tests
ng test

# Linter le code
ng lint

# Générer un nouveau composant
ng generate component bi/components/mon-composant

# Générer un nouveau service
ng generate service bi/services/mon-service

# Analyser la taille des bundles
npm run analyze
```

---

## 📞 Besoin d'Aide ?

### Ressources
1. **Documentation du module :** `src/app/bi/README.md`
2. **Guide détaillé :** `docs/BI_NEXT_STEPS.md`
3. **Plan complet :** `docs/BI_IMPLEMENTATION_PLAN.md`

### Support
- Consulter la documentation
- Vérifier les exemples de code
- Créer un ticket si problème persistant

---

**🎉 Félicitations ! Vous êtes prêt à utiliser le module BI Dashboard !**

**Prochaine étape :** Installer Chart.js et créer vos premiers graphiques 📊

---

**Version :** 1.0.0  
**Date :** 19 novembre 2025  
**Temps de lecture :** 5 minutes  
**Temps de mise en route :** 5 minutes
