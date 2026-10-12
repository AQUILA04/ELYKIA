package com.optimize.elykia.core.entity.debt;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.optimize.common.entities.entity.Auditable;
import com.optimize.elykia.core.entity.article.Articles;
import com.optimize.elykia.core.entity.inventory.InventoryItem;
import com.optimize.elykia.core.entity.stock.CommercialMonthlyStockItem;
import com.optimize.elykia.core.enumaration.DebtPriceBasis;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "debt_line")
@Getter
@Setter
@NoArgsConstructor
public class DebtLine extends Auditable<String> {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "debt_document_id", nullable = false)
    @JsonIgnore
    private DebtDocument debtDocument;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "article_id")
    private Articles article;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stock_item_id")
    @JsonIgnore
    private CommercialMonthlyStockItem stockItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_item_id")
    @JsonIgnore
    private InventoryItem inventoryItem;

    @Column(name = "line_code", length = 60)
    private String lineCode;

    @Column(length = 255)
    private String label;

    private Integer quantity;

    @Column(name = "unit_price")
    private Double unitPrice = 0.0;

    @Column(nullable = false)
    private Double amount = 0.0;

    @Enumerated(EnumType.STRING)
    @Column(name = "price_basis", length = 30)
    private DebtPriceBasis priceBasis;

    @Column(name = "sort_order")
    private Integer sortOrder = 0;
}
