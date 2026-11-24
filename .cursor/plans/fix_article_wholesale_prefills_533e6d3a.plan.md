---
name: Fix article wholesale prefills
overview: "Bug confirmé côté frontend uniquement : à l’édition, `loadArticle` ne pré-remplit pas les prix de vente gros / demi-gros, les unités demi-gros ni les offres personnalisées, alors qu’une méthode complète `setFormValues` existe déjà mais n’est jamais appelée. Le backend GET/PUT gère correctement ces champs."
todos:
  - id: fix-loadArticle
    content: "Dans add.component.ts : appeler setFormValues dans loadArticle + retirer console.log"
    status: pending
  - id: changelog
    content: Bump version frontend + entrée docs/CHANGELOG.md
    status: pending
isProject: false
---

# Correctif pré-remplissage prix d’en-gros (édition article)

## Diagnostic

Le backend est sain : `GET /api/v1/articles/{id}` renvoie bien `wholesaleSalePrice`, `halfWholesaleSalePrice`, `unitsPerHalfPackage` et `salePacks` ; le `PUT` les persiste.

Le bug est dans [`frontend/src/app/article/add/add.component.ts`](frontend/src/app/article/add/add.component.ts), méthode `loadArticle` :

```73:88:frontend/src/app/article/add/add.component.ts
        this.articleForm.patchValue({
          ...
          packagingType: data.data.packagingType || 'NONE',
          unitsPerPackage: data.data.unitsPerPackage ?? null,
          wholesalePurchasePrice: data.data.wholesalePurchasePrice ?? null,
          halfWholesalePurchasePrice: data.data.halfWholesalePurchasePrice ?? null
        });
```

Champs **jamais** patchés au chargement :
- `wholesaleSalePrice` — « Prix de vente gros (1 colis) »
- `halfWholesaleSalePrice` — « Prix de vente demi-gros »
- `unitsPerHalfPackage` — « Unités du demi-gros » (cache les champs demi-gros si unités impaires)
- `salePacks` — « Offres personnalisées »

Les prix d’**achat** gros / demi-gros **sont** pré-remplis. Les utilisateurs qui remarquent surtout les prix de **vente** gros voient donc des champs vides.

Effet collatéral : à l’enregistrement, `onSubmit` envoie `null` / `[]` pour ces champs absents du formulaire → le PUT écrase les valeurs en base (perte silencieuse).

## Correctif prévu

Réutiliser la méthode morte déjà complète `setFormValues(article)` (l.220–247), qui patch tous les champs gros et reconstruit `salePacks` :

Dans `loadArticle`, remplacer le `patchValue` partiel par :

```ts
this.setFormValues(data.data);
this.existingOwnPhoto = data.data.photoUrl || null;
this.inheritedPhotoUrl = data.data.photoUrl ? null : (data.data.displayPhotoUrl || null);
this.refreshInherited(data.data.type);
this.onPackagingTypeChanged(data.data.packagingType || 'NONE');
```

Garder l’appel à `onPackagingTypeChanged` **après** le patch (comportement actuel : ne nullifie que si `NONE`).

Retirer le `console.log(data)` résiduel dans `loadArticle`.

## Hors scope

- Pas de changement backend / DTO / migration
- Pas de maj guide utilisateur (comportement attendu déjà décrit ; bug d’UI de pré-remplissage)
- Changelog frontend + bump version selon skill `keep-changelog` au moment de l’implémentation

## Vérification manuelle

1. Éditer un article avec packaging CARTON/SAC, prix vente gros + demi-gros + offre personnalisée
2. Enregistrer, rouvrir le formulaire → tous les champs pré-remplis
3. Enregistrer sans toucher aux prix → valeurs inchangées en base / au rechargement
