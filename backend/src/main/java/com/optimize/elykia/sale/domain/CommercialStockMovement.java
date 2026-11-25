package com.optimize.elykia.sale.domain;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.inventory.domain.Articles;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * @deprecated Remplacé par {@code com.optimize.elykia.commercialstock.domain.CommercialStockLedgerEntry}.
 */
@Deprecated(since = "2.16.0", forRemoval = true)
@Entity
@Getter
@Setter
@NoArgsConstructor
public class CommercialStockMovement extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Multi-agency scope (FK agency.id). */
    @Column(name = "agency_id")
    private Long agencyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_item_id", nullable = false)
    private CommercialMonthlyStockItem stockItem;

    private Long creditId;

    private String creditReference;

    private Long stockReturnId;

    /** @deprecated Utiliser {@link #commercialUsername}. */
    @Deprecated(since = "2.14.0", forRemoval = true)
    private String collector;

    @Column(name = "commercial_username")
    private String commercialUsername;

    public void setCommercialUsername(String commercialUsername) {
        this.commercialUsername = commercialUsername;
        this.collector = commercialUsername;
    }

    @Deprecated(since = "2.14.0", forRemoval = true)
    public void setCollector(String collector) {
        this.collector = collector;
        this.commercialUsername = collector;
    }

    public String getCommercialUsername() {
        return commercialUsername != null ? commercialUsername : collector;
    }

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

    private Double unitPurchasePrice;

    private Double unitSalePrice;

    private Double marginAmount;

    private String sourceType;

    private Long sourceId;
}
