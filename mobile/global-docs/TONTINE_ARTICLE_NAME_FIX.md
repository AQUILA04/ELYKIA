# Correction Affichage des Noms d'Articles dans les Livraisons Tontine

## Problème Identifié

Sur la page de détail d'un membre, les articles de livraison affichaient "Article inconnu" au lieu du nom réel de l'article.

## Cause Racine

**Problème 1 - Mapping API** : L'API retourne les items de livraison avec la structure suivante :
```json
{
  "items": [{
    "id": 7,
    "articles": { "id": 1, "name": "Rizière 1Kg", ... },
    "articleId": 1,
    "articleName": "RIZ: Rizière Rizière 1Kg 1Kg",
    ...
  }]
}
```

Le code essayait de récupérer l'ID via `i.article?.id` (singulier) alors que l'API retourne `articles` (pluriel) et `articleId` directement.

**Problème 2 - Pas de JOIN** : Le repository récupérait les items sans faire de jointure avec la table `articles`, donc les noms n'étaient pas disponibles.

## Solutions Implémentées

### 1. Correction du Mapping API

**Fichier**: `elykia-mobile/src/app/core/services/tontine.service.ts`

```typescript
// AVANT (incorrect)
items: m.delivery.items ? m.delivery.items.map((i: any) => ({
    id: i.id,
    tontineDeliveryId: m.delivery.id,
    articleId: i.article?.id,  // ❌ Ne fonctionne pas avec l'API
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    totalPrice: i.totalPrice
})) : []

// APRÈS (correct)
items: m.delivery.items ? m.delivery.items.map((i: any) => {
    // API returns 'articles' (plural) or 'article', and also 'articleId' directly
    const articleId = i.articleId || i.articles?.id || i.article?.id;
    
    return {
        id: i.id,
        tontineDeliveryId: m.delivery.id,
        articleId: articleId,  // ✅ Récupère l'ID correctement
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice
    };
}) : []
```

### 2. Ajout de JOIN dans le Repository

**Fichier**: `elykia-mobile/src/app/core/repositories/tontine-delivery.repository.ts`

```typescript
// AVANT (sans JOIN)
const itemsResult = await this.databaseService.query(
    'SELECT * FROM tontine_delivery_items WHERE tontineDeliveryId = ?', 
    [d.id]
);
d.items = itemsResult.values || [];

// APRÈS (avec JOIN)
const itemsQuery = `
    SELECT 
        tdi.*,
        a.name as articleName,
        a.commercialName as articleCommercialName
    FROM tontine_delivery_items tdi
    LEFT JOIN articles a ON tdi.articleId = a.id
    WHERE tdi.tontineDeliveryId = ?
`;
const itemsResult = await this.databaseService.query(itemsQuery, [d.id]);

d.items = (itemsResult.values || []).map((item: any) => ({
    ...item,
    articleName: item.articleCommercialName || item.articleName || 'Article inconnu'
}));
```

### 3. Ajout de articleName dans le Modèle

**Fichier**: `elykia-mobile/src/app/models/tontine.model.ts`

```typescript
export interface TontineDeliveryItem {
    id: string;
    tontineDeliveryId: string;
    articleId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    articleName?: string; // ✅ Ajouté - Populated via JOIN with articles table
}
```

### 4. Simplification de la Page de Détail

**Fichier**: `elykia-mobile/src/app/features/tontine/pages/member-detail/member-detail.page.ts`

```typescript
// AVANT (récupération manuelle)
if (this.vm.delivery.items) {
    this.vm.deliveryItems = await Promise.all(this.vm.delivery.items.map(async (item) => {
        const article = await this.articleRepo.findById(item.articleId);
        return {
            ...item,
            articleName: article ? article.name : 'Article inconnu'
        };
    }));
}

// APRÈS (déjà récupéré par le repository)
if (this.vm.delivery.items) {
    // Article names are already populated by the repository via JOIN
    this.vm.deliveryItems = this.vm.delivery.items;
}
```

## Vérification de l'Enregistrement Local

Le processus d'enregistrement local a été vérifié et fonctionne correctement :

**Fichier**: `elykia-mobile/src/app/features/tontine/pages/delivery-creation/delivery-creation.page.ts`

```typescript
this.cart.forEach((qty, articleId) => {
    const details = this.cartDetails.get(articleId);
    if (details) {
        items.push({
            id: this.generateUuid(),
            tontineDeliveryId: deliveryId,
            articleId: articleId,  // ✅ Correctement enregistré
            quantity: qty,
            unitPrice: details.price,
            totalPrice: details.price * qty
        });
    }
});
```

## Ordre de Priorité pour articleId

Le code essaie maintenant de récupérer l'`articleId` dans cet ordre :
1. `i.articleId` - ID direct dans l'item (priorité 1)
2. `i.articles?.id` - ID dans l'objet articles au pluriel (priorité 2)
3. `i.article?.id` - ID dans l'objet article au singulier (priorité 3, compatibilité)

## Résultat

- ✅ Les noms d'articles s'affichent correctement lors de l'initialisation depuis l'API
- ✅ Les noms d'articles s'affichent correctement lors de l'enregistrement local
- ✅ La jointure SQL optimise les performances (pas de requête par article)
- ✅ Le code est compatible avec différents formats d'API
- ✅ Fallback vers "Article inconnu" si l'article n'existe pas dans la base

## Tests Effectués

1. ✅ Initialisation depuis l'API - Les noms s'affichent correctement
2. ✅ Enregistrement local d'une livraison - Les noms s'affichent correctement
3. ✅ Affichage sur la page de détail du membre - Les noms sont visibles
4. ✅ Reçu de livraison - Les noms d'articles sont corrects
