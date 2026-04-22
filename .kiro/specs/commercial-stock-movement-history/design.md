# Design : Historique des Mouvements de Stock Commercial

## Vue d'ensemble

Ajout d'une entité `CommercialStockMovement` pour tracer chaque opération modifiant le stock mensuel d'un commercial (`CommercialMonthlyStockItem`). Ce design couvre la création de l'entité, du repository, du service, et l'intégration dans les points d'entrée existants.

---

## Design Haut Niveau

### Composants impliqués

```
CreditService
    ├── distributeArticlesV2()   → vente à crédit (CREDIT_SALE)
    └── startCredit()            → vente CASH (CASH_SALE)

CommercialMonthlyStockItem       → entité stock existante
CommercialStockMovement          → NOUVELLE entité historique
CommercialStockMovementRepository → NOUVEAU repository
CommercialStockMovementService   → NOUVEAU service
```

### Modèle de données

```
CommercialMonthlyStockItem (existant)
    │
    └──< CommercialStockMovement (nouveau)
            - id
            - stockItem         (ManyToOne → CommercialMonthlyStockItem)
            - credit            (ManyToOne → Credit, nullable)
            - creditReference   (String)
            - collector         (String)
            - article           (ManyToOne → Articles)
            - movementType      (Enum: CREDIT_SALE, CASH_SALE, STOCK_IN, RETURN, ADJUSTMENT)
            - quantityBefore    (Integer)
            - quantityMoved     (Integer)
            - quantityAfter     (Integer)
            - operationDate     (LocalDateTime)
```

### Flux d'une vente à crédit (`distributeArticlesV2`)

```
Pour chaque CreditArticles dans la vente :
  1. Lire quantityRemaining actuel → quantityBefore
  2. Déduire la quantité vendue du stock (logique existante)
  3. Lire quantityRemaining après mise à jour → quantityAfter
  4. Créer CommercialStockMovement(CREDIT_SALE, quantityBefore, quantité, quantityAfter, credit)
  5. Persister le mouvement
```

### Flux d'une vente CASH (`startCredit`)

```
Pour chaque CreditArticles dans la vente CASH :
  1. Lire quantityRemaining actuel → quantityBefore
  2. Mettre à jour le stock (logique existante)
  3. Lire quantityRemaining après → quantityAfter
  4. Créer CommercialStockMovement(CASH_SALE, quantityBefore, quantité, quantityAfter, credit)
  5. Persister le mouvement
```

---

## Design Bas Niveau

### 1. Enum `CommercialStockMovementType`

```java
package com.optimize.elykia.core.enumaration;

public enum CommercialStockMovementType {
    CREDIT_SALE,   // Vente à crédit via distributeArticlesV2
    CASH_SALE,     // Vente au comptant via startCredit
    STOCK_IN,      // Entrée de stock (prise en charge par le commercial)
    RETURN,        // Retour d'article au magasin
    ADJUSTMENT     // Ajustement manuel
}
```

### 2. Entité `CommercialStockMovement`

```java
package com.optimize.elykia.core.entity.stock;

@Entity
@Getter @Setter @NoArgsConstructor
public class CommercialStockMovement extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_item_id", nullable = false)
    private CommercialMonthlyStockItem stockItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "credit_id")
    private Credit credit; // nullable (ex: STOCK_IN n'a pas de crédit)

    private String creditReference;

    private String collector;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "article_id", nullable = false)
    private Articles article;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommercialStockMovementType movementType;

    @Column(nullable = false)
    private Integer quantityBefore;

    @Column(nullable = false)
    private Integer quantityMoved;

    @Column(nullable = false)
    private Integer quantityAfter;

    @Column(nullable = false)
    private LocalDateTime operationDate;
}
```

### 3. Repository `CommercialStockMovementRepository`

```java
package com.optimize.elykia.core.repository;

public interface CommercialStockMovementRepository
        extends JpaRepository<CommercialStockMovement, Long> {

    List<CommercialStockMovement> findByStockItem_IdOrderByOperationDateDesc(Long stockItemId);

    List<CommercialStockMovement> findByCredit_IdOrderByOperationDateDesc(Long creditId);

    List<CommercialStockMovement> findByCollectorAndMovementTypeOrderByOperationDateDesc(
            String collector, CommercialStockMovementType type);
}
```

### 4. Service `CommercialStockMovementService`

```java
package com.optimize.elykia.core.service.stock;

@Service
@Transactional
public class CommercialStockMovementService {

    private final CommercialStockMovementRepository repository;

    public CommercialStockMovementService(CommercialStockMovementRepository repository) {
        this.repository = repository;
    }

    /**
     * Enregistre un mouvement de stock pour un item donné.
     *
     * @param stockItem      l'item de stock concerné
     * @param credit         le crédit associé (peut être null)
     * @param movementType   le type d'opération
     * @param quantityBefore quantité disponible avant l'opération
     * @param quantityMoved  quantité de l'opération
     * @param quantityAfter  quantité restante après l'opération
     */
    public CommercialStockMovement record(
            CommercialMonthlyStockItem stockItem,
            Credit credit,
            CommercialStockMovementType movementType,
            Integer quantityBefore,
            Integer quantityMoved,
            Integer quantityAfter) {

        CommercialStockMovement movement = new CommercialStockMovement();
        movement.setStockItem(stockItem);
        movement.setCredit(credit);
        movement.setCreditReference(credit != null ? credit.getReference() : null);
        movement.setCollector(stockItem.getMonthlyStock().getCollector());
        movement.setArticle(stockItem.getArticle());
        movement.setMovementType(movementType);
        movement.setQuantityBefore(quantityBefore);
        movement.setQuantityMoved(quantityMoved);
        movement.setQuantityAfter(quantityAfter);
        movement.setOperationDate(LocalDateTime.now());
        return repository.save(movement);
    }

    public List<CommercialStockMovement> getByStockItem(Long stockItemId) {
        return repository.findByStockItem_IdOrderByOperationDateDesc(stockItemId);
    }

    public List<CommercialStockMovement> getByCredit(Long creditId) {
        return repository.findByCredit_IdOrderByOperationDateDesc(creditId);
    }
}
```

### 5. Intégration dans `CreditService.distributeArticlesV2`

Dans la boucle `clientCredit.getArticles().forEach(...)`, après `stockItem.updateRemaining()` :

```java
// Capture quantityBefore AVANT la mise à jour
Integer quantityBefore = stockItem.getQuantityRemaining();

// ... logique existante de mise à jour du stock ...
stockItem.setQuantitySold(stockItem.getQuantitySold() + creditArticles.getQuantity());
// ... totalSoldValue, totalMargeValue ...
stockItem.updateRemaining();

// Enregistrement du mouvement
commercialStockMovementService.record(
    stockItem,
    clientCredit,
    CommercialStockMovementType.CREDIT_SALE,
    quantityBefore,
    creditArticles.getQuantity(),
    stockItem.getQuantityRemaining()
);
```

### 6. Intégration dans `CreditService.startCredit` (ventes CASH)

Dans la boucle `cashCredit.getArticles().forEach(...)`, après `stockItem.updateRemaining()` :

```java
Integer quantityBefore = stockItem.getQuantityRemaining();

// ... logique existante ...
stockItem.setQuantityTaken(stockItem.getQuantityTaken() + creditArticle.getQuantity());
stockItem.setQuantitySold(stockItem.getQuantitySold() + creditArticle.getQuantity());
// ... totalSoldValue ...
stockItem.updateRemaining();

// Enregistrement du mouvement
commercialStockMovementService.record(
    stockItem,
    credit,
    CommercialStockMovementType.CASH_SALE,
    quantityBefore,
    creditArticle.getQuantity(),
    stockItem.getQuantityRemaining()
);
```

### 7. DTO de réponse `CommercialStockMovementDto`

```java
public record CommercialStockMovementDto(
    Long id,
    Long stockItemId,
    Long creditId,
    String creditReference,
    String collector,
    String articleName,
    String movementType,
    Integer quantityBefore,
    Integer quantityMoved,
    Integer quantityAfter,
    LocalDateTime operationDate
) {
    public static CommercialStockMovementDto fromEntity(CommercialStockMovement m) {
        return new CommercialStockMovementDto(
            m.getId(),
            m.getStockItem().getId(),
            m.getCredit() != null ? m.getCredit().getId() : null,
            m.getCreditReference(),
            m.getCollector(),
            m.getArticle().getCommercialName(),
            m.getMovementType().name(),
            m.getQuantityBefore(),
            m.getQuantityMoved(),
            m.getQuantityAfter(),
            m.getOperationDate()
        );
    }
}
```

### 8. Endpoint REST (optionnel)

```java
// GET /api/stock/movements/item/{stockItemId}
// GET /api/stock/movements/credit/{creditId}
```

---

## Considérations techniques

- `CommercialStockMovementService` est injecté dans `CreditService` via `@Autowired` setter (pattern existant dans le projet) pour éviter les dépendances circulaires.
- La capture de `quantityBefore` doit se faire **avant** toute modification du `stockItem` dans la boucle.
- Le mouvement est persisté dans la même transaction que la vente pour garantir la cohérence.
- `credit` peut être `null` pour les types `STOCK_IN` et `ADJUSTMENT`.
