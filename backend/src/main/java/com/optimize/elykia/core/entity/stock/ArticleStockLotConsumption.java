package com.optimize.elykia.core.entity.stock;

import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.enumaration.ArticleStockLotMovementType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "article_stock_lot_consumption")
@Getter
@Setter
@NoArgsConstructor
public class ArticleStockLotConsumption extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "lot_id", nullable = false)
    private ArticleStockLot lot;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_purchase_price", nullable = false)
    private Double unitPurchasePrice;

    @Enumerated(EnumType.STRING)
    @Column(name = "movement_type", nullable = false)
    private ArticleStockLotMovementType movementType;

    @Column(name = "source_type")
    private String sourceType;

    @Column(name = "source_id")
    private Long sourceId;
}
