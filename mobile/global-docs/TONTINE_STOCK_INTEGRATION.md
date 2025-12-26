# Intégration du Stock Tontine

## Modifications Effectuées

### 1. Création de l'Entité TontineStock

**Fichier**: `elykia-mobile/src/app/models/tontine.model.ts`

```typescript
export interface TontineStock {
    id: string;
    commercial: string;
    creditId?: string;
    articleId: string;
    articleName?: string;
    unitPrice: number;
    totalQuantity: number;
    availableQuantity: number;
    distributedQuantity: number;
    year: number;
    tontineSessionId: string;
}
```

### 2. Création du Repository TontineStockRepository

**Fichier**: `elykia-mobile/src/app/core/repositories/tontine-stock.repository.ts`

Méthodes disponibles :
- `saveAll()` - Sauvegarde en masse
- `getByCommercialAndSession()` - Récupération par commercial et session
- `getAvailableStocks()` - Stocks disponibles uniquement (availableQuantity > 0)
- `getByArticle()` - Stock par article
- `updateQuantities()` - Mise à jour après distribution

### 3. Ajout de la Table dans la Base de Données

**Fichier**: `elykia-mobile/src/app/core/services/database.service.ts`

```sql
CREATE TABLE IF NOT EXISTS tontine_stocks (
    id TEXT PRIMARY KEY,
    commercial TEXT,
    creditId TEXT,
    articleId TEXT,
    articleName TEXT,
    unitPrice REAL,
    totalQuantity INTEGER,
    availableQuantity INTEGER,
    distributedQuantity INTEGER,
    year INTEGER,
    tontineSessionId TEXT,
    FOREIGN KEY(tontineSessionId) REFERENCES tontine_sessions(id),
    FOREIGN KEY(articleId) REFERENCES articles(id)
);
```

Méthodes ajoutées :
- `saveTontineStocks()` - Sauvegarde
- `getTontineStocks()` - Récupération

### 4. Intégration dans TontineService

**Fichier**: `elykia-mobile/src/app/core/services/tontine.service.ts`

- Ajout de `fetchAndSaveStocks()` - Récupère les stocks depuis l'API `/api/v1/tontines/stock`
- Modification de `initializeTontine()` - Utilise `forkJoin` pour paralléliser le chargement des membres et des stocks

```typescript
initializeTontine(): Observable<boolean> {
    return this.fetchAndSaveSession().pipe(
        switchMap(session => {
            if (session) {
                return forkJoin({
                    members: this.fetchAndSaveMembers(session.id),
                    stocks: this.fetchAndSaveStocks()
                }).pipe(map(() => true));
            }
            return of(true);
        })
    );
}
```

### 5. Modification de la Page de Création de Livraison

**Fichier**: `elykia-mobile/src/app/features/tontine/pages/delivery-creation/delivery-creation.page.ts`

#### Changements Principaux :

**Avant** : Utilisait `Article` et `ArticleRepository`
**Après** : Utilise `TontineStock` et `TontineStockRepository`

#### Modifications Détaillées :

1. **Imports** :
   - Remplacé `ArticleRepository` par `TontineStockRepository`
   - Remplacé `Article` par `TontineStock`

2. **ViewModel** :
   ```typescript
   // AVANT
   articles: Article[];
   
   // APRÈS
   stocks: TontineStock[];
   ```

3. **Chargement des Données** :
   ```typescript
   // AVANT
   async loadArticles() {
       const pageData = await this.articleRepo.searchArticles(...);
       this.vm.articles = [...this.vm.articles, ...pageData.content];
   }
   
   // APRÈS
   async loadStocks() {
       this.allStocks = await this.stockRepo.getAvailableStocks(
           this.commercialUsername,
           this.vm.session.id
       );
       this.vm.stocks = this.allStocks;
   }
   ```

4. **Gestion du Panier** :
   ```typescript
   // AVANT
   private cart = new Map<string, number>(); // articleId -> quantity
   private cartDetails = new Map<string, { price: number, name: string }>();
   
   // APRÈS
   private cart = new Map<string, number>(); // stockId -> quantity
   private cartDetails = new Map<string, { price: number, name: string, maxQty: number }>();
   ```

5. **Contrôle de Quantité** :
   ```typescript
   // AVANT
   increaseQuantity(article: Article) {
       if (currentQty < article.stockQuantity) { ... }
   }
   
   // APRÈS
   increaseQuantity(stock: TontineStock) {
       if (currentQty < stock.availableQuantity) { ... }
   }
   ```

6. **Mise à Jour du Stock après Livraison** :
   ```typescript
   async processDelivery() {
       // ... création de la livraison ...
       
       // Nouveau : Mise à jour des stocks
       for (const update of stockUpdates) {
           await this.stockRepo.updateQuantities(update.stockId, update.quantity);
       }
   }
   ```

### 6. Modification du Template HTML

**Fichier**: `elykia-mobile/src/app/features/tontine/pages/delivery-creation/delivery-creation.page.html`

```html
<!-- AVANT -->
<div class="article-card" *ngFor="let article of vm.articles">
    <div class="article-name">{{article.commercialName || article.name}}</div>
    <div class="article-price">{{article.creditSalePrice | number}} FCFA</div>
    <div class="article-stock">Stock: {{article.stockQuantity}} unités</div>
    <button (click)="increaseQuantity(article)">+</button>
</div>

<!-- APRÈS -->
<div class="article-card" *ngFor="let stock of vm.stocks">
    <div class="article-name">{{stock.articleName || 'Article'}}</div>
    <div class="article-price">{{stock.unitPrice | number}} FCFA</div>
    <div class="article-stock">Disponible: {{stock.availableQuantity}} unités</div>
    <button (click)="increaseQuantity(stock)">+</button>
</div>
```

## Flux de Données

### Initialisation
1. L'utilisateur lance l'initialisation des données
2. `TontineService.initializeTontine()` est appelé
3. En parallèle :
   - Récupération des membres depuis `/api/v1/tontines/sessions/{id}/members`
   - Récupération des stocks depuis `/api/v1/tontines/stock`
4. Les stocks sont sauvegardés dans la table `tontine_stocks`

### Création de Livraison
1. L'utilisateur accède à la page de création de livraison
2. Les stocks disponibles sont chargés depuis la base locale
3. L'utilisateur sélectionne des articles et quantités
4. Validation et enregistrement :
   - Création de la livraison
   - Mise à jour des stocks (availableQuantity - qty, distributedQuantity + qty)
   - Mise à jour du statut du membre à 'DELIVERED'
5. Affichage du reçu de livraison

## Avantages

- ✅ Gestion dédiée du stock tontine séparée du stock général
- ✅ Contrôle précis des quantités disponibles par session
- ✅ Mise à jour automatique du stock après chaque livraison
- ✅ Traçabilité des quantités distribuées
- ✅ Évite les conflits avec le stock général des articles
- ✅ Permet une gestion multi-session (par année)
- ✅ Initialisation parallèle pour de meilleures performances

## Points d'Attention

1. **Synchronisation** : Les mises à jour de stock locales doivent être synchronisées avec le serveur
2. **Cohérence** : S'assurer que le stock tontine est bien initialisé avant de créer des livraisons
3. **Validation** : Le stock disponible est vérifié avant chaque ajout au panier
4. **Budget** : Le budget épargné du membre est toujours respecté
