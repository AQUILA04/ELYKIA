package com.optimize.elykia.inventory.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

/**
 * Position transactionnelle du stock magasin par agence et par article.
 * Invariants :
 * - {@code onHandQuantity >= 0}
 * - {@code 0 <= reservedQuantity <= onHandQuantity}
 * - {@code availableQuantity() == onHandQuantity - reservedQuantity >= 0}
 */
@Entity
@Table(name = "warehouse_stock_position",
        uniqueConstraints = @UniqueConstraint(name = "uq_warehouse_stock_position",
                columnNames = {"agency_id", "article_id"}))
@Getter
@Setter
@NoArgsConstructor
public class WarehouseStockPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "agency_id", nullable = false)
    private Long agencyId;

    @Column(name = "article_id", nullable = false)
    private Long articleId;

    @Column(name = "on_hand_quantity", nullable = false)
    private Integer onHandQuantity = 0;

    @Column(name = "reserved_quantity", nullable = false)
    private Integer reservedQuantity = 0;

    @Column(name = "reorder_point")
    private Integer reorderPoint;

    @Column(name = "optimal_stock_level")
    private Integer optimalStockLevel;

    @Column(name = "last_restock_date")
    private LocalDate lastRestockDate;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public static WarehouseStockPosition open(Long agencyId, Long articleId) {
        WarehouseStockPosition pos = new WarehouseStockPosition();
        pos.agencyId = agencyId;
        pos.articleId = articleId;
        pos.onHandQuantity = 0;
        pos.reservedQuantity = 0;
        LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);
        pos.createdAt = now;
        pos.updatedAt = now;
        return pos;
    }

    public int availableQuantity() {
        int onHand = onHandQuantity == null ? 0 : onHandQuantity;
        int reserved = reservedQuantity == null ? 0 : reservedQuantity;
        return Math.max(0, onHand - reserved);
    }

    public void addOnHand(int quantity) {
        if (quantity < 0) {
            throw new IllegalArgumentException("La quantité d'entrée doit être positive.");
        }
        int current = onHandQuantity == null ? 0 : onHandQuantity;
        this.onHandQuantity = current + quantity;
        this.lastRestockDate = LocalDate.now(ZoneOffset.UTC);
        touch();
    }

    public void deductOnHand(int quantity) {
        if (quantity < 0) {
            throw new IllegalArgumentException("La quantité de sortie doit être positive.");
        }
        int current = onHandQuantity == null ? 0 : onHandQuantity;
        if (quantity > current) {
            throw new IllegalStateException("Stock physique magasin insuffisant pour l'article " + articleId
                    + " (agence " + agencyId + ") : " + current + " < " + quantity);
        }
        this.onHandQuantity = current - quantity;
        int reserved = reservedQuantity == null ? 0 : reservedQuantity;
        if (reserved > this.onHandQuantity) {
            this.reservedQuantity = this.onHandQuantity;
        }
        touch();
    }

    /**
     * Réserve jusqu'à {@code requested} unités parmi la quantité disponible.
     *
     * @return la quantité effectivement réservée ({@code 0 <= reserved <= requested})
     */
    public int reserveAvailableUpTo(int requested) {
        if (requested <= 0) {
            return 0;
        }
        int available = availableQuantity();
        int allocated = Math.min(requested, available);
        int currentReserved = reservedQuantity == null ? 0 : reservedQuantity;
        this.reservedQuantity = currentReserved + allocated;
        touch();
        return allocated;
    }

    public void releaseReserved(int quantity) {
        if (quantity <= 0) {
            return;
        }
        int current = reservedQuantity == null ? 0 : reservedQuantity;
        this.reservedQuantity = Math.max(0, current - quantity);
        touch();
    }

    public void touch() {
        this.updatedAt = LocalDateTime.now(ZoneOffset.UTC);
        if (this.createdAt == null) {
            this.createdAt = this.updatedAt;
        }
    }
}
