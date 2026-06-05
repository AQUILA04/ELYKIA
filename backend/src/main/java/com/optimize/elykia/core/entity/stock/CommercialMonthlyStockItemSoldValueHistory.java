package com.optimize.elykia.core.entity.stock;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.CommercialStockMovementType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "commercial_monthly_stock_item_sold_value_history")
@Getter
@Setter
@NoArgsConstructor
public class CommercialMonthlyStockItemSoldValueHistory extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stock_item_id", nullable = false)
    @JsonIgnore
    private CommercialMonthlyStockItem stockItem;

    private Long creditId;

    private String creditReference;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CommercialStockMovementType movementType;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private Double saleUnitPrice;

    @Column(nullable = false)
    private Double weightedAverageUnitPrice;

    @Column(nullable = false)
    private Double previousTotalSoldValue;

    @Column(nullable = false)
    private Double newTotalSoldValue;

    @Column(nullable = false)
    private Double deltaValue;

    public CommercialMonthlyStockItemSoldValueHistory(
            CommercialMonthlyStockItem stockItem,
            Long creditId,
            String creditReference,
            CommercialStockMovementType movementType,
            Integer quantity,
            Double saleUnitPrice,
            Double weightedAverageUnitPrice,
            Double previousTotalSoldValue,
            Double newTotalSoldValue) {
        this.stockItem = stockItem;
        this.creditId = creditId;
        this.creditReference = creditReference;
        this.movementType = movementType;
        this.quantity = quantity;
        this.saleUnitPrice = saleUnitPrice;
        this.weightedAverageUnitPrice = weightedAverageUnitPrice;
        this.previousTotalSoldValue = previousTotalSoldValue;
        this.newTotalSoldValue = newTotalSoldValue;
        this.deltaValue = newTotalSoldValue - previousTotalSoldValue;
    }
}
